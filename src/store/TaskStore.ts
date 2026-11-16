import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TaskStatusType, TeamId, TaskStatusRecord, TaskNoteRecord, TaskActivityRecord } from '../types';

export type SyncState = 'connecting' | 'live' | 'offline';

export interface TaskStoreListener {
  (eventType: 'status' | 'assignee' | 'note' | 'sync', payload?: unknown): void;
}

export class TaskStoreManager {
  private supabase: SupabaseClient | null = null;
  public isLocalOnly = true;
  public syncState: SyncState = 'offline';
  
  // In-memory state cache
  private statuses: Map<string, TaskStatusRecord> = new Map();
  private notes: TaskNoteRecord[] = [];
  private activities: TaskActivityRecord[] = [];
  private listeners: Set<TaskStoreListener> = new Set();
  
  // Realtime toast callback
  public onRemoteChange?: (team: TeamId, reviewId: string, newStatus: TaskStatusType, actor: string) => void;

  constructor(forceLocal = false) {
    if (forceLocal) {
      this.isLocalOnly = true;
      this.syncState = 'offline';
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://')) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
          realtime: { params: { eventsPerSecond: 10 } },
        });
        this.isLocalOnly = false;
        this.initSupabase();
      } catch (e) {
        console.warn('Failed to initialise Supabase client. Defaulting to local-only mode.', e);
        this.isLocalOnly = true;
        this.syncState = 'offline';
      }
    } else {
      this.isLocalOnly = true;
      this.syncState = 'offline';
    }
  }

  public subscribe(listener: TaskStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(eventType: 'status' | 'assignee' | 'note' | 'sync', payload?: unknown) {
    this.listeners.forEach((l) => l(eventType, payload));
  }

  private makeKey(reviewId: string, team: TeamId): string {
    return `${reviewId}:${team}`;
  }

  private async initSupabase() {
    if (!this.supabase) return;
    this.syncState = 'connecting';
    this.notify('sync');

    try {
      // 1. Initial snapshot fetch
      const [statusRes, notesRes, actRes] = await Promise.all([
        this.supabase.from('task_status').select('*'),
        this.supabase.from('task_notes').select('*').order('created_at', { ascending: false }).limit(200),
        this.supabase.from('task_activity').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      if (statusRes.data) {
        statusRes.data.forEach((row: TaskStatusRecord) => {
          this.statuses.set(this.makeKey(row.review_id, row.team), row);
        });
      }
      if (notesRes.data) {
        this.notes = notesRes.data as TaskNoteRecord[];
      }
      if (actRes.data) {
        this.activities = actRes.data as TaskActivityRecord[];
      }

      this.syncState = 'live';
      this.notify('sync');

      // 2. Setup Realtime subscription
      this.supabase
        .channel('public:tasks')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'task_status' },
          (payload) => {
            const row = payload.new as TaskStatusRecord;
            if (row && row.review_id && row.team) {
              const key = this.makeKey(row.review_id, row.team);
              const prev = this.statuses.get(key);
              this.statuses.set(key, row);
              this.notify('status', { reviewId: row.review_id, team: row.team });

              if (prev && prev.status !== row.status && this.onRemoteChange) {
                this.onRemoteChange(row.team, row.review_id, row.status, row.updated_by || 'A teammate');
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'task_notes' },
          (payload) => {
            const note = payload.new as TaskNoteRecord;
            if (note) {
              this.notes.unshift(note);
              this.notify('note', note);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'task_activity' },
          (payload) => {
            const act = payload.new as TaskActivityRecord;
            if (act) {
              this.activities.unshift(act);
              this.notify('status', act);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.syncState = 'live';
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.syncState = 'offline';
          }
          this.notify('sync');
        });
    } catch (err) {
      console.warn('Supabase fetch failed, running local offline mode', err);
      this.syncState = 'offline';
      this.notify('sync');
    }
  }

  public getStatus(reviewId: string, team: TeamId): TaskStatusType {
    const key = this.makeKey(reviewId, team);
    const rec = this.statuses.get(key);
    return rec ? rec.status : 'todo';
  }

  public getAssignee(reviewId: string, team: TeamId): string | null {
    const key = this.makeKey(reviewId, team);
    const rec = this.statuses.get(key);
    return rec ? rec.assignee : null;
  }

  public async setStatus(
    reviewId: string,
    team: TeamId,
    status: TaskStatusType,
    actor: string
  ): Promise<boolean> {
    const key = this.makeKey(reviewId, team);
    const prev = this.statuses.get(key);
    const prevStatus = prev ? prev.status : 'todo';

    // 1. Optimistic local update
    const optimisticRow: TaskStatusRecord = {
      review_id: reviewId,
      team,
      status,
      assignee: prev?.assignee || null,
      updated_by: actor,
      updated_at: new Date().toISOString(),
    };
    this.statuses.set(key, optimisticRow);

    const actRow: TaskActivityRecord = {
      id: Date.now(),
      review_id: reviewId,
      team,
      kind: 'status',
      from_value: prevStatus,
      to_value: status,
      actor,
      created_at: new Date().toISOString(),
    };
    this.activities.unshift(actRow);
    this.notify('status', { reviewId, team, status });

    // 2. Push to Supabase if connected
    if (this.supabase && !this.isLocalOnly) {
      try {
        const { error } = await this.supabase.rpc('set_status', {
          p_review_id: reviewId,
          p_team: team,
          p_status: status,
          p_actor: actor,
        });
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Remote set_status failed, rolling back optimistic update:', err);
        // Rollback
        if (prev) {
          this.statuses.set(key, prev);
        } else {
          this.statuses.delete(key);
        }
        this.notify('status', { reviewId, team, status: prevStatus });
        return false;
      }
    }

    return true;
  }

  public async setAssignee(
    reviewId: string,
    team: TeamId,
    assignee: string | null,
    actor: string
  ): Promise<boolean> {
    const key = this.makeKey(reviewId, team);
    const prev = this.statuses.get(key);
    const prevAssignee = prev ? prev.assignee : null;

    const optimisticRow: TaskStatusRecord = {
      review_id: reviewId,
      team,
      status: prev?.status || 'todo',
      assignee,
      updated_by: actor,
      updated_at: new Date().toISOString(),
    };
    this.statuses.set(key, optimisticRow);

    const actRow: TaskActivityRecord = {
      id: Date.now(),
      review_id: reviewId,
      team,
      kind: 'assignee',
      from_value: prevAssignee,
      to_value: assignee,
      actor,
      created_at: new Date().toISOString(),
    };
    this.activities.unshift(actRow);
    this.notify('assignee', { reviewId, team });

    if (this.supabase && !this.isLocalOnly) {
      try {
        const { error } = await this.supabase.rpc('set_assignee', {
          p_review_id: reviewId,
          p_team: team,
          p_assignee: assignee,
          p_actor: actor,
        });
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Remote set_assignee failed:', err);
        if (prev) this.statuses.set(key, prev);
        this.notify('assignee', { reviewId, team });
        return false;
      }
    }
    return true;
  }

  public async addNote(
    reviewId: string,
    team: TeamId,
    body: string,
    author: string
  ): Promise<boolean> {
    const newNote: TaskNoteRecord = {
      id: Date.now(),
      review_id: reviewId,
      team,
      body,
      author,
      created_at: new Date().toISOString(),
    };
    this.notes.unshift(newNote);
    this.notify('note', newNote);

    if (this.supabase && !this.isLocalOnly) {
      try {
        const { data, error } = await this.supabase.rpc('add_note', {
          p_review_id: reviewId,
          p_team: team,
          p_body: body,
          p_author: author,
        });
        if (error) throw error;
        if (data && data.id) {
          newNote.id = data.id;
        }
        return true;
      } catch (err) {
        console.error('Remote add_note failed:', err);
        return false;
      }
    }
    return true;
  }

  public getNotes(reviewId: string, team?: TeamId): TaskNoteRecord[] {
    return this.notes.filter(
      (n) => n.review_id === reviewId && (!team || n.team === team)
    );
  }

  public getActivities(limit = 50): TaskActivityRecord[] {
    return this.activities.slice(0, limit);
  }

  public getReviewActivities(reviewId: string, limit = 5): TaskActivityRecord[] {
    return this.activities
      .filter((a) => a.review_id === reviewId)
      .slice(0, limit);
  }
}

// Global Singleton Store Instance
export const taskStore = new TaskStoreManager();

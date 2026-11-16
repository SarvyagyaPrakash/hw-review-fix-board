import React, { useState, useEffect } from 'react';
import {
  Review,
  TeamId,
  TEAM_COLORS,
  TEAM_DISPLAY_NAMES,
  TaskStatusType,
} from '../types';
import { ProgressBar } from './ProgressBar';
import { StatusControl } from './StatusControl';
import { taskStore } from '../store/TaskStore';
import { useData } from '../context/DataContext';
import { Star, ThumbsUp, MessageSquare, ChevronDown, ChevronUp, User, Sparkles } from 'lucide-react';

interface ReviewCardProps {
  review: Review;
  selectedTeam: TeamId | null;
  onStatusChangeSuccess?: (msg: string) => void;
  onStatusChangeError?: (msg: string) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  selectedTeam,
  onStatusChangeSuccess,
  onStatusChangeError,
}) => {
  const { experiments, actorName } = useData();
  const [expandedText, setExpandedText] = useState(false);
  const [activeNotesTeam, setActiveNotesTeam] = useState<TeamId | null>(null);
  const [noteBody, setNoteBody] = useState('');
  const [justUpdatedTeam, setJustUpdatedTeam] = useState<TeamId | null>(null);
  const [updatedStatusType, setUpdatedStatusType] = useState<TaskStatusType | null>(null);

  // Local state for live reactivity
  const [teamStatuses, setTeamStatuses] = useState<Record<TeamId, TaskStatusType>>(() => {
    const map: Partial<Record<TeamId, TaskStatusType>> = {};
    review.teams.forEach((t) => {
      map[t.team] = taskStore.getStatus(review.id, t.team);
    });
    return map as Record<TeamId, TaskStatusType>;
  });

  const [teamAssignees, setTeamAssignees] = useState<Record<TeamId, string>>(() => {
    const map: Partial<Record<TeamId, string>> = {};
    review.teams.forEach((t) => {
      map[t.team] = taskStore.getAssignee(review.id, t.team) || '';
    });
    return map as Record<TeamId, string>;
  });

  const [notesCount, setNotesCount] = useState<Record<TeamId, number>>(() => {
    const map: Partial<Record<TeamId, number>> = {};
    review.teams.forEach((t) => {
      map[t.team] = taskStore.getNotes(review.id, t.team).length;
    });
    return map as Record<TeamId, number>;
  });

  useEffect(() => {
    const unsubscribe = taskStore.subscribe((event) => {
      if (event === 'status' || event === 'assignee' || event === 'note') {
        const nextSt: Partial<Record<TeamId, TaskStatusType>> = {};
        const nextAs: Partial<Record<TeamId, string>> = {};
        const nextNc: Partial<Record<TeamId, number>> = {};

        review.teams.forEach((t) => {
          nextSt[t.team] = taskStore.getStatus(review.id, t.team);
          nextAs[t.team] = taskStore.getAssignee(review.id, t.team) || '';
          nextNc[t.team] = taskStore.getNotes(review.id, t.team).length;
        });

        setTeamStatuses(nextSt as Record<TeamId, TaskStatusType>);
        setTeamAssignees(nextAs as Record<TeamId, string>);
        setNotesCount(nextNc as Record<TeamId, number>);
      }
    });
    return unsubscribe;
  }, [review.id, review.teams]);

  const handleStatusChange = async (team: TeamId, newStatus: TaskStatusType) => {
    setJustUpdatedTeam(team);
    setUpdatedStatusType(newStatus);
    setTimeout(() => {
      setJustUpdatedTeam(null);
      setUpdatedStatusType(null);
    }, 1200);

    const ok = await taskStore.setStatus(review.id, team, newStatus, actorName);
    if (ok) {
      if (onStatusChangeSuccess) {
        onStatusChangeSuccess(`${TEAM_DISPLAY_NAMES[team]} marked “${newStatus}”`);
      }
    } else {
      if (onStatusChangeError) {
        onStatusChangeError('Could not save status. Check your connection and try again.');
      }
    }
  };

  const handleAssigneeBlur = (team: TeamId, val: string) => {
    taskStore.setAssignee(review.id, team, val.trim() || null, actorName);
  };

  const handleAddNote = async (team: TeamId) => {
    if (!noteBody.trim()) return;
    await taskStore.addNote(review.id, team, noteBody.trim(), actorName);
    setNoteBody('');
  };

  // Verbatim quote & Evidence Highlight
  const isLong = review.text.length > 280;
  const displayText = !expandedText && isLong ? review.text.slice(0, 280) + '…' : review.text;

  // Highlight all evidence substrings within text
  const renderHighlightedText = (fullText: string) => {
    const evidenceList = review.issues.map((i) => i.evidence).filter(Boolean);
    if (evidenceList.length === 0) return fullText;

    // Build regex to match any of the evidence snippets
    const escaped = evidenceList.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = fullText.split(regex);

    return parts.map((part, idx) => {
      const isEv = evidenceList.some((e) => e.toLowerCase() === part.toLowerCase());
      if (isEv) {
        return (
          <mark
            key={idx}
            className="bg-amber-200/60 dark:bg-amber-900/40 text-ink px-1 rounded py-0.5 font-medium underline decoration-amber-400 dark:decoration-amber-600 underline-offset-2"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const owningTeamIds = review.teams.map((t) => t.team);

  return (
    <article
      className={`rounded-card border bg-paper p-6 shadow-sm transition-all duration-300 ease-out ${
        justUpdatedTeam
          ? updatedStatusType === 'done'
            ? 'border-emerald-500/80 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/10 scale-[1.008]'
            : updatedStatusType === 'working'
            ? 'border-amber-500/80 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/10 scale-[1.008]'
            : 'border-neutral-400/80 ring-2 ring-neutral-400/50 shadow-md scale-[1.004]'
          : 'border-hairline/80 dark:border-[#3A3C39] hover:shadow-md'
      }`}
    >
      {/* 1. Header Meta Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted mb-4 pb-3 border-b border-hairline/40">
        <div className="flex items-center gap-3">
          {/* Star rating */}
          <div className="flex items-center gap-1 font-semibold text-ink">
            <span className="flex text-amber-500">
              {Array.from({ length: review.stars }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </span>
            <span>{review.stars} star</span>
          </div>

          <span className="text-hairline">•</span>
          <span className="font-semibold text-ink">{review.alias}</span>
          {review.version && (
            <>
              <span className="text-hairline">•</span>
              <span>v{review.version}</span>
            </>
          )}
          {review.date && (
            <>
              <span className="text-hairline">•</span>
              <span>{review.date}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {review.thumbs > 0 && (
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3 text-muted" />
              {review.thumbs}
            </span>
          )}

          {/* Theme Chips */}
          <div className="flex flex-wrap gap-1.5">
            {review.issues.map((iss, idx) => {
              const primaryTeam = review.teams[0]?.team || 'product-analyst';
              const col = TEAM_COLORS[primaryTeam];
              return (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    backgroundColor: `${col}18`,
                    color: col,
                    border: `1px solid ${col}66`,
                  }}
                >
                  {iss.theme.replace(/_/g, ' ')}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Review Quote */}
      <div className="mb-5">
        <blockquote className="font-heading text-lg sm:text-xl font-semibold leading-relaxed text-ink tracking-tight">
          “{renderHighlightedText(displayText)}”
        </blockquote>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpandedText(!expandedText)}
            className="text-xs font-semibold text-muted hover:text-ink mt-2 inline-flex items-center gap-1 underline underline-offset-4"
          >
            {expandedText ? 'Show less' : 'Read full review'}
            {expandedText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* 3. Team Blocks */}
      <div className="space-y-4">
        {review.teams.map((tObj) => {
          const tm = tObj.team;
          const isSelected = selectedTeam === null || selectedTeam === tm;
          const teamColor = TEAM_COLORS[tm];
          const st = teamStatuses[tm] || 'todo';
          const assigneeVal = teamAssignees[tm] || '';

          // If another team is filtered in sidebar, collapse this team block to single summary line
          if (!isSelected) {
            return (
              <div
                key={tm}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-canvas/40 border border-hairline/60 text-xs text-muted"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: teamColor }}
                  />
                  <span className="font-semibold text-ink">{TEAM_DISPLAY_NAMES[tm]}</span>
                </div>
                <span
                  className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: st === 'done' ? '#10b98120' : '#6b728020',
                    color: st === 'done' ? '#059669' : 'var(--muted)',
                  }}
                >
                  {st}
                </span>
              </div>
            );
          }

          // Full Team Block
          const teamIssues = review.issues.filter((iss) =>
            tObj.themes.includes(iss.theme)
          );

          return (
            <div
              key={tm}
              className="p-4 rounded-xl border border-hairline/60 bg-paper/90 relative"
              style={{ borderLeft: `4px solid ${teamColor}` }}
            >
              {/* Header inside team block */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-sm text-ink">
                    {TEAM_DISPLAY_NAMES[tm]}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {justUpdatedTeam === tm && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-pulse transition-all">
                      Saved ✓
                    </span>
                  )}
                  <StatusControl
                    team={tm}
                    currentStatus={st}
                    onChange={(newStatus) => handleStatusChange(tm, newStatus)}
                  />
                </div>
              </div>

              {/* Issues in this team block */}
              {teamIssues.map((iss, iIdx) => {
                const expKey = `${iss.theme}|${tm}`;
                const exp = experiments[expKey];

                return (
                  <div key={iIdx} className="space-y-2 text-sm text-ink mb-3 pb-3 border-b border-hairline/30 last:border-0 last:pb-0 last:mb-0">
                    <div>
                      <span className="font-semibold text-xs text-muted uppercase tracking-wider block mb-0.5">Problem</span>
                      <p className="font-medium text-ink leading-snug">{iss.problem}</p>
                    </div>

                    <div>
                      <span className="font-semibold text-xs text-muted uppercase tracking-wider block mb-0.5">Evidence</span>
                      <p className="text-xs italic text-muted font-sans bg-canvas/30 p-2 rounded border border-hairline/40">
                        “{iss.evidence}”
                      </p>
                    </div>

                    {exp && (
                      <div className="pt-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-semibold text-xs text-muted uppercase tracking-wider">Suggested Experiment</span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI-suggested
                          </span>
                        </div>
                        <p className="text-xs text-ink font-medium leading-relaxed">{exp.experiment}</p>
                        
                        <div className="mt-1.5 flex items-baseline gap-1.5 text-xs">
                          <span className="font-semibold text-muted text-[11px]">Metric to watch:</span>
                          <span className="font-bold underline decoration-dotted">{exp.metric}</span>
                          <span className="text-muted text-[11px]">({exp.metric_note})</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Assignee and Notes Row */}
              <div className="mt-3 pt-3 border-t border-hairline/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-muted">
                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-medium">Assignee:</span>
                  <input
                    type="text"
                    maxLength={40}
                    defaultValue={assigneeVal}
                    placeholder="Unassigned"
                    onBlur={(e) => handleAssigneeBlur(tm, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="h-7 px-2 rounded-lg bg-paper/60 dark:bg-black/20 border border-hairline/70 dark:border-white/10 focus:border-ink dark:focus:border-white/30 outline-none text-ink text-xs w-36 transition-all shadow-2xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setActiveNotesTeam(activeNotesTeam === tm ? null : tm)}
                  className="h-7 flex items-center gap-1.5 font-medium text-muted hover:text-ink transition-colors px-2.5 rounded-lg border border-hairline/60 dark:border-white/10 hover:bg-canvas/50 active:scale-95 shadow-2xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Notes ({notesCount[tm] || 0})</span>
                </button>
              </div>

              {/* Collapsible Notes Drawer */}
              {activeNotesTeam === tm && (
                <div className="mt-3 pt-3 border-t border-hairline/40 bg-canvas/20 -mx-4 -mb-4 p-4 rounded-b-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Team Discussion</h4>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto mb-3 pr-1">
                    {taskStore.getNotes(review.id, tm).map((note) => (
                      <div key={note.id} className="text-xs p-2.5 rounded bg-paper border border-hairline/60">
                        <div className="flex justify-between items-center text-[11px] text-muted mb-1">
                          <span className="font-semibold text-ink">{note.author || 'Anonymous'}</span>
                          <span>{new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-ink whitespace-pre-wrap">{note.body}</p>
                      </div>
                    ))}
                    {taskStore.getNotes(review.id, tm).length === 0 && (
                      <p className="text-xs italic text-muted">No notes yet. Add one below.</p>
                    )}
                  </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={500}
                        value={noteBody}
                        onChange={(e) => setNoteBody(e.target.value)}
                        placeholder="Add team note (max 500 chars)..."
                        className="flex-1 h-8 text-xs px-3 rounded-xl border border-hairline/80 dark:border-white/10 bg-paper/90 dark:bg-[#1a1c1b] text-ink dark:text-[#ECEAE5] outline-none focus:border-ink dark:focus:border-hairline placeholder:text-muted shadow-2xs transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddNote(tm);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNote(tm)}
                        disabled={!noteBody.trim()}
                        className="h-8 px-4 flex items-center justify-center rounded-xl text-xs font-semibold bg-ink text-paper hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all shadow-2xs flex-shrink-0"
                      >
                        Post
                      </button>
                    </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Segmented Progress Bar */}
      <ProgressBar teams={owningTeamIds} statuses={teamStatuses} />
    </article>
  );
};

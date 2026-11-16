import { describe, it, expect } from 'vitest';
import { TaskStoreManager } from '../store/TaskStore';

describe('TaskStoreManager Local Mode', () => {
  it('updates status optimistically and logs activity', async () => {
    const store = new TaskStoreManager(true);
    const revId = 'test_r_101';
    const team = 'product-analyst';

    expect(store.getStatus(revId, team)).toBe('todo');

    const ok = await store.setStatus(revId, team, 'working', 'Test User');
    expect(ok).toBe(true);
    expect(store.getStatus(revId, team)).toBe('working');

    const acts = store.getReviewActivities(revId);
    expect(acts.length).toBeGreaterThan(0);
    expect(acts[0].to_value).toBe('working');
  });

  it('updates assignee and adds notes', async () => {
    const store = new TaskStoreManager(true);
    const revId = 'test_r_102';
    const team = 'game-developer';

    await store.setAssignee(revId, team, 'Sarah P.', 'Test User');
    expect(store.getAssignee(revId, team)).toBe('Sarah P.');

    await store.addNote(revId, team, 'Working on bowling frame drops', 'Sarah P.');
    const notes = store.getNotes(revId, team);
    expect(notes.length).toBe(1);
    expect(notes[0].body).toBe('Working on bowling frame drops');
  });
});

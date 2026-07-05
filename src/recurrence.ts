import type { Task } from './types';

// Build the next occurrence of a recurring task (`before`, now due `nextDue`),
// carrying its subtasks over FRESH — reparented to the new occurrence, reset to
// "to do", renumbered after the parent, with comments/attachments cleared.
// Pure (ids come from `makeId`) so it can be unit-tested without the store.
// This is the fix for #20: completing a recurring task must not drop subtasks.
export function buildOccurrence(
  before: Task,
  subtasks: Task[],
  baseNum: number,
  nextDue: Date,
  now: Date,
  makeId: () => string,
): { parent: Task; subs: Task[] } {
  const parentId = makeId();
  const parent: Task = {
    ...before,
    id: parentId,
    number: baseNum,
    completed: false,
    completedAt: null,
    dueDate: nextDue,
    // Day/week-scoped commitments don't carry over to a future occurrence:
    // an inherited thisWeek pinned next month's instance into Next Week (#18).
    thisWeek: false,
    todayDate: null,
    createdAt: now,
    updatedAt: now,
    comments: [],
    attachments: [],
  };
  const subs = [...subtasks]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || +a.createdAt - +b.createdAt)
    .map((s, i) => ({
      ...s,
      id: makeId(),
      number: baseNum + 1 + i,
      parentId,
      completed: false,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      comments: [],
      attachments: [],
    }));
  return { parent, subs };
}

import type { Task, Member } from './types';

// Resolve a task's responsible member ids, tolerating the legacy single field.
export const taskAssigneeIds = (task: Task): string[] =>
  task.assigneeIds ?? (task.assigneeId ? [task.assigneeId] : []);

// Resolve a task's responsible members (in order, skipping unknown ids).
export const assigneesOf = (task: Task, members: Member[]): Member[] =>
  taskAssigneeIds(task)
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is Member => !!m);

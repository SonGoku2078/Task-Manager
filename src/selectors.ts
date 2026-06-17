import type { Task, UIState, Priority } from './types';

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const startOfDay = (d: Date) => {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isOverdue = (task: Task) =>
  !!task.dueDate && !task.completed && task.dueDate < startOfDay(new Date());

const matchesSearch = (task: Task, query: string) => {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return (
    task.title.toLowerCase().includes(q) ||
    task.description.toLowerCase().includes(q)
  );
};

const matchesFilters = (task: Task, ui: UIState) => {
  const f = ui.filters;
  if (f.projectId && task.projectId !== f.projectId) return false;
  if (f.categoryId && !task.categoryIds.includes(f.categoryId)) return false;
  if (f.priority && task.priority !== f.priority) return false;
  if (f.completed !== null && task.completed !== f.completed) return false;
  return true;
};

export const sortTasks = (tasks: Task[], ui: UIState): Task[] => {
  const { sortField, sortDir } = ui;
  if (sortField === 'manual') return tasks;
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'priority':
        cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        break;
      case 'dueDate': {
        const av = a.dueDate ? a.dueDate.getTime() : Infinity;
        const bv = b.dueDate ? b.dueDate.getTime() : Infinity;
        cmp = av - bv;
        break;
      }
      case 'title':
        cmp = a.title.localeCompare(b.title);
        break;
      case 'createdAt':
        cmp = a.createdAt.getTime() - b.createdAt.getTime();
        break;
    }
    return cmp * dir;
  });
};

// Tasks visible in the current main view, after view scoping + filters + search + sort.
export const selectVisibleTasks = (tasks: Task[], ui: UIState): Task[] => {
  let result = tasks;

  switch (ui.currentView) {
    case 'inbox':
      // Inbox = tasks not assigned to any project.
      result = result.filter((t) => !t.projectId);
      break;
    case 'priority':
      result = result.filter((t) => !t.completed && (t.starred || t.priority === 'high'));
      break;
    case 'projects':
      if (ui.selectedProjectId) {
        result = result.filter((t) => t.projectId === ui.selectedProjectId);
      }
      break;
    case 'today': {
      const now = new Date();
      // Today = due today (incl. completed) OR overdue and still open.
      result = result.filter(
        (t) => t.dueDate && (isSameDay(t.dueDate, now) || isOverdue(t))
      );
      break;
    }
    case 'search':
      // handled by search query below
      break;
    case 'calendar':
      result = result.filter(
        (t) => t.dueDate && isSameDay(t.dueDate, ui.currentDate)
      );
      break;
  }

  result = result.filter(
    (t) => matchesFilters(t, ui) && matchesSearch(t, ui.searchQuery)
  );

  return sortTasks(result, ui);
};

// Top non-completed tasks for the Priority list (starred & high priority first).
export const selectPriorityTasks = (tasks: Task[], limit = 5): Task[] => {
  return [...tasks]
    .filter((t) => !t.completed)
    .sort((a, b) => {
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      if (a.priority !== b.priority)
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      const av = a.dueDate ? a.dueDate.getTime() : Infinity;
      const bv = b.dueDate ? b.dueDate.getTime() : Infinity;
      return av - bv;
    })
    .slice(0, limit);
};

export const tasksOnDate = (tasks: Task[], date: Date): Task[] =>
  tasks.filter((t) => t.dueDate && isSameDay(t.dueDate, date));

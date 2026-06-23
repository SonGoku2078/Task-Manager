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

// Stable day key (YYYY-MM-DD) for set membership / multi-day selection.
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

export const isOverdue = (task: Task) =>
  !!task.dueDate && !task.completed && task.dueDate < startOfDay(new Date());

const matchesSearch = (task: Task, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  // Search by task number, with or without a leading "#".
  const numQ = q.replace(/^#/, '');
  if (/^\d+$/.test(numQ) && String(task.number) === numQ) return true;
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
  if (f.dueFrom || f.dueTo) {
    if (!task.dueDate) return false;
    const k = dateKey(task.dueDate);
    if (f.dueFrom && k < f.dueFrom) return false;
    if (f.dueTo && k > f.dueTo) return false;
  }
  return true;
};

export const sortTasks = (tasks: Task[], ui: UIState): Task[] => {
  const { sortField, sortDir } = ui;
  if (sortField === 'manual') return tasks;
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'number':
        cmp = a.number - b.number;
        break;
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
  // Subtasks are managed under their parent and hidden from flat lists —
  // except in search, where they must be findable.
  let result =
    ui.currentView === 'search' ? tasks : tasks.filter((t) => !t.parentId);

  switch (ui.currentView) {
    case 'inbox':
      // Inbox = tasks not assigned to any project.
      result = result.filter((t) => !t.projectId);
      break;
    case 'completed':
      result = result.filter((t) => t.completed);
      break;
    case 'priority':
      // Nozbe-style: open tasks that are overdue OR starred. Base order:
      // overdue first, then starred, then by due date.
      result = result
        .filter((t) => !t.completed && (t.starred || isOverdue(t)))
        .sort((a, b) => {
          const ao = isOverdue(a) ? 0 : 1;
          const bo = isOverdue(b) ? 0 : 1;
          if (ao !== bo) return ao - bo;
          if (a.starred !== b.starred) return a.starred ? -1 : 1;
          const ad = a.dueDate ? a.dueDate.getTime() : Infinity;
          const bd = b.dueDate ? b.dueDate.getTime() : Infinity;
          return ad - bd;
        });
      break;
    case 'projects':
      if (ui.selectedProjectId) {
        result = result.filter((t) => t.projectId === ui.selectedProjectId);
      }
      break;
    case 'today': {
      const now = new Date();
      // Today = the day's agenda (due today). Overdue lives in Priorität.
      result = result.filter((t) => t.dueDate && isSameDay(t.dueDate, now));
      break;
    }
    case 'search':
      // handled by search query below
      break;
    case 'calendar': {
      // Show tasks for all selected days (fallback to the anchor day).
      const keys = new Set(
        ui.selectedDates.length ? ui.selectedDates : [dateKey(ui.currentDate)]
      );
      result = result.filter((t) => t.dueDate && keys.has(dateKey(t.dueDate)));
      break;
    }
  }

  result = result.filter(
    (t) => matchesFilters(t, ui) && matchesSearch(t, ui.searchQuery)
  );

  return sortTasks(result, ui);
};

// Top non-completed tasks for the Priority list (starred & high priority first).
export const selectPriorityTasks = (tasks: Task[], limit = 5): Task[] => {
  return [...tasks]
    .filter((t) => !t.completed && !t.parentId)
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

// --- Week / calendar grid helpers ---------------------------------------

export const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  r.setHours(0, 0, 0, 0);
  return r;
};

// Monday-based start of the week containing `d`.
export const startOfWeek = (d: Date): Date => {
  const r = startOfDay(d);
  const offset = (r.getDay() + 6) % 7; // 0 = Monday
  return addDays(r, -offset);
};

// Seven consecutive days starting at `start`.
export const weekDays7 = (start: Date): Date[] =>
  Array.from({ length: 7 }, (_, i) => addDays(start, i));

// ISO-8601 week number (weeks start Monday; week 1 contains the first Thursday).
export const isoWeek = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // 0 = Monday
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 864e5));
};

// Reuse the main app's selector helpers, plus a few small mobile-specific
// composers for the 4 MVP views.
import type { Task } from './types';
import {
  selectPriorityTasks,
  isInNextWeekWindow,
  isOverdue,
  tasksOnDate,
  addDays,
  isSameDay,
  dateKey,
  startOfWeek,
  weekDays7,
} from '../../../src/selectors';

export { selectPriorityTasks, isInNextWeekWindow, isOverdue, tasksOnDate, addDays, isSameDay, dateKey, startOfWeek, weekDays7 };

const root = (t: Task) => !t.parentId; // hide subtasks from the flat mobile lists

// Inbox: open tasks with no project.
export const mobileInbox = (tasks: Task[]): Task[] =>
  tasks.filter((t) => root(t) && !t.completed && !t.projectId);

// Next Action: top-5 by ⭐ > priority > due date.
export const mobileNextAction = (tasks: Task[]): Task[] =>
  selectPriorityTasks(tasks.filter(root), 5);

export interface NextWeekGroup {
  key: 'today' | 'tomorrow' | 'week' | 'future';
  label: string;
  tasks: Task[];
}

// Next Week: open tasks due within the next 7 days (or flagged thisWeek),
// grouped Today / Tomorrow / This Week / Future, each sorted by due date.
export const mobileNextWeek = (tasks: Task[]): NextWeekGroup[] => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);

  const relevant = tasks.filter((t) => {
    if (!root(t) || t.completed) return false;
    if (t.dueDate && t.dueDate <= weekEnd) return true;
    return isInNextWeekWindow(t) || t.thisWeek === true;
  });

  const byDue = (a: Task, b: Task) =>
    (a.dueDate ? +a.dueDate : Infinity) - (b.dueDate ? +b.dueDate : Infinity);

  const groups: NextWeekGroup[] = [
    { key: 'today', label: 'Heute', tasks: [] },
    { key: 'tomorrow', label: 'Morgen', tasks: [] },
    { key: 'week', label: 'Diese Woche', tasks: [] },
    { key: 'future', label: 'Ohne Datum / später', tasks: [] },
  ];

  for (const t of relevant) {
    if (t.dueDate && isSameDay(t.dueDate, today)) groups[0].tasks.push(t);
    else if (t.dueDate && isSameDay(t.dueDate, tomorrow)) groups[1].tasks.push(t);
    else if (t.dueDate && t.dueDate <= weekEnd) groups[2].tasks.push(t);
    else groups[3].tasks.push(t);
  }
  for (const g of groups) g.tasks.sort(byDue);
  return groups.filter((g) => g.tasks.length > 0);
};

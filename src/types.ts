export type Priority = 'low' | 'medium' | 'high';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export type ViewType =
  | 'inbox'
  | 'priority'
  | 'projects'
  | 'categories'
  | 'calendar'
  | 'today'
  | 'week'
  | 'search';

export type SortField = 'manual' | 'priority' | 'dueDate' | 'title' | 'createdAt';
export type SortDir = 'asc' | 'desc';

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string | null;
  dueDate: Date | null;
  priority: Priority;
  categoryIds: string[];
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  starred: boolean;
  recurrence: RecurrenceType;
  recurrenceEnd?: Date | null;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Filters {
  projectId: string | null;
  categoryId: string | null;
  priority: Priority | null;
  completed: boolean | null; // null = both, false = open, true = done
}

export interface UIState {
  selectedTaskId: string | null;
  selectedProjectId: string | null;
  currentView: ViewType;
  currentDate: Date;
  searchQuery: string;
  filters: Filters;
  sortField: SortField;
  sortDir: SortDir;
}

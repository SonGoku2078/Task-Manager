export type Priority = 'low' | 'medium' | 'high';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';
export type Theme = 'light' | 'dark';
export type MemberRole = 'admin' | 'editor' | 'viewer';

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  color: string;
}

export interface Settings {
  userName: string;
  theme: Theme;
}

export type ViewType =
  | 'inbox'
  | 'priority'
  | 'projects'
  | 'categories'
  | 'calendar'
  | 'today'
  | 'week'
  | 'search'
  | 'custom'
  | 'templates'
  | 'activity'
  | 'completed'
  | 'reports'
  | 'settings';

export type SortField = 'manual' | 'priority' | 'dueDate' | 'title' | 'createdAt';
export type SortDir = 'asc' | 'desc';

// Which contextual secondary panel is open. When not 'none', the sidebar collapses to icons.
export type SidePanel = 'none' | 'projects' | 'calendar';

export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  url?: string; // server-hosted URL (used after backend migration; local uses dataUrl)
}

export interface Task {
  id: string;
  number: number; // human-friendly sequential id (#N), stable, used in share URLs
  title: string;
  description: string;
  projectId: string | null;
  parentId?: string | null; // set for subtasks; root tasks are null/undefined
  dueDate: Date | null;
  priority: Priority;
  categoryIds: string[];
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  starred: boolean;
  recurrence: RecurrenceType;
  recurrenceEnd?: Date | null;
  comments?: Comment[];
  assigneeId?: string | null;
  attachments?: Attachment[];
}

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  label?: string; // optional grouping label (e.g. "Arbeit", "Privat")
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export type ActivityKind =
  | 'created'
  | 'updated'
  | 'completed'
  | 'reopened'
  | 'deleted'
  | 'comment'
  | 'attachment'
  | 'subtask'
  | 'project-created';

export interface ActivityEntry {
  id: string;
  at: Date;
  actor: string;
  kind: ActivityKind;
  taskId?: string; // present for task-related entries (enables grouping + open)
  taskNumber?: number;
  taskTitle: string; // task title or project name
  field?: string; // for 'updated': which field changed
  from?: string; // human-readable previous value
  to?: string; // human-readable new value
}

export interface Filters {
  projectId: string | null;
  categoryId: string | null;
  priority: Priority | null;
  completed: boolean | null; // null = both, false = open, true = done
  dueFrom: string | null; // YYYY-MM-DD inclusive lower bound on dueDate
  dueTo: string | null; // YYYY-MM-DD inclusive upper bound on dueDate
}

export interface SavedView {
  id: string;
  name: string;
  filters: Filters;
  sortField: SortField;
  sortDir: SortDir;
  searchQuery: string;
}

export interface UIState {
  selectedTaskId: string | null;
  selectedProjectId: string | null;
  currentView: ViewType;
  currentDate: Date;
  selectedDates: string[]; // multi-day calendar selection (YYYY-MM-DD keys)
  searchQuery: string;
  filters: Filters;
  sortField: SortField;
  sortDir: SortDir;
  activeSavedViewId: string | null;
  sidePanel: SidePanel;
}

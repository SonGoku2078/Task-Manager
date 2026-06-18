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
}

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

export type ActivityAction =
  | 'created'
  | 'completed'
  | 'reopened'
  | 'deleted'
  | 'project-created';

export interface ActivityEntry {
  id: string;
  at: Date;
  action: ActivityAction;
  subject: string;
  actor: string;
}

export interface Filters {
  projectId: string | null;
  categoryId: string | null;
  priority: Priority | null;
  completed: boolean | null; // null = both, false = open, true = done
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
  searchQuery: string;
  filters: Filters;
  sortField: SortField;
  sortDir: SortDir;
  activeSavedViewId: string | null;
  sidePanel: SidePanel;
}

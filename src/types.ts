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

export interface NozbeConnection {
  token: string;
  clientId: string;
  syncCompleted: boolean; // write completion changes back to Nozbe
}

export type ProjectSort = 'manual' | 'name' | 'color';

// Calendar main-area display mode: classic day/list, a Mon–Sun week grid,
// or a rolling 7-day window (today + the next 6 days).
export type CalendarMode = 'list' | 'week' | 'rolling';

export interface Settings {
  userName: string;
  theme: Theme;
  nozbe?: NozbeConnection; // present when connected to a Nozbe account
  addToTop?: boolean; // quick-add: insert new tasks at the top of the list
  projectSort?: ProjectSort; // ordering of the projects panel
  projectsPanelWidth?: number; // user-resized width of the projects panel (px)
  detailPanelWidth?: number; // user-resized width of the task detail panel (px)
  calendarMode?: CalendarMode; // how the calendar main area is shown
  calendarStartHour?: number; // first hour shown in the week grid (0–23)
  calendarEndHour?: number; // last hour shown in the week grid (1–24)
  calendarMonthCount?: number; // months stacked in the month panel (1 or 2)
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

export type SortField =
  | 'manual'
  | 'number'
  | 'priority'
  | 'dueDate'
  | 'title'
  | 'createdAt';
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
  nozbeId?: string; // source id when imported from Nozbe (traceability / re-import)
}

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  label?: string; // optional grouping label (e.g. "Arbeit", "Privat")
  pinned?: boolean; // user-marked "active" project: floats to the top, others dim
  nozbeId?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  nozbeId?: string;
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

export type Priority = 'low' | 'medium' | 'high';
export type RecurrenceType =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';
export type RecurUnit = 'day' | 'week' | 'month' | 'year';
// For month-based recurrence: keep the same date, or snap to the 1st / last day.
export type RecurMonthDay = 'date' | 'first' | 'last';
export type Theme = 'light' | 'dark';
export type MemberRole = 'admin' | 'editor' | 'viewer';

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  color: string;
  avatarUrl?: string; // uploaded profile image as a data URL (falls back to initials)
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
  calendarHourHeight?: number; // px per hour in the week grid (zoom: 24–160)
  navOrder?: ViewType[]; // user-defined order of the main sidebar menus
  colorPalette?: string[]; // project color swatches
  colorLabels?: Record<string, string>; // hex → label name (e.g. '#9c27b0' → 'Lifestyle')
  filtersCollapsed?: boolean; // collapse the filter bar to save vertical space
  sectionsCollapsed?: boolean; // collapse the Gruppen/Sektionen jump-bar
}

export type ViewType =
  | 'inbox'
  | 'priority'
  | 'projects'
  | 'categories'
  | 'calendar'
  | 'today'
  | 'week'
  | 'someday'
  | 'nextweek'
  | 'search'
  | 'custom'
  | 'templates'
  | 'activity'
  | 'completed'
  | 'reports'
  | 'members'
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
export type SidePanel = 'none' | 'projects' | 'calendar' | 'someday';

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

// A reference from one task to another task or to a project.
export interface TaskLink {
  type: 'task' | 'project';
  id: string;
}

export interface Task {
  id: string;
  number: number; // human-friendly sequential id (#N), stable, used in share URLs
  title: string;
  description: string;
  projectId: string | null;
  parentId?: string | null; // set for subtasks; root tasks are null/undefined
  dueDate: Date | null;
  // Time-of-day scheduling within dueDate's day. null/undefined = no time
  // (task sits in the day's "ohne Zeit" slot); a number = minutes from midnight
  // (task is positioned on the week-view time axis).
  startMinutes?: number | null;
  durationMin?: number | null; // block length in minutes (default 60 when timed)
  priority: Priority;
  categoryIds: string[];
  completed: boolean;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  starred: boolean;
  recurrence: RecurrenceType;
  recurrenceEnd?: Date | null;
  // Custom recurrence: repeat every `recurInterval` `recurUnit`s. `recurMonthDay`
  // applies when recurring by month (keep date / 1st / last day of month).
  recurInterval?: number;
  recurUnit?: RecurUnit;
  recurMonthDay?: RecurMonthDay;
  sectionId?: string | null; // optional grouping inside a project (null = ungrouped)
  someday?: boolean; // GTD: parked as "someday/maybe" (shown in the Someday view)
  thisWeek?: boolean; // GTD: committed for the current week (shown in Next Week)
  waiting?: boolean; // GTD: waiting on someone else
  waitingFor?: string | null; // free-text name of the person being waited on
  // GTD: manually pinned to "Heute". Holds the local dateKey (YYYY-MM-DD) of the
  // day it was set; only active while todayDate === today, expires overnight.
  todayDate?: string | null;
  comments?: Comment[];
  links?: TaskLink[]; // references to other tasks or projects (e.g. "see project X")
  assigneeId?: string | null; // deprecated single assignee (migrated to assigneeIds)
  assigneeIds?: string[]; // responsible members; defaults to [self member 'u-me']
  attachments?: Attachment[];
  nozbeId?: string; // source id when imported from Nozbe (traceability / re-import)
  linkedProjectId?: string | null; // project-reference task: this task represents another project as a dependency
  sortOrder?: number; // manual ordering (also orders subtasks within a parent)
}

// A user-defined group within a project to bundle tasks (e.g. "Vorbereitung").
export interface Section {
  id: string;
  // Scope a section belongs to: either a project id (e.g. "p-work") or a
  // view key (e.g. "view:priority", "view:today", "view:nextweek", "view:someday").
  scope: string;
  name: string;
  sortOrder?: number; // display order within its scope (persisted; drag to change)
}

export type ProjectKind = 'project' | 'area';

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  label?: string; // optional grouping label (e.g. "Arbeit", "Privat")
  pinned?: boolean; // user-marked "active" project: floats to the top, others dim
  active?: boolean; // GTD: active (under Projekte) vs inactive/someday. undefined = active
  kind?: ProjectKind; // 'area' = ongoing responsibility (e.g. Finanzen); undefined = project
  description?: string;
  nozbeId?: string;
  parentAreaId?: string | null; // if set: this project is grouped under this area
  archived?: boolean; // project is finished/closed → hidden from active + someday, shown in Archiv
}

// A recurring weekly time block reserved for a project (e.g. Mo–Mi 8–12 Projekt A).
export interface ProjectBlocker {
  id: string;
  projectId: string;
  weekdays: number[]; // 0 = Monday … 6 = Sunday
  startMinutes: number; // minutes from midnight
  durationMin: number;
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
  // For 'deleted': snapshot of the removed task (+ its subtasks) to enable restore.
  payload?: { task: Task; subtasks: Task[] };
}

export interface Filters {
  projectId: string | null;
  categoryId: string | null;
  priority: Priority | null;
  completed: boolean | null; // null = both, false = open, true = done
  dueFrom: string | null; // YYYY-MM-DD inclusive lower bound on dueDate
  dueTo: string | null; // YYYY-MM-DD inclusive upper bound on dueDate
  assigneeId?: string | null; // filter by responsible member
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
  editTitleTaskId: string | null; // task whose title should auto-focus for editing
  selectedProjectId: string | null;
  selectedProjectIds: string[]; // multi-project selection (combined task list)
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

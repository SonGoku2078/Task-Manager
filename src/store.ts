import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Task,
  Project,
  Category,
  UIState,
  Filters,
  SortField,
  ViewType,
  SidePanel,
  SavedView,
  ActivityEntry,
  ActivityKind,
  Member,
  MemberRole,
  Settings,
  Theme,
  Attachment,
  ProjectSort,
} from './types';
import { dummyTasks, defaultProjects, defaultCategories } from './dummyData';
import type { ProjectTemplate } from './templates';
import { pushNozbeCompleted, type MappedImport } from './nozbe';

const DATE_KEYS = new Set([
  'dueDate',
  'createdAt',
  'updatedAt',
  'recurrenceEnd',
  'currentDate',
  'at',
]);

// Revive ISO date strings back into Date objects when loading from storage.
const dateReviver = (key: string, value: unknown) => {
  if (DATE_KEYS.has(key) && typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return value;
};

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

const ACTIVITY_CAP = 500;

// Build a task-related activity entry (created/updated/completed/comment/…).
const taskEntry = (
  kind: ActivityKind,
  task: Pick<Task, 'id' | 'number' | 'title'>,
  actor: string,
  extra: { field?: string; from?: string; to?: string } = {}
): ActivityEntry => ({
  id: uid('act'),
  at: new Date(),
  actor,
  kind,
  taskId: task.id,
  taskNumber: task.number,
  taskTitle: task.title,
  ...extra,
});

// Build a non-task entry (e.g. project-created).
const plainEntry = (
  kind: ActivityKind,
  subject: string,
  actor: string
): ActivityEntry => ({
  id: uid('act'),
  at: new Date(),
  actor,
  kind,
  taskTitle: subject,
});

// Append an entry, keeping only the most recent ACTIVITY_CAP.
const pushLog = (log: ActivityEntry[], entry: ActivityEntry): ActivityEntry[] =>
  [entry, ...log].slice(0, ACTIVITY_CAP);

// Coalesce consecutive edits of the SAME field on the SAME task into one entry
// (keeping the original `from`, updating `to`) so a burst of keystrokes shows up
// as a single net change instead of one entry per keystroke.
const mergeOrPush = (
  log: ActivityEntry[],
  entry: ActivityEntry
): ActivityEntry[] => {
  const top = log[0];
  if (
    entry.kind === 'updated' &&
    top &&
    top.kind === 'updated' &&
    top.taskId === entry.taskId &&
    top.field === entry.field
  ) {
    return [{ ...top, to: entry.to, at: entry.at }, ...log.slice(1)];
  }
  return pushLog(log, entry);
};

// Human-readable representation of a field value for the change log.
const fmtVal = (
  field: string,
  value: unknown,
  ctx: { projects: Project[]; categories: Category[]; members: Member[] }
): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'dueDate' || field === 'recurrenceEnd') {
    const d = value as Date;
    return d instanceof Date && !isNaN(d.getTime())
      ? d.toLocaleDateString('de-DE')
      : '—';
  }
  if (field === 'projectId') {
    return ctx.projects.find((p) => p.id === value)?.name ?? '—';
  }
  if (field === 'assigneeId') {
    return ctx.members.find((m) => m.id === value)?.name ?? '—';
  }
  if (field === 'categoryIds') {
    const ids = value as string[];
    if (!ids.length) return '—';
    return ids
      .map((id) => ctx.categories.find((c) => c.id === id)?.name ?? id)
      .join(', ');
  }
  if (field === 'priority') {
    return { low: 'Niedrig', medium: 'Mittel', high: 'Hoch' }[value as string] ?? String(value);
  }
  if (typeof value === 'boolean') return value ? 'ja' : 'nein';
  return String(value);
};

// Fields whose changes are recorded in the activity log, with German labels.
const TRACKED_FIELDS: { key: keyof Task; label: string }[] = [
  { key: 'title', label: 'Titel' },
  { key: 'description', label: 'Beschreibung' },
  { key: 'dueDate', label: 'Fälligkeit' },
  { key: 'priority', label: 'Priorität' },
  { key: 'projectId', label: 'Projekt' },
  { key: 'categoryIds', label: 'Kategorien' },
  { key: 'starred', label: 'Markierung' },
  { key: 'recurrence', label: 'Wiederholung' },
  { key: 'assigneeId', label: 'Zuweisung' },
];

const sameValue = (a: unknown, b: unknown): boolean => {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => v === b[i]);
  return a === b;
};

// Advance a date by one recurrence step.
const nextRecurrence = (date: Date, type: Task['recurrence']): Date => {
  const d = new Date(date);
  switch (type) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
};

const defaultUIState: UIState = {
  selectedTaskId: null,
  selectedProjectId: null,
  currentView: 'inbox',
  currentDate: new Date(),
  selectedDates: [],
  searchQuery: '',
  filters: {
    projectId: null,
    categoryId: null,
    priority: null,
    completed: null,
    dueFrom: null,
    dueTo: null,
  },
  sortField: 'manual',
  sortDir: 'asc',
  activeSavedViewId: null,
  sidePanel: 'none',
};

const defaultSettings: Settings = {
  userName: 'Du',
  theme: 'light',
};

export interface NewTaskInput {
  title: string;
  description?: string;
  projectId?: string | null;
  parentId?: string | null;
  dueDate?: Date | null;
  priority?: Task['priority'];
  categoryIds?: string[];
  starred?: boolean;
  recurrence?: Task['recurrence'];
}

interface AppState {
  tasks: Task[];
  projects: Project[];
  categories: Category[];
  savedViews: SavedView[];
  activityLog: ActivityEntry[];
  members: Member[];
  settings: Settings;
  nextTaskNumber: number;
  ui: UIState;

  // Task CRUD
  addTask: (input: NewTaskInput) => Task;
  addSubtask: (parentId: string, title: string) => Task | null;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  toggleStar: (id: string) => void;
  addComment: (taskId: string, text: string) => void;
  deleteComment: (taskId: string, commentId: string) => void;
  addAttachment: (taskId: string, attachment: Attachment) => void;
  deleteAttachment: (taskId: string, attachmentId: string) => void;

  // Bulk operations
  bulkUpdate: (ids: string[], updates: Partial<Task>) => void;
  bulkDelete: (ids: string[]) => void;

  // Manual ordering (drag & drop)
  reorderTasks: (draggedId: string, targetId: string) => void;
  reorderProjects: (draggedId: string, targetId: string) => void;

  // Wipe all local tasks + projects + categories (fresh start / clean re-import).
  clearAll: () => void;

  // Import: replace tasks/projects/categories with mapped Nozbe data.
  replaceWithNozbe: (data: MappedImport) => {
    projects: number;
    categories: number;
    tasks: number;
  };

  // Project CRUD
  addProject: (name: string, color?: string, icon?: string) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  toggleProjectPinned: (id: string) => void;

  createProjectFromTemplate: (template: ProjectTemplate) => Project;

  // Category CRUD
  addCategory: (name: string, color?: string) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // UI
  selectTask: (id: string | null) => void;
  selectProject: (id: string | null) => void;
  setView: (view: ViewType) => void;
  setSidePanel: (panel: SidePanel) => void;
  setCurrentDate: (date: Date) => void;
  setSelectedDates: (dates: string[]) => void;
  setSearchQuery: (q: string) => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  setSort: (field: SortField, dir?: UIState['sortDir']) => void;

  // Saved (custom) views
  addSavedView: (name: string) => SavedView;
  deleteSavedView: (id: string) => void;
  applySavedView: (id: string) => void;

  // Team (local) + settings
  addMember: (name: string, role?: MemberRole) => Member;
  updateMember: (id: string, updates: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  setUserName: (name: string) => void;
  setTheme: (theme: Theme) => void;
  setAddToTop: (v: boolean) => void;
  setProjectSort: (sort: ProjectSort) => void;
  setProjectsPanelWidth: (px: number) => void;

  // Nozbe connection + live sync
  connectNozbe: (token: string, clientId: string) => void;
  disconnectNozbe: () => void;
  setNozbeSync: (enabled: boolean) => void;
}

// Fire-and-forget: push a completion change to Nozbe if connected + sync enabled.
const syncCompletion = (state: AppState, task: Task, completed: boolean) => {
  const nz = state.settings.nozbe;
  if (nz?.syncCompleted && nz.token && nz.clientId && task.nozbeId) {
    void pushNozbeCompleted(nz.token, nz.clientId, task.nozbeId, completed).catch(
      (e) => console.warn('Nozbe-Sync fehlgeschlagen:', e)
    );
  }
};

const PROJECT_COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4'];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: dummyTasks,
      projects: defaultProjects,
      categories: defaultCategories,
      savedViews: [],
      activityLog: [],
      members: [],
      settings: defaultSettings,
      nextTaskNumber: dummyTasks.length + 1,
      ui: defaultUIState,

      addTask: (input) => {
        const now = new Date();
        const number = get().nextTaskNumber;
        const task: Task = {
          id: uid('task'),
          number,
          title: input.title,
          description: input.description ?? '',
          projectId: input.projectId ?? null,
          parentId: input.parentId ?? null,
          dueDate: input.dueDate ?? null,
          priority: input.priority ?? 'medium',
          categoryIds: input.categoryIds ?? [],
          completed: false,
          createdAt: now,
          updatedAt: now,
          starred: input.starred ?? false,
          recurrence: input.recurrence ?? 'none',
          recurrenceEnd: null,
        };
        set((state) => ({
          // Honour the quick-add direction toggle: prepend or append.
          tasks: state.settings.addToTop
            ? [task, ...state.tasks]
            : [...state.tasks, task],
          nextTaskNumber: state.nextTaskNumber + 1,
          activityLog: pushLog(
            state.activityLog,
            taskEntry('created', task, state.settings.userName)
          ),
        }));
        return task;
      },

      addSubtask: (parentId, title) => {
        const parent = get().tasks.find((t) => t.id === parentId);
        if (!parent) return null;
        const task = get().addTask({
          title,
          parentId,
          projectId: parent.projectId,
        });
        set((state) => ({
          activityLog: pushLog(
            state.activityLog,
            taskEntry('subtask', parent, state.settings.userName, { to: title })
          ),
        }));
        return task;
      },

      updateTask: (id, updates) =>
        set((state) => {
          const before = state.tasks.find((t) => t.id === id);
          const tasks = state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
          );
          let activityLog = state.activityLog;
          if (before) {
            const after = { ...before, ...updates };
            const ctx = {
              projects: state.projects,
              categories: state.categories,
              members: state.members,
            };
            const entries = TRACKED_FIELDS.filter(
              (f) => f.key in updates && !sameValue(before[f.key], after[f.key])
            ).map((f) =>
              taskEntry('updated', after, state.settings.userName, {
                field: f.label,
                from: fmtVal(f.key, before[f.key], ctx),
                to: fmtVal(f.key, after[f.key], ctx),
              })
            );
            for (const e of entries) activityLog = mergeOrPush(activityLog, e);
          }
          return { tasks, activityLog };
        }),

      deleteTask: (id) =>
        set((state) => {
          // Cascade: remove the task and all of its descendant subtasks.
          const toRemove = new Set<string>();
          const collect = (pid: string) => {
            toRemove.add(pid);
            state.tasks
              .filter((t) => t.parentId === pid)
              .forEach((c) => collect(c.id));
          };
          collect(id);
          const removed = state.tasks.find((t) => t.id === id);
          return {
            tasks: state.tasks.filter((t) => !toRemove.has(t.id)),
            activityLog: removed
              ? pushLog(
                  state.activityLog,
                  taskEntry('deleted', removed, state.settings.userName)
                )
              : state.activityLog,
            ui:
              state.ui.selectedTaskId && toRemove.has(state.ui.selectedTaskId)
                ? { ...state.ui, selectedTaskId: null }
                : state.ui,
          };
        }),

      toggleTask: (id) => {
        const before = get().tasks.find((t) => t.id === id);
        set((state) => {
          const target = state.tasks.find((t) => t.id === id);
          if (!target) return {};
          const completing = !target.completed;
          const tasks = state.tasks.map((t) =>
            t.id === id ? { ...t, completed: completing, updatedAt: new Date() } : t
          );
          const activityLog = pushLog(
            state.activityLog,
            taskEntry(
              completing ? 'completed' : 'reopened',
              target,
              state.settings.userName
            )
          );

          // Recurring task: spawn the next occurrence when completed.
          let nextTaskNumber = state.nextTaskNumber;
          if (
            completing &&
            target.recurrence !== 'none' &&
            target.dueDate
          ) {
            const nextDue = nextRecurrence(target.dueDate, target.recurrence);
            const withinRange =
              !target.recurrenceEnd || nextDue <= target.recurrenceEnd;
            if (withinRange) {
              const now = new Date();
              tasks.push({
                ...target,
                id: uid('task'),
                number: nextTaskNumber,
                completed: false,
                dueDate: nextDue,
                createdAt: now,
                updatedAt: now,
                comments: [],
                attachments: [],
              });
              nextTaskNumber += 1;
            }
          }
          return { tasks, activityLog, nextTaskNumber };
        });
        // Write the completion change back to Nozbe (if connected + enabled).
        if (before) syncCompletion(get(), before, !before.completed);
      },

      toggleStar: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, starred: !t.starred, updatedAt: new Date() } : t
          ),
        })),

      addComment: (taskId, text) =>
        set((state) => {
          const target = state.tasks.find((t) => t.id === taskId);
          return {
            tasks: state.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    comments: [
                      ...(t.comments ?? []),
                      {
                        id: uid('cmt'),
                        text,
                        author: state.settings.userName,
                        createdAt: new Date(),
                      },
                    ],
                  }
                : t
            ),
            activityLog: target
              ? pushLog(
                  state.activityLog,
                  taskEntry('comment', target, state.settings.userName, { to: text })
                )
              : state.activityLog,
          };
        }),

      deleteComment: (taskId, commentId) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, comments: (t.comments ?? []).filter((c) => c.id !== commentId) }
              : t
          ),
        })),

      addAttachment: (taskId, attachment) =>
        set((state) => {
          const target = state.tasks.find((t) => t.id === taskId);
          return {
            tasks: state.tasks.map((t) =>
              t.id === taskId
                ? { ...t, attachments: [...(t.attachments ?? []), attachment] }
                : t
            ),
            activityLog: target
              ? pushLog(
                  state.activityLog,
                  taskEntry('attachment', target, state.settings.userName, {
                    to: attachment.name,
                  })
                )
              : state.activityLog,
          };
        }),

      deleteAttachment: (taskId, attachmentId) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  attachments: (t.attachments ?? []).filter(
                    (a) => a.id !== attachmentId
                  ),
                }
              : t
          ),
        })),

      bulkUpdate: (ids, updates) => {
        const idSet = new Set(ids);
        set((state) => ({
          tasks: state.tasks.map((t) =>
            idSet.has(t.id) ? { ...t, ...updates, updatedAt: new Date() } : t
          ),
        }));
        // Sync bulk completion changes to Nozbe.
        if (updates.completed !== undefined) {
          const s = get();
          s.tasks
            .filter((t) => idSet.has(t.id) && t.nozbeId)
            .forEach((t) => syncCompletion(s, t, updates.completed as boolean));
        }
      },

      bulkDelete: (ids) =>
        set((state) => {
          const idSet = new Set(ids);
          return {
            tasks: state.tasks.filter((t) => !idSet.has(t.id)),
            ui:
              state.ui.selectedTaskId && idSet.has(state.ui.selectedTaskId)
                ? { ...state.ui, selectedTaskId: null }
                : state.ui,
          };
        }),

      // Move dragged task to the position of target (drop-before). Forces manual sort
      // so the new order is actually shown.
      reorderTasks: (draggedId, targetId) =>
        set((state) => {
          if (draggedId === targetId) return {};
          const list = [...state.tasks];
          const from = list.findIndex((t) => t.id === draggedId);
          const to = list.findIndex((t) => t.id === targetId);
          if (from === -1 || to === -1) return {};
          const [moved] = list.splice(from, 1);
          const insertAt = list.findIndex((t) => t.id === targetId);
          list.splice(insertAt, 0, moved);
          return {
            tasks: list,
            ui: { ...state.ui, sortField: 'manual' as SortField },
          };
        }),

      reorderProjects: (draggedId, targetId) =>
        set((state) => {
          if (draggedId === targetId) return {};
          const list = [...state.projects];
          const from = list.findIndex((p) => p.id === draggedId);
          const to = list.findIndex((p) => p.id === targetId);
          if (from === -1 || to === -1) return {};
          const [moved] = list.splice(from, 1);
          const insertAt = list.findIndex((p) => p.id === targetId);
          list.splice(insertAt, 0, moved);
          return {
            projects: list,
            settings: { ...state.settings, projectSort: 'manual' as ProjectSort },
          };
        }),

      clearAll: () =>
        set((state) => ({
          tasks: [],
          projects: [],
          categories: [],
          nextTaskNumber: 1,
          activityLog: [
            plainEntry(
              'deleted',
              'Alle Aufgaben, Projekte und Kategorien gelöscht',
              state.settings.userName
            ),
          ],
          ui: {
            ...state.ui,
            selectedTaskId: null,
            selectedProjectId: null,
            sidePanel: 'none',
            currentView: 'inbox',
          },
        })),

      replaceWithNozbe: (data) => {
        const tasks = data.tasks.map((t, i) => ({ ...t, number: i + 1 }));
        set((state) => ({
          tasks,
          projects: data.projects,
          categories: data.categories,
          nextTaskNumber: tasks.length + 1,
          activityLog: [
            plainEntry(
              'created',
              `Nozbe-Import: ${tasks.length} Aufgaben, ${data.projects.length} Projekte, ${data.categories.length} Kategorien`,
              state.settings.userName
            ),
          ],
          ui: {
            ...state.ui,
            selectedTaskId: null,
            selectedProjectId: null,
            sidePanel: 'none',
            currentView: 'inbox',
          },
        }));
        return {
          projects: data.projects.length,
          categories: data.categories.length,
          tasks: tasks.length,
        };
      },

      addProject: (name, color, icon) => {
        const project: Project = {
          id: uid('proj'),
          name,
          color: color ?? PROJECT_COLORS[get().projects.length % PROJECT_COLORS.length],
          icon: icon ?? '📁',
        };
        set((state) => ({
          // New projects appear at the top of the list.
          projects: [project, ...state.projects],
          activityLog: pushLog(
            state.activityLog,
            plainEntry('project-created', project.name, state.settings.userName)
          ),
        }));
        return project;
      },

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      toggleProjectPinned: (id) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, pinned: !p.pinned } : p
          ),
        })),

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          // Orphan tasks fall back to inbox (no project).
          tasks: state.tasks.map((t) =>
            t.projectId === id ? { ...t, projectId: null } : t
          ),
          ui:
            state.ui.selectedProjectId === id
              ? { ...state.ui, selectedProjectId: null }
              : state.ui,
        })),

      createProjectFromTemplate: (template) => {
        const project: Project = {
          id: uid('proj'),
          name: template.name,
          color: template.color,
          icon: template.icon,
        };
        const now = new Date();
        const startNumber = get().nextTaskNumber;
        const tasks: Task[] = template.tasks.map((t, i) => ({
          id: uid('task'),
          number: startNumber + i,
          title: t.title,
          description: '',
          projectId: project.id,
          parentId: null,
          dueDate: null,
          priority: t.priority ?? 'medium',
          categoryIds: [],
          completed: false,
          // Stagger createdAt so template order is preserved under createdAt sort.
          createdAt: new Date(now.getTime() + i),
          updatedAt: now,
          starred: false,
          recurrence: 'none',
          recurrenceEnd: null,
        }));
        set((state) => ({
          projects: [...state.projects, project],
          tasks: [...state.tasks, ...tasks],
          nextTaskNumber: state.nextTaskNumber + tasks.length,
          activityLog: pushLog(
            state.activityLog,
            plainEntry('project-created', project.name, state.settings.userName)
          ),
        }));
        return project;
      },

      addCategory: (name, color) => {
        const category: Category = {
          id: uid('cat'),
          name,
          color: color ?? PROJECT_COLORS[get().categories.length % PROJECT_COLORS.length],
        };
        set((state) => ({ categories: [...state.categories, category] }));
        return category;
      },

      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          tasks: state.tasks.map((t) =>
            t.categoryIds.includes(id)
              ? { ...t, categoryIds: t.categoryIds.filter((c) => c !== id) }
              : t
          ),
        })),

      selectTask: (id) =>
        set((state) => ({ ui: { ...state.ui, selectedTaskId: id } })),

      selectProject: (id) =>
        set((state) => ({ ui: { ...state.ui, selectedProjectId: id } })),

      setView: (view) =>
        set((state) => ({
          ui: {
            ...state.ui,
            currentView: view,
            // Search query is scoped to the search view.
            searchQuery: view === 'search' ? state.ui.searchQuery : '',
            // Leaving a saved view clears the active marker.
            activeSavedViewId: view === 'custom' ? state.ui.activeSavedViewId : null,
          },
        })),

      setSidePanel: (panel) =>
        set((state) => ({ ui: { ...state.ui, sidePanel: panel } })),

      setCurrentDate: (date) =>
        set((state) => ({ ui: { ...state.ui, currentDate: date } })),

      setSelectedDates: (dates) =>
        set((state) => ({ ui: { ...state.ui, selectedDates: dates } })),

      setSearchQuery: (q) => set((state) => ({ ui: { ...state.ui, searchQuery: q } })),

      setFilter: (key, value) =>
        set((state) => ({
          ui: { ...state.ui, filters: { ...state.ui.filters, [key]: value } },
        })),

      resetFilters: () =>
        set((state) => ({
          ui: { ...state.ui, filters: { ...defaultUIState.filters } },
        })),

      setSort: (field, dir) =>
        set((state) => ({
          ui: {
            ...state.ui,
            sortField: field,
            sortDir:
              dir ??
              (state.ui.sortField === field && state.ui.sortDir === 'asc'
                ? 'desc'
                : 'asc'),
          },
        })),

      addSavedView: (name) => {
        const ui = get().ui;
        const view: SavedView = {
          id: uid('view'),
          name,
          filters: { ...ui.filters },
          sortField: ui.sortField,
          sortDir: ui.sortDir,
          searchQuery: ui.searchQuery,
        };
        set((state) => ({ savedViews: [...state.savedViews, view] }));
        return view;
      },

      deleteSavedView: (id) =>
        set((state) => ({
          savedViews: state.savedViews.filter((v) => v.id !== id),
          ui:
            state.ui.activeSavedViewId === id
              ? { ...state.ui, activeSavedViewId: null, currentView: 'inbox' }
              : state.ui,
        })),

      applySavedView: (id) =>
        set((state) => {
          const view = state.savedViews.find((v) => v.id === id);
          if (!view) return {};
          return {
            ui: {
              ...state.ui,
              currentView: 'custom',
              activeSavedViewId: id,
              filters: { ...view.filters },
              sortField: view.sortField,
              sortDir: view.sortDir,
              searchQuery: view.searchQuery,
              selectedProjectId: null,
            },
          };
        }),

      addMember: (name, role = 'editor') => {
        const member: Member = {
          id: uid('mbr'),
          name,
          role,
          color: PROJECT_COLORS[get().members.length % PROJECT_COLORS.length],
        };
        set((state) => ({ members: [...state.members, member] }));
        return member;
      },

      updateMember: (id, updates) =>
        set((state) => ({
          members: state.members.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      deleteMember: (id) =>
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
          // Unassign tasks that pointed at this member.
          tasks: state.tasks.map((t) =>
            t.assigneeId === id ? { ...t, assigneeId: null } : t
          ),
        })),

      setUserName: (name) =>
        set((state) => ({ settings: { ...state.settings, userName: name } })),

      setTheme: (theme) =>
        set((state) => ({ settings: { ...state.settings, theme } })),

      setAddToTop: (v) =>
        set((state) => ({ settings: { ...state.settings, addToTop: v } })),

      setProjectSort: (sort) =>
        set((state) => ({ settings: { ...state.settings, projectSort: sort } })),

      setProjectsPanelWidth: (px) =>
        set((state) => ({
          settings: {
            ...state.settings,
            projectsPanelWidth: Math.max(200, Math.min(560, Math.round(px))),
          },
        })),

      connectNozbe: (token, clientId) =>
        set((state) => ({
          settings: {
            ...state.settings,
            nozbe: {
              token,
              clientId,
              syncCompleted: state.settings.nozbe?.syncCompleted ?? true,
            },
          },
        })),

      disconnectNozbe: () =>
        set((state) => {
          const { nozbe: _omit, ...rest } = state.settings;
          void _omit;
          return { settings: rest };
        }),

      setNozbeSync: (enabled) =>
        set((state) =>
          state.settings.nozbe
            ? {
                settings: {
                  ...state.settings,
                  nozbe: { ...state.settings.nozbe, syncCompleted: enabled },
                },
              }
            : {}
        ),
    }),
    {
      name: 'nozbe-clone-state',
      version: 2,
      storage: createJSONStorage(() => localStorage, { reviver: dateReviver }),
      partialize: (state) => ({
        tasks: state.tasks,
        projects: state.projects,
        categories: state.categories,
        savedViews: state.savedViews,
        activityLog: state.activityLog,
        members: state.members,
        settings: state.settings,
        nextTaskNumber: state.nextTaskNumber,
      }),
      // v1 → v2: backfill task numbers + parentId + nextTaskNumber.
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as {
          tasks?: Task[];
          nextTaskNumber?: number;
          activityLog?: unknown[];
          [k: string]: unknown;
        };
        if (version < 2 && Array.isArray(state.tasks)) {
          const ordered = [...state.tasks].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          const numberById = new Map<string, number>();
          ordered.forEach((t, i) => numberById.set(t.id, i + 1));
          state.tasks = state.tasks.map((t) => ({
            ...t,
            number: t.number ?? numberById.get(t.id) ?? 0,
            parentId: t.parentId ?? null,
          }));
          state.nextTaskNumber = state.tasks.length + 1;
          // The activity-log entry shape changed incompatibly in v2; start fresh.
          state.activityLog = [];
        }
        return state;
      },
    }
  )
);

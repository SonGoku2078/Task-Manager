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
  SavedView,
} from './types';
import { dummyTasks, defaultProjects, defaultCategories } from './dummyData';

const DATE_KEYS = new Set([
  'dueDate',
  'createdAt',
  'updatedAt',
  'recurrenceEnd',
  'currentDate',
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
  searchQuery: '',
  filters: {
    projectId: null,
    categoryId: null,
    priority: null,
    completed: null,
  },
  sortField: 'manual',
  sortDir: 'asc',
  activeSavedViewId: null,
};

export interface NewTaskInput {
  title: string;
  description?: string;
  projectId?: string | null;
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
  ui: UIState;

  // Task CRUD
  addTask: (input: NewTaskInput) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  toggleStar: (id: string) => void;

  // Bulk operations
  bulkUpdate: (ids: string[], updates: Partial<Task>) => void;
  bulkDelete: (ids: string[]) => void;

  // Project CRUD
  addProject: (name: string, color?: string, icon?: string) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Category CRUD
  addCategory: (name: string, color?: string) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // UI
  selectTask: (id: string | null) => void;
  selectProject: (id: string | null) => void;
  setView: (view: ViewType) => void;
  setCurrentDate: (date: Date) => void;
  setSearchQuery: (q: string) => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  setSort: (field: SortField, dir?: UIState['sortDir']) => void;

  // Saved (custom) views
  addSavedView: (name: string) => SavedView;
  deleteSavedView: (id: string) => void;
  applySavedView: (id: string) => void;
}

const PROJECT_COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4'];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: dummyTasks,
      projects: defaultProjects,
      categories: defaultCategories,
      savedViews: [],
      ui: defaultUIState,

      addTask: (input) => {
        const now = new Date();
        const task: Task = {
          id: uid('task'),
          title: input.title,
          description: input.description ?? '',
          projectId: input.projectId ?? null,
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
        set((state) => ({ tasks: [...state.tasks, task] }));
        return task;
      },

      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
          ),
        })),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          ui:
            state.ui.selectedTaskId === id
              ? { ...state.ui, selectedTaskId: null }
              : state.ui,
        })),

      toggleTask: (id) =>
        set((state) => {
          const target = state.tasks.find((t) => t.id === id);
          if (!target) return {};
          const completing = !target.completed;
          const tasks = state.tasks.map((t) =>
            t.id === id ? { ...t, completed: completing, updatedAt: new Date() } : t
          );

          // Recurring task: spawn the next occurrence when completed.
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
                completed: false,
                dueDate: nextDue,
                createdAt: now,
                updatedAt: now,
              });
            }
          }
          return { tasks };
        }),

      toggleStar: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, starred: !t.starred, updatedAt: new Date() } : t
          ),
        })),

      bulkUpdate: (ids, updates) =>
        set((state) => {
          const idSet = new Set(ids);
          return {
            tasks: state.tasks.map((t) =>
              idSet.has(t.id) ? { ...t, ...updates, updatedAt: new Date() } : t
            ),
          };
        }),

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

      addProject: (name, color, icon) => {
        const project: Project = {
          id: uid('proj'),
          name,
          color: color ?? PROJECT_COLORS[get().projects.length % PROJECT_COLORS.length],
          icon: icon ?? '📁',
        };
        set((state) => ({ projects: [...state.projects, project] }));
        return project;
      },

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
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

      setCurrentDate: (date) =>
        set((state) => ({ ui: { ...state.ui, currentDate: date } })),

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
    }),
    {
      name: 'nozbe-clone-state',
      version: 1,
      storage: createJSONStorage(() => localStorage, { reviver: dateReviver }),
      partialize: (state) => ({
        tasks: state.tasks,
        projects: state.projects,
        categories: state.categories,
        savedViews: state.savedViews,
      }),
    }
  )
);

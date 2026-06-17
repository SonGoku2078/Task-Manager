import { create } from 'zustand';
import type { Task, UIState } from './types';

interface AppState {
  tasks: Task[];
  uiState: UIState;

  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  toggleStar: (id: string) => void;

  selectTask: (task: Task | null) => void;
  selectProject: (projectId: string | null) => void;
  setCurrentView: (view: UIState['currentView']) => void;
  setCurrentDate: (date: Date) => void;
}

export const useStore = create<AppState>((set) => ({
  tasks: [],
  uiState: {
    selectedTask: null,
    selectedProject: null,
    currentView: 'calendar',
    currentDate: new Date(),
  },

  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      uiState: state.uiState.selectedTask?.id === id
        ? { ...state.uiState, selectedTask: null }
        : state.uiState,
    })),

  toggleTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    })),

  toggleStar: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, starred: !t.starred } : t
      ),
    })),

  selectTask: (task) =>
    set((state) => ({
      uiState: { ...state.uiState, selectedTask: task },
    })),

  selectProject: (projectId) =>
    set((state) => ({
      uiState: { ...state.uiState, selectedProject: projectId },
    })),

  setCurrentView: (view) =>
    set((state) => ({
      uiState: { ...state.uiState, currentView: view },
    })),

  setCurrentDate: (date) =>
    set((state) => ({
      uiState: { ...state.uiState, currentDate: date },
    })),
}));

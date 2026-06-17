export type Priority = 'low' | 'medium' | 'high';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  dueDate: Date;
  priority: Priority;
  tags: string[];
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  starred: boolean;
  recurrence: RecurrenceType;
  recurrenceEnd?: Date;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface UIState {
  selectedTask: Task | null;
  selectedProject: string | null;
  currentView: 'calendar' | 'inbox' | 'today' | 'week';
  currentDate: Date;
}

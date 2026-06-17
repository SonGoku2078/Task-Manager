import { useEffect, useState } from 'react';
import { useStore } from './store';
import { dummyTasks, projects } from './dummyData';
import type { Task } from './types';
import './App.css';
import Sidebar from './components/Sidebar';
import CalendarPanel from './components/CalendarPanel';
import TaskList from './components/TaskList';
import TaskDetailPanel from './components/TaskDetailPanel';

function App() {
  const { tasks, uiState, addTask, selectTask } = useStore();
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Load tasks from localStorage on mount
  useEffect(() => {
    const store = useStore.getState();
    const savedTasks = localStorage.getItem('tasks');

    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        parsedTasks.forEach((task: Task) => {
          store.addTask({
            ...task,
            dueDate: new Date(task.dueDate),
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt),
          });
        });
      } catch (error) {
        console.error('Failed to load tasks from localStorage:', error);
      }
    } else if (store.tasks.length === 0) {
      // First time: load dummy data
      dummyTasks.forEach(task => store.addTask(task));
    }
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: newTaskTitle,
        description: '',
        projectId: '1',
        dueDate: new Date(),
        priority: 'medium',
        tags: [],
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        starred: false,
        recurrence: 'none',
      };
      addTask(newTask);
      setNewTaskTitle('');
      setShowNewTaskForm(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar projects={projects} />
      <CalendarPanel />
      <div className="main-content">
        <div className="task-header">
          <h2>Inbox</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="info-btn">ℹ️</button>
            <button
              className="btn btn-primary"
              onClick={() => setShowNewTaskForm(!showNewTaskForm)}
            >
              + Add Task
            </button>
          </div>
        </div>

        {showNewTaskForm && (
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            gap: '8px',
            backgroundColor: '#f9f9f9',
          }}>
            <input
              type="text"
              placeholder="New task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask();
                if (e.key === 'Escape') setShowNewTaskForm(false);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
              autoFocus
            />
            <button
              className="btn btn-primary"
              onClick={handleAddTask}
            >
              Save
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowNewTaskForm(false);
                setNewTaskTitle('');
              }}
            >
              Cancel
            </button>
          </div>
        )}

        <TaskList tasks={tasks} onSelectTask={selectTask} />
      </div>
      {uiState.selectedTask && uiState.selectedTask.id && (
        <TaskDetailPanel task={uiState.selectedTask} />
      )}
    </div>
  );
}

export default App;

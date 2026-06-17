import { useState } from 'react';
import { useStore } from './store';
import { selectVisibleTasks } from './selectors';
import type { ViewType } from './types';
import './App.css';
import Sidebar from './components/Sidebar';
import CalendarPanel from './components/CalendarPanel';
import TaskList from './components/TaskList';
import TaskDetailPanel from './components/TaskDetailPanel';

const VIEW_TITLES: Record<ViewType, string> = {
  inbox: 'Inbox',
  priority: 'Priorität',
  projects: 'Projekt',
  categories: 'Kategorien',
  calendar: 'Kalender',
  today: 'Heute',
  week: 'Diese Woche',
  search: 'Suche',
};

function App() {
  const tasks = useStore((s) => s.tasks);
  const ui = useStore((s) => s.ui);
  const projects = useStore((s) => s.projects);
  const addTask = useStore((s) => s.addTask);
  const selectTask = useStore((s) => s.selectTask);
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const setView = useStore((s) => s.setView);

  const [newTaskTitle, setNewTaskTitle] = useState('');

  const visibleTasks = selectVisibleTasks(tasks, ui);
  const selectedTask = ui.selectedTaskId
    ? tasks.find((t) => t.id === ui.selectedTaskId) ?? null
    : null;

  const currentProject =
    ui.currentView === 'projects' && ui.selectedProjectId
      ? projects.find((p) => p.id === ui.selectedProjectId)
      : null;

  const headerTitle = currentProject
    ? `${currentProject.icon} ${currentProject.name}`
    : VIEW_TITLES[ui.currentView];

  const handleAddTask = () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    const created = addTask({
      title,
      projectId: currentProject ? currentProject.id : null,
    });
    setNewTaskTitle('');
    selectTask(created.id);
  };

  return (
    <div className="app-container">
      <Sidebar />
      <CalendarPanel />
      <div className="main-content">
        <div className="task-header">
          {currentProject ? (
            <input
              className="project-title-input"
              value={currentProject.name}
              onChange={(e) =>
                updateProject(currentProject.id, { name: e.target.value })
              }
            />
          ) : (
            <h2>{headerTitle}</h2>
          )}
          <div className="task-header-right">
            <span className="task-count">{visibleTasks.length}</span>
            {currentProject && (
              <button
                className="header-icon-btn"
                title="Projekt löschen"
                onClick={() => {
                  if (
                    window.confirm(
                      `Projekt "${currentProject.name}" löschen? Aufgaben wandern in die Inbox.`
                    )
                  ) {
                    deleteProject(currentProject.id);
                    setView('inbox');
                  }
                }}
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        <div className="quick-add">
          <input
            type="text"
            className="quick-add-input"
            placeholder="+ Aufgabe hinzufügen…"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTask();
              if (e.key === 'Escape') setNewTaskTitle('');
            }}
          />
          <button className="btn btn-primary" onClick={handleAddTask}>
            Hinzufügen
          </button>
        </div>

        <TaskList tasks={visibleTasks} />
      </div>

      {selectedTask && <TaskDetailPanel task={selectedTask} />}
    </div>
  );
}

export default App;

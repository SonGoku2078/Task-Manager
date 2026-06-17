import { useState } from 'react';
import { useStore } from './store';
import { selectVisibleTasks, selectPriorityTasks } from './selectors';
import type { ViewType } from './types';
import './App.css';
import Sidebar from './components/Sidebar';
import CalendarPanel from './components/CalendarPanel';
import TaskList from './components/TaskList';
import TaskDetailPanel from './components/TaskDetailPanel';
import CategoryBar from './components/CategoryBar';
import FilterBar from './components/FilterBar';

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
  const setSearchQuery = useStore((s) => s.setSearchQuery);

  const [newTaskTitle, setNewTaskTitle] = useState('');

  const visibleTasks =
    ui.currentView === 'priority'
      ? selectPriorityTasks(tasks, 5)
      : selectVisibleTasks(tasks, ui);
  const selectedTask = ui.selectedTaskId
    ? tasks.find((t) => t.id === ui.selectedTaskId) ?? null
    : null;

  const currentProject =
    ui.currentView === 'projects' && ui.selectedProjectId
      ? projects.find((p) => p.id === ui.selectedProjectId)
      : null;

  const headerTitle = currentProject
    ? `${currentProject.icon} ${currentProject.name}`
    : ui.currentView === 'calendar'
      ? ui.currentDate.toLocaleDateString('de-DE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
      : VIEW_TITLES[ui.currentView];

  const handleAddTask = () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    const created = addTask({
      title,
      projectId: currentProject ? currentProject.id : null,
      dueDate: ui.currentView === 'calendar' ? new Date(ui.currentDate) : null,
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

        {ui.currentView === 'search' && (
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              autoFocus
              type="text"
              className="search-input"
              placeholder="Aufgaben durchsuchen (Titel & Beschreibung)…"
              value={ui.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {ui.searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery('')}
                title="Löschen"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {ui.currentView === 'categories' && <CategoryBar />}

        {['inbox', 'projects', 'today', 'search', 'categories'].includes(
          ui.currentView
        ) && <FilterBar />}

        {ui.currentView === 'priority' && (
          <div className="view-hint">
            Deine Top 5 nächsten Schritte — markierte (★) und hoch-priorisierte Aufgaben zuerst.
          </div>
        )}

        <TaskList
          tasks={visibleTasks}
          emptyHint={
            ui.currentView === 'priority'
              ? 'Keine offenen Aufgaben — markiere welche mit ★ oder setze Priorität „Hoch".'
              : undefined
          }
        />
      </div>

      {selectedTask && <TaskDetailPanel task={selectedTask} />}
    </div>
  );
}

export default App;

import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { selectVisibleTasks, selectPriorityTasks } from './selectors';
import { parseQuickAdd } from './quickParse';
import type { ViewType } from './types';
import './App.css';
import Sidebar from './components/Sidebar';
import CalendarPanel from './components/CalendarPanel';
import ProjectsPanel from './components/ProjectsPanel';
import TaskList from './components/TaskList';
import TaskDetailPanel from './components/TaskDetailPanel';
import CategoryBar from './components/CategoryBar';
import FilterBar from './components/FilterBar';
import BulkActionBar from './components/BulkActionBar';
import TemplatesGallery from './components/TemplatesGallery';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';

const VIEW_TITLES: Record<ViewType, string> = {
  inbox: 'Inbox',
  priority: 'Priorität',
  projects: 'Projekt',
  categories: 'Kategorien',
  calendar: 'Kalender',
  today: 'Heute',
  week: 'Diese Woche',
  search: 'Suche',
  custom: 'Gespeicherte Ansicht',
  templates: 'Vorlagen',
  activity: 'Erledigt',
  reports: 'Berichte',
  settings: 'Einstellungen',
};

function App() {
  const tasks = useStore((s) => s.tasks);
  const ui = useStore((s) => s.ui);
  const projects = useStore((s) => s.projects);
  const savedViews = useStore((s) => s.savedViews);
  const theme = useStore((s) => s.settings.theme);

  // Apply the selected theme to the document root.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const addTask = useStore((s) => s.addTask);
  const selectTask = useStore((s) => s.selectTask);
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const addProject = useStore((s) => s.addProject);
  const addCategory = useStore((s) => s.addCategory);
  const categories = useStore((s) => s.categories);
  const setView = useStore((s) => s.setView);
  const setSidePanel = useStore((s) => s.setSidePanel);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const deleteTask = useStore((s) => s.deleteTask);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const quickAddRef = useRef<HTMLInputElement>(null);

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exitBulk = () => {
    setBulkMode(false);
    setSelectedIds(new Set());
  };

  // Global keyboard shortcuts: n = new task, / = search, Esc = close, Del = delete.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable);

      if (e.key === 'Escape') {
        if (typing) el?.blur();
        else if (useStore.getState().ui.selectedTaskId) selectTask(null);
        return;
      }
      if (typing) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        quickAddRef.current?.focus();
      } else if (e.key === '/') {
        e.preventDefault();
        setView('search');
      } else if (e.key === 'Delete') {
        const id = useStore.getState().ui.selectedTaskId;
        if (id) {
          e.preventDefault();
          deleteTask(id);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectTask, setView, deleteTask]);

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

  const activeSavedView =
    ui.currentView === 'custom' && ui.activeSavedViewId
      ? savedViews.find((v) => v.id === ui.activeSavedViewId)
      : null;

  const headerTitle = currentProject
    ? `${currentProject.icon} ${currentProject.name}`
    : activeSavedView
      ? `🔎 ${activeSavedView.name}`
      : ui.currentView === 'calendar'
      ? ui.selectedDates.length > 1
        ? `${ui.selectedDates.length} Tage ausgewählt`
        : ui.currentDate.toLocaleDateString('de-DE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })
      : VIEW_TITLES[ui.currentView];

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const parsed = parseQuickAdd(newTaskTitle);
    const title = parsed.title || newTaskTitle.trim();

    // Resolve #project token: match existing (case-insensitive) or create.
    let projectId: string | null = currentProject ? currentProject.id : null;
    if (parsed.projectName) {
      const existing = projects.find(
        (p) => p.name.toLowerCase() === parsed.projectName!.toLowerCase()
      );
      projectId = existing ? existing.id : addProject(parsed.projectName).id;
    }

    // Resolve @category tokens: match existing or create.
    const categoryIds = parsed.categoryNames.map((name) => {
      const existing = categories.find(
        (c) => c.name.toLowerCase() === name.toLowerCase()
      );
      return existing ? existing.id : addCategory(name).id;
    });

    const created = addTask({
      title,
      projectId,
      categoryIds,
      dueDate: ui.currentView === 'calendar' ? new Date(ui.currentDate) : null,
    });
    setNewTaskTitle('');
    selectTask(created.id);
  };

  return (
    <div className="app-container">
      <Sidebar />
      {ui.sidePanel === 'projects' && <ProjectsPanel />}
      {ui.sidePanel === 'calendar' && <CalendarPanel />}
      <div className="main-content">
        <div className="task-header">
          {currentProject ? (
            <div className="project-title-group">
              <input
                className="project-title-input"
                value={currentProject.name}
                onChange={(e) =>
                  updateProject(currentProject.id, { name: e.target.value })
                }
              />
              <input
                className="project-label-input"
                placeholder="+ Label"
                value={currentProject.label ?? ''}
                onChange={(e) =>
                  updateProject(currentProject.id, {
                    label: e.target.value || undefined,
                  })
                }
                title="Projekt-Label (Gruppierung in der Seitenleiste)"
              />
            </div>
          ) : (
            <h2>{headerTitle}</h2>
          )}
          <div className="task-header-right">
            <span className="task-count">{visibleTasks.length}</span>
            <button
              className="header-icon-btn"
              title="Drucken / als PDF speichern"
              onClick={() => window.print()}
            >
              🖨
            </button>
            <button
              className="header-icon-btn"
              title={bulkMode ? 'Auswahl beenden' : 'Mehrere auswählen'}
              onClick={() => (bulkMode ? exitBulk() : setBulkMode(true))}
            >
              {bulkMode ? '✕' : '☑'}
            </button>
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
                    setSidePanel('none');
                    setView('inbox');
                  }
                }}
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        <div className="print-meta">
          Nozbe · {headerTitle} · {new Date().toLocaleDateString('de-DE')}
        </div>

        {ui.currentView === 'templates' ? (
          <TemplatesGallery />
        ) : ui.currentView === 'activity' ? (
          <TaskList
            tasks={[...tasks]
              .filter((t) => t.completed)
              .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())}
            emptyHint="Noch nichts erledigt. Hake Aufgaben ab — sie erscheinen hier und lassen sich wieder öffnen."
          />
        ) : ui.currentView === 'reports' ? (
          <ReportsView />
        ) : ui.currentView === 'settings' ? (
          <SettingsView />
        ) : (
        <>
        <div className="quick-add">
          <input
            ref={quickAddRef}
            type="text"
            className="quick-add-input"
            placeholder={'+ Aufgabe…  #Projekt @Kategorie  (Taste n)'}
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

        {['inbox', 'projects', 'today', 'search', 'categories', 'custom'].includes(
          ui.currentView
        ) && <FilterBar />}

        {bulkMode && (
          <BulkActionBar
            selectedIds={[...selectedIds]}
            totalVisible={visibleTasks.length}
            onSelectAll={() => setSelectedIds(new Set(visibleTasks.map((t) => t.id)))}
            onClear={exitBulk}
          />
        )}

        {ui.currentView === 'priority' && (
          <div className="view-hint">
            Deine Top 5 nächsten Schritte — markierte (★) und hoch-priorisierte Aufgaben zuerst.
          </div>
        )}

        <TaskList
          tasks={visibleTasks}
          emptyHint={
            ui.currentView === 'priority'
              ? 'Keine offenen Aufgaben — markiere welche mit ★ oder setze Priorität Hoch.'
              : undefined
          }
          selectionMode={bulkMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
        </>
        )}
      </div>

      {selectedTask && <TaskDetailPanel task={selectedTask} />}
    </div>
  );
}

export default App;

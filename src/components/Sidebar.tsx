import { useState } from 'react';
import { useStore } from '../store';
import type { ViewType } from '../types';
import './Sidebar.css';

const navItems: { id: ViewType; icon: string; label: string }[] = [
  { id: 'priority', icon: '📌', label: 'Priorität' },
  { id: 'inbox', icon: '📥', label: 'Inbox' },
  { id: 'today', icon: '⭐', label: 'Heute' },
  { id: 'projects', icon: '📂', label: 'Projekte' },
  { id: 'categories', icon: '🏷️', label: 'Kategorien' },
  { id: 'calendar', icon: '📅', label: 'Kalender' },
  { id: 'templates', icon: '📋', label: 'Vorlagen' },
];

export default function Sidebar() {
  const currentView = useStore((s) => s.ui.currentView);
  const setView = useStore((s) => s.setView);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const selectedProjectId = useStore((s) => s.ui.selectedProjectId);
  const selectProject = useStore((s) => s.selectProject);
  const addProject = useStore((s) => s.addProject);
  const savedViews = useStore((s) => s.savedViews);
  const applySavedView = useStore((s) => s.applySavedView);
  const deleteSavedView = useStore((s) => s.deleteSavedView);
  const activeSavedViewId = useStore((s) => s.ui.activeSavedViewId);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const openCount = (projectId: string) =>
    tasks.filter((t) => t.projectId === projectId && !t.completed).length;

  // Group projects by their optional label; unlabeled first.
  const groupedProjects = (() => {
    const order: (string | undefined)[] = [];
    const map = new Map<string | undefined, typeof projects>();
    for (const p of projects) {
      const key = p.label || undefined;
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(p);
    }
    // Unlabeled group first, then labeled alphabetically.
    order.sort((a, b) => {
      if (a === undefined) return -1;
      if (b === undefined) return 1;
      return a.localeCompare(b);
    });
    return order.map((label) => ({ label, items: map.get(label)! }));
  })();

  const submitProject = () => {
    const name = newName.trim();
    if (name) {
      const project = addProject(name);
      selectProject(project.id);
      setView('projects');
    }
    setNewName('');
    setAdding(false);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-brand">✅ Nozbe</div>

      <div className="sidebar-items">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-separator" />

      <div className="sidebar-section-label">
        Projekte
        <button className="sidebar-add" onClick={() => setAdding(true)} title="Projekt hinzufügen">
          +
        </button>
      </div>
      {adding && (
        <div className="sidebar-add-row">
          <input
            autoFocus
            className="sidebar-add-input"
            placeholder="Projektname…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitProject();
              if (e.key === 'Escape') {
                setAdding(false);
                setNewName('');
              }
            }}
            onBlur={submitProject}
          />
        </div>
      )}
      {groupedProjects.map(({ label, items }) => (
        <div key={label ?? '__none'}>
          {label && <div className="sidebar-group-label">{label}</div>}
          <div className="sidebar-items">
            {items.map((p) => (
              <button
                key={p.id}
                className={`sidebar-item project-item ${
                  currentView === 'projects' && selectedProjectId === p.id
                    ? 'active'
                    : ''
                }`}
                onClick={() => {
                  selectProject(p.id);
                  setView('projects');
                }}
              >
                <span className="sidebar-icon" style={{ color: p.color }}>
                  {p.icon}
                </span>
                <span className="project-name">{p.name}</span>
                <span className="project-count">{openCount(p.id)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {savedViews.length > 0 && (
        <>
          <div className="sidebar-separator" />
          <div className="sidebar-section-label">Ansichten</div>
          <div className="sidebar-items">
            {savedViews.map((v) => (
              <div
                key={v.id}
                className={`sidebar-item project-item ${
                  activeSavedViewId === v.id ? 'active' : ''
                }`}
                onClick={() => applySavedView(v.id)}
              >
                <span className="sidebar-icon">🔎</span>
                <span className="project-name">{v.name}</span>
                <button
                  className="saved-view-del"
                  title="Ansicht löschen"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSavedView(v.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sidebar-separator" />

      <div className="sidebar-items">
        <button
          className={`sidebar-item ${currentView === 'search' ? 'active' : ''}`}
          onClick={() => setView('search')}
        >
          <span className="sidebar-icon">🔍</span>
          <span>Suchen</span>
        </button>
      </div>
    </div>
  );
}

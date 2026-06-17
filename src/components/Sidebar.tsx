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
];

export default function Sidebar() {
  const currentView = useStore((s) => s.ui.currentView);
  const setView = useStore((s) => s.setView);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const selectedProjectId = useStore((s) => s.ui.selectedProjectId);
  const selectProject = useStore((s) => s.selectProject);
  const addProject = useStore((s) => s.addProject);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const openCount = (projectId: string) =>
    tasks.filter((t) => t.projectId === projectId && !t.completed).length;

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
      <div className="sidebar-items">
        {projects.map((p) => (
          <button
            key={p.id}
            className={`sidebar-item project-item ${
              currentView === 'projects' && selectedProjectId === p.id ? 'active' : ''
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

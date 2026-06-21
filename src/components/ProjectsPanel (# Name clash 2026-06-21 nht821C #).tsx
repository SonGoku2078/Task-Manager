import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import './ProjectsPanel.css';

export default function ProjectsPanel() {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const selectedProjectId = useStore((s) => s.ui.selectedProjectId);
  const selectProject = useStore((s) => s.selectProject);
  const addProject = useStore((s) => s.addProject);
  const reorderProjects = useStore((s) => s.reorderProjects);
  const storedWidth = useStore((s) => s.settings.projectsPanelWidth);
  const setProjectsPanelWidth = useStore((s) => s.setProjectsPanelWidth);

  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(storedWidth ?? 240);

  // Keep local width in sync if the stored value changes elsewhere.
  useEffect(() => {
    if (storedWidth) setWidth(storedWidth);
  }, [storedWidth]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const left = panelRef.current?.getBoundingClientRect().left ?? 0;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(200, Math.min(560, ev.clientX - left));
      setWidth(next);
    };
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setProjectsPanelWidth(Math.max(200, Math.min(560, ev.clientX - left)));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const openCount = (projectId: string) =>
    tasks.filter((t) => t.projectId === projectId && !t.completed).length;

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  // Manual order (drag & drop); active ("pinned") projects float to the top.
  const sorted = [
    ...filtered.filter((p) => p.pinned),
    ...filtered.filter((p) => !p.pinned),
  ];
  const anyPinned = projects.some((p) => p.pinned);

  const submitProject = () => {
    const name = newName.trim();
    if (name) {
      const project = addProject(name);
      selectProject(project.id);
    }
    setNewName('');
    setAdding(false);
  };

  const canDrag = true;

  return (
    <div className="projects-panel" ref={panelRef} style={{ width }}>
      <div className="projects-panel-head">
        <span className="projects-panel-title">📂 Projekte</span>
        <button
          className="projects-add-btn"
          title="Projekt hinzufügen (wird oben angelegt)"
          onClick={() => setAdding(true)}
        >
          +
        </button>
      </div>

      <input
        className="projects-search"
        placeholder="Suchen…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {adding && (
        <input
          autoFocus
          className="projects-add-input"
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
      )}

      <div className="projects-list">
        {sorted.map((p) => (
          <div
            key={p.id}
            className={`projects-item ${selectedProjectId === p.id ? 'active' : ''} ${
              anyPinned && !p.pinned ? 'dimmed' : ''
            } ${overId === p.id ? 'drag-over' : ''} ${dragId === p.id ? 'dragging' : ''}`}
            draggable={canDrag}
            onClick={() => selectProject(p.id)}
            onDragStart={() => canDrag && setDragId(p.id)}
            onDragOver={(e) => {
              if (!canDrag || !dragId) return;
              e.preventDefault();
              setOverId(p.id);
            }}
            onDragLeave={() => setOverId((cur) => (cur === p.id ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              if (canDrag && dragId) reorderProjects(dragId, p.id);
              setDragId(null);
              setOverId(null);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
          >
            {p.pinned && <span className="projects-active-dot" title="Aktiv">●</span>}
            <span className="projects-dot" style={{ background: p.color }} />
            <span className="projects-item-name" title={`${p.icon} ${p.name}`}>
              {p.icon} {p.name}
              {p.label && <span className="projects-item-label">{p.label}</span>}
            </span>
            <span className="projects-item-count">{openCount(p.id)}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="projects-empty">Keine Projekte gefunden.</p>
        )}
      </div>

      <div
        className="projects-resize"
        title="Breite ziehen"
        onMouseDown={startResize}
      />
    </div>
  );
}

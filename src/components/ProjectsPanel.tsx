import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import type { Project } from '../types';
import ClearableInput from './ClearableInput';
import './ProjectsPanel.css';

interface ProjectsPanelProps {
  mode?: 'projects' | 'someday';
}

export default function ProjectsPanel({ mode = 'projects' }: ProjectsPanelProps) {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const selectedProjectId = useStore((s) => s.ui.selectedProjectId);
  const selectedProjectIds = useStore((s) => s.ui.selectedProjectIds);
  const selectProject = useStore((s) => s.selectProject);
  const toggleProjectSelected = useStore((s) => s.toggleProjectSelected);
  const addProject = useStore((s) => s.addProject);
  const reorderProjects = useStore((s) => s.reorderProjects);
  const storedWidth = useStore((s) => s.settings.projectsPanelWidth);
  const setProjectsPanelWidth = useStore((s) => s.setProjectsPanelWidth);

  const someday = mode === 'someday';

  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState<false | 'project' | 'area'>(false);
  const [newName, setNewName] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(storedWidth ?? 240);

  useEffect(() => {
    if (storedWidth) setWidth(storedWidth);
  }, [storedWidth]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const left = panelRef.current?.getBoundingClientRect().left ?? 0;
    const onMove = (ev: MouseEvent) => setWidth(Math.max(200, Math.min(560, ev.clientX - left)));
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

  const matchesQuery = (p: Project) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase());

  // Group the projects depending on the panel mode.
  const all = projects.filter(matchesQuery);
  const activeProjects = all.filter((p) => p.kind !== 'area' && p.active === true);
  const areas = all.filter((p) => p.kind === 'area');
  const somedayProjects = all.filter((p) => p.kind !== 'area' && p.active !== true);

  const pinnedFirst = (list: Project[]) => [
    ...list.filter((p) => p.pinned),
    ...list.filter((p) => !p.pinned),
  ];
  const anyPinned = activeProjects.some((p) => p.pinned);

  const submitProject = () => {
    const name = newName.trim();
    if (name) {
      const project = addProject(name, undefined, undefined, {
        active: !someday,
        kind: adding === 'area' ? 'area' : 'project',
      });
      selectProject(project.id);
    }
    setNewName('');
    setAdding(false);
  };

  const renderItem = (p: Project) => (
    <div
      key={p.id}
      className={`projects-item ${
        (selectedProjectIds.length ? selectedProjectIds.includes(p.id) : selectedProjectId === p.id)
          ? 'active'
          : ''
      } ${anyPinned && !p.pinned && p.kind !== 'area' ? 'dimmed' : ''} ${
        overId === p.id ? 'drag-over' : ''
      } ${dragId === p.id ? 'dragging' : ''}`}
      draggable
      onClick={(e) =>
        e.ctrlKey || e.metaKey ? toggleProjectSelected(p.id) : selectProject(p.id)
      }
      onDragStart={() => setDragId(p.id)}
      onDragOver={(e) => {
        if (!dragId) return;
        e.preventDefault();
        setOverId(p.id);
      }}
      onDragLeave={() => setOverId((cur) => (cur === p.id ? null : cur))}
      onDrop={(e) => {
        e.preventDefault();
        if (dragId) reorderProjects(dragId, p.id);
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
      <span className="projects-item-name" title={p.name}>
        {p.name}
        {p.label && <span className="projects-item-label">{p.label}</span>}
      </span>
      <span className="projects-item-count">{openCount(p.id)}</span>
    </div>
  );

  return (
    <div className="projects-panel" ref={panelRef} style={{ width }}>
      <div className="projects-panel-head">
        <span className="projects-panel-title">
          {someday ? '🌥️ Someday' : '📂 Projekte'}
        </span>
        <div className="projects-add-group">
          {!someday && (
            <button
              className="projects-add-btn"
              title="Area hinzufügen (wiederkehrender Bereich)"
              onClick={() => {
                setAdding('area');
                setNewName('');
              }}
            >
              🔁
            </button>
          )}
          <button
            className="projects-add-btn"
            title={someday ? 'Someday-Projekt hinzufügen' : 'Projekt hinzufügen'}
            onClick={() => {
              setAdding('project');
              setNewName('');
            }}
          >
            +
          </button>
        </div>
      </div>

      <ClearableInput
        className="projects-search"
        placeholder="Suchen…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery('')}
      />

      {adding && (
        <ClearableInput
          autoFocus
          className="projects-add-input"
          placeholder={adding === 'area' ? 'Area-Name…' : 'Projektname…'}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onClear={() => setNewName('')}
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
        {someday ? (
          <>
            {pinnedFirst(somedayProjects).map(renderItem)}
            {somedayProjects.length === 0 && (
              <p className="projects-empty">Keine inaktiven Projekte.</p>
            )}
          </>
        ) : (
          <>
            {pinnedFirst(activeProjects).map(renderItem)}
            {activeProjects.length === 0 && (
              <p className="projects-empty">Keine aktiven Projekte.</p>
            )}
            {areas.length > 0 && (
              <>
                <div className="projects-group-head">🔁 Areas</div>
                {areas.map(renderItem)}
              </>
            )}
          </>
        )}
      </div>

      <div className="projects-resize" title="Breite ziehen" onMouseDown={startResize} />
    </div>
  );
}

import { useState } from 'react';
import { useStore } from '../store';
import './ProjectsPanel.css';

export default function ProjectsPanel() {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const selectedProjectId = useStore((s) => s.ui.selectedProjectId);
  const selectProject = useStore((s) => s.selectProject);
  const addProject = useStore((s) => s.addProject);

  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const openCount = (projectId: string) =>
    tasks.filter((t) => t.projectId === projectId && !t.completed).length;

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  // Group filtered projects by their optional label; unlabeled first.
  const grouped = (() => {
    const order: (string | undefined)[] = [];
    const map = new Map<string | undefined, typeof projects>();
    for (const p of filtered) {
      const key = p.label || undefined;
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(p);
    }
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
    }
    setNewName('');
    setAdding(false);
  };

  return (
    <div className="projects-panel">
      <div className="projects-panel-head">
        <span className="projects-panel-title">📂 Projekte</span>
        <button
          className="projects-add-btn"
          title="Projekt hinzufügen"
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
        {grouped.map(({ label, items }) => (
          <div key={label ?? '__none'}>
            {label && <div className="projects-group-label">{label}</div>}
            {items.map((p) => (
              <button
                key={p.id}
                className={`projects-item ${
                  selectedProjectId === p.id ? 'active' : ''
                }`}
                onClick={() => selectProject(p.id)}
              >
                <span className="projects-dot" style={{ background: p.color }} />
                <span className="projects-item-name">
                  {p.icon} {p.name}
                </span>
                <span className="projects-item-count">{openCount(p.id)}</span>
              </button>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="projects-empty">Keine Projekte gefunden.</p>
        )}
      </div>
    </div>
  );
}

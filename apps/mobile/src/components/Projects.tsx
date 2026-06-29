import { useState } from 'react';
import { useStore } from '../store';
import TaskRow from './TaskRow';

// Browse projects → tap one to see (and add to) its open tasks.
export default function Projects({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const addTask = useStore((s) => s.addTask);
  const [openId, setOpenId] = useState<string | null>(null);

  const openCount = (pid: string) =>
    tasks.filter((t) => t.projectId === pid && !t.parentId && !t.completed).length;

  // ── Drill-down: one project's open tasks ──
  if (openId) {
    const project = projects.find((p) => p.id === openId);
    const list = tasks.filter((t) => t.projectId === openId && !t.parentId && !t.completed);
    return (
      <div className="m-list">
        <button className="m-back" onClick={() => setOpenId(null)}>‹ Projekte</button>
        <h2 className="m-group-head">
          <span className="m-dot" style={{ background: project?.color ?? '#9ca3af' }} />
          {project?.name ?? 'Projekt'}
          <span className="m-group-count">{list.length}</span>
        </h2>
        <QuickAddTo projectId={openId} addTask={addTask} />
        {list.length === 0
          ? <p className="m-empty">Keine offenen Aufgaben in diesem Projekt.</p>
          : list.map((t) => <TaskRow key={t.id} task={t} onOpen={onOpenTask} />)}
      </div>
    );
  }

  // ── Project list ──
  const visible = projects
    .filter((p) => !p.archived)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (visible.length === 0) {
    return <p className="m-empty">Keine Projekte (oder noch nicht geladen — siehe ⚙️).</p>;
  }

  return (
    <div className="m-list">
      {visible.map((p) => (
        <button key={p.id} className="m-proj-row" onClick={() => setOpenId(p.id)}>
          <span className="m-dot" style={{ background: p.color }} />
          <span className="m-proj-name">
            {p.kind === 'area' ? '∞ ' : ''}{p.name}
          </span>
          <span className="m-group-count">{openCount(p.id)}</span>
          <span className="m-proj-chevron">›</span>
        </button>
      ))}
    </div>
  );
}

// Quick-add scoped to a project.
function QuickAddTo({ projectId, addTask }: { projectId: string; addTask: ReturnType<typeof useStore.getState>['addTask'] }) {
  const [title, setTitle] = useState('');
  const submit = () => {
    const t = title.trim();
    if (!t) return;
    addTask({ title: t, projectId });
    setTitle('');
  };
  return (
    <div className="m-quickadd">
      <input
        className="m-quickadd-input"
        placeholder="+ Aufgabe in dieses Projekt…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
      />
      <button className="m-quickadd-add" onClick={submit} disabled={!title.trim()}>+</button>
    </div>
  );
}

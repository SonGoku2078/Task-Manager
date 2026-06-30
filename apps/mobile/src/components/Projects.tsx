import { useState } from 'react';
import { useStore } from '../store';
import type { Project } from '../types';
import TaskRow from './TaskRow';

// Browse projects → tap one to see (and add to) its open tasks. The drill-down
// state lives in the app's nav history (so back/forward + gestures work).
export default function Projects({
  openProjectId,
  onOpenProject,
  onBack,
  onOpenTask,
}: {
  openProjectId: string | null;
  onOpenProject: (id: string) => void;
  onBack: () => void;
  onOpenTask: (id: string) => void;
}) {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const addTask = useStore((s) => s.addTask);

  const openCount = (pid: string) =>
    tasks.filter((t) => t.projectId === pid && !t.parentId && !t.completed).length;

  // ── Drill-down: one project's open tasks ──
  if (openProjectId) {
    const project = projects.find((p) => p.id === openProjectId);
    const list = tasks.filter((t) => t.projectId === openProjectId && !t.parentId && !t.completed);
    return (
      <div className="m-list">
        <button className="m-back" onClick={onBack}>‹ Projekte</button>
        <h2 className="m-group-head">
          <span className="m-dot" style={{ background: project?.color ?? '#9ca3af' }} />
          {project?.name ?? 'Projekt'}
          <span className="m-group-count">{list.length}</span>
        </h2>
        <QuickAddTo projectId={openProjectId} addTask={addTask} />
        {list.length === 0
          ? <p className="m-empty">Keine offenen Aufgaben in diesem Projekt.</p>
          : list.map((t) => <TaskRow key={t.id} task={t} onOpen={onOpenTask} />)}
      </div>
    );
  }

  // ── Project list ──
  // Match the desktop "Projekte" panel: active projects + areas only (hide
  // inactive/"Irgendwann" and archived). Show projects first, then areas;
  // pinned float to the top within each group, then alphabetical.
  const sortGroup = (list: Project[]) =>
    [...list].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || a.name.localeCompare(b.name));
  const shown = projects.filter((p) => !p.archived && (p.kind === 'area' || p.active === true));
  const projs = sortGroup(shown.filter((p) => p.kind !== 'area'));
  const areas = sortGroup(shown.filter((p) => p.kind === 'area'));

  if (projs.length === 0 && areas.length === 0) {
    return <p className="m-empty">Keine Projekte (oder noch nicht geladen — siehe ⚙️).</p>;
  }

  const row = (p: Project) => (
    <button key={p.id} className="m-proj-row" onClick={() => onOpenProject(p.id)}>
      <span className="m-dot" style={{ background: p.color }} />
      <span className="m-proj-name">{p.kind === 'area' ? '∞ ' : ''}{p.name}</span>
      <span className="m-group-count">{openCount(p.id)}</span>
      <span className="m-proj-chevron">›</span>
    </button>
  );

  return (
    <div className="m-list">
      {projs.map(row)}
      {areas.length > 0 && (
        <>
          <h2 className="m-group-head m-proj-subhead">Bereiche</h2>
          {areas.map(row)}
        </>
      )}
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

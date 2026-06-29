import { useStore } from '../store';
import TaskRow from './TaskRow';

// Browse every open task, grouped by project — so the full dataset is visible
// (the other tabs are intentionally filtered).
export default function AllTasks({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);

  const open = tasks.filter((t) => !t.parentId && !t.completed);
  if (open.length === 0) {
    return <p className="m-empty">Keine offenen Aufgaben (oder noch nicht geladen — siehe ⚙️).</p>;
  }

  const byProject = new Map<string, typeof open>();
  for (const t of open) {
    const key = t.projectId ?? '__none__';
    const arr = byProject.get(key);
    if (arr) arr.push(t);
    else byProject.set(key, [t]);
  }

  const groups = [...byProject.entries()].map(([pid, list]) => ({
    pid,
    name: pid === '__none__' ? 'Ohne Projekt (Inbox)' : projects.find((p) => p.id === pid)?.name ?? 'Projekt',
    color: pid === '__none__' ? '#9ca3af' : projects.find((p) => p.id === pid)?.color ?? '#9ca3af',
    list,
  }));
  groups.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="m-list">
      {groups.map((g) => (
        <section key={g.pid} className="m-group">
          <h2 className="m-group-head">
            <span className="m-dot" style={{ background: g.color }} /> {g.name}
            <span className="m-group-count">{g.list.length}</span>
          </h2>
          {g.list.map((t) => <TaskRow key={t.id} task={t} onOpen={onOpenTask} />)}
        </section>
      ))}
    </div>
  );
}

import { useStore } from '../store';
import { mobileNextWeek } from '../selectors';
import TaskRow from './TaskRow';

export default function NextWeek({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const tasks = useStore((s) => s.tasks);
  const groups = mobileNextWeek(tasks);

  if (groups.length === 0) {
    return <p className="m-empty">🗓️ Nichts für die nächsten 7 Tage.</p>;
  }
  return (
    <div className="m-list">
      {groups.map((g) => (
        <section key={g.key} className="m-group">
          <h2 className="m-group-head">
            {g.label} <span className="m-group-count">{g.tasks.length}</span>
          </h2>
          {g.tasks.map((t) => (
            <TaskRow key={t.id} task={t} onOpen={onOpenTask} />
          ))}
        </section>
      ))}
    </div>
  );
}

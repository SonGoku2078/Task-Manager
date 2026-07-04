import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { mobileToday, mobileDoneToday, dateKey } from '../selectors';
import TaskRow from './TaskRow';

export default function Today({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const tasks = useStore((s) => s.tasks);
  // Re-render when the calendar day flips so due-today membership and the
  // ☀️ Heute flag expiry stay fresh while the app is left open overnight.
  const [, setDayKey] = useState(() => dateKey(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setDayKey(dateKey(new Date())), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const open = mobileToday(tasks);
  const done = mobileDoneToday(tasks);

  if (open.length === 0 && done.length === 0) {
    return <p className="m-empty">☀️ Nichts für heute geplant.</p>;
  }
  return (
    <div className="m-list">
      {open.map((t) => (
        <TaskRow key={t.id} task={t} onOpen={onOpenTask} />
      ))}

      {done.length > 0 && (
        <section className="m-group m-group-done">
          <h2 className="m-group-head">
            ✓ Heute erledigt <span className="m-group-count">{done.length}</span>
          </h2>
          {done.map((t) => (
            <TaskRow key={t.id} task={t} onOpen={onOpenTask} />
          ))}
        </section>
      )}
    </div>
  );
}

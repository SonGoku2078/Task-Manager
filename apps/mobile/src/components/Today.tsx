import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { mobileToday, mobileDoneToday, dateKey, applyCompletionHold } from '../selectors';
import { useListFlip } from '../hooks';
import TaskRow from './TaskRow';

export default function Today({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const tasks = useStore((s) => s.tasks);
  const completionHold = useStore((s) => s.completionHold);
  const completionPulse = useStore((s) => s.completionPulse);
  // Re-render when the calendar day flips so due-today membership and the
  // ☀️ Heute flag expiry stay fresh while the app is left open overnight.
  const [, setDayKey] = useState(() => dateKey(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setDayKey(dateKey(new Date())), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Held tasks stay "virtually open" in place during the check-off animation
  // (#53); the FLIP hook glides them into ✓ Heute erledigt on release.
  const listRef = useRef<HTMLDivElement>(null);
  useListFlip(listRef, completionPulse);
  const held = applyCompletionHold(tasks, completionHold);
  const open = mobileToday(held);
  const done = mobileDoneToday(held);

  if (open.length === 0 && done.length === 0) {
    return <p className="m-empty">☀️ Nichts für heute geplant.</p>;
  }
  return (
    <div className="m-list" ref={listRef}>
      {open.map((t) => (
        <TaskRow key={t.id} task={t} onOpen={onOpenTask} />
      ))}

      {done.length > 0 && (
        <section className="m-group m-group-done">
          <h2 className="m-group-head">
            ✓ Heute erledigt <span className="m-group-count">{done.length}</span>
          </h2>
          {done.map((t) => (
            <TaskRow key={t.id} task={t} onOpen={onOpenTask} showCompletedDate />
          ))}
        </section>
      )}
    </div>
  );
}

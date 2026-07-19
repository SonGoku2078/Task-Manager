import { useRef } from 'react';
import { useStore } from '../store';
import { mobileNextWeek, mobileDoneThisWeek, applyCompletionHold } from '../selectors';
import { useListFlip } from '../hooks';
import TaskRow from './TaskRow';

export default function NextWeek({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const tasks = useStore((s) => s.tasks);
  const completionHold = useStore((s) => s.completionHold);
  const completionPulse = useStore((s) => s.completionPulse);
  // #53: held tasks stay in their group during the grey phase, then glide
  // down into ✓ Erledigt (letzte 7 Tage).
  const listRef = useRef<HTMLDivElement>(null);
  useListFlip(listRef, completionPulse);
  const held = applyCompletionHold(tasks, completionHold);
  const groups = mobileNextWeek(held);
  const done = mobileDoneThisWeek(held);

  if (groups.length === 0 && done.length === 0) {
    return <p className="m-empty">🗓️ Nichts für die nächsten 7 Tage.</p>;
  }
  return (
    <div className="m-list" ref={listRef}>
      {groups.map((g) => (
        <section key={g.key} className="m-group">
          <h2 className={`m-group-head ${g.key === 'overdue' ? 'is-overdue' : ''}`}>
            {g.label} <span className="m-group-count">{g.tasks.length}</span>
          </h2>
          {g.tasks.map((t) => (
            <TaskRow key={t.id} task={t} onOpen={onOpenTask} />
          ))}
        </section>
      ))}

      {done.length > 0 && (
        <section className="m-group m-group-done">
          <h2 className="m-group-head">
            ✓ Erledigt (letzte 7 Tage) <span className="m-group-count">{done.length}</span>
          </h2>
          {done.map((t) => (
            <TaskRow key={t.id} task={t} onOpen={onOpenTask} showCompletedDate />
          ))}
        </section>
      )}
    </div>
  );
}

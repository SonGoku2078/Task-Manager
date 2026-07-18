import { useStore } from '../store';
import { mobileInbox, applyCompletionHold } from '../selectors';
import TaskRow from './TaskRow';

export default function Inbox({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const tasks = useStore((s) => s.tasks);
  const completionHold = useStore((s) => s.completionHold);
  // Inbox hides completed tasks → checked rows grey in place, then collapse
  // out ('exit', #53 AC2); the hold keeps them listed until then.
  const list = mobileInbox(applyCompletionHold(tasks, completionHold));

  if (list.length === 0) {
    return <p className="m-empty">📥 Inbox leer — alles zugeordnet. 🎉</p>;
  }
  return (
    <div className="m-list">
      {list.map((t) => (
        <TaskRow key={t.id} task={t} onOpen={onOpenTask} completionMode="exit" />
      ))}
    </div>
  );
}

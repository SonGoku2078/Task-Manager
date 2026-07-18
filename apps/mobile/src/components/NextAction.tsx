import { useStore } from '../store';
import { mobileNextAction, applyCompletionHold } from '../selectors';
import TaskRow from './TaskRow';

export default function NextAction({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const tasks = useStore((s) => s.tasks);
  const completionHold = useStore((s) => s.completionHold);
  // Next Action hides completed tasks → grey hold, then collapse out (#53).
  const list = mobileNextAction(applyCompletionHold(tasks, completionHold));

  if (list.length === 0) {
    return <p className="m-empty">⭐ Keine offenen Prioritäten — markiere Tasks mit ★.</p>;
  }
  return (
    <div className="m-list m-list-big">
      {list.map((t) => (
        <TaskRow key={t.id} task={t} onOpen={onOpenTask} completionMode="exit" />
      ))}
    </div>
  );
}

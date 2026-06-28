import { useStore } from '../store';
import { mobileNextAction } from '../selectors';
import TaskRow from './TaskRow';

export default function NextAction({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const tasks = useStore((s) => s.tasks);
  const list = mobileNextAction(tasks);

  if (list.length === 0) {
    return <p className="m-empty">⭐ Keine offenen Prioritäten — markiere Tasks mit ★.</p>;
  }
  return (
    <div className="m-list m-list-big">
      {list.map((t) => (
        <TaskRow key={t.id} task={t} onOpen={onOpenTask} />
      ))}
    </div>
  );
}

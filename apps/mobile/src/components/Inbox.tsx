import { useStore } from '../store';
import { mobileInbox } from '../selectors';
import TaskRow from './TaskRow';

export default function Inbox({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const tasks = useStore((s) => s.tasks);
  const list = mobileInbox(tasks);

  if (list.length === 0) {
    return <p className="m-empty">📥 Inbox leer — alles zugeordnet. 🎉</p>;
  }
  return (
    <div className="m-list">
      {list.map((t) => (
        <TaskRow key={t.id} task={t} onOpen={onOpenTask} />
      ))}
    </div>
  );
}

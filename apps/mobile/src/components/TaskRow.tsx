import { useStore } from '../store';
import { isOverdue } from '../selectors';
import type { Task } from '../types';

export default function TaskRow({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: (id: string) => void;
}) {
  const toggleTask = useStore((s) => s.toggleTask);
  const toggleStar = useStore((s) => s.toggleStar);
  const projects = useStore((s) => s.projects);
  const project = projects.find((p) => p.id === task.projectId);

  return (
    <div
      className={`m-row ${task.completed ? 'done' : ''}`}
      onClick={() => onOpen(task.id)}
    >
      <input
        type="checkbox"
        className="m-check"
        checked={task.completed}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          toggleTask(task.id);
        }}
      />
      <span className={`m-prio m-prio-${task.priority}`} />
      <div className="m-row-body">
        <div className="m-row-title">{task.title}</div>
        <div className="m-row-meta">
          {project && (
            <span className="m-row-project">
              <span className="m-dot" style={{ background: project.color }} />
              {project.name}
            </span>
          )}
          {task.dueDate && (
            <span className={`m-row-due ${isOverdue(task) ? 'overdue' : ''}`}>
              📅 {task.dueDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {task.durationMin ? <span className="m-row-dur">⏱ {task.durationMin}m</span> : null}
          {task.recurrence !== 'none' && <span title={task.recurrence}>↻</span>}
        </div>
      </div>
      <button
        className={`m-star ${task.starred ? 'on' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleStar(task.id);
        }}
      >
        {task.starred ? '★' : '☆'}
      </button>
    </div>
  );
}

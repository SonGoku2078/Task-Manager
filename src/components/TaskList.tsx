import type { Task } from '../types';
import { useStore } from '../store';
import './TaskList.css';

interface TaskListProps {
  tasks: Task[];
  onSelectTask: (task: Task | null) => void;
}

export default function TaskList({ tasks, onSelectTask }: TaskListProps) {
  const { toggleTask, toggleStar } = useStore();

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="task-item"
          onClick={() => onSelectTask(task)}
        >
          <input
            type="checkbox"
            className="task-checkbox"
            checked={task.completed}
            onChange={(e) => {
              e.stopPropagation();
              toggleTask(task.id);
            }}
          />
          <div className="task-content">
            <div className={`task-title ${task.completed ? 'completed' : ''}`}>
              {task.title}
            </div>
            <div className="task-meta">
              <span className="task-project">📌 1</span>
              {task.dueDate && (
                <span className={`task-time ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                  📅 {new Date(task.dueDate).toLocaleDateString('de-DE', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
            </div>
          </div>
          <div className="task-actions">
            <button
              className={`task-star ${task.starred ? 'starred' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleStar(task.id);
              }}
            >
              {task.starred ? '★' : '☆'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

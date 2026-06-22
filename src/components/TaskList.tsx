import { useState } from 'react';
import type { Task } from '../types';
import { useStore } from '../store';
import { isOverdue } from '../selectors';
import './TaskList.css';

interface TaskListProps {
  tasks: Task[];
  emptyHint?: string;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export default function TaskList({
  tasks,
  emptyHint,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
}: TaskListProps) {
  const toggleTask = useStore((s) => s.toggleTask);
  const toggleStar = useStore((s) => s.toggleStar);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.ui.selectedTaskId);
  const projects = useStore((s) => s.projects);
  const categories = useStore((s) => s.categories);
  const reorderTasks = useStore((s) => s.reorderTasks);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Drag & drop is for re-ordering only, not while bulk-selecting.
  const dragEnabled = !selectionMode;

  if (tasks.length === 0) {
    return (
      <div className="task-list-empty">
        <div className="empty-icon">🗒️</div>
        <p>{emptyHint ?? 'Keine Aufgaben hier. Füge oben eine neue hinzu.'}</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => {
        const project = projects.find((p) => p.id === task.projectId);
        const taskCats = categories.filter((c) => task.categoryIds.includes(c.id));
        return (
          <div
            key={task.id}
            className={`task-item ${selectedTaskId === task.id ? 'selected' : ''} ${
              task.completed ? 'is-completed' : ''
            } ${selectionMode && selectedIds?.has(task.id) ? 'bulk-selected' : ''} ${
              overId === task.id ? 'drag-over' : ''
            } ${dragId === task.id ? 'dragging' : ''}`}
            draggable={dragEnabled}
            onDragStart={() => dragEnabled && setDragId(task.id)}
            onDragOver={(e) => {
              if (!dragEnabled || !dragId) return;
              e.preventDefault();
              setOverId(task.id);
            }}
            onDragLeave={() => setOverId((cur) => (cur === task.id ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragEnabled && dragId) reorderTasks(dragId, task.id);
              setDragId(null);
              setOverId(null);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onClick={() =>
              selectionMode ? onToggleSelect?.(task.id) : selectTask(task.id)
            }
          >
            <input
              type="checkbox"
              className="task-checkbox"
              checked={
                selectionMode ? !!selectedIds?.has(task.id) : task.completed
              }
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                if (selectionMode) onToggleSelect?.(task.id);
                else toggleTask(task.id);
              }}
            />
            <span className={`priority-dot priority-${task.priority}`} title={task.priority} />
            <div className="task-content">
              <div className={`task-title ${task.completed ? 'completed' : ''}`}>
                {task.title}
              </div>
              <div className="task-meta">
                {project && (
                  <span className="task-project" style={{ color: project.color }}>
                    {project.icon} {project.name}
                  </span>
                )}
                {task.dueDate && (
                  <span className={`task-time ${isOverdue(task) ? 'overdue' : ''}`}>
                    📅{' '}
                    {task.dueDate.toLocaleDateString('de-DE', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
                {task.recurrence !== 'none' && (
                  <span className="task-recurring" title={`Wiederholt: ${task.recurrence}`}>
                    🔁
                  </span>
                )}
                {(task.comments?.length ?? 0) > 0 && (
                  <span
                    className="task-comments"
                    title={`${task.comments!.length} Kommentar${
                      task.comments!.length === 1 ? '' : 'e'
                    }`}
                  >
                    💬 {task.comments!.length}
                  </span>
                )}
                {taskCats.map((c) => (
                  <span key={c.id} className="task-cat" style={{ background: c.color }}>
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="task-actions">
              <button
                className={`task-star ${task.starred ? 'starred' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStar(task.id);
                }}
                title={task.starred ? 'Stern entfernen' : 'Markieren'}
              >
                {task.starred ? '★' : '☆'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import type { Task } from '../types';
import { useStore } from '../store';
import './TaskDetailPanel.css';

interface TaskDetailPanelProps {
  task: Task;
}

export default function TaskDetailPanel({ task }: TaskDetailPanelProps) {
  const { updateTask, deleteTask, selectTask } = useStore();

  return (
    <div className="task-detail-panel">
      <div className="panel-header">
        <h3>Task Details</h3>
        <button
          className="panel-close"
          onClick={() => selectTask(null)}
        >
          ✕
        </button>
      </div>

      <div className="panel-content">
        <div className="detail-field">
          <label className="detail-label">Title</label>
          <input
            type="text"
            className="detail-input"
            value={task.title}
            onChange={(e) => {
              e.stopPropagation();
              updateTask(task.id, { title: e.target.value });
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>

        <div className="detail-field">
          <label className="detail-label">Description</label>
          <textarea
            className="detail-input detail-textarea"
            value={task.description}
            onChange={(e) => updateTask(task.id, { description: e.target.value })}
            placeholder="Add notes..."
          />
        </div>

        <div className="detail-field">
          <label className="detail-label">Due Date</label>
          <input
            type="date"
            className="detail-input"
            value={task.dueDate.toISOString().split('T')[0]}
            onChange={(e) => updateTask(task.id, { dueDate: new Date(e.target.value) })}
          />
        </div>

        <div className="detail-field">
          <label className="detail-label">Priority</label>
          <select
            className="detail-select"
            value={task.priority}
            onChange={(e) => updateTask(task.id, { priority: e.target.value as any })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="detail-field">
          <label className="detail-label">Recurrence</label>
          <select
            className="detail-select"
            value={task.recurrence}
            onChange={(e) => updateTask(task.id, { recurrence: e.target.value as any })}
          >
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="detail-field">
          <label className="detail-label">Tags</label>
          <input
            type="text"
            className="detail-input"
            value={task.tags.join(', ')}
            onChange={(e) => updateTask(task.id, { tags: e.target.value.split(',').map(t => t.trim()) })}
            placeholder="Separate with commas"
          />
        </div>
      </div>

      <div className="panel-actions">
        <button
          className="btn btn-secondary"
          onClick={() => {
            deleteTask(task.id);
            selectTask(null as any);
          }}
        >
          Delete
        </button>
        <button
          className="btn btn-primary"
          onClick={() => selectTask(null)}
        >
          Save
        </button>
      </div>
    </div>
  );
}

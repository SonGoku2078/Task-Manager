import type { Task } from '../types';
import { useStore } from '../store';
import './TaskDetailPanel.css';

interface TaskDetailPanelProps {
  task: Task;
}

const toDateInput = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';

export default function TaskDetailPanel({ task }: TaskDetailPanelProps) {
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const selectTask = useStore((s) => s.selectTask);
  const toggleStar = useStore((s) => s.toggleStar);
  const projects = useStore((s) => s.projects);
  const categories = useStore((s) => s.categories);

  const toggleCategory = (id: string) => {
    const has = task.categoryIds.includes(id);
    updateTask(task.id, {
      categoryIds: has
        ? task.categoryIds.filter((c) => c !== id)
        : [...task.categoryIds, id],
    });
  };

  return (
    <div className="task-detail-panel">
      <div className="panel-header">
        <h3>Aufgabe</h3>
        <div className="panel-header-actions">
          <button
            className={`detail-star ${task.starred ? 'starred' : ''}`}
            onClick={() => toggleStar(task.id)}
            title="Markieren"
          >
            {task.starred ? '★' : '☆'}
          </button>
          <button className="panel-close" onClick={() => selectTask(null)}>
            ✕
          </button>
        </div>
      </div>

      <div className="panel-content">
        <div className="detail-field">
          <label className="detail-label">Titel</label>
          <input
            type="text"
            className="detail-input"
            value={task.title}
            onChange={(e) => updateTask(task.id, { title: e.target.value })}
          />
        </div>

        <div className="detail-field">
          <label className="detail-label">Beschreibung</label>
          <textarea
            className="detail-input detail-textarea"
            value={task.description}
            onChange={(e) => updateTask(task.id, { description: e.target.value })}
            placeholder="Notizen hinzufügen..."
          />
        </div>

        <div className="detail-row">
          <div className="detail-field">
            <label className="detail-label">Projekt</label>
            <select
              className="detail-select"
              value={task.projectId ?? ''}
              onChange={(e) =>
                updateTask(task.id, { projectId: e.target.value || null })
              }
            >
              <option value="">Inbox (kein Projekt)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="detail-field">
            <label className="detail-label">Priorität</label>
            <select
              className="detail-select"
              value={task.priority}
              onChange={(e) =>
                updateTask(task.id, { priority: e.target.value as Task['priority'] })
              }
            >
              <option value="low">Niedrig</option>
              <option value="medium">Mittel</option>
              <option value="high">Hoch</option>
            </select>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-field">
            <label className="detail-label">Fälligkeit</label>
            <input
              type="date"
              className="detail-input"
              value={toDateInput(task.dueDate)}
              onChange={(e) =>
                updateTask(task.id, {
                  dueDate: e.target.value ? new Date(e.target.value) : null,
                })
              }
            />
          </div>

          <div className="detail-field">
            <label className="detail-label">Wiederholung</label>
            <select
              className="detail-select"
              value={task.recurrence}
              onChange={(e) =>
                updateTask(task.id, {
                  recurrence: e.target.value as Task['recurrence'],
                })
              }
            >
              <option value="none">Keine</option>
              <option value="daily">Täglich</option>
              <option value="weekly">Wöchentlich</option>
              <option value="monthly">Monatlich</option>
            </select>
          </div>
        </div>

        <div className="detail-field">
          <label className="detail-label">Kategorien</label>
          <div className="cat-chips">
            {categories.length === 0 && (
              <span className="cat-empty">Noch keine Kategorien angelegt</span>
            )}
            {categories.map((c) => {
              const active = task.categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  className={`cat-chip ${active ? 'active' : ''}`}
                  style={active ? { background: c.color, borderColor: c.color } : { borderColor: c.color, color: c.color }}
                  onClick={() => toggleCategory(c.id)}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel-actions">
        <button
          className="btn btn-danger"
          onClick={() => {
            deleteTask(task.id);
          }}
        >
          Löschen
        </button>
        <button className="btn btn-primary" onClick={() => selectTask(null)}>
          Fertig
        </button>
      </div>
    </div>
  );
}

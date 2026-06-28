import { useState } from 'react';
import { useStore } from '../store';
import type { Priority } from '../types';

const toInput = (d: Date | null | undefined) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
const fromInput = (v: string): Date | null => (v ? new Date(`${v}T00:00:00`) : null);

export default function TaskDetailModal({
  taskId,
  onClose,
}: {
  taskId: string;
  onClose: () => void;
}) {
  const task = useStore((s) => s.tasks.find((t) => t.id === taskId));
  const projects = useStore((s) => s.projects);
  const categories = useStore((s) => s.categories);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const toggleTask = useStore((s) => s.toggleTask);
  const toggleStar = useStore((s) => s.toggleStar);

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');

  if (!task) return null;

  const save = () => {
    updateTask(task.id, { title: title.trim() || task.title, description });
    onClose();
  };
  const remove = () => {
    deleteTask(task.id);
    onClose();
  };

  return (
    <div className="m-modal-backdrop" onClick={onClose}>
      <div className="m-modal" onClick={(e) => e.stopPropagation()}>
        <div className="m-modal-head">
          <span className="m-modal-num">#{task.number}</span>
          <div className="m-modal-head-actions">
            <button
              className={`m-star ${task.starred ? 'on' : ''}`}
              onClick={() => toggleStar(task.id)}
            >
              {task.starred ? '★' : '☆'}
            </button>
            <button className="m-modal-x" onClick={onClose}>✕</button>
          </div>
        </div>

        <label className="m-field">
          <span>Titel</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="m-field">
          <span>Beschreibung</span>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div className="m-field-row">
          <label className="m-field">
            <span>Priorität</span>
            <select
              value={task.priority}
              onChange={(e) => updateTask(task.id, { priority: e.target.value as Priority })}
            >
              <option value="high">Hoch</option>
              <option value="medium">Mittel</option>
              <option value="low">Niedrig</option>
            </select>
          </label>
          <label className="m-field">
            <span>Fällig</span>
            <input
              type="date"
              value={toInput(task.dueDate)}
              onChange={(e) => updateTask(task.id, { dueDate: fromInput(e.target.value) })}
            />
          </label>
        </div>

        <label className="m-field">
          <span>Projekt</span>
          <select
            value={task.projectId ?? ''}
            onChange={(e) => updateTask(task.id, { projectId: e.target.value || null })}
          >
            <option value="">— Inbox (kein Projekt) —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        {categories.length > 0 && (
          <div className="m-field">
            <span>Kategorien</span>
            <div className="m-cats">
              {categories.map((c) => {
                const on = task.categoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    className={`m-cat ${on ? 'on' : ''}`}
                    style={on ? { background: c.color, borderColor: c.color } : undefined}
                    onClick={() =>
                      updateTask(task.id, {
                        categoryIds: on
                          ? task.categoryIds.filter((id) => id !== c.id)
                          : [...task.categoryIds, c.id],
                      })
                    }
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <label className="m-toggle">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => toggleTask(task.id)}
          />
          <span>Erledigt</span>
        </label>

        <div className="m-modal-foot">
          <button className="m-btn-del" onClick={remove}>🗑 Löschen</button>
          <button className="m-btn-save" onClick={save}>Speichern</button>
        </div>
      </div>
    </div>
  );
}

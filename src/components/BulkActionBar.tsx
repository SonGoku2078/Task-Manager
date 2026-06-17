import { useStore } from '../store';
import type { Priority } from '../types';
import './BulkActionBar.css';

interface BulkActionBarProps {
  selectedIds: string[];
  totalVisible: number;
  onSelectAll: () => void;
  onClear: () => void;
}

export default function BulkActionBar({
  selectedIds,
  totalVisible,
  onSelectAll,
  onClear,
}: BulkActionBarProps) {
  const bulkUpdate = useStore((s) => s.bulkUpdate);
  const bulkDelete = useStore((s) => s.bulkDelete);
  const projects = useStore((s) => s.projects);

  const count = selectedIds.length;
  const disabled = count === 0;

  return (
    <div className="bulk-bar">
      <label className="bulk-selectall">
        <input
          type="checkbox"
          checked={count > 0 && count === totalVisible}
          ref={(el) => {
            if (el) el.indeterminate = count > 0 && count < totalVisible;
          }}
          onChange={(e) => (e.target.checked ? onSelectAll() : onClear())}
        />
        {count} ausgewählt
      </label>

      <div className="bulk-actions">
        <button
          className="bulk-btn"
          disabled={disabled}
          onClick={() => bulkUpdate(selectedIds, { completed: true })}
        >
          ✓ Erledigen
        </button>
        <button
          className="bulk-btn"
          disabled={disabled}
          onClick={() => bulkUpdate(selectedIds, { completed: false })}
        >
          ↺ Öffnen
        </button>
        <button
          className="bulk-btn"
          disabled={disabled}
          onClick={() => bulkUpdate(selectedIds, { starred: true })}
        >
          ★ Markieren
        </button>

        <select
          className="bulk-select"
          disabled={disabled}
          value=""
          onChange={(e) => {
            if (e.target.value) {
              bulkUpdate(selectedIds, {
                projectId: e.target.value === '__inbox' ? null : e.target.value,
              });
              e.target.value = '';
            }
          }}
        >
          <option value="">Projekt setzen…</option>
          <option value="__inbox">Inbox (kein Projekt)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon} {p.name}
            </option>
          ))}
        </select>

        <select
          className="bulk-select"
          disabled={disabled}
          value=""
          onChange={(e) => {
            if (e.target.value) {
              bulkUpdate(selectedIds, { priority: e.target.value as Priority });
              e.target.value = '';
            }
          }}
        >
          <option value="">Priorität…</option>
          <option value="high">Hoch</option>
          <option value="medium">Mittel</option>
          <option value="low">Niedrig</option>
        </select>

        <button
          className="bulk-btn bulk-btn-danger"
          disabled={disabled}
          onClick={() => {
            if (window.confirm(`${count} Aufgabe(n) löschen?`)) {
              bulkDelete(selectedIds);
              onClear();
            }
          }}
        >
          🗑 Löschen
        </button>
      </div>

      <button className="bulk-cancel" onClick={onClear}>
        ✕ Auswahl beenden
      </button>
    </div>
  );
}

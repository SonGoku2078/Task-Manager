import { useStore } from '../store';
import type { Priority, SortField } from '../types';
import './FilterBar.css';

const SORT_LABELS: Record<SortField, string> = {
  manual: 'Standard',
  number: 'Nummer',
  priority: 'Priorität',
  dueDate: 'Fälligkeit',
  title: 'Titel',
  createdAt: 'Erstellt',
};

export default function FilterBar() {
  const filters = useStore((s) => s.ui.filters);
  const sortField = useStore((s) => s.ui.sortField);
  const sortDir = useStore((s) => s.ui.sortDir);
  const projects = useStore((s) => s.projects);
  const categories = useStore((s) => s.categories);
  const members = useStore((s) => s.members);
  const setFilter = useStore((s) => s.setFilter);
  const resetFilters = useStore((s) => s.resetFilters);
  const setSort = useStore((s) => s.setSort);
  const addSavedView = useStore((s) => s.addSavedView);
  const applySavedView = useStore((s) => s.applySavedView);

  const hasActiveFilter =
    filters.projectId !== null ||
    filters.categoryId !== null ||
    filters.priority !== null ||
    filters.completed !== null ||
    filters.dueFrom !== null ||
    filters.dueTo !== null ||
    (filters.assigneeId ?? null) !== null;

  return (
    <div className="filter-bar">
      <select
        className="filter-select"
        value={filters.projectId ?? ''}
        onChange={(e) => setFilter('projectId', e.target.value || null)}
      >
        <option value="">Alle Projekte</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id} style={{ color: p.color }}>
            ● {p.name}
          </option>
        ))}
      </select>

      <select
        className="filter-select"
        value={filters.categoryId ?? ''}
        onChange={(e) => setFilter('categoryId', e.target.value || null)}
      >
        <option value="">Alle Kategorien</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        className="filter-select"
        value={filters.priority ?? ''}
        onChange={(e) =>
          setFilter('priority', (e.target.value || null) as Priority | null)
        }
      >
        <option value="">Jede Priorität</option>
        <option value="high">Hoch</option>
        <option value="medium">Mittel</option>
        <option value="low">Niedrig</option>
      </select>

      <select
        className="filter-select"
        value={filters.completed === null ? '' : filters.completed ? 'done' : 'open'}
        onChange={(e) => {
          const v = e.target.value;
          setFilter('completed', v === '' ? null : v === 'done');
        }}
      >
        <option value="">Alle Status</option>
        <option value="open">Offen</option>
        <option value="done">Erledigt</option>
      </select>

      <select
        className="filter-select"
        value={filters.assigneeId ?? ''}
        onChange={(e) => setFilter('assigneeId', e.target.value || null)}
        title="Verantwortlich"
      >
        <option value="">Alle Personen</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <span className="filter-date-label" title="Fälligkeit von – bis">📅</span>
      <input
        type="date"
        className="filter-select filter-date"
        value={filters.dueFrom ?? ''}
        onChange={(e) => setFilter('dueFrom', e.target.value || null)}
        title="Fällig ab"
      />
      <span className="filter-date-sep">–</span>
      <input
        type="date"
        className="filter-select filter-date"
        value={filters.dueTo ?? ''}
        onChange={(e) => setFilter('dueTo', e.target.value || null)}
        title="Fällig bis"
      />

      <div className="filter-spacer" />

      <label className="filter-sort-label">Sortieren</label>
      <select
        className="filter-select"
        value={sortField}
        onChange={(e) => setSort(e.target.value as SortField, sortDir)}
      >
        {(Object.keys(SORT_LABELS) as SortField[]).map((f) => (
          <option key={f} value={f}>
            {SORT_LABELS[f]}
          </option>
        ))}
      </select>
      <button
        className="filter-dir-btn"
        title={sortDir === 'asc' ? 'Aufsteigend' : 'Absteigend'}
        disabled={sortField === 'manual'}
        onClick={() => setSort(sortField, sortDir === 'asc' ? 'desc' : 'asc')}
      >
        {sortDir === 'asc' ? '↑' : '↓'}
      </button>

      {hasActiveFilter && (
        <>
          <button
            className="filter-save"
            title="Aktuelle Filter als Ansicht speichern"
            onClick={() => {
              const name = window.prompt('Name der gespeicherten Ansicht:');
              if (name && name.trim()) {
                const view = addSavedView(name.trim());
                applySavedView(view.id);
              }
            }}
          >
            💾 Ansicht speichern
          </button>
          <button className="filter-reset" onClick={resetFilters}>
            ✕ Filter zurücksetzen
          </button>
        </>
      )}
    </div>
  );
}

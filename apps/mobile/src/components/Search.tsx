import { useState } from 'react';
import { useStore } from '../store';
import { matchesSearch } from '../selectors';
import TaskRow from './TaskRow';

// Full-screen search overlay. Reuses the desktop matcher (title, #number,
// description, assignee, waitingFor, status keywords).
export default function Search({
  onOpenTask,
  onClose,
}: {
  onOpenTask: (id: string) => void;
  onClose: () => void;
}) {
  const tasks = useStore((s) => s.tasks);
  const members = useStore((s) => s.members);
  const [q, setQ] = useState('');

  const results = q.trim()
    ? tasks.filter((t) => !t.parentId && matchesSearch(t, q, members)).slice(0, 100)
    : [];

  return (
    <div className="m-search-overlay">
      <div className="m-search-bar">
        <span className="m-search-icon">🔍</span>
        <input
          className="m-search-input"
          autoFocus
          placeholder="Suchen: Titel, #Nr, Person, Status…"
          inputMode="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="m-modal-x" onClick={onClose}>✕</button>
      </div>
      <div className="m-search-results">
        {q.trim() === '' ? (
          <p className="m-empty">Tippe, um zu suchen.</p>
        ) : results.length === 0 ? (
          <p className="m-empty">Keine Treffer.</p>
        ) : (
          results.map((t) => <TaskRow key={t.id} task={t} onOpen={onOpenTask} />)
        )}
      </div>
    </div>
  );
}

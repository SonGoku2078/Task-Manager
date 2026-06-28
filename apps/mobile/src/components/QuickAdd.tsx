import { useState } from 'react';
import { useStore } from '../store';
import type { Priority } from '../types';

const PRIOS: { key: Priority; icon: string; title: string }[] = [
  { key: 'high', icon: '🔴', title: 'Hoch' },
  { key: 'medium', icon: '🟡', title: 'Mittel' },
  { key: 'low', icon: '⚪', title: 'Niedrig' },
];

export default function QuickAdd() {
  const addTask = useStore((s) => s.addTask);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    addTask({ title: t, priority });
    setTitle('');
    setPriority('medium');
  };

  return (
    <div className="m-quickadd">
      <input
        className="m-quickadd-input"
        placeholder="+ Neue Aufgabe…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <div className="m-quickadd-prio">
        {PRIOS.map((p) => (
          <button
            key={p.key}
            className={`m-prio-btn ${priority === p.key ? 'on' : ''}`}
            title={p.title}
            onClick={() => setPriority(p.key)}
          >
            {p.icon}
          </button>
        ))}
      </div>
      <button className="m-quickadd-add" onClick={submit} disabled={!title.trim()}>
        +
      </button>
    </div>
  );
}

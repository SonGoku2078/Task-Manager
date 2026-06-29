import { useState } from 'react';
import { useStore } from '../store';

export default function QuickAdd() {
  const addTask = useStore((s) => s.addTask);
  const [title, setTitle] = useState('');

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    addTask({ title: t });
    setTitle('');
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
      <button className="m-quickadd-add" onClick={submit} disabled={!title.trim()}>
        +
      </button>
    </div>
  );
}

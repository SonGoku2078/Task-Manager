import { useState } from 'react';
import { useStore } from '../store';
import { parseQuickAdd } from '../quickParse';
import { dateKey } from '../selectors';
import type { MobileTab } from './Navigation';

// Quick-add for the flat list tabs. Mirrors the desktop: the active view seeds
// the new task's GTD flag (Heute → todayDate, Woche → thisWeek, Aktion →
// starred), and #Projekt / @Kategorie tokens file it (matched against existing
// projects/categories).
export default function QuickAdd({ tab }: { tab: MobileTab }) {
  const addTask = useStore((s) => s.addTask);
  const projects = useStore((s) => s.projects);
  const categories = useStore((s) => s.categories);
  const [title, setTitle] = useState('');

  const submit = () => {
    const raw = title.trim();
    if (!raw) return;
    const parsed = parseQuickAdd(raw);
    const projectId = parsed.projectName
      ? projects.find((p) => p.name.toLowerCase() === parsed.projectName!.toLowerCase())?.id ?? null
      : null;
    const categoryIds = parsed.categoryNames
      .map((n) => categories.find((c) => c.name.toLowerCase() === n.toLowerCase())?.id)
      .filter((x): x is string => !!x);
    addTask({
      title: parsed.title || raw,
      projectId,
      categoryIds,
      todayDate: tab === 'today' ? dateKey(new Date()) : null,
      thisWeek: tab === 'nextweek',
      starred: tab === 'nextaction',
    });
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

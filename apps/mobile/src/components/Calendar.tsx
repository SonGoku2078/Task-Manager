import { useState } from 'react';
import { useStore } from '../store';
import { tasksOnDate, dateKey, isSameDay } from '../selectors';
import TaskRow from './TaskRow';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function Calendar({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const tasks = useStore((s) => s.tasks);
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);

  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Count open, dated tasks per day for the dots.
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    if (!t.completed && t.dueDate && t.dueDate.getFullYear() === year && t.dueDate.getMonth() === month) {
      const k = dateKey(t.dueDate);
      counts[k] = (counts[k] ?? 0) + 1;
    }
  }

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const dayTasks = tasksOnDate(tasks, selected).filter((t) => !t.parentId);

  return (
    <div className="m-cal">
      <div className="m-cal-toolbar">
        <button className="m-cal-nav" onClick={() => setView(new Date(year, month - 1, 1))}>‹</button>
        <span className="m-cal-month">
          {view.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
        </span>
        <button className="m-cal-nav" onClick={() => setView(new Date(year, month + 1, 1))}>›</button>
      </div>

      <div className="m-cal-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="m-cal-wd">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="m-cal-cell empty" />;
          const k = dateKey(d);
          const n = counts[k] ?? 0;
          return (
            <button
              key={i}
              className={`m-cal-cell ${isSameDay(d, today) ? 'today' : ''} ${
                isSameDay(d, selected) ? 'sel' : ''
              }`}
              onClick={() => setSelected(d)}
            >
              <span className="m-cal-num">{d.getDate()}</span>
              {n > 0 && <span className="m-cal-dot">{n > 3 ? '•••' : '•'.repeat(n)}</span>}
            </button>
          );
        })}
      </div>

      <div className="m-cal-day">
        <h2 className="m-group-head">
          {selected.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          <span className="m-group-count">{dayTasks.length}</span>
        </h2>
        {dayTasks.length === 0 ? (
          <p className="m-empty">Keine Aufgaben an diesem Tag.</p>
        ) : (
          dayTasks.map((t) => <TaskRow key={t.id} task={t} onOpen={onOpenTask} />)
        )}
      </div>
    </div>
  );
}

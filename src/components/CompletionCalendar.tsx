import { useState } from 'react';
import type { Task } from '../types';
import './CompletionCalendar.css';

interface Props {
  tasks: Task[];
}

export default function CompletionCalendar({ tasks }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based

  // Count completions per day key "YYYY-MM-DD"
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    if (t.completed && t.completedAt) {
      const d = new Date(t.completedAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = `${year}-${month}-${d.getDate()}`;
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
  }

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = (firstDay + 6) % 7; // Mon-based offset
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const monthName = new Date(year, month, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const dayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const totalThisMonth = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="completion-cal">
      <div className="completion-cal-header">
        <button className="completion-cal-nav" onClick={prevMonth}>‹</button>
        <span className="completion-cal-title">{monthName} · <span className="completion-cal-count">{totalThisMonth} erledigt</span></span>
        <button className="completion-cal-nav" onClick={nextMonth}>›</button>
      </div>
      <div className="completion-cal-grid">
        {dayLabels.map(d => (
          <div key={d} className="completion-cal-label">{d}</div>
        ))}
        {Array.from({ length: startOffset }, (_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const key = `${year}-${month}-${day}`;
          const count = counts[key] ?? 0;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return (
            <div
              key={day}
              className={`completion-cal-day ${count > 0 ? 'has-completions' : ''} ${isToday ? 'is-today' : ''}`}
              title={count > 0 ? `${count} Aufgabe${count > 1 ? 'n' : ''} erledigt` : ''}
            >
              <span className="completion-cal-day-num">{day}</span>
              {count > 0 && (
                <span className={`completion-cal-dot dot-${Math.min(count, 5)}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useStore } from '../store';
import {
  tasksOnDate,
  dateKey,
  isSameDay,
  addDays,
  startOfWeek,
  weekDays7,
} from '../selectors';
import TaskRow from './TaskRow';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const fmtShort = (d: Date) => d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

export default function Calendar({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const tasks = useStore((s) => s.tasks);
  const today = new Date();
  const [mode, setMode] = useState<'week' | 'day'>('week');
  const [anchor, setAnchor] = useState<Date>(today);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const root = (t: { parentId?: string | null }) => !t.parentId;
  const weekStart = startOfWeek(anchor);
  const weekEnd = addDays(weekStart, 6);
  const step = (dir: number) =>
    setAnchor((a) => addDays(a, mode === 'week' ? dir * 7 : dir));

  const label =
    mode === 'week'
      ? `${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`
      : anchor.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });

  // ── Month picker grid ──
  const year = pickerMonth.getFullYear();
  const month = pickerMonth.getMonth();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
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

  const pickDay = (d: Date) => {
    setAnchor(d);
    setPickerOpen(false);
  };

  // ── Task lists ──
  const dayList = (d: Date) => tasksOnDate(tasks, d).filter(root);

  return (
    <div className="m-cal">
      <div className="m-cal-header">
        <div className="m-cal-modes">
          <button className={`m-seg ${mode === 'week' ? 'on' : ''}`} onClick={() => setMode('week')}>Woche</button>
          <button className={`m-seg ${mode === 'day' ? 'on' : ''}`} onClick={() => setMode('day')}>Tag</button>
        </div>
        <div className="m-cal-pick">
          <button className="m-cal-nav" onClick={() => step(-1)}>‹</button>
          <button
            className="m-cal-label"
            onClick={() => { setPickerMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1)); setPickerOpen((o) => !o); }}
          >
            📅 {label} {pickerOpen ? '▴' : '▾'}
          </button>
          <button className="m-cal-nav" onClick={() => step(1)}>›</button>
        </div>
        <button className="m-cal-today" onClick={() => { setAnchor(today); setPickerOpen(false); }}>Heute</button>
      </div>

      {pickerOpen && (
        <div className="m-cal-picker">
          <div className="m-cal-toolbar">
            <button className="m-cal-nav" onClick={() => setPickerMonth(new Date(year, month - 1, 1))}>‹</button>
            <span className="m-cal-month">{pickerMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</span>
            <button className="m-cal-nav" onClick={() => setPickerMonth(new Date(year, month + 1, 1))}>›</button>
          </div>
          <div className="m-cal-grid">
            {WEEKDAYS.map((w) => <div key={w} className="m-cal-wd">{w}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="m-cal-cell empty" />;
              const inSel = mode === 'week' ? d >= weekStart && d <= weekEnd : isSameDay(d, anchor);
              const n = counts[dateKey(d)] ?? 0;
              return (
                <button
                  key={i}
                  className={`m-cal-cell ${isSameDay(d, today) ? 'today' : ''} ${inSel ? 'sel' : ''}`}
                  onClick={() => pickDay(d)}
                >
                  <span className="m-cal-num">{d.getDate()}</span>
                  {n > 0 && <span className="m-cal-dot">{n > 3 ? '•••' : '•'.repeat(n)}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'week' ? (
        <div className="m-list">
          {weekDays7(weekStart).map((d) => {
            const list = dayList(d);
            return (
              <section key={dateKey(d)} className="m-group">
                <h2 className={`m-group-head ${isSameDay(d, today) ? 'is-today' : ''}`}>
                  {d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
                  <span className="m-group-count">{list.length}</span>
                </h2>
                {list.length === 0
                  ? <p className="m-empty m-empty-sm">—</p>
                  : list.map((t) => <TaskRow key={t.id} task={t} onOpen={onOpenTask} />)}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="m-list">
          <h2 className="m-group-head">
            {anchor.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            <span className="m-group-count">{dayList(anchor).length}</span>
          </h2>
          {dayList(anchor).length === 0
            ? <p className="m-empty">Keine Aufgaben an diesem Tag.</p>
            : dayList(anchor).map((t) => <TaskRow key={t.id} task={t} onOpen={onOpenTask} />)}
        </div>
      )}
    </div>
  );
}

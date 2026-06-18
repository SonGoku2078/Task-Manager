import type { MouseEvent } from 'react';
import { useStore } from '../store';
import { isSameDay, tasksOnDate, dateKey } from '../selectors';
import { downloadICS } from '../ics';
import './CalendarPanel.css';

// Inclusive list of YYYY-MM-DD keys between two dates (order-independent).
const rangeKeys = (a: Date, b: Date): string[] => {
  const start = new Date(Math.min(a.getTime(), b.getTime()));
  const end = new Date(Math.max(a.getTime(), b.getTime()));
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const keys: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    keys.push(dateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
};

const monthNames = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];
const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
// Monday-first index (0 = Monday).
const firstWeekday = (y: number, m: number) => (new Date(y, m, 1).getDay() + 6) % 7;

export default function CalendarPanel() {
  const currentDate = useStore((s) => s.ui.currentDate);
  const selectedDates = useStore((s) => s.ui.selectedDates);
  const setCurrentDate = useStore((s) => s.setCurrentDate);
  const setSelectedDates = useStore((s) => s.setSelectedDates);
  const setView = useStore((s) => s.setView);
  const tasks = useStore((s) => s.tasks);

  // Effective selection (fallback to the anchor day when nothing explicit is chosen).
  const selectedSet = new Set(
    selectedDates.length ? selectedDates : [dateKey(currentDate)]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const totalDays = daysInMonth(year, month);
  const lead = firstWeekday(year, month);

  const cells: ({ day: number; date: Date } | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, date: new Date(year, month, d) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1));
  };

  const selectDay = (date: Date, e: MouseEvent) => {
    const key = dateKey(date);
    if (e.shiftKey) {
      // Range from the anchor day to the clicked day.
      setSelectedDates(rangeKeys(currentDate, date));
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle this day in/out of the multi-selection.
      const base = selectedDates.length ? selectedDates : [dateKey(currentDate)];
      const next = base.includes(key)
        ? base.filter((k) => k !== key)
        : [...base, key];
      setSelectedDates(next);
    } else {
      // Plain click selects a single day.
      setSelectedDates([key]);
    }
    setCurrentDate(date);
    setView('calendar');
  };

  const selectToday = () => {
    const today = new Date();
    setSelectedDates([dateKey(today)]);
    setCurrentDate(today);
    setView('calendar');
  };

  const isSelected = (date: Date) => selectedSet.has(dateKey(date));

  return (
    <div className="calendar-panel">
      <h3 className="calendar-title">Kalender</h3>

      <button className="btn-week" onClick={selectToday}>
        Heute
      </button>

      <div className="calendar-nav">
        <button className="cal-nav-btn" onClick={() => changeMonth(-1)} title="Vorheriger Monat">
          ‹
        </button>
        <span className="cal-month-label">
          {monthNames[month]} {year}
        </span>
        <button className="cal-nav-btn" onClick={() => changeMonth(1)} title="Nächster Monat">
          ›
        </button>
      </div>

      <div className="weekdays">
        {weekDays.map((d) => (
          <div key={d} className="weekday">
            {d}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={idx} className="cal-day empty" />;
          const count = tasksOnDate(tasks, cell.date).length;
          return (
            <button
              key={idx}
              className={`cal-day ${isSameDay(cell.date, today) ? 'today' : ''} ${
                isSelected(cell.date) ? 'selected' : ''
              }`}
              onClick={(e) => selectDay(cell.date, e)}
            >
              <span className="cal-day-num">{cell.day}</span>
              {count > 0 && <span className="cal-day-dot">{count > 3 ? '•••' : '•'.repeat(count)}</span>}
            </button>
          );
        })}
      </div>

      {selectedDates.length > 1 ? (
        <div className="cal-multi">
          <span>{selectedDates.length} Tage ausgewählt</span>
          <button
            className="cal-multi-clear"
            onClick={() => setSelectedDates([dateKey(currentDate)])}
          >
            zurücksetzen
          </button>
        </div>
      ) : (
        <p className="cal-multi-hint">
          Mehrere Tage: Strg/Cmd-Klick · Bereich: Shift-Klick
        </p>
      )}

      <div className="calendar-export">
        <button
          className="ics-export-btn"
          onClick={() => downloadICS(tasks)}
          title="Aufgaben mit Fälligkeit als .ics-Datei exportieren"
        >
          📥 Als .ics exportieren
        </button>
        <p className="ics-hint">
          In Google/Apple Kalender importierbar. Hinweis: ein automatisch
          aktualisierendes Abo (webcal://) bräuchte einen Server.
        </p>
      </div>
    </div>
  );
}

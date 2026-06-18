import { useStore } from '../store';
import { isSameDay, tasksOnDate } from '../selectors';
import { downloadICS } from '../ics';
import './CalendarPanel.css';

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
  const currentView = useStore((s) => s.ui.currentView);
  const setCurrentDate = useStore((s) => s.setCurrentDate);
  const setView = useStore((s) => s.setView);
  const tasks = useStore((s) => s.tasks);

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

  const selectDay = (date: Date) => {
    setCurrentDate(date);
    setView('calendar');
  };

  const isSelected = (date: Date) =>
    currentView === 'calendar' && isSameDay(date, currentDate);

  return (
    <div className="calendar-panel">
      <h3 className="calendar-title">Kalender</h3>

      <button className="btn-week" onClick={() => selectDay(new Date())}>
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
              onClick={() => selectDay(cell.date)}
            >
              <span className="cal-day-num">{cell.day}</span>
              {count > 0 && <span className="cal-day-dot">{count > 3 ? '•••' : '•'.repeat(count)}</span>}
            </button>
          );
        })}
      </div>

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

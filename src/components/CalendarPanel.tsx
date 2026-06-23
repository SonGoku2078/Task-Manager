import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useStore } from '../store';
import {
  isSameDay,
  tasksOnDate,
  dateKey,
  startOfWeek,
  addDays,
  isoWeek,
} from '../selectors';
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
const weekDayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function CalendarPanel() {
  const currentDate = useStore((s) => s.ui.currentDate);
  const selectedDates = useStore((s) => s.ui.selectedDates);
  const setCurrentDate = useStore((s) => s.setCurrentDate);
  const setSelectedDates = useStore((s) => s.setSelectedDates);
  const setView = useStore((s) => s.setView);
  const tasks = useStore((s) => s.tasks);
  const updateTask = useStore((s) => s.updateTask);
  const monthCount = useStore((s) => s.settings.calendarMonthCount ?? 1);
  const setCalendarMonthCount = useStore((s) => s.setCalendarMonthCount);

  const [dropKey, setDropKey] = useState<string | null>(null);

  // Effective selection (fallback to the anchor day when nothing explicit is chosen).
  const selectedSet = new Set(
    selectedDates.length ? selectedDates : [dateKey(currentDate)]
  );

  const today = new Date();

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const selectDay = (date: Date, e: MouseEvent) => {
    const key = dateKey(date);
    if (e.shiftKey) {
      setSelectedDates(rangeKeys(currentDate, date));
    } else if (e.ctrlKey || e.metaKey) {
      const base = selectedDates.length ? selectedDates : [dateKey(currentDate)];
      const next = base.includes(key)
        ? base.filter((k) => k !== key)
        : [...base, key];
      setSelectedDates(next);
    } else {
      setSelectedDates([key]);
    }
    setCurrentDate(date);
    setView('calendar');
  };

  const selectToday = () => {
    const t = new Date();
    setSelectedDates([dateKey(t)]);
    setCurrentDate(t);
    setView('calendar');
  };

  const isSelected = (date: Date) => selectedSet.has(dateKey(date));

  // Drag a task from anywhere (week view / list) onto a day → reschedule it.
  const onDropDay = (date: Date) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) updateTask(id, { dueDate: new Date(date) });
    setDropKey(null);
  };

  // Drag the bottom handle to reveal / hide the second month.
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startCount = monthCount;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      setCalendarMonthCount(startCount + Math.round(delta / 130));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const renderMonth = (offset: number) => {
    const base = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    const year = base.getFullYear();
    const month = base.getMonth();
    const gridStart = startOfWeek(base); // Monday on/before the 1st
    // 6 week-rows always fully cover any month.
    const weeks = Array.from({ length: 6 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d))
    );

    return (
      <div key={offset} className="calendar-month">
        <div className="calendar-nav">
          {offset === 0 ? (
            <button className="cal-nav-btn" onClick={() => changeMonth(-1)} title="Vorheriger Monat">
              ‹
            </button>
          ) : (
            <span className="cal-nav-spacer" />
          )}
          <span className="cal-month-label">
            {monthNames[month]} {year}
          </span>
          {offset === monthCount - 1 ? (
            <button className="cal-nav-btn" onClick={() => changeMonth(1)} title="Nächster Monat">
              ›
            </button>
          ) : (
            <span className="cal-nav-spacer" />
          )}
        </div>

        <div className="weekdays">
          <div className="weekday weeknum-head" title="Kalenderwoche">
            KW
          </div>
          {weekDayLabels.map((d) => (
            <div key={d} className="weekday">
              {d}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {weeks.map((week) => (
            <div key={dateKey(week[0])} className="cal-week-row">
              <div className="cal-weeknum" title="Kalenderwoche">
                {isoWeek(week[0])}
              </div>
              {week.map((date) => {
                const dayTasks = tasksOnDate(tasks, date);
                const openCount = dayTasks.filter((t) => !t.completed).length;
                const doneCount = dayTasks.length - openCount;
                const key = dateKey(date);
                return (
                  <button
                    key={key}
                    className={`cal-day ${date.getMonth() === month ? '' : 'outside'} ${
                      isSameDay(date, today) ? 'today' : ''
                    } ${isSelected(date) ? 'selected' : ''} ${
                      dropKey === key ? 'drop-target' : ''
                    }`}
                    onClick={(e) => selectDay(date, e)}
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes('text/plain')) {
                        e.preventDefault();
                        setDropKey(key);
                      }
                    }}
                    onDragLeave={() => setDropKey((c) => (c === key ? null : c))}
                    onDrop={onDropDay(date)}
                  >
                    <span className="cal-day-num">{date.getDate()}</span>
                    {dayTasks.length > 0 && (
                      <span
                        className="cal-day-dots"
                        title={`${openCount} offen · ${doneCount} erledigt`}
                      >
                        {openCount > 0 && <span className="cal-dot open" />}
                        {doneCount > 0 && <span className="cal-dot done" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-panel">
      <h3 className="calendar-title">Kalender</h3>

      <button className="btn-week" onClick={selectToday}>
        Heute
      </button>

      {Array.from({ length: monthCount }, (_, i) => renderMonth(i))}

      <div
        className="calendar-resize"
        title={monthCount < 2 ? 'Nach unten ziehen für 2. Monat' : 'Nach oben ziehen für 1 Monat'}
        onMouseDown={startResize}
      >
        <span className="calendar-resize-grip" />
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
          Mehrere Tage: Strg/Cmd-Klick · Bereich: Shift-Klick · Aufgabe auf einen Tag ziehen verschiebt sie
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

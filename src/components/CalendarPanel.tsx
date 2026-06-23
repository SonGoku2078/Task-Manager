import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useStore } from '../store';
import {
  isSameDay,
  tasksOnDate,
  dateKey,
  startOfWeek,
  weekDays7,
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
  const addTask = useStore((s) => s.addTask);
  const selectTaskForEdit = useStore((s) => s.selectTaskForEdit);
  const monthCount = useStore((s) => s.settings.calendarMonthCount ?? 1);
  const setCalendarMonthCount = useStore((s) => s.setCalendarMonthCount);
  const calendarMode = useStore((s) => s.settings.calendarMode ?? 'list');
  const setCalendarMode = useStore((s) => s.setCalendarMode);

  const [dropKey, setDropKey] = useState<string | null>(null);

  // The month(s) shown by the grid — independent from the selected/anchor day so
  // selecting a day in the second month doesn't shift the whole calendar.
  const [viewMonth, setViewMonth] = useState(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  );

  // Mouse drag-select state.
  const painting = useRef(false);
  const anchor = useRef<Date | null>(null);

  useEffect(() => {
    const onUp = () => {
      if (!painting.current) return;
      painting.current = false;
      anchor.current = null;
      // A multi-day drag selection switches to the week view as columns.
      if (useStore.getState().ui.selectedDates.length > 1) {
        setCalendarMode('week');
        setView('calendar');
      }
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [setCalendarMode, setView]);

  const selectedSet = new Set(
    selectedDates.length ? selectedDates : [dateKey(currentDate)]
  );

  // Days currently visible in the main area — highlighted distinctly from today.
  const visibleSet = (() => {
    if (calendarMode === 'rolling') {
      return new Set(weekDays7(addDays(new Date(), 0)).map(dateKey));
    }
    if (calendarMode === 'week') {
      if (selectedDates.length > 1) return new Set(selectedDates);
      return new Set(weekDays7(startOfWeek(currentDate)).map(dateKey));
    }
    return selectedSet; // list mode
  })();

  const today = new Date();

  const changeMonth = (delta: number) =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));

  const selectDay = (date: Date, e: MouseEvent) => {
    const key = dateKey(date);
    if (e.shiftKey) {
      setSelectedDates(rangeKeys(currentDate, date));
    } else if (e.ctrlKey || e.metaKey) {
      const base = selectedDates.length ? selectedDates : [dateKey(currentDate)];
      setSelectedDates(
        base.includes(key) ? base.filter((k) => k !== key) : [...base, key]
      );
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
    setViewMonth(new Date(t.getFullYear(), t.getMonth(), 1));
    setView('calendar');
  };

  // Click a calendar-week number → jump to the week view of that week.
  const selectWeek = (monday: Date) => {
    setSelectedDates(weekDays7(monday).map(dateKey));
    setCurrentDate(monday);
    setCalendarMode('week');
    setView('calendar');
  };

  const onDropDay = (date: Date) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) updateTask(id, { dueDate: new Date(date) });
    setDropKey(null);
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startCount = monthCount;
    const onMove = (ev: globalThis.MouseEvent) => {
      setCalendarMonthCount(startCount + Math.round((ev.clientY - startY) / 130));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const renderMonth = (offset: number) => {
    const base = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + offset, 1);
    const month = base.getMonth();
    const gridStart = startOfWeek(base);
    const weeks = Array.from({ length: 6 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d))
    );

    return (
      <div key={offset} className="calendar-month">
        {offset > 0 && (
          <div className="cal-month-label">
            {monthNames[month]} {base.getFullYear()}
          </div>
        )}

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
              <button
                className="cal-weeknum"
                title="Diese Woche in der Wochenansicht öffnen"
                onClick={() => selectWeek(week[0])}
              >
                {isoWeek(week[0])}
              </button>
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
                    } ${selectedSet.has(key) ? 'selected' : ''} ${
                      visibleSet.has(key) ? 'in-view' : ''
                    } ${dropKey === key ? 'drop-target' : ''}`}
                    onClick={(e) => selectDay(date, e)}
                    onDoubleClick={() => {
                      const created = addTask({
                        title: 'Neue Aufgabe',
                        dueDate: new Date(date),
                        startMinutes: null,
                      });
                      selectTaskForEdit(created.id);
                    }}
                    onMouseDown={(e) => {
                      if (e.shiftKey || e.ctrlKey || e.metaKey) return;
                      e.preventDefault();
                      painting.current = true;
                      anchor.current = date;
                      setSelectedDates([key]);
                      setCurrentDate(date);
                    }}
                    onMouseEnter={() => {
                      if (painting.current && anchor.current) {
                        setSelectedDates(rangeKeys(anchor.current, date));
                      }
                    }}
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

      <div className="calendar-nav">
        <button className="cal-nav-btn" onClick={() => changeMonth(-1)} title="Vorheriger Monat">
          ‹
        </button>
        <span className="cal-nav-hint">
          {monthNames[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </span>
        <button className="cal-nav-btn" onClick={() => changeMonth(1)} title="Nächster Monat">
          ›
        </button>
      </div>

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
          Tage ziehen wählt mehrere aus · KW-Nummer öffnet die Woche · Aufgabe auf einen Tag ziehen verschiebt sie
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

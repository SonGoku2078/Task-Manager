import { useStore } from '../store';
import {
  startOfWeek,
  weekDays7,
  addDays,
  isSameDay,
  dateKey,
  tasksOnDate,
} from '../selectors';
import type { Task } from '../types';
import './WeekView.css';

const weekDayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface WeekViewProps {
  mode: 'week' | 'rolling';
}

const parseKey = (k: string) => new Date(`${k}T00:00:00`);

export default function WeekView({ mode }: WeekViewProps) {
  const currentDate = useStore((s) => s.ui.currentDate);
  const selectedDates = useStore((s) => s.ui.selectedDates);
  const setCurrentDate = useStore((s) => s.setCurrentDate);
  const tasks = useStore((s) => s.tasks);
  const categories = useStore((s) => s.categories);
  const updateTask = useStore((s) => s.updateTask);
  const toggleTask = useStore((s) => s.toggleTask);
  const addTask = useStore((s) => s.addTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.ui.selectedTaskId);
  const startHour = useStore((s) => s.settings.calendarStartHour ?? 6);
  const endHour = useStore((s) => s.settings.calendarEndHour ?? 22);
  const hourHeight = useStore((s) => s.settings.calendarHourHeight ?? 48);
  const setCalendarHours = useStore((s) => s.setCalendarHours);
  const setCalendarHourHeight = useStore((s) => s.setCalendarHourHeight);

  const today = new Date();

  // Which days become columns.
  let days: Date[];
  if (mode === 'rolling') {
    days = weekDays7(addDays(today, 0));
  } else if (selectedDates.length > 1) {
    // A drag/range selection in the month panel drives the visible columns.
    days = [...selectedDates].sort().slice(0, 14).map(parseKey);
  } else {
    days = weekDays7(startOfWeek(currentDate));
  }

  const selectedSet = new Set(selectedDates);

  // Zoom → time granularity. Taller rows reveal finer slots.
  const slots = hourHeight >= 110 ? 4 : hourHeight >= 64 ? 2 : 1;
  const snap = 60 / slots;
  const slotPx = hourHeight / slots;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = (endHour - startHour) * hourHeight;

  const shiftWeek = (delta: number) =>
    setCurrentDate(addDays(days[0], delta * days.length));
  const goToday = () => setCurrentDate(new Date());

  // y (px from column top) → snapped minutes-from-midnight, clamped to the range.
  const yToMinutes = (y: number) => {
    const raw = startHour * 60 + (y / hourHeight) * 60;
    const snapped = Math.round(raw / snap) * snap;
    return Math.max(startHour * 60, Math.min(endHour * 60 - snap, snapped));
  };

  const dropOnNoTime = (date: Date) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) updateTask(id, { dueDate: new Date(date), startMinutes: null });
  };

  const dropOnTime = (date: Date, colEl: HTMLElement | null) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id || !colEl) return;
    const y = e.clientY - colEl.getBoundingClientRect().top;
    const t = tasks.find((x) => x.id === id);
    updateTask(id, {
      dueDate: new Date(date),
      startMinutes: yToMinutes(y),
      durationMin: t?.durationMin ?? 60,
    });
  };

  const createAt = (date: Date, startMinutes: number | null) => {
    const created = addTask({
      title: 'Neue Aufgabe',
      dueDate: new Date(date),
      startMinutes,
      durationMin: startMinutes == null ? null : 60,
    });
    selectTask(created.id);
  };

  // Drag the bottom edge of a timed block to change its duration.
  const startResizeBlock = (task: Task, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startDur = task.durationMin ?? 60;
    const onMove = (ev: MouseEvent) => {
      const deltaMin = ((ev.clientY - startY) / hourHeight) * 60;
      const next = Math.max(snap, Math.round((startDur + deltaMin) / snap) * snap);
      updateTask(task.id, { durationMin: next });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Drag the time gutter vertically to zoom (reveals 30-/15-min slots).
  const startZoom = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = hourHeight;
    const onMove = (ev: MouseEvent) => {
      setCalendarHourHeight(startH + (ev.clientY - startY) * 0.6);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const catColor = (task: Task) =>
    categories.find((c) => task.categoryIds.includes(c.id))?.color;

  const toggleOpen = (id: string) => selectTask(selectedTaskId === id ? null : id);

  const rangeLabel =
    `${days[0].toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} – ` +
    days[days.length - 1].toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div className="week-view">
      <div className="week-toolbar">
        <div className="week-nav">
          <button className="week-nav-btn" onClick={() => shiftWeek(-1)} title="Zurück">
            ‹
          </button>
          <button className="week-today-btn" onClick={goToday}>
            Heute
          </button>
          <button className="week-nav-btn" onClick={() => shiftWeek(1)} title="Weiter">
            ›
          </button>
          <span className="week-range">{rangeLabel}</span>
        </div>

        <div className="week-hours-ctrl">
          <span>Zeit</span>
          <label>
            von
            <input
              type="number"
              min={0}
              max={23}
              value={startHour}
              onChange={(e) => setCalendarHours(Number(e.target.value), endHour)}
            />
          </label>
          <label>
            bis
            <input
              type="number"
              min={1}
              max={24}
              value={endHour}
              onChange={(e) => setCalendarHours(startHour, Number(e.target.value))}
            />
          </label>
          <span>Uhr</span>
        </div>
      </div>

      {/* Column headers */}
      <div
        className="week-head"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div className="week-gutter-head" />
        {days.map((d) => (
          <div
            key={dateKey(d)}
            className={`week-col-head ${isSameDay(d, today) ? 'is-today' : ''} ${
              selectedSet.has(dateKey(d)) ? 'is-selected' : ''
            }`}
          >
            <span className="week-col-day">{weekDayLabels[(d.getDay() + 6) % 7]}</span>
            <span className="week-col-date">{d.getDate()}.</span>
          </div>
        ))}
      </div>

      {/* "ohne Zeit" — tasks that only have a date */}
      <div
        className="week-allday"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div className="week-gutter-label">ohne&nbsp;Zeit</div>
        {days.map((d) => {
          const dayTasks = tasksOnDate(tasks, d).filter(
            (t) => !t.parentId && (t.startMinutes == null)
          );
          return (
            <div
              key={dateKey(d)}
              className="week-allday-cell"
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('text/plain')) e.preventDefault();
              }}
              onDrop={dropOnNoTime(d)}
              onDoubleClick={() => createAt(d, null)}
            >
              {dayTasks.map((t) => (
                <div
                  key={t.id}
                  className={`week-task ${t.completed ? 'done' : ''} ${
                    selectedTaskId === t.id ? 'selected' : ''
                  }`}
                  style={catColor(t) ? { borderLeftColor: catColor(t) } : undefined}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                  onClick={() => toggleOpen(t.id)}
                  title={t.title}
                >
                  <input
                    type="checkbox"
                    className="week-task-check"
                    checked={t.completed}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleTask(t.id);
                    }}
                  />
                  <span className="week-task-title">{t.title}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="week-grid-scroll">
        <div
          className="week-grid"
          style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
        >
          <div className="week-gutter" style={{ height: gridHeight }} onMouseDown={startZoom} title="Ziehen zum Zoomen (Stunden / 30 / 15 Min)">
            {hours.map((h) => (
              <div key={h} className="week-hour-label" style={{ height: hourHeight }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {days.map((d) => {
            const colRef = { current: null as HTMLElement | null };
            const timed = tasksOnDate(tasks, d).filter(
              (t) => !t.parentId && t.startMinutes != null
            );
            return (
              <div
                key={dateKey(d)}
                className={`week-col ${isSameDay(d, today) ? 'is-today' : ''}`}
                style={{
                  height: gridHeight,
                  backgroundImage: `repeating-linear-gradient(to bottom, var(--border-light) 0, var(--border-light) 1px, transparent 1px, transparent ${slotPx}px)`,
                }}
                ref={(el) => {
                  colRef.current = el;
                }}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes('text/plain')) e.preventDefault();
                }}
                onDrop={(e) => dropOnTime(d, colRef.current)(e)}
                onDoubleClick={(e) => {
                  const y = e.clientY - (colRef.current?.getBoundingClientRect().top ?? 0);
                  createAt(d, yToMinutes(y));
                }}
              >
                {timed.map((t) => {
                  const start = t.startMinutes ?? startHour * 60;
                  const top = ((start - startHour * 60) / 60) * hourHeight;
                  const height = Math.max(18, ((t.durationMin ?? 60) / 60) * hourHeight);
                  return (
                    <div
                      key={t.id}
                      className={`week-block ${t.completed ? 'done' : ''} ${
                        selectedTaskId === t.id ? 'selected' : ''
                      }`}
                      style={{
                        top,
                        height,
                        borderLeftColor: catColor(t) ?? 'var(--accent)',
                      }}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                      onClick={() => toggleOpen(t.id)}
                      title={t.title}
                    >
                      <span className="week-block-time">
                        {String(Math.floor(start / 60)).padStart(2, '0')}:
                        {String(start % 60).padStart(2, '0')}
                      </span>
                      <span className="week-block-title">{t.title}</span>
                      <span
                        className="week-block-resize"
                        onMouseDown={(e) => startResizeBlock(t, e)}
                        title="Dauer ziehen"
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

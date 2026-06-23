import { useStore } from '../store';
import {
  startOfWeek,
  weekDays7,
  addDays,
  isSameDay,
  tasksOnDate,
} from '../selectors';
import './WeekView.css';

const weekDayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface WeekViewProps {
  mode: 'week' | 'rolling';
}

export default function WeekView({ mode }: WeekViewProps) {
  const currentDate = useStore((s) => s.ui.currentDate);
  const setCurrentDate = useStore((s) => s.setCurrentDate);
  const tasks = useStore((s) => s.tasks);
  const categories = useStore((s) => s.categories);
  const updateTask = useStore((s) => s.updateTask);
  const toggleTask = useStore((s) => s.toggleTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.ui.selectedTaskId);
  const startHour = useStore((s) => s.settings.calendarStartHour ?? 6);
  const endHour = useStore((s) => s.settings.calendarEndHour ?? 22);
  const setCalendarHours = useStore((s) => s.setCalendarHours);

  const today = new Date();
  // Rolling: always today + next 6 days. Week: Monday–Sunday around currentDate.
  const start = mode === 'rolling' ? addDays(today, 0) : startOfWeek(currentDate);
  const days = weekDays7(start);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  const shiftWeek = (delta: number) => setCurrentDate(addDays(start, delta * 7));
  const goToday = () => setCurrentDate(new Date());

  const onDropDay = (date: Date) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) updateTask(id, { dueDate: new Date(date) });
  };

  const catColor = (task: { categoryIds: string[] }) =>
    categories.find((c) => task.categoryIds.includes(c.id))?.color;

  const rangeLabel =
    `${days[0].toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} – ` +
    days[6].toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="week-view">
      <div className="week-toolbar">
        <div className="week-nav">
          {mode === 'week' && (
            <>
              <button className="week-nav-btn" onClick={() => shiftWeek(-1)} title="Vorherige Woche">
                ‹
              </button>
              <button className="week-today-btn" onClick={goToday}>
                Heute
              </button>
              <button className="week-nav-btn" onClick={() => shiftWeek(1)} title="Nächste Woche">
                ›
              </button>
            </>
          )}
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
      <div className="week-head">
        <div className="week-gutter-head" />
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={`week-col-head ${isSameDay(d, today) ? 'is-today' : ''}`}
          >
            <span className="week-col-day">{weekDayLabels[(d.getDay() + 6) % 7]}</span>
            <span className="week-col-date">{d.getDate()}.</span>
          </div>
        ))}
      </div>

      {/* All-day tasks (no time model — every task sits in its day's all-day row). */}
      <div className="week-allday">
        <div className="week-gutter-label">ganztägig</div>
        {days.map((d) => {
          const dayTasks = tasksOnDate(tasks, d).filter((t) => !t.parentId);
          return (
            <div
              key={d.toISOString()}
              className="week-allday-cell"
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('text/plain')) e.preventDefault();
              }}
              onDrop={onDropDay(d)}
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
                  onClick={() => selectTask(t.id)}
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

      {/* Time grid (visual structure; tasks are all-day) */}
      <div className="week-grid-scroll">
        <div className="week-grid">
          <div className="week-gutter">
            {hours.map((h) => (
              <div key={h} className="week-hour-label">
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className={`week-col ${isSameDay(d, today) ? 'is-today' : ''}`}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('text/plain')) e.preventDefault();
              }}
              onDrop={onDropDay(d)}
            >
              {hours.map((h) => (
                <div key={h} className="week-hour-cell" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { unlockAudio } from '../pomodoroSound';
import { pomodoroDayKey, fmtFocus, type PomodoroPhase } from '../pomodoro';
import './PomodoroPanel.css';

// pomofocus.io-style Pomodoro window, opened from the header mini-timer (#39).
const TABS: { phase: PomodoroPhase; label: string }[] = [
  { phase: 'focus', label: 'Fokus' },
  { phase: 'break', label: 'Kurze Pause' },
  { phase: 'long', label: 'Lange Pause' },
];

export default function PomodoroPanel() {
  const pomodoro = useStore((s) => s.pomodoro);
  const settings = useStore((s) => s.settings);
  const log = useStore((s) => s.pomodoroLog);
  const taskLog = useStore((s) => s.pomodoroTaskLog);
  const tasks = useStore((s) => s.tasks);
  const start = useStore((s) => s.pomodoroStart);
  const pause = useStore((s) => s.pomodoroPause);
  const advance = useStore((s) => s.pomodoroAdvance);
  const reset = useStore((s) => s.pomodoroReset);
  const setPhase = useStore((s) => s.pomodoroSetPhase);
  const setTask = useStore((s) => s.pomodoroSetTask);
  const selectTask = useStore((s) => s.selectTask);
  const setSidePanel = useStore((s) => s.setSidePanel);

  // 1s display tick while running (remaining derives from endsAt — drift-free).
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!pomodoro.running) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [pomodoro.running]);

  const remaining = pomodoro.running
    ? Math.max(0, (pomodoro.endsAt ?? 0) - Date.now())
    : pomodoro.remainingMs;
  const mm = String(Math.floor(remaining / 60_000)).padStart(2, '0');
  const ss = String(Math.floor((remaining % 60_000) / 1000)).padStart(2, '0');
  const rounds = settings.pomodoroRounds ?? 4;
  const todayKey = pomodoroDayKey(new Date());
  const doneToday = log[todayKey] ?? 0;
  const currentTask = pomodoro.currentTaskId
    ? tasks.find((t) => t.id === pomodoro.currentTaskId)
    : null;
  // Tasks worked on today (focus time), most time first (#39).
  const workedToday = Object.entries(taskLog[todayKey] ?? {})
    .map(([id, sec]) => ({ task: tasks.find((t) => t.id === id), sec }))
    .filter((e): e is { task: NonNullable<typeof e.task>; sec: number } => !!e.task && e.sec > 0)
    .sort((a, b) => b.sec - a.sec);

  const onStart = () => { unlockAudio(); start(); };

  return (
    <div className={`pomodoro-panel phase-${pomodoro.phase}`}>
      <div className="pomodoro-panel-head">
        <span className="pomodoro-panel-title">🍅 Pomodoro</span>
        <button className="pomodoro-panel-close" title="Schließen" onClick={() => setSidePanel('none')}>✕</button>
      </div>

      <div className="pomodoro-card">
        <div className="pomodoro-tabs">
          {TABS.map((t) => (
            <button
              key={t.phase}
              className={`pomodoro-tab ${pomodoro.phase === t.phase ? 'active' : ''}`}
              onClick={() => setPhase(t.phase)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="pomodoro-clock">{mm}:{ss}</div>

        <div className="pomodoro-actions">
          {pomodoro.running ? (
            <button className="pomodoro-main-btn" onClick={pause}>PAUSE</button>
          ) : (
            <button className="pomodoro-main-btn" onClick={onStart}>START</button>
          )}
          <button className="pomodoro-skip" title="Phase überspringen" onClick={advance}>⏭</button>
        </div>

        <div className="pomodoro-round-line">Runde {pomodoro.round}/{rounds}</div>
      </div>

      <div className="pomodoro-current">
        {currentTask ? (
          <>
            <span className="pomodoro-current-label">Aktuelle Aufgabe</span>
            <div className="pomodoro-current-task">
              <button
                className="pomodoro-current-name"
                title="Aufgabe öffnen"
                onClick={() => selectTask(currentTask.id)}
              >
                {currentTask.title}
              </button>
              <button className="pomodoro-current-clear" title="Lösen" onClick={() => setTask(null)}>✕</button>
            </div>
          </>
        ) : (
          <p className="pomodoro-current-hint">
            Keine Aufgabe gewählt. In „Heute" oder „Next Week" bei einer Aufgabe auf 🍅 tippen.
          </p>
        )}
      </div>

      {workedToday.length > 0 && (
        <div className="pomodoro-worked">
          <span className="pomodoro-worked-label">Heute bearbeitet</span>
          <div className="pomodoro-worked-list">
            {workedToday.map(({ task, sec }) => (
              <button
                key={task.id}
                className={`pomodoro-worked-item ${pomodoro.currentTaskId === task.id ? 'active' : ''}`}
                title="Als aktuelle Aufgabe übernehmen"
                onClick={() => setTask(task.id)}
              >
                <span className="pomodoro-worked-name">{task.title}</span>
                <span className="pomodoro-worked-time">{fmtFocus(sec)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pomodoro-summary">
        <span className="pomodoro-summary-count">{doneToday}</span>
        <span className="pomodoro-summary-label">{doneToday === 1 ? 'Runde heute' : 'Runden heute'}</span>
        {doneToday > 0 && (
          <button className="pomodoro-reset-link" title="Timer zurücksetzen" onClick={reset}>Timer zurücksetzen</button>
        )}
      </div>
    </div>
  );
}

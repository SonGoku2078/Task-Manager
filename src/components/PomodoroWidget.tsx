import { useEffect, useState } from 'react';
import { useStore, pomodoroPhaseMs } from '../store';
import './PomodoroWidget.css';

// Pomodoro countdown in the main header (#3). The store holds phase/endsAt;
// this widget only ticks for display and fires the phase-end notification.

const PHASE_META = {
  focus: { icon: '🍅', label: 'Fokus' },
  break: { icon: '☕', label: 'Pause' },
  long: { icon: '🌴', label: 'Lange Pause' },
} as const;

// Short beep via WebAudio — no asset file needed.
function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    /* audio may be blocked */
  }
}

function notify(title: string, body: string) {
  beep();
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch {
    /* notifications unavailable */
  }
}

export default function PomodoroWidget() {
  const pomodoro = useStore((s) => s.pomodoro);
  const settings = useStore((s) => s.settings);
  const start = useStore((s) => s.pomodoroStart);
  const pause = useStore((s) => s.pomodoroPause);
  const reset = useStore((s) => s.pomodoroReset);
  const advance = useStore((s) => s.pomodoroAdvance);

  // Display tick (1s). The remaining time derives from endsAt — drift-free.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!pomodoro.running) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [pomodoro.running]);

  const remaining = pomodoro.running
    ? Math.max(0, (pomodoro.endsAt ?? 0) - Date.now())
    : pomodoro.remainingMs;

  // Phase finished → notify + advance (runs at most once per zero-crossing).
  useEffect(() => {
    if (!pomodoro.running || remaining > 0) return;
    const next = pomodoro.phase === 'focus' ? 'Pause' : 'Weiterarbeiten';
    notify('🍅 Pomodoro', `${PHASE_META[pomodoro.phase].label} vorbei — jetzt: ${next}!`);
    advance();
  }, [remaining, pomodoro.running, pomodoro.phase, advance]);

  const mm = String(Math.floor(remaining / 60_000)).padStart(2, '0');
  const ss = String(Math.floor((remaining % 60_000) / 1000)).padStart(2, '0');
  const meta = PHASE_META[pomodoro.phase];
  const rounds = settings.pomodoroRounds ?? 4;
  const idle =
    !pomodoro.running &&
    pomodoro.phase === 'focus' &&
    pomodoro.round === 1 &&
    pomodoro.remainingMs === pomodoroPhaseMs('focus', settings);

  const onStart = () => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch {
      /* ignore */
    }
    start();
  };

  return (
    <div
      className={`pomodoro-widget ${pomodoro.running ? 'running' : ''} phase-${pomodoro.phase}`}
      title={`Pomodoro: ${meta.label} — Runde ${pomodoro.round}/${rounds}`}
    >
      <span className="pomodoro-time">
        {meta.icon} {mm}:{ss}
      </span>
      {!idle && <span className="pomodoro-round">{pomodoro.round}/{rounds}</span>}
      {pomodoro.running ? (
        <button className="pomodoro-btn" title="Pausieren" onClick={pause}>⏸</button>
      ) : (
        <button className="pomodoro-btn" title="Starten" onClick={onStart}>▶</button>
      )}
      {!idle && (
        <>
          <button className="pomodoro-btn" title="Phase überspringen" onClick={advance}>⏭</button>
          <button className="pomodoro-btn" title="Zurücksetzen" onClick={reset}>⟲</button>
        </>
      )}
    </div>
  );
}

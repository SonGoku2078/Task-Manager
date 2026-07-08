import { useEffect, useState } from 'react';
import { useStore, pomodoroPhaseMs } from '../store';
import { playAlarm, startFocusSound, stopFocusSound, unlockAudio } from '../pomodoroSound';
import './PomodoroWidget.css';

// Pomodoro countdown in the main header (#3/#39). The store holds phase/endsAt
// and persists it; this always-mounted widget ticks for display, fires the
// phase-end alarm, drives the optional ticking, and opens the side panel.

const PHASE_META = {
  focus: { icon: '🍅', label: 'Fokus' },
  break: { icon: '☕', label: 'Pause' },
  long: { icon: '🌴', label: 'Lange Pause' },
} as const;

export default function PomodoroWidget() {
  const pomodoro = useStore((s) => s.pomodoro);
  const settings = useStore((s) => s.settings);
  const start = useStore((s) => s.pomodoroStart);
  const pause = useStore((s) => s.pomodoroPause);
  const reset = useStore((s) => s.pomodoroReset);
  const advance = useStore((s) => s.pomodoroAdvance);
  const sidePanel = useStore((s) => s.ui.sidePanel);
  const setSidePanel = useStore((s) => s.setSidePanel);

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

  // Optional looping focus sound (ticking / noise) — only while focusing.
  const focusSound = settings.pomodoroFocusSound ?? 'none';
  const focusVolume = settings.pomodoroFocusVolume ?? 50;
  useEffect(() => {
    if (pomodoro.running && pomodoro.phase === 'focus' && focusSound !== 'none') {
      startFocusSound(focusSound, focusVolume);
    } else {
      stopFocusSound();
    }
    return () => stopFocusSound();
  }, [pomodoro.running, pomodoro.phase, focusSound, focusVolume]);

  // Phase finished → alarm + notify + advance (runs at most once per zero-crossing).
  const alarmSound = settings.pomodoroAlarmSound ?? 'bell';
  const alarmVolume = settings.pomodoroAlarmVolume ?? 50;
  const alarmRepeat = settings.pomodoroAlarmRepeat ?? 1;
  useEffect(() => {
    if (!pomodoro.running || remaining > 0) return;
    stopFocusSound();
    if (alarmVolume > 0) playAlarm(alarmSound, alarmVolume, alarmRepeat);
    const next = pomodoro.phase === 'focus' ? 'Pause' : 'Weiterarbeiten';
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🍅 Pomodoro', { body: `${PHASE_META[pomodoro.phase].label} vorbei — jetzt: ${next}!` });
      }
    } catch { /* notifications unavailable */ }
    advance();
  }, [remaining, pomodoro.running, pomodoro.phase, advance, alarmSound, alarmVolume, alarmRepeat]);

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
    unlockAudio(); // allow audio later (user gesture)
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch { /* ignore */ }
    start();
  };

  return (
    <div
      className={`pomodoro-widget ${pomodoro.running ? 'running' : ''} phase-${pomodoro.phase}`}
      title={`Pomodoro: ${meta.label} — Runde ${pomodoro.round}/${rounds} · klicken für Details`}
    >
      <button
        className="pomodoro-time"
        onClick={() => setSidePanel(sidePanel === 'pomodoro' ? 'none' : 'pomodoro')}
        title="Pomodoro-Fenster öffnen"
      >
        {meta.icon} {mm}:{ss}
      </button>
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

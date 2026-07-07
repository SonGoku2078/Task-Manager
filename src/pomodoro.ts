// Pure Pomodoro phase logic (#39) — no store/DOM deps so it stays unit-testable.
export type PomodoroPhase = 'focus' | 'break' | 'long';

// Given the current phase/round and how many focus rounds precede a long break,
// return the next phase, the next round number, and whether a focus just ended
// (used for the daily "rounds done" tally and auto-start decisions).
export function nextPomodoroPhase(
  phase: PomodoroPhase,
  round: number,
  rounds: number
): { phase: PomodoroPhase; round: number; focusCompleted: boolean } {
  if (phase === 'focus') {
    const toLong = round % Math.max(1, rounds) === 0;
    return { phase: toLong ? 'long' : 'break', round, focusCompleted: true };
  }
  if (phase === 'long') return { phase: 'focus', round: 1, focusCompleted: false };
  // Short break → advance to the next focus round.
  return { phase: 'focus', round: round + 1, focusCompleted: false };
}

// Local calendar day key (YYYY-MM-DD) for the daily rounds tally.
export function pomodoroDayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

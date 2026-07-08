// Proves #39 phase logic: focus→break→focus…, long break after N rounds,
// round counter, and the focusCompleted flag that drives the daily tally.
// Run: npx tsx scripts/pomodoro.test.ts
import assert from 'node:assert';
import { nextPomodoroPhase, pomodoroDayKey, fmtFocus } from '../src/pomodoro';

const rounds = 4;

// Round 1 focus → short break, round unchanged, focus counted.
let r = nextPomodoroPhase('focus', 1, rounds);
assert.deepStrictEqual(r, { phase: 'break', round: 1, focusCompleted: true });

// Short break → next focus round.
r = nextPomodoroPhase('break', 1, rounds);
assert.deepStrictEqual(r, { phase: 'focus', round: 2, focusCompleted: false });

// The 4th focus round completes → long break (round stays 4).
r = nextPomodoroPhase('focus', 4, rounds);
assert.deepStrictEqual(r, { phase: 'long', round: 4, focusCompleted: true });

// Long break → focus, round resets to 1.
r = nextPomodoroPhase('long', 4, rounds);
assert.deepStrictEqual(r, { phase: 'focus', round: 1, focusCompleted: false });

// rounds = 1 → every focus goes straight to a long break (no div-by-zero).
r = nextPomodoroPhase('focus', 1, 1);
assert.strictEqual(r.phase, 'long');

// Day key is a stable local YYYY-MM-DD.
assert.strictEqual(pomodoroDayKey(new Date(2026, 6, 8)), '2026-07-08');

// Focus-time formatting: seconds → minutes → hours (#39 per-task time).
assert.strictEqual(fmtFocus(45), '45s');
assert.strictEqual(fmtFocus(90), '1 Min');
assert.strictEqual(fmtFocus(25 * 60), '25 Min');
assert.strictEqual(fmtFocus(3900), '1h 5m');
assert.strictEqual(fmtFocus(-3), '0s');

console.log('✅ PASS — pomodoro: phase transitions, long-break interval, daily flag, fmtFocus.');

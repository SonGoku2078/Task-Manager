// WebAudio for the Pomodoro (#39): a phase-end alarm and an optional ticking.
// One shared AudioContext, unlocked on the first user gesture (Start) so the
// browser autoplay policy doesn't swallow the sound. All calls are best-effort.

let ctx: AudioContext | null = null;
let tickTimer: number | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    return ctx;
  } catch {
    return null;
  }
}

// Call from a user gesture (e.g. the Start button) so audio is allowed later.
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function tone(freq: number, durationSec: number, volume: number, when = 0): void {
  const c = getCtx();
  if (!c) return;
  try {
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(Math.max(0.0001, volume), t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec);
    osc.start(t0);
    osc.stop(t0 + durationSec);
  } catch {
    /* audio blocked */
  }
}

// Three rising beeps so the end of a phase is clearly audible.
export function playAlarm(volume = 1): void {
  const v = 0.25 * Math.max(0, Math.min(1, volume));
  tone(880, 0.35, v, 0);
  tone(1046, 0.35, v, 0.4);
  tone(1318, 0.5, v, 0.8);
}

// A soft, quiet tick once per second while focusing.
export function startTicking(volume = 0.5): void {
  stopTicking();
  const v = 0.06 * Math.max(0, Math.min(1, volume));
  const doTick = () => tone(600, 0.05, v, 0);
  doTick();
  tickTimer = window.setInterval(doTick, 1000);
}

export function stopTicking(): void {
  if (tickTimer != null) {
    window.clearInterval(tickTimer);
    tickTimer = null;
  }
}

// WebAudio playback for the Pomodoro (#39): a phase-end alarm and an optional
// looping focus sound, from bundled audio files. One shared AudioContext,
// unlocked on the first user gesture (Start/Test) so autoplay policy doesn't
// swallow it. Files are decoded lazily into cached AudioBuffers. Best-effort.
import bell from './sounds/bell.wav';
import kitchen from './sounds/kitchen.wav';
import digital from './sounds/digital.wav';
import chime from './sounds/chime.wav';
import wood from './sounds/wood.wav';
import tickingSlow from './sounds/ticking-slow.wav';
import tickingFast from './sounds/ticking-fast.wav';
import whiteNoise from './sounds/white-noise.wav';
import brownNoise from './sounds/brown-noise.wav';

export const ALARM_SOUNDS: Record<string, string> = { bell, kitchen, digital, chime, wood };
export const FOCUS_SOUNDS: Record<string, string> = {
  'ticking-slow': tickingSlow,
  'ticking-fast': tickingFast,
  'white-noise': whiteNoise,
  'brown-noise': brownNoise,
};

let ctx: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();
let focusSrc: AudioBufferSourceNode | null = null;
let focusGen = 0; // invalidates in-flight startFocusSound() calls

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

// Call from a user gesture (Start / Test) so audio is allowed later.
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

async function load(url: string): Promise<AudioBuffer | null> {
  const c = getCtx();
  if (!c) return null;
  const cached = buffers.get(url);
  if (cached) return cached;
  try {
    const arr = await (await fetch(url)).arrayBuffer();
    const buf = await c.decodeAudioData(arr);
    buffers.set(url, buf);
    return buf;
  } catch {
    return null;
  }
}

const clampVol = (v: number) => Math.max(0, Math.min(1, v / 100));

// Play the phase-end alarm `repeat` times at the chosen volume.
export async function playAlarm(sound: string, volume = 50, repeat = 1): Promise<void> {
  const url = ALARM_SOUNDS[sound] ?? ALARM_SOUNDS.bell;
  const c = getCtx();
  const buf = await load(url);
  if (!c || !buf) return;
  const gain = c.createGain();
  gain.gain.value = clampVol(volume);
  gain.connect(c.destination);
  const n = Math.max(1, Math.min(10, Math.round(repeat)));
  for (let k = 0; k < n; k++) {
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(gain);
    src.start(c.currentTime + k * (buf.duration + 0.15));
  }
}

// Start (or restart) the looping focus sound. 'none' → silence.
export async function startFocusSound(sound: string, volume = 50): Promise<void> {
  stopFocusSound();
  const gen = ++focusGen;
  const url = FOCUS_SOUNDS[sound];
  if (!url) return; // 'none' or unknown
  const c = getCtx();
  const buf = await load(url);
  if (gen !== focusGen || !c || !buf) return; // superseded while decoding
  const gain = c.createGain();
  gain.gain.value = clampVol(volume);
  gain.connect(c.destination);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(gain);
  src.start();
  focusSrc = src;
}

export function stopFocusSound(): void {
  focusGen++; // cancel any in-flight start
  if (focusSrc) {
    try { focusSrc.stop(); } catch { /* already stopped */ }
    focusSrc = null;
  }
}

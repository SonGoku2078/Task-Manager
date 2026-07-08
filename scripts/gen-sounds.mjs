// Generates the Pomodoro sound assets as small mono 16-bit WAV files (#39).
// License-clean by authorship (CC0). Run: node scripts/gen-sounds.mjs
// White/brown noise and ticking are authentic; alarms are clean synth tones.
// Swap any file in src/sounds/ for your own recording — the picker just reads them.
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'sounds');
mkdirSync(OUT, { recursive: true });

function toWav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), 44 + i * 2);
  }
  return buf;
}
const secs = (t) => Math.round(t * SR);
const save = (name, samples) => { writeFileSync(path.join(OUT, `${name}.wav`), toWav(samples)); console.log(`  ${name}.wav (${(samples.length / SR).toFixed(2)}s)`); };

// ── Focus sounds (loopable) ──
function whiteNoise(dur = 2) {
  const s = new Float32Array(secs(dur));
  for (let i = 0; i < s.length; i++) s[i] = (Math.random() * 2 - 1) * 0.5;
  return s;
}
function brownNoise(dur = 2) {
  const s = new Float32Array(secs(dur));
  let last = 0;
  for (let i = 0; i < s.length; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    s[i] = last * 3.5;
  }
  return s;
}
// A short filtered "click" tick placed on a grid → seamless loop.
function ticking(interval, dur, freq = 1000) {
  const s = new Float32Array(secs(dur));
  const clickLen = secs(0.03);
  for (let start = 0; start < s.length; start += secs(interval)) {
    for (let i = 0; i < clickLen && start + i < s.length; i++) {
      const env = Math.exp(-i / (SR * 0.006));
      s[start + i] += Math.sin((2 * Math.PI * freq * i) / SR) * env * 0.6
        + (Math.random() * 2 - 1) * env * 0.15;
    }
  }
  return s;
}

// ── Alarm sounds (one-shot) ──
function bell(dur = 1.6) {
  const s = new Float32Array(secs(dur));
  const partials = [1, 2.76, 5.4, 8.9];
  const gains = [1, 0.5, 0.25, 0.12];
  const f0 = 660;
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 3.2);
    let v = 0;
    for (let p = 0; p < partials.length; p++) v += Math.sin(2 * Math.PI * f0 * partials[p] * t) * gains[p];
    s[i] = v * env * 0.28;
  }
  return s;
}
function kitchen(dur = 1.1) {
  // Kitchen-timer ring: ~2 kHz tone with fast tremolo + decay.
  const s = new Float32Array(secs(dur));
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    const trem = 0.5 + 0.5 * Math.sin(2 * Math.PI * 45 * t);
    const env = Math.exp(-t * 2.6);
    s[i] = Math.sin(2 * Math.PI * 2050 * t) * trem * env * 0.32;
  }
  return s;
}
function digital(dur = 0.85) {
  // Three short square-ish beeps.
  const s = new Float32Array(secs(dur));
  const beep = 0.11, gap = 0.16, f = 1200;
  for (let b = 0; b < 3; b++) {
    const start = secs(b * gap);
    for (let i = 0; i < secs(beep) && start + i < s.length; i++) {
      const t = i / SR;
      const env = Math.min(1, i / 200) * Math.exp(-t * 6);
      const sq = Math.sign(Math.sin(2 * Math.PI * f * t));
      s[start + i] = sq * env * 0.2;
    }
  }
  return s;
}
function chime(dur = 1.5) {
  // Descending pure tones (C6, A5, F5, C5).
  const s = new Float32Array(secs(dur));
  const notes = [1046, 880, 698, 523];
  const step = 0.16;
  for (let n = 0; n < notes.length; n++) {
    const start = secs(n * step);
    for (let i = 0; start + i < s.length; i++) {
      const t = i / SR;
      const env = Math.exp(-t * 4.5);
      s[start + i] += Math.sin(2 * Math.PI * notes[n] * t) * env * 0.24;
    }
  }
  return s;
}
function wood(dur = 0.4) {
  // Wood-block knock: band-ish noise burst, very fast decay.
  const s = new Float32Array(secs(dur));
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 55);
    s[i] = (Math.sin(2 * Math.PI * 820 * t) * 0.7 + (Math.random() * 2 - 1) * 0.4) * env * 0.6;
  }
  return s;
}

console.log('Generating Pomodoro sounds →', OUT);
save('white-noise', whiteNoise());
save('brown-noise', brownNoise());
save('ticking-slow', ticking(1.0, 2.0));
save('ticking-fast', ticking(0.5, 1.0));
save('bell', bell());
save('kitchen', kitchen());
save('digital', digital());
save('chime', chime());
save('wood', wood());
console.log('done.');

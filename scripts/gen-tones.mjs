// Generates the built-in reminder tones (#30) as small WAV files in the
// Android res/raw folder. Self-contained — no audio assets to ship. Re-run
// with: node scripts/gen-tones.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAW = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', 'apps', 'mobile', 'android', 'app', 'src', 'main', 'res', 'raw'
);
mkdirSync(RAW, { recursive: true });

const RATE = 44100;

// Build a PCM16 mono WAV from a list of {freq, dur, at} notes with a soft
// pluck envelope, so tones are pleasant and clearly distinguishable.
function wav(notes) {
  const total = Math.max(...notes.map((n) => n.at + n.dur)) + 0.05;
  const samples = Math.floor(total * RATE);
  const data = Buffer.alloc(samples * 2);
  for (const { freq, dur, at } of notes) {
    const start = Math.floor(at * RATE);
    const len = Math.floor(dur * RATE);
    for (let i = 0; i < len; i++) {
      const t = i / RATE;
      const env = Math.exp(-4 * t); // decay
      const v = Math.sin(2 * Math.PI * freq * t) * env * 0.6;
      const idx = (start + i) * 2;
      if (idx + 1 < data.length) {
        const cur = data.readInt16LE(idx);
        data.writeInt16LE(Math.max(-32768, Math.min(32767, cur + v * 32767)), idx);
      }
    }
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const tones = {
  tone_glocke: [ { freq: 880, dur: 0.5, at: 0 }, { freq: 660, dur: 0.6, at: 0.28 } ],
  tone_piep: [ { freq: 1200, dur: 0.14, at: 0 }, { freq: 1200, dur: 0.14, at: 0.22 } ],
  tone_marimba: [ { freq: 523, dur: 0.28, at: 0 }, { freq: 659, dur: 0.28, at: 0.16 }, { freq: 784, dur: 0.4, at: 0.32 } ],
};

for (const [name, notes] of Object.entries(tones)) {
  writeFileSync(path.join(RAW, `${name}.wav`), wav(notes));
  console.log(`wrote ${name}.wav`);
}

# Pomodoro sounds

All files in this folder are **generated** by `scripts/gen-sounds.mjs`
(WebAudio-style synthesis written to WAV). They are original, license-free
(CC0 / public domain by authorship) — no third-party samples are bundled.

| File | Type | Notes |
|---|---|---|
| `white-noise.wav` | focus (loop) | uniform white noise |
| `brown-noise.wav` | focus (loop) | integrated (brown) noise, low rumble |
| `ticking-slow.wav` | focus (loop) | clock tick every 1.0 s |
| `ticking-fast.wav` | focus (loop) | clock tick every 0.5 s |
| `bell.wav` | alarm | inharmonic bell partials, decaying |
| `kitchen.wav` | alarm | kitchen-timer ring (2 kHz + tremolo) |
| `digital.wav` | alarm | three square-wave beeps |
| `chime.wav` | alarm | descending pure tones |
| `wood.wav` | alarm | wood-block knock |

To use your own sound, drop a same-named file here (any format the browser can
decode — `.mp3`/`.ogg`/`.wav`) and update the import extension in
`src/pomodoroSound.ts`. Re-generate the defaults anytime with
`node scripts/gen-sounds.mjs`.

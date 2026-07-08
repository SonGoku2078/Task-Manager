// Ambient module declarations so `tsc -b` types binary asset imports (Vite
// resolves them to a URL string at build time). No vite-env.d.ts in this repo.
declare module '*.wav' { const src: string; export default src; }
declare module '*.mp3' { const src: string; export default src; }
declare module '*.ogg' { const src: string; export default src; }

// Central place for the deployment base URL. Empty = use the current origin
// (local / static hosting). When moving to a real server, set BASE_URL to the
// server domain (e.g. "https://tasks.example.com") — this is the only swap point
// needed for share links to keep working.
export const BASE_URL = '';

// Hash fragment that references a task by its human-friendly number, e.g. "#/t/42".
export const taskHash = (taskNumber: number) => `#/t/${taskNumber}`;

// Parse a task number out of a hash like "#/t/42". Returns null if it doesn't match.
export const parseTaskHash = (hash: string): number | null => {
  const m = hash.match(/^#\/t\/(\d+)$/);
  return m ? Number(m[1]) : null;
};

// Base for Nozbe Classic API calls. In dev this is the Vite proxy path (`/nozbe-api`,
// see vite.config.ts) which forwards to https://api.nozbe.com:3000 and dodges CORS.
// After a backend exists, point this at the server endpoint that proxies/holds credentials.
export const NOZBE_API_BASE = '/nozbe-api';
export const NOZBE_WEB_URL = 'https://app.nozbe.com';

// Full shareable URL for a task. Local: current page + hash. Server: BASE_URL + hash.
export const taskShareUrl = (taskNumber: number) => {
  const base =
    BASE_URL ||
    (typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : '');
  return `${base}${taskHash(taskNumber)}`;
};

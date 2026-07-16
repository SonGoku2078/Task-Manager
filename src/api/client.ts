// Single point for the backend URL.
// Resolved per request so the native/mobile app can point at a LAN IP at runtime
// (in-app "Server-URL" setting, stored in localStorage) without a rebuild.
// Precedence: localStorage 'tm-api-url' > build-time VITE_API_URL > default.
const DEFAULT_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

export function getBaseUrl(): string {
  try {
    const override = localStorage.getItem('tm-api-url');
    if (override !== null && override.trim() !== '') return override.trim().replace(/\/+$/, '');
  } catch { /* ignore */ }
  return DEFAULT_BASE_URL;
}

// Normalize a user-typed backend URL: trim, strip trailing slashes, force an
// absolute http(s) URL — otherwise requests resolve relative to the app's own
// origin (e.g. Capacitor's localhost), which silently "works". Shared by
// setBaseUrl and the pure "Verbindung testen" check (which must not persist).
export function normalizeBaseUrl(url: string): string {
  let v = url.trim().replace(/\/+$/, '');
  if (v && !/^https?:\/\//i.test(v)) v = `http://${v}`;
  return v;
}

export function setBaseUrl(url: string): void {
  try {
    const v = normalizeBaseUrl(url);
    if (v) localStorage.setItem('tm-api-url', v);
    else localStorage.removeItem('tm-api-url');
  } catch { /* ignore */ }
}

// Back-compat export (initial value; prefer getBaseUrl() for live lookups).
export const BASE_URL = DEFAULT_BASE_URL;

// Date fields that must be revived from ISO strings to Date objects.
const DATE_KEYS = new Set([
  'dueDate', 'createdAt', 'updatedAt', 'recurrenceEnd', 'completedAt', 'at',
  'startDate', 'endDate',
]);

function reviveDates(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(reviveDates);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k,
        DATE_KEYS.has(k) && typeof v === 'string' ? new Date(v) : reviveDates(v),
      ]),
    );
  }
  return obj;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // Always time out — a request that hangs (e.g. fired mid server-restart) must
  // not block the write queue forever. AbortError surfaces as a network error,
  // so the outbox keeps the op and retries it on the next tick.
  const res = await fetch(`${getBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    signal: init?.signal ?? AbortSignal.timeout(10000),
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path}: ${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json().then(reviveDates) as T;
}

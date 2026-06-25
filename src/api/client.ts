// Single point for the backend URL.
// In dev: set VITE_API_URL=http://localhost:3001 in .env.local
// In production (Electron): server runs on same origin.
export const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

// Date fields that must be revived from ISO strings to Date objects.
const DATE_KEYS = new Set([
  'dueDate', 'createdAt', 'updatedAt', 'recurrenceEnd', 'at',
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
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path}: ${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json().then(reviveDates) as T;
}

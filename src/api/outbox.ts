// Durable write queue ("outbox") — the core data-safety mechanism.
//
// Every mutation is recorded here and persisted to localStorage BEFORE it is
// sent to the server. Ops are replayed FIFO until the server confirms them, so
// edits made while the backend is unreachable are never lost. The server makes
// creates idempotent (INSERT OR REPLACE), so replaying a partially-applied op
// is safe.
//
// IMPORTANT: this uses its own localStorage key (`tm-outbox`) and must never be
// confused with the legacy `nozbe-clone-state` snapshot, which is dead.

import {
  tasksApi,
  projectsApi,
  categoriesApi,
  membersApi,
  sectionsApi,
  blockersApi,
  savedViewsApi,
  activityLogApi,
  settingsApi,
} from './index';

export interface Op {
  id: string;
  ts: number;
  kind: string;
  // Serialisable payload — Date fields survive as ISO strings (the server
  // reparses them), which is exactly what JSON.stringify produces anyway.
  payload: Record<string, unknown>;
  attempts?: number;
}

const KEY = 'tm-outbox';
const DEAD_KEY = 'tm-outbox-dead';
const MAX_ATTEMPTS = 5;

let queue: Op[] = load();
let flushing = false;
let listeners: Array<(n: number) => void> = [];

// Recover anything previously moved to the dead-letter list (e.g. ops that
// failed while the server had a bug). They go back to the FRONT so their
// original order is roughly preserved, and their attempt counters reset.
(function recoverDeadLetters() {
  try {
    const raw = localStorage.getItem(DEAD_KEY);
    if (!raw) return;
    const dead = JSON.parse(raw) as Op[];
    if (Array.isArray(dead) && dead.length) {
      queue = [...dead.map((o) => ({ ...o, attempts: 0 })), ...queue];
      localStorage.removeItem(DEAD_KEY);
      persist();
    }
  } catch {
    /* ignore */
  }
})();

function load(): Op[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as Op[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    /* storage full / unavailable — queue still lives in memory */
  }
  for (const l of listeners) l(queue.length);
}

function deadLetter(op: Op, reason: string): void {
  console.error(`Outbox: dropping op ${op.kind} to dead-letter:`, reason, op);
  try {
    const raw = localStorage.getItem(DEAD_KEY);
    const dead = raw ? (JSON.parse(raw) as unknown[]) : [];
    dead.push({ ...op, reason });
    localStorage.setItem(DEAD_KEY, JSON.stringify(dead));
  } catch {
    /* ignore */
  }
}

function uid(): string {
  return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Returns the HTTP status if the error came from an HTTP error response, or
// null for a connectivity/timeout failure. apiFetch throws
// `Error('API <path>: <status> <text>')` for HTTP errors.
function httpStatus(e: unknown): number | null {
  if (e instanceof Error && e.message.startsWith('API ')) {
    const m = e.message.match(/:\s(\d{3})\b/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

// kind → API call. Payloads are plain objects pulled back out of localStorage.
/* eslint-disable @typescript-eslint/no-explicit-any */
const handlers: Record<string, (p: any) => Promise<unknown>> = {
  'task.create':      (p) => tasksApi.create(p.task),
  'task.update':      (p) => tasksApi.update(p.id, p.patch),
  'task.remove':      (p) => tasksApi.remove(p.id),
  'task.reorder':     (p) => tasksApi.reorder(p.ids),
  'project.create':   (p) => projectsApi.create(p.project),
  'project.update':   (p) => projectsApi.update(p.id, p.patch),
  'project.remove':   (p) => projectsApi.remove(p.id),
  'project.reorder':  (p) => projectsApi.reorder(p.ids),
  'category.create':  (p) => categoriesApi.create(p.category),
  'category.update':  (p) => categoriesApi.update(p.id, p.patch),
  'category.remove':  (p) => categoriesApi.remove(p.id),
  'member.create':    (p) => membersApi.create(p.member),
  'member.update':    (p) => membersApi.update(p.id, p.patch),
  'member.remove':    (p) => membersApi.remove(p.id),
  'section.create':   (p) => sectionsApi.create(p.section),
  'section.update':   (p) => sectionsApi.update(p.id, p.patch),
  'section.remove':   (p) => sectionsApi.remove(p.id),
  'blocker.create':   (p) => blockersApi.create(p.blocker),
  'blocker.update':   (p) => blockersApi.update(p.id, p.patch),
  'blocker.remove':   (p) => blockersApi.remove(p.id),
  'savedView.create': (p) => savedViewsApi.create(p.view),
  'savedView.remove': (p) => savedViewsApi.remove(p.id),
  'activityLog.append': (p) => activityLogApi.append(p.entry),
  'settings.patch':   (p) => settingsApi.patch(p.patch),
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function pendingCount(): number {
  return queue.length;
}

export function onChange(fn: (n: number) => void): () => void {
  listeners.push(fn);
  fn(queue.length);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function enqueue(kind: string, payload: Record<string, unknown>): void {
  queue.push({ id: uid(), ts: Date.now(), kind, payload });
  persist();
  void flush();
}

// Replay the queue FIFO. Resolves when the queue is drained or stalls (offline /
// a blocking error). Safe to call repeatedly; concurrent calls are coalesced.
export async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    while (queue.length) {
      const op = queue[0];
      const handler = handlers[op.kind];
      if (!handler) {
        deadLetter(op, 'unknown kind');
        queue.shift();
        persist();
        continue;
      }
      try {
        await handler(op.payload);
        queue.shift();
        persist();
      } catch (e) {
        const status = httpStatus(e);
        if (status === null) {
          // Connectivity failure — the server is unreachable, so nothing else
          // will succeed either. Keep the whole queue and retry on the next tick.
          break;
        }
        // Any HTTP error (4xx client error OR 5xx server error). Retry a few
        // times; if it keeps failing, park it to the dead-letter list so ONE
        // poison op can never block the rest of the queue (and the user's other
        // edits) forever. Dead-letters are recovered and retried on next load.
        op.attempts = (op.attempts ?? 0) + 1;
        if (op.attempts >= MAX_ATTEMPTS) {
          deadLetter(op, String(e));
          queue.shift();
          persist();
          continue;
        }
        persist();
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

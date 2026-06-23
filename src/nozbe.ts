import type {
  Task,
  Project,
  Category,
  RecurrenceType,
  Comment,
  Attachment,
} from './types';
import { NOZBE_API_BASE } from './config';

// Raw shapes from the Nozbe Classic REST API (loosely typed — extra fields ignored).
export interface NozbeTask {
  id: string;
  name?: string;
  completed?: number | boolean;
  datetime?: string | null;
  recur?: number | string;
  next?: boolean;
  project_id?: string | null;
  con_list?: Array<string | { id?: string }> | null;
  comments?: Array<Record<string, unknown>> | null;
  [k: string]: unknown;
}
export interface NozbeProject {
  id: string;
  name?: string;
  [k: string]: unknown;
}
export interface NozbeContext {
  id: string;
  name?: string;
  [k: string]: unknown;
}

export interface NozbeExport {
  tasks?: NozbeTask[];
  projects?: NozbeProject[];
  contexts?: NozbeContext[];
}

export interface MappedImport {
  projects: Project[];
  categories: Category[];
  tasks: Task[];
}

const PALETTE = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4', '#43a047', '#8e24aa'];

// Nozbe Classic stores a project/context colour as a fixed colour *name*. Map those
// names to the hex values Nozbe renders, so imported projects look identical to Nozbe.
const NOZBE_COLORS: Record<string, string> = {
  red: '#e8554e',
  orange: '#f5a623',
  yellow: '#f8d12f',
  green: '#7cb342',
  darkgreen: '#2e7d32',
  teal: '#26a69a',
  turquoise: '#26a69a',
  lightblue: '#4fc3f7',
  blue: '#2f8fed',
  darkblue: '#1565c0',
  purple: '#9c27b0',
  violet: '#9c27b0',
  pink: '#e91e63',
  magenta: '#e91e63',
  brown: '#8d6e63',
  gray: '#9e9e9e',
  grey: '#9e9e9e',
  black: '#424242',
};

// Resolve a Nozbe colour value: hex passthrough, known colour name, else fallback.
const mapColor = (raw: unknown, fallback: string): string => {
  if (typeof raw === 'string') {
    const v = raw.trim();
    if (/^#?[0-9a-f]{6}$/i.test(v)) return v.startsWith('#') ? v : `#${v}`;
    const named = NOZBE_COLORS[v.toLowerCase()];
    if (named) return named;
  }
  return fallback;
};

// Nozbe returns its own ordering for projects/contexts. Read whichever numeric order
// field is present so the initial import mirrors Nozbe's structure (can be re-sorted
// by the user afterwards). Returns null when no order field exists.
const orderOf = (o: Record<string, unknown>): number | null => {
  for (const k of ['ord', 'order', 'seq', 'sequence', 'position', 'pos', 'sort']) {
    const n = Number(o[k]);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

// Stable sort by Nozbe's order field; items without an order keep their API position.
const byNozbeOrder = <T extends Record<string, unknown>>(items: T[]): T[] =>
  items
    .map((item, i) => ({ item, i, ord: orderOf(item) }))
    .sort((a, b) => {
      if (a.ord == null && b.ord == null) return a.i - b.i;
      if (a.ord == null) return 1;
      if (b.ord == null) return -1;
      return a.ord - b.ord || a.i - b.i;
    })
    .map((x) => x.item);

// "YYYY-MM-DD HH:MM[:SS]" → Date (local), or null.
const parseNozbeDate = (s: string | null | undefined): Date | null => {
  if (!s || typeof s !== 'string') return null;
  const d = new Date(s.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
};

// Nozbe recur (0..7) → our coarse RecurrenceType (some granularity is lost).
const mapRecur = (r: number | string | undefined): RecurrenceType => {
  const n = Number(r) || 0;
  if (n === 1 || n === 2) return 'daily';
  if (n === 3 || n === 4) return 'weekly';
  if (n === 5 || n === 7) return 'monthly';
  return 'none';
};

// ISO ("2026-06-19T11:47:31+00:00") or "YYYY-MM-DD HH:MM:SS" → Date, fallback now.
const toDate = (s: unknown, fallback: Date): Date => {
  if (typeof s === 'string' && s.trim()) {
    const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
    if (!isNaN(d.getTime())) return d;
  }
  return fallback;
};

// Nozbe ts ("1782074061.984698", unix seconds) → Date, or fallback.
const tsToDate = (ts: unknown, fallback: Date): Date => {
  const n = parseFloat(String(ts));
  return isFinite(n) && n > 0 ? new Date(n * 1000) : fallback;
};

interface NozbeComment {
  id?: string;
  deleted?: boolean;
  body?: unknown;
  type?: string;
  uploadinfo?: { name?: string; url?: string; description?: string };
  _user_name?: string;
  _created_at_gmt?: string;
  _created_at?: string;
  [k: string]: unknown;
}

// Split out a Nozbe task's comments into our comments / attachments / subtasks.
// Nozbe Classic has no real description, sub-tasks or attachment fields — those live
// inside the comment stream (markdown = note, file/*_widget = attachment, checklist = subtasks).
const splitComments = (
  raw: NozbeComment[],
  created: Date
): { comments: Comment[]; attachments: Attachment[]; checklist: { title: string; done: boolean }[] } => {
  const comments: Comment[] = [];
  const attachments: Attachment[] = [];
  const checklist: { title: string; done: boolean }[] = [];

  raw.filter((c) => c && !c.deleted).forEach((c, i) => {
    const at = toDate(c._created_at_gmt || c._created_at, created);
    const author = c._user_name?.trim() || 'Nozbe';
    const cid = c.id || `c${i}`;
    switch (c.type) {
      case 'file':
        attachments.push({
          id: `nza-${cid}`,
          name: c.uploadinfo?.name || 'Datei',
          type: '',
          size: 0,
          dataUrl: '',
          url: c.uploadinfo?.url,
        });
        break;
      case 'evernote_widget':
      case 'onedrive_widget':
        (Array.isArray(c.body) ? c.body : []).forEach(
          (w: { name?: string; link?: string }, j: number) =>
            attachments.push({
              id: `nza-${cid}-${j}`,
              name: w.name || 'Link',
              type: 'link',
              size: 0,
              dataUrl: '',
              url: w.link,
            })
        );
        break;
      case 'checklist':
        String(c.body ?? '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .forEach((line) => {
            // "(-) text" = open, "(+) text" / "(x) text" = done.
            const m = line.match(/^\(([\-+x ])\)\s*(.*)$/i);
            checklist.push(
              m
                ? { title: m[2] || '(leer)', done: /[+x]/i.test(m[1]) }
                : { title: line, done: false }
            );
          });
        break;
      default: // markdown / anything textual → a real comment
        if (typeof c.body === 'string' && c.body.trim()) {
          comments.push({ id: `nzc-${cid}`, text: c.body.trim(), author, createdAt: at });
        }
    }
  });

  return { comments, attachments, checklist };
};

// Fetch one resource type from the Nozbe Classic API (via the dev proxy in dev).
export async function fetchNozbeList(
  token: string,
  clientId: string,
  type: 'task' | 'project' | 'context'
): Promise<Array<Record<string, unknown>>> {
  const url = `${NOZBE_API_BASE}/list?access_token=${encodeURIComponent(
    token
  )}&client_id=${encodeURIComponent(clientId)}&type=${type}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Nozbe API antwortete ${res.status} bei type=${type}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(`Unerwartete Antwort für type=${type} (kein Array)`);
  }
  return data;
}

export interface NozbeAuth {
  token: string;
  clientId: string;
  userId?: string;
}

// Derive the OAuth client_id (+ client_secret) from email + password. This is the
// documented & verified endpoint: GET /oauth/secret/data?email=…&password=… → JSON
// { client_id, client_secret }. The password is only sent to Nozbe (via the dev proxy)
// and never stored.
export async function fetchNozbeSecret(
  email: string,
  password: string
): Promise<{ clientId: string; clientSecret: string }> {
  const url = `${NOZBE_API_BASE}/oauth/secret/data?email=${encodeURIComponent(
    email
  )}&password=${encodeURIComponent(password)}`;
  const res = await fetch(url);
  const text = (await res.text()).trim();

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Unerwartete Antwort von Nozbe: ${text.slice(0, 120)}`);
  }
  // The API returns { error: "Bad login or password" } on wrong credentials.
  if (json.error) {
    throw new Error(`Anmeldung fehlgeschlagen: ${String(json.error)}`);
  }
  const clientId = String(json.client_id ?? '');
  const clientSecret = String(json.client_secret ?? '');
  if (!clientId) {
    throw new Error(`Keine client_id erhalten: ${text.slice(0, 120)}`);
  }
  return { clientId, clientSecret };
}

// Full login (proven flow): email + password derive the client_id, and the API-Key from
// Nozbe (Einstellungen → API-Schlüssel) IS the access token. We verify the pair against
// /list before returning, so a bad API-Key fails here rather than silently later.
export async function loginNozbe(
  email: string,
  password: string,
  apiKey: string
): Promise<NozbeAuth> {
  if (!email.trim() || !password) {
    throw new Error('E-Mail und Passwort erforderlich.');
  }
  if (!apiKey.trim()) {
    throw new Error('API-Schlüssel erforderlich (Nozbe → Einstellungen → API-Schlüssel).');
  }
  const token = apiKey.trim();
  const { clientId } = await fetchNozbeSecret(email.trim(), password);

  // Verify the access_token + client_id pair actually loads data.
  await fetchNozbeList(token, clientId, 'task');

  return { token, clientId };
}

// Write a task update back to Nozbe (PUT /task, form-encoded). Only fields we set.
export async function pushNozbeTask(
  token: string,
  clientId: string,
  nozbeId: string,
  fields: Record<string, string | number>
): Promise<void> {
  const url = `${NOZBE_API_BASE}/task?access_token=${encodeURIComponent(
    token
  )}&client_id=${encodeURIComponent(clientId)}`;
  const body = new URLSearchParams({ id: nozbeId });
  for (const [k, v] of Object.entries(fields)) body.set(k, String(v));
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Nozbe PUT /task antwortete ${res.status}`);
  }
}

// Convenience: mark a Nozbe task completed/open.
export const pushNozbeCompleted = (
  token: string,
  clientId: string,
  nozbeId: string,
  completed: boolean
) => pushNozbeTask(token, clientId, nozbeId, { completed: completed ? 1 : 0 });

// Pure mapper: Nozbe objects → our domain objects. Task numbers are assigned later
// by the store (which owns nextTaskNumber); here they default to 0.
export function mapNozbe(raw: NozbeExport): MappedImport {
  const now = new Date();

  // Diagnostic: dump the raw fields of the first project so we can confirm which
  // fields Nozbe uses for colour and ordering (open DevTools console after a sync).
  if (raw.projects?.length) {
    const p0 = raw.projects[0] as Record<string, unknown>;
    console.info('[Nozbe-Import] Projekt-Felder:', Object.keys(p0).join(', '));
    console.info('[Nozbe-Import] Beispiel-Projekt:', p0);
  }
  if (raw.contexts?.length) {
    console.info('[Nozbe-Import] Beispiel-Kategorie:', raw.contexts[0]);
  }

  // Nozbe's own "Inbox" is a pseudo-project; its tasks belong in our dedicated Inbox
  // view (projectId === null), not in a real project named "Inbox". Drop it from the
  // project list and treat its tasks as project-less.
  // (A task keeps a project only if that project survives below; Inbox tasks therefore
  // fall back to projectId === null automatically.)
  const isInboxProject = (p: NozbeProject) =>
    (p.name ?? '').trim().toLowerCase() === 'inbox';

  const projects: Project[] = byNozbeOrder(
    (raw.projects ?? []).filter((p) => !isInboxProject(p)) as Record<string, unknown>[]
  ).map((p, i) => ({
    id: `nzp-${p.id}`,
    nozbeId: String(p.id),
    name: (p.name as string)?.trim() || 'Unbenanntes Projekt',
    color: mapColor(p.color, PALETTE[i % PALETTE.length]),
    icon: '📁',
  }));

  const categories: Category[] = byNozbeOrder(
    (raw.contexts ?? []) as Record<string, unknown>[]
  ).map((c, i) => ({
    id: `nzc-${c.id}`,
    nozbeId: String(c.id),
    name: (c.name as string)?.trim() || 'Kontext',
    color: mapColor(c.color, PALETTE[i % PALETTE.length]),
  }));

  const projectIds = new Set(projects.map((p) => p.id));
  const categoryIds = new Set(categories.map((c) => c.id));

  // Each Nozbe task becomes one parent task plus zero or more checklist sub-tasks.
  const tasks: Task[] = (raw.tasks ?? []).flatMap((t) => {
    const conIds = (t.con_list ?? [])
      .map((c) => (typeof c === 'string' ? c : c?.id))
      .filter((id): id is string => !!id)
      .map((id) => `nzc-${id}`)
      .filter((id) => categoryIds.has(id));

    const projectId =
      t.project_id && projectIds.has(`nzp-${t.project_id}`)
        ? `nzp-${t.project_id}`
        : null;

    const createdAt = toDate(
      (t as Record<string, unknown>)._created_at_org,
      tsToDate(t.ts, now)
    );
    const updatedAt = tsToDate(t.ts, createdAt);

    const { comments, attachments, checklist } = splitComments(
      (t.comments as NozbeComment[]) ?? [],
      createdAt
    );

    const parentId = `nzt-${t.id}`;
    const parent: Task = {
      id: parentId,
      nozbeId: String(t.id),
      number: 0,
      title: t.name?.trim() || '(ohne Titel)',
      description: '',
      projectId,
      parentId: null,
      dueDate: parseNozbeDate(t.datetime),
      priority: 'medium',
      categoryIds: conIds,
      completed: !!Number(t.completed),
      createdAt,
      updatedAt,
      starred: !!t.next,
      recurrence: mapRecur(t.recur),
      recurrenceEnd: null,
      comments: comments.length ? comments : undefined,
      attachments: attachments.length ? attachments : undefined,
    };

    // Checklist items → sub-tasks under the parent.
    const subtasks: Task[] = checklist.map((c, i) => ({
      id: `${parentId}-sub-${i}`,
      number: 0,
      title: c.title,
      description: '',
      projectId,
      parentId,
      dueDate: null,
      priority: 'medium',
      categoryIds: [],
      completed: c.done,
      createdAt,
      updatedAt,
      starred: false,
      recurrence: 'none',
      recurrenceEnd: null,
    }));

    return [parent, ...subtasks];
  });

  return { projects, categories, tasks };
}

// Fetch all three resource types and map them in one go (direct import path).
export async function importFromNozbeApi(
  token: string,
  clientId: string
): Promise<MappedImport> {
  const [projects, contexts, tasks] = await Promise.all([
    fetchNozbeList(token, clientId, 'project'),
    fetchNozbeList(token, clientId, 'context'),
    fetchNozbeList(token, clientId, 'task'),
  ]);
  return mapNozbe({
    projects: projects as NozbeProject[],
    contexts: contexts as NozbeContext[],
    tasks: tasks as NozbeTask[],
  });
}

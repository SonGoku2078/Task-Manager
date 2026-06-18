import type { Task, Project, Category, RecurrenceType } from './types';
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

// Pure mapper: Nozbe objects → our domain objects. Task numbers are assigned later
// by the store (which owns nextTaskNumber); here they default to 0.
export function mapNozbe(raw: NozbeExport): MappedImport {
  const now = new Date();

  const projects: Project[] = (raw.projects ?? []).map((p, i) => ({
    id: `nzp-${p.id}`,
    nozbeId: String(p.id),
    name: p.name?.trim() || 'Unbenanntes Projekt',
    color: PALETTE[i % PALETTE.length],
    icon: '📁',
  }));

  const categories: Category[] = (raw.contexts ?? []).map((c, i) => ({
    id: `nzc-${c.id}`,
    nozbeId: String(c.id),
    name: c.name?.trim() || 'Kontext',
    color: PALETTE[i % PALETTE.length],
  }));

  const projectIds = new Set(projects.map((p) => p.id));
  const categoryIds = new Set(categories.map((c) => c.id));

  const tasks: Task[] = (raw.tasks ?? []).map((t) => {
    const conIds = (t.con_list ?? [])
      .map((c) => (typeof c === 'string' ? c : c?.id))
      .filter((id): id is string => !!id)
      .map((id) => `nzc-${id}`)
      .filter((id) => categoryIds.has(id));

    const projectId =
      t.project_id && projectIds.has(`nzp-${t.project_id}`)
        ? `nzp-${t.project_id}`
        : null;

    return {
      id: `nzt-${t.id}`,
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
      createdAt: now,
      updatedAt: now,
      starred: !!t.next,
      recurrence: mapRecur(t.recur),
      recurrenceEnd: null,
    };
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

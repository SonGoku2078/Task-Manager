// eslint-disable-next-line @typescript-eslint/no-require-imports
const SQLiteLib = require('node-sqlite3-wasm') as {
  Database: new (path: string) => RawDB;
};
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { SCHEMA } from './schema.sql';

// ── Minimal raw types from node-sqlite3-wasm ─────────────────────────────────
interface RawStatement {
  run(params?: unknown): void;
  all(params?: unknown): Record<string, unknown>[];
  get(params?: unknown): Record<string, unknown> | undefined;
}
interface RawDB {
  exec(sql: string): void;
  prepare(sql: string): RawStatement;
  transaction(fn: () => void): () => void;
  close(): void;
}

// ── Public DB interface (better-sqlite3-compatible API) ───────────────────────
export type BindParam = Record<string, unknown> | unknown[] | string | number | null | undefined;
export interface Statement {
  run(params?: BindParam, ...rest: BindParam[]): void;
  all(params?: BindParam): Record<string, unknown>[];
  get(params?: BindParam): Record<string, unknown> | undefined;
}
export interface DB {
  exec(sql: string): void;
  prepare(sql: string): Statement;
  transaction(fn: () => void): () => void;
  close(): void;
}

// node-sqlite3-wasm uses ':name' keys; better-sqlite3 uses bare 'name' keys
// with '@name' placeholders in SQL.  This shim:
//   1. Replaces @name → :name in the SQL string
//   2. Adds ':' prefix to plain object keys on every call
function transformSql(sql: string): string {
  return sql.replace(/@(\w+)/g, ':$1');
}

function transformParams(
  params: Record<string, unknown> | unknown[] | string | number | null | undefined,
  ...rest: unknown[]
): unknown {
  if (params === undefined || params === null) return undefined;
  if (Array.isArray(params)) {
    // Positional array — pass as-is (single param wrapped in array for wasm lib)
    return params;
  }
  if (typeof params !== 'object') {
    // Scalar — wrap in array for positional binding
    const arr: unknown[] = [params, ...rest];
    return arr;
  }
  // Named-object: convert { key: val } → { ':key': val }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    out[k.startsWith(':') || k.startsWith('@') || k.startsWith('$') ? k : `:${k}`] = v;
  }
  return out;
}

// Drop named params that don't appear in the SQL. better-sqlite3 ignored extra
// keys, but node-sqlite3-wasm throws "Unknown binding parameter". This keeps the
// route code (which passes whole row objects to partial UPDATEs) working.
function filterNamed(p: unknown, named: Set<string>): unknown {
  if (!p || Array.isArray(p) || typeof p !== 'object') return p;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
    if (named.has(k.replace(/^[:@$]/, ''))) out[k] = v;
  }
  return out;
}

function wrapStatement(sql: string, raw: RawStatement): Statement {
  // Named placeholders actually present in this statement.
  const named = new Set<string>();
  for (const m of sql.matchAll(/[@:$](\w+)/g)) named.add(m[1]);
  return {
    run(params?, ...rest) {
      raw.run(filterNamed(transformParams(params, ...rest), named));
    },
    all(params?) {
      return raw.all(filterNamed(transformParams(params), named)) ?? [];
    },
    get(params?) {
      return raw.get(filterNamed(transformParams(params), named));
    },
  };
}

function wrapDB(raw: RawDB): DB {
  return {
    exec(sql) { raw.exec(sql); },
    prepare(sql) { return wrapStatement(sql, raw.prepare(transformSql(sql))); },
    transaction(fn) {
      return () => {
        raw.exec('BEGIN');
        try {
          fn();
          raw.exec('COMMIT');
        } catch (e) {
          try { raw.exec('ROLLBACK'); } catch (_) { /* ignore */ }
          throw e;
        }
      };
    },
    close() { raw.close(); },
  };
}

// ── Open the database ─────────────────────────────────────────────────────────
const DB_PATH =
  process.env.DB_PATH ??
  path.join(os.homedir(), '.task-manager', 'data.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// ── Safety net: snapshot the DB file on every startup ─────────────────────────
// A timestamped copy of the existing database is kept before we open it, so a
// bad write, failed migration, or corruption can always be rolled back.
const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backups');
const MAX_BACKUPS = 20;

export function backupDb(tag = 'startup'): void {
  try {
    if (!fs.existsSync(DB_PATH) || fs.statSync(DB_PATH).size === 0) return;
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, `data-${stamp}-${tag}.db`));
    // Retention: keep only the most recent MAX_BACKUPS files.
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('data-') && f.endsWith('.db'))
      .sort();
    for (const old of files.slice(0, Math.max(0, files.length - MAX_BACKUPS))) {
      try { fs.unlinkSync(path.join(BACKUP_DIR, old)); } catch { /* ignore */ }
    }
  } catch (e) {
    console.warn('DB backup failed (continuing):', e);
  }
}

backupDb('startup');

// ── Self-heal a stale dotfile lock ────────────────────────────────────────────
// node-sqlite3-wasm uses SQLite's "dotfile" locking VFS, which creates a
// `<db>.lock` file. If a server is killed or crashes uncleanly, that file is
// left behind and every subsequent open fails with "database is locked" until
// it is removed by hand. This app is single-instance (one local server owns the
// DB), so on startup we safely remove a leftover lock before opening.
const LOCK_PATH = `${DB_PATH}.lock`;
try {
  if (fs.existsSync(LOCK_PATH)) {
    fs.unlinkSync(LOCK_PATH);
    console.warn('Removed stale DB lock file:', LOCK_PATH);
  }
} catch (e) {
  console.warn('Could not remove stale lock file (continuing):', e);
}

const rawDb = new SQLiteLib.Database(DB_PATH);
export const db: DB = wrapDB(rawDb);
db.exec(SCHEMA);

// ── Auto-migrate: add columns that newer code expects but an older DB lacks ────
// `CREATE TABLE IF NOT EXISTS` never alters an existing table, so a DB created
// before a column was introduced is missing it — and every INSERT/UPDATE that
// references that column fails with "no such column", silently losing writes.
// This walks the expected schema and ALTERs in any missing column.
function ensureColumns(table: string, defs: Record<string, string>): void {
  let have: Set<string>;
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all();
    have = new Set(rows.map((r) => String((r as Record<string, unknown>).name)));
  } catch {
    return; // table doesn't exist yet — SCHEMA will have created it
  }
  for (const [col, decl] of Object.entries(defs)) {
    if (!have.has(col)) {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${decl}`);
        console.warn(`DB migration: added missing column ${table}.${col}`);
      } catch (e) {
        console.warn(`DB migration: could not add ${table}.${col}:`, e);
      }
    }
  }
}

ensureColumns('tasks', {
  section_id: 'TEXT',
  start_minutes: 'INTEGER',
  duration_min: 'INTEGER',
  waiting: 'INTEGER NOT NULL DEFAULT 0',
  waiting_for: 'TEXT',
  recurrence_end: 'TEXT',
  recur_interval: 'INTEGER',
  recur_unit: 'TEXT',
  recur_month_day: 'TEXT',
  completed_at: 'TEXT',
  nozbe_id: 'TEXT',
  sort_order: 'INTEGER NOT NULL DEFAULT 0',
  category_ids: "TEXT NOT NULL DEFAULT '[]'",
  assignee_ids: "TEXT NOT NULL DEFAULT '[]'",
  comments: "TEXT NOT NULL DEFAULT '[]'",
  attachments: "TEXT NOT NULL DEFAULT '[]'",
  links: "TEXT NOT NULL DEFAULT '[]'",
  linked_project_id: 'TEXT',
});
ensureColumns('projects', {
  label: 'TEXT',
  pinned: 'INTEGER NOT NULL DEFAULT 0',
  active: 'INTEGER NOT NULL DEFAULT 1',
  kind: "TEXT NOT NULL DEFAULT 'project'",
  description: 'TEXT',
  sort_order: 'INTEGER NOT NULL DEFAULT 0',
  nozbe_id: 'TEXT',
  parent_area_id: 'TEXT',
});

console.log(`SQLite database: ${DB_PATH}`);

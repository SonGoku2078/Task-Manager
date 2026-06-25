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

function wrapStatement(sql: string, raw: RawStatement): Statement {
  return {
    run(params?, ...rest) {
      raw.run(transformParams(params, ...rest));
    },
    all(params?) {
      return raw.all(transformParams(params)) ?? [];
    },
    get(params?) {
      return raw.get(transformParams(params));
    },
  };
}

function wrapDB(raw: RawDB): DB {
  return {
    exec(sql) { raw.exec(sql); },
    prepare(sql) { return wrapStatement(sql, raw.prepare(transformSql(sql))); },
    transaction(fn) { return raw.transaction(fn); },
    close() { raw.close(); },
  };
}

// ── Open the database ─────────────────────────────────────────────────────────
const DB_PATH =
  process.env.DB_PATH ??
  path.join(os.homedir(), '.task-manager', 'data.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const rawDb = new SQLiteLib.Database(DB_PATH);
export const db: DB = wrapDB(rawDb);
db.exec(SCHEMA);

console.log(`SQLite database: ${DB_PATH}`);

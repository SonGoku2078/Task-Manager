// Admin endpoints for the DEV environment (#29). The only consumer is the
// "PROD → DEV importieren" button in the settings of a dev instance.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SQLiteLib = require('node-sqlite3-wasm') as {
  Database: new (path: string) => {
    prepare(sql: string): { all(params?: unknown): Record<string, unknown>[]; get(params?: unknown): Record<string, unknown> | undefined };
    close(): void;
  };
};
import { Router } from 'express';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { db, backupDb } from '../db';

const router = Router();

const TABLES = [
  'tasks',
  'projects',
  'categories',
  'members',
  'sections',
  'blockers',
  'saved_views',
  'activity_log',
  'settings',
];

// Replace ALL data of this (dev) database with a snapshot of the production
// database. PROD is only ever READ (plain file copy); the dev.db gets a
// backup first, and the swap runs in one transaction (error ⇒ rollback).
router.post('/import-prod', (_req, res) => {
  // Hard guard: refuse on anything that isn't the standard dev setup.
  const dbFile = process.env.DB_FILE ?? 'data.db';
  if (dbFile === 'data.db' || process.env.DB_PATH) {
    return res.status(403).json({ error: 'Import ist nur in der DEV-Umgebung erlaubt.' });
  }
  const prodPath = path.join(os.homedir(), '.task-manager', 'data.db');
  if (!fs.existsSync(prodPath)) {
    return res.status(404).json({ error: `PROD-Datenbank nicht gefunden: ${prodPath}` });
  }

  // Copy the file trio to temp — opening the live prod DB directly would fight
  // its dotfile lock and could miss WAL commits; on the copy, SQLite runs the
  // WAL recovery safely and the original stays untouched.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-import-'));
  const tmpDb = path.join(tmpDir, 'data.db');
  let src: InstanceType<typeof SQLiteLib.Database> | null = null;
  try {
    fs.copyFileSync(prodPath, tmpDb);
    for (const suf of ['-wal', '-shm']) {
      if (fs.existsSync(prodPath + suf)) fs.copyFileSync(prodPath + suf, tmpDb + suf);
    }

    backupDb('pre-prod-import');

    src = new SQLiteLib.Database(tmpDb);
    const counts: Record<string, number> = {};
    db.transaction(() => {
      for (const t of TABLES) {
        db.prepare(`DELETE FROM ${t}`).run();
        const exists = src!
          .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
          .get([t]);
        if (!exists) {
          counts[t] = 0;
          continue;
        }
        const rows = src!.prepare(`SELECT * FROM ${t}`).all();
        counts[t] = rows.length;
        if (!rows.length) continue;
        // Explicit column names: source ∩ dev schema, so an older prod DB
        // (missing columns → dev defaults) or a newer one can't break the copy.
        const devCols = new Set(
          db.prepare(`PRAGMA table_info(${t})`).all().map((r) => String(r.name))
        );
        const cols = Object.keys(rows[0]).filter((c) => devCols.has(c));
        const ins = db.prepare(
          `INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map((c) => `@${c}`).join(',')})`
        );
        for (const row of rows) {
          ins.run(Object.fromEntries(cols.map((c) => [c, row[c] ?? null])));
        }
      }
    })();
    return res.json({ ok: true, counts });
  } catch (e) {
    console.error('PROD→DEV import failed:', e);
    return res.status(500).json({ error: String(e) });
  } finally {
    try { src?.close(); } catch { /* ignore */ }
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

export default router;

import { Router } from 'express';
import { db } from '../db';

const router = Router();

const JSON_KEYS = new Set(['nozbe', 'colorPalette', 'colorLabels', 'navOrder']);

function loadSettings(): Record<string, unknown> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const out: Record<string, unknown> = {};
  for (const { key, value } of rows) {
    if (key === 'nextTaskNumber') { out[key] = Number(value); continue; }
    if (JSON_KEYS.has(key)) {
      try { out[key] = JSON.parse(value); } catch { out[key] = value; }
    } else {
      out[key] = value;
    }
  }
  return out;
}

router.get('/', (_req, res) => {
  res.json(loadSettings());
});

router.patch('/', (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  db.transaction(() => {
    for (const [k, v] of Object.entries(req.body)) {
      const stored = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
      upsert.run(k, stored);
    }
  })();
  res.json(loadSettings());
});

export default router;

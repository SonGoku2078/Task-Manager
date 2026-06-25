import { Router } from 'express';
import { db } from '../db';

const router = Router();

function rowToEntry(r: Record<string, unknown>) {
  return {
    id: r.id, at: new Date(r.at as string), actor: r.actor ?? '',
    kind: r.kind, taskId: r.task_id ?? null, taskNumber: r.task_number ?? null,
    taskTitle: r.task_title ?? '', field: r.field ?? null,
    from: r.from_val ?? null, to: r.to_val ?? null,
    payload: r.payload ? JSON.parse(r.payload as string) : null,
  };
}

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM activity_log ORDER BY at DESC LIMIT 500').all();
  res.json(rows.map(r => rowToEntry(r as Record<string, unknown>)));
});

router.post('/', (req, res) => {
  const e = req.body;
  db.prepare(`INSERT INTO activity_log VALUES (@id,@at,@actor,@kind,@task_id,@task_number,@task_title,@field,@from_val,@to_val,@payload)`).run({
    id: e.id, at: new Date(e.at).toISOString(), actor: e.actor ?? '',
    kind: e.kind, task_id: e.taskId ?? null, task_number: e.taskNumber ?? null,
    task_title: e.taskTitle ?? '', field: e.field ?? null,
    from_val: e.from ?? null, to_val: e.to ?? null,
    payload: e.payload ? JSON.stringify(e.payload) : null,
  });
  // Keep max 500 entries.
  db.prepare(`DELETE FROM activity_log WHERE id NOT IN (SELECT id FROM activity_log ORDER BY at DESC LIMIT 500)`).run();
  res.status(201).end();
});

export default router;

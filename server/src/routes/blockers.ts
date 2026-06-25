import { Router } from 'express';
import { db } from '../db';

const router = Router();

function rowToBlocker(r: Record<string, unknown>) {
  return { id: r.id, projectId: r.project_id, weekdays: JSON.parse(r.weekdays as string ?? '[]'), startMinutes: r.start_minutes, durationMin: r.duration_min };
}

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM blockers').all().map(r => rowToBlocker(r as Record<string, unknown>)));
});

router.post('/', (req, res) => {
  const { id, projectId, weekdays, startMinutes, durationMin } = req.body;
  db.prepare('INSERT INTO blockers VALUES (@id,@project_id,@weekdays,@start_minutes,@duration_min)').run({ id, project_id: projectId, weekdays: JSON.stringify(weekdays ?? []), start_minutes: startMinutes ?? 0, duration_min: durationMin ?? 60 });
  res.status(201).json(rowToBlocker(db.prepare('SELECT * FROM blockers WHERE id=?').get(id) as Record<string, unknown>));
});

router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM blockers WHERE id=?').get(id) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  const upd = { ...rowToBlocker(row), ...req.body, id };
  db.prepare('UPDATE blockers SET project_id=@projectId, weekdays=@wd, start_minutes=@startMinutes, duration_min=@durationMin WHERE id=@id').run({ ...upd, wd: JSON.stringify(upd.weekdays) });
  return res.json(rowToBlocker(db.prepare('SELECT * FROM blockers WHERE id=?').get(id) as Record<string, unknown>));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM blockers WHERE id=?').run(req.params.id);
  res.status(204).end();
});

export default router;

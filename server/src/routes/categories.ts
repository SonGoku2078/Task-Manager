import { Router } from 'express';
import { db } from '../db';

const router = Router();

function rowToCat(r: Record<string, unknown>) {
  return { id: r.id, name: r.name, color: r.color ?? '#4caf50', nozbeId: r.nozbe_id ?? null };
}

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all().map(r => rowToCat(r as Record<string, unknown>)));
});

router.post('/', (req, res) => {
  const { id, name, color, nozbeId, sortOrder } = req.body;
  db.prepare('INSERT INTO categories VALUES (@id,@name,@color,@sort_order,@nozbe_id)').run({ id, name, color: color ?? '#4caf50', sort_order: sortOrder ?? 0, nozbe_id: nozbeId ?? null });
  res.status(201).json(rowToCat(db.prepare('SELECT * FROM categories WHERE id=?').get(id) as Record<string, unknown>));
});

router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM categories WHERE id=?').get(id) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  const upd = { ...rowToCat(row), ...req.body, id };
  db.prepare('UPDATE categories SET name=@name, color=@color WHERE id=@id').run(upd);
  return res.json(rowToCat(db.prepare('SELECT * FROM categories WHERE id=?').get(id) as Record<string, unknown>));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  res.status(204).end();
});

export default router;

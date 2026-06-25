import { Router } from 'express';
import { db } from '../db';

const router = Router();

function rowToMember(r: Record<string, unknown>) {
  return { id: r.id, name: r.name, role: r.role ?? 'editor', color: r.color ?? '#4caf50', avatarUrl: r.avatar_url ?? undefined };
}

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM members').all().map(r => rowToMember(r as Record<string, unknown>)));
});

router.post('/', (req, res) => {
  const { id, name, role, color, avatarUrl } = req.body;
  db.prepare('INSERT INTO members VALUES (@id,@name,@role,@color,@avatar_url)').run({ id, name, role: role ?? 'editor', color: color ?? '#4caf50', avatar_url: avatarUrl ?? null });
  res.status(201).json(rowToMember(db.prepare('SELECT * FROM members WHERE id=?').get(id) as Record<string, unknown>));
});

router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM members WHERE id=?').get(id) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  const upd = { ...rowToMember(row), ...req.body, id };
  db.prepare('UPDATE members SET name=@name, role=@role, color=@color, avatar_url=@avatarUrl WHERE id=@id').run(upd);
  return res.json(rowToMember(db.prepare('SELECT * FROM members WHERE id=?').get(id) as Record<string, unknown>));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM members WHERE id=?').run(req.params.id);
  res.status(204).end();
});

export default router;

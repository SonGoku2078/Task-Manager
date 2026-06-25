import { Router } from 'express';
import { db } from '../db';

const router = Router();

function rowToProject(r: Record<string, unknown>) {
  return {
    id:          r.id,
    name:        r.name ?? '',
    color:       r.color ?? '#4caf50',
    icon:        r.icon ?? '📁',
    label:       r.label ?? null,
    pinned:      !!(r.pinned as number),
    active:      !!(r.active as number),
    kind:        r.kind ?? 'project',
    description: r.description ?? undefined,
    sortOrder:   r.sort_order ?? 0,
    nozbeId:      r.nozbe_id ?? null,
    parentAreaId: r.parent_area_id ?? null,
  };
}

function projectToRow(p: Record<string, unknown>) {
  return {
    id:             p.id,
    name:           p.name ?? '',
    color:          p.color ?? '#4caf50',
    icon:           p.icon ?? '📁',
    label:          p.label ?? null,
    pinned:         p.pinned ? 1 : 0,
    active:         p.active !== false ? 1 : 0,
    kind:           p.kind ?? 'project',
    description:    p.description ?? null,
    sort_order:     p.sortOrder ?? 0,
    nozbe_id:       p.nozbeId ?? null,
    parent_area_id: p.parentAreaId ?? null,
  };
}

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY sort_order ASC').all();
  res.json(rows.map(r => rowToProject(r as Record<string, unknown>)));
});

router.post('/', (req, res) => {
  const row = projectToRow(req.body);
  db.prepare(`INSERT INTO projects VALUES (
    @id,@name,@color,@icon,@label,@pinned,@active,@kind,@description,@sort_order,@nozbe_id,@parent_area_id
  )`).run(row);
  res.status(201).json(rowToProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(row.id as string) as Record<string, unknown>));
});

router.patch('/reorder', (req, res) => {
  const { ids } = req.body as { ids: string[] };
  const upd = db.prepare('UPDATE projects SET sort_order = ? WHERE id = ?');
  db.transaction(() => ids.forEach((id, i) => upd.run(i, id)))();
  res.status(204).end();
});

router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = projectToRow({ ...rowToProject(existing), ...req.body, id });
  db.prepare(`UPDATE projects SET name=@name, color=@color, icon=@icon, label=@label,
    pinned=@pinned, active=@active, kind=@kind, description=@description,
    sort_order=@sort_order, nozbe_id=@nozbe_id, parent_area_id=@parent_area_id WHERE id=@id`).run(merged);
  return res.json(rowToProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown>));
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.transaction(() => {
    db.prepare("UPDATE tasks SET project_id = NULL WHERE project_id = ?").run(id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  })();
  res.status(204).end();
});

export default router;

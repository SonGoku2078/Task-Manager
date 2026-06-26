import { Router } from 'express';
import { db } from '../db';

const router = Router();

function rowToView(r: Record<string, unknown>) {
  return {
    id: r.id, name: r.name,
    filters: JSON.parse(r.filters as string ?? '{}'),
    sortField: r.sort_field ?? 'manual',
    sortDir: r.sort_dir ?? 'asc',
    searchQuery: r.search_query ?? '',
    sortOrder: r.sort_order ?? 0,
  };
}

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM saved_views ORDER BY sort_order ASC').all().map(r => rowToView(r as Record<string, unknown>)));
});

router.post('/', (req, res) => {
  const { id, name, filters, sortField, sortDir, searchQuery, sortOrder } = req.body;
  db.prepare('INSERT OR REPLACE INTO saved_views VALUES (@id,@name,@filters,@sort_field,@sort_dir,@search_query,@sort_order)').run({
    id, name, filters: JSON.stringify(filters ?? {}),
    sort_field: sortField ?? 'manual', sort_dir: sortDir ?? 'asc',
    search_query: searchQuery ?? '', sort_order: sortOrder ?? 0,
  });
  res.status(201).json(rowToView(db.prepare('SELECT * FROM saved_views WHERE id=?').get(id) as Record<string, unknown>));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM saved_views WHERE id=?').run(req.params.id);
  res.status(204).end();
});

export default router;

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { db } from './db';
import tasksRouter from './routes/tasks';
import projectsRouter from './routes/projects';
import categoriesRouter from './routes/categories';
import membersRouter from './routes/members';
import sectionsRouter from './routes/sections';
import blockersRouter from './routes/blockers';
import savedViewsRouter from './routes/savedViews';
import activityLogRouter from './routes/activityLog';
import settingsRouter from './routes/settings';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API routes
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/tasks',        tasksRouter);
app.use('/api/projects',     projectsRouter);
app.use('/api/categories',   categoriesRouter);
app.use('/api/members',      membersRouter);
app.use('/api/sections',     sectionsRouter);
app.use('/api/blockers',     blockersRouter);
app.use('/api/saved-views',  savedViewsRouter);
app.use('/api/activity-log', activityLogRouter);
app.use('/api/settings',     settingsRouter);

// One-time localStorage → SQLite migration.
app.post('/api/migrate', async (req, res) => {
  const already = (db.prepare("SELECT value FROM settings WHERE key='migrated'").get() as { value: string } | undefined)?.value;
  if (already === '1') return res.status(409).json({ error: 'Already migrated' });
  const { runMigration } = await import('./migrate');
  const count = runMigration(db, req.body);
  return res.json({ ok: true, tasks: count });
});

// Serve compiled frontend in production (vite build --outDir ../public).
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('*', (_req, res) => {
  const index = path.join(publicDir, 'index.html');
  res.sendFile(index, (err) => {
    if (err) res.status(404).send('Frontend not built yet. Run: npm run build in the root.');
  });
});

app.listen(PORT, () => {
  console.log(`Task Manager server running at http://localhost:${PORT}`);
});

import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db';
import { tasksToICS, IcsTask } from '../ics';
import { PORT, lanIPv4, publicAddress, isLoopback } from '../lan';

// The feed URL carries a secret token because the server has no auth at all —
// without it anyone on the LAN could read every task via the calendar URL.
function getOrCreateIcsToken(): string {
  const row = db.prepare("SELECT value FROM settings WHERE key='icsToken'").get() as
    | { value: string }
    | undefined;
  if (row?.value) return row.value;
  const token = crypto.randomBytes(24).toString('base64url');
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('icsToken', token);
  return token;
}

function rowToIcsTask(r: Record<string, unknown>): IcsTask {
  return {
    id: String(r.id),
    title: (r.title as string) ?? '',
    description: (r.description as string) ?? '',
    dueDate: r.due_date ? new Date(r.due_date as string) : null,
    startMinutes: (r.start_minutes as number | null) ?? null,
    durationMin: (r.duration_min as number | null) ?? null,
    completed: !!(r.completed as number),
    updatedAt: new Date(r.updated_at as string),
    recurrence: (r.recurrence as IcsTask['recurrence']) ?? 'none',
    recurrenceEnd: r.recurrence_end ? new Date(r.recurrence_end as string) : null,
    recurInterval: (r.recur_interval as number | null) ?? null,
    recurUnit: (r.recur_unit as IcsTask['recurUnit']) ?? null,
    recurMonthDay: (r.recur_month_day as IcsTask['recurMonthDay']) ?? null,
    projectName: (r.project_name as string | null) ?? null,
  };
}

const router = Router();

// Feed info for the settings UIs (web + mobile). Generating the token lazily
// here means it exists from the first settings visit onwards.
router.get('/api/calendar-feed', (req, res) => {
  const token = getOrCreateIcsToken();
  const feedPath = `/calendar/${token}.ics`;
  // Die Adresse aus der Anfrage steht zuerst: sie ist nachweislich erreichbar
  // (diese Anfrage kam ja darueber). Im Container liefert lanIPv4() nur
  // Bridge-Adressen wie 172.18.0.3, die niemand aufrufen kann (#79).
  const addr = publicAddress(req);
  const urls = [`${addr.baseUrl}${feedPath}`];
  // Interface-Adressen NUR als Notnagel, wenn die Anfrage ueber localhost kam
  // (dann laesst sich daraus keine Adresse fuer andere Geraete ableiten).
  // Sonst waeren es im Container die unbrauchbaren 172.x-Bridge-Adressen.
  if (isLoopback(addr.hostname)) {
    for (const ip of lanIPv4()) {
      const u = `http://${ip}:${PORT}${feedPath}`;
      if (!urls.includes(u)) urls.push(u);
    }
  }
  res.json({ token, port: PORT, baseUrl: addr.baseUrl, urls });
});

// The subscribable feed. 404 (not 403) on a bad token — don't confirm the
// route exists to someone probing without the secret.
router.get('/calendar/:token.ics', (req, res) => {
  const stored = (
    db.prepare("SELECT value FROM settings WHERE key='icsToken'").get() as
      | { value: string }
      | undefined
  )?.value;
  const given = (req.params as Record<string, string>).token ?? '';
  const ok =
    !!stored &&
    given.length === stored.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(stored));
  if (!ok) return res.status(404).send('Not found');

  const rows = db
    .prepare(
      `SELECT t.*, p.name AS project_name FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE t.due_date IS NOT NULL`
    )
    .all() as Record<string, unknown>[];
  const ics = tasksToICS(rows.map(rowToIcsTask));
  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Content-Disposition', 'inline; filename="selfmanaged.ics"');
  res.set('Cache-Control', 'no-cache');
  return res.send(ics);
});

export default router;

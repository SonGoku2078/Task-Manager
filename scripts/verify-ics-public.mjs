// Prueft eine oeffentlich erreichbare ICS-Feed-URL (#61): Der Feed muss gehen,
// alles andere darf NICHT erreichbar sein.
//
//   node scripts/verify-ics-public.mjs https://<netbird-domain>/calendar/<token>.ics
//
// Die Pruefung ist rein lesend (GET/HEAD) und kann jederzeit wiederholt werden.
// Gegen einen UNGEFILTERTEN Server ausgefuehrt schlaegt sie absichtlich an —
// so laesst sich zeigen, dass der Filter wirklich etwas tut.

const feedUrl = process.argv[2];
if (!feedUrl) {
  console.error('Aufruf: node scripts/verify-ics-public.mjs <feed-url>');
  process.exit(2);
}

let base;
try {
  const u = new URL(feedUrl);
  base = `${u.protocol}//${u.host}`;
} catch {
  console.error(`Keine gueltige URL: ${feedUrl}`);
  process.exit(2);
}

const results = [];
const ok = (name, pass, extra = '') => {
  results.push({ name, pass });
  console.log(`${pass ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
};

const get = async (url, method = 'GET') => {
  try {
    const res = await fetch(url, { method, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const body = method === 'GET' ? await res.text() : '';
    return { status: res.status, type: res.headers.get('content-type') ?? '', body };
  } catch (e) {
    return { status: 0, type: '', body: '', error: String(e.message ?? e) };
  }
};

console.log(`Pruefe ${base}\n`);

// 1. Der Feed selbst muss funktionieren.
const feed = await get(feedUrl);
ok(
  'Feed liefert 200 + text/calendar',
  feed.status === 200 && /text\/calendar/.test(feed.type),
  `HTTP ${feed.status} ${feed.type}${feed.error ? ' ' + feed.error : ''}`
);
ok(
  'Feed-Inhalt ist ein gueltiger Kalender',
  feed.body.startsWith('BEGIN:VCALENDAR') && feed.body.includes('END:VCALENDAR'),
  feed.body.slice(0, 24).replace(/\n/g, ' ')
);

// 2. Falscher Token darf nichts liefern.
const wrong = await get(feedUrl.replace(/\/calendar\/[^/]+$/, '/calendar/wrongtoken123.ics'));
ok('Falscher Token -> 404', wrong.status === 404, `HTTP ${wrong.status}`);

// 3. Alles andere darf von aussen NICHT erreichbar sein.
for (const path of ['/', '/api/tasks', '/api/projects', '/health', '/calendar/']) {
  const r = await get(base + path);
  ok(`${path} nicht erreichbar`, r.status === 404 || r.status === 0, `HTTP ${r.status}`);
}

// 4. Schreibende Methoden muessen abgewiesen werden.
const post = await get(feedUrl, 'POST');
ok('POST auf den Feed abgewiesen', post.status === 403 || post.status === 404 || post.status === 405, `HTTP ${post.status}`);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} Pruefungen bestanden`);
if (failed.length) {
  console.log('\nFehlgeschlagen:');
  for (const f of failed) console.log('  - ' + f.name);
  console.log('\nWenn "nicht erreichbar"-Pruefungen fehlschlagen, zeigt der oeffentliche');
  console.log('Zugang auf den Server statt auf den Filter-Proxy — sofort korrigieren.');
}
// exitCode statt process.exit(): laesst offene Verbindungen sauber auslaufen.
process.exitCode = failed.length ? 1 : 0;

import { useEffect, useMemo, useState } from 'react';
import './TestReportView.css';

// 🧪 Testreport — the pre-deploy approval page. Renders the central test-case
// database (docs/testcases.json, served via /api/testreport): every feature
// and regression test with its latest run result. Deploy only when green.

interface TestRun {
  datum: string;
  ergebnis: 'pass' | 'fail' | 'offen';
  bemerkung?: string;
}

interface TestCase {
  id: string;
  bereich: string;
  titel: string;
  erwartung: string;
  typ: 'auto' | 'manuell';
  quelle: string;
  regression: boolean;
  laeufe: TestRun[];
}

interface TestDb {
  updated: string;
  cases: TestCase[];
}

const lastRun = (c: TestCase): TestRun | null =>
  c.laeufe.length ? c.laeufe[c.laeufe.length - 1] : null;

type Filter = 'alle' | 'regression' | 'fail' | 'offen';

export default function TestReportView() {
  const [db, setDb] = useState<TestDb | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('alle');

  useEffect(() => {
    let on = true;
    fetch('/api/testreport')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => { if (on) setDb(d); })
      .catch((e) => { if (on) setError(e instanceof Error ? e.message : 'Fehler'); });
    return () => { on = false; };
  }, []);

  const stats = useMemo(() => {
    const cases = db?.cases ?? [];
    const pass = cases.filter((c) => lastRun(c)?.ergebnis === 'pass').length;
    const fail = cases.filter((c) => lastRun(c)?.ergebnis === 'fail').length;
    const offen = cases.length - pass - fail;
    return { total: cases.length, pass, fail, offen };
  }, [db]);

  if (error) {
    return <div className="testreport-view"><p className="testreport-error">Testreport nicht verfügbar: {error} (Server offline?)</p></div>;
  }
  if (!db) {
    return <div className="testreport-view"><p>…</p></div>;
  }

  const visible = db.cases.filter((c) => {
    const r = lastRun(c);
    if (filter === 'regression') return c.regression;
    if (filter === 'fail') return r?.ergebnis === 'fail';
    if (filter === 'offen') return !r || r.ergebnis === 'offen';
    return true;
  });

  const byBereich = new Map<string, TestCase[]>();
  for (const c of visible) {
    if (!byBereich.has(c.bereich)) byBereich.set(c.bereich, []);
    byBereich.get(c.bereich)!.push(c);
  }

  const allGreen = stats.fail === 0 && stats.offen === 0 && stats.total > 0;

  return (
    <div className="testreport-view">
      <div className={`testreport-verdict ${allGreen ? 'go' : stats.fail > 0 ? 'nogo' : 'pending'}`}>
        {allGreen
          ? '🟢 Alle Testfälle bestanden — bereit für Deployment-Approve.'
          : stats.fail > 0
            ? `🔴 ${stats.fail} Testfall/-fälle fehlgeschlagen — kein Deploy.`
            : `🟡 ${stats.offen} Testfall/-fälle noch nicht gelaufen.`}
        <span className="testreport-updated">Stand: {db.updated}</span>
      </div>

      <div className="report-cards">
        <div className="report-card"><div className="report-num">{stats.total}</div><div className="report-label">Testfälle</div></div>
        <div className="report-card"><div className="report-num pass">{stats.pass}</div><div className="report-label">Pass</div></div>
        <div className="report-card"><div className="report-num fail">{stats.fail}</div><div className="report-label">Fail</div></div>
        <div className="report-card"><div className="report-num">{stats.offen}</div><div className="report-label">Offen</div></div>
      </div>

      <div className="testreport-filters">
        {(
          [
            ['alle', 'Alle'],
            ['regression', 'Nur Regression'],
            ['fail', 'Nur Fails'],
            ['offen', 'Nur offene'],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            className={`testreport-filter ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {[...byBereich.entries()].map(([bereich, cases]) => (
        <section key={bereich} className="testreport-section">
          <h3 className="testreport-heading">{bereich}</h3>
          <table className="testreport-table">
            <thead>
              <tr>
                <th>ID</th><th>Testfall</th><th>Typ</th><th>Regr.</th><th>Letzter Lauf</th><th>Ergebnis</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const r = lastRun(c);
                return (
                  <tr key={c.id}>
                    <td className="testreport-id">{c.id}</td>
                    <td>
                      <div className="testreport-title" title={c.erwartung}>{c.titel}</div>
                      <div className="testreport-source">{c.quelle}</div>
                    </td>
                    <td>{c.typ === 'auto' ? '🤖 auto' : '🖱 manuell'}</td>
                    <td>{c.regression ? '✓' : ''}</td>
                    <td>{r ? `${r.datum}${r.bemerkung ? ` — ${r.bemerkung}` : ''}` : '—'}</td>
                    <td>
                      <span className={`testreport-badge ${r?.ergebnis ?? 'offen'}`}>
                        {r?.ergebnis === 'pass' ? '✅ pass' : r?.ergebnis === 'fail' ? '❌ fail' : '⏳ offen'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

import { useState } from 'react';
import { useStore } from '../store';
import { getBaseUrl, setBaseUrl, flushOutbox } from '../api';

export default function Settings({ onClose }: { onClose: () => void }) {
  const theme = useStore((s) => s.settings.theme);
  const setTheme = useStore((s) => s.setTheme);
  const loadAll = useStore((s) => s.loadAll);
  const taskCount = useStore((s) => s.tasks.length);

  const [url, setUrl] = useState(getBaseUrl());
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  // Test connects, SAVES the URL, and actually loads data — so "ok" means the
  // app is really talking to the backend (not just /health reachable).
  const testAndConnect = async () => {
    setBusy(true);
    setStatus('… verbinde');
    const base = url.trim().replace(/\/+$/, '');
    setBaseUrl(base);
    setUrl(base);
    try {
      const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
      if (!health.ok) { setStatus(`✕ /health antwortet ${health.status}`); return; }
      const tasks = await (await fetch(`${base}/api/tasks`, { signal: AbortSignal.timeout(8000) })).json();
      const n = Array.isArray(tasks) ? tasks.length : 0;
      await loadAll();
      setStatus(`✓ Verbunden — ${n} Aufgaben geladen`);
    } catch (e) {
      setStatus(`✕ nicht erreichbar (${e instanceof Error ? e.message : 'Fehler'})`);
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    setBusy(true);
    try { await flushOutbox(); await loadAll(); } finally { setBusy(false); }
  };

  return (
    <div className="m-modal-backdrop" onClick={onClose}>
      <div className="m-modal" onClick={(e) => e.stopPropagation()}>
        <div className="m-modal-head">
          <span className="m-title">Einstellungen</span>
          <button className="m-modal-x" onClick={onClose}>✕</button>
        </div>

        <label className="m-field">
          <span>Server-URL (Dev-Backend im WLAN)</span>
          <input
            value={url}
            placeholder="http://192.168.1.193:3002"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => { setUrl(e.target.value); setStatus(''); }}
          />
        </label>

        <button className="m-btn-ghost" onClick={testAndConnect} disabled={busy || !url.trim()}>
          {busy ? '… verbinde' : 'Verbinden & Daten laden'}
        </button>
        {status && (
          <div className={status.startsWith('✓') ? 'm-ok' : status.startsWith('✕') ? 'm-fail' : ''}>
            {status}
          </div>
        )}

        <div className="m-settings-info">
          Aktive URL: <code>{getBaseUrl() || '(keine — Server-URL eingeben)'}</code><br />
          Geladene Aufgaben: <strong>{taskCount}</strong>
          {taskCount > 0 && ' — Daten sind da. Tabs sind gefiltert (Inbox = projektlos, Woche = bald fällig, Aktion = ★).'}
        </div>

        <button className="m-btn-ghost" onClick={syncNow} disabled={busy}>↻ Jetzt synchronisieren</button>

        <label className="m-toggle">
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
          <span>Dark Mode</span>
        </label>

        <div className="m-modal-foot">
          <button className="m-btn-save" onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  );
}

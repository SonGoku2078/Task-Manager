import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { getBaseUrl, setBaseUrl, flushOutbox } from '../api';
import { checkForUpdate, openApk, APP_VERSION } from '../update';
import { useSwipeDown } from '../gestures';

export default function Settings({ onClose }: { onClose: () => void }) {
  const theme = useStore((s) => s.settings.theme);
  const setTheme = useStore((s) => s.setTheme);
  const loadAll = useStore((s) => s.loadAll);
  const taskCount = useStore((s) => s.tasks.length);

  // Pre-fill with a sensible default so nothing must be typed from scratch
  // (editable — change the IP/port as needed).
  const [url, setUrl] = useState(getBaseUrl() || 'http://192.168.8.188:3001');
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const swipe = useSwipeDown(onClose);
  const [updateMsg, setUpdateMsg] = useState<string>('');
  const [updateUrl, setUpdateUrl] = useState<string | null>(null);

  const checkUpdate = async () => {
    setUpdateMsg('… suche');
    setUpdateUrl(null);
    const u = await checkForUpdate();
    if (!u) { setUpdateMsg('✕ Update-Prüfung fehlgeschlagen (kein Internet?)'); return; }
    if (u.available && u.apkUrl) {
      setUpdateUrl(u.apkUrl);
      setUpdateMsg(`⬆ Update ${u.latest.replace(/^mobile-v/, 'v')} verfügbar`);
    } else {
      setUpdateMsg(`✓ Aktuell (${u.current === 'dev' ? 'Entwicklungs-Build' : 'v' + u.current})`);
    }
  };

  // Test connects, SAVES the URL, and actually loads data — so "ok" means the
  // app is really talking to the backend (not just /health reachable).
  const testAndConnect = async () => {
    setBusy(true);
    setStatus('… verbinde');
    // setBaseUrl forces an absolute http(s):// URL; read it back normalized.
    setBaseUrl(url);
    const base = getBaseUrl();
    setUrl(base);
    try {
      // Verify it's really OUR backend: /health must return JSON {ok:true}.
      // (A wrong URL can resolve to the app's own localhost server and return
      // the SPA HTML with status 200 — that must NOT count as connected.)
      const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
      const healthData = await health.json().catch(() => null);
      if (!health.ok || !healthData || healthData.ok !== true) {
        setStatus('✕ Kein SelfManaged-Server unter dieser URL');
        return;
      }
      const tasks = await (await fetch(`${base}/api/tasks`, { signal: AbortSignal.timeout(8000) })).json();
      if (!Array.isArray(tasks)) {
        setStatus('✕ Unerwartete Antwort von /api/tasks');
        return;
      }
      await loadAll();
      setStatus(`✓ Verbunden — ${tasks.length} Aufgaben geladen`);
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

  // ICS calendar feed URL (issue #24) — token-secured, for subscribing from an
  // external calendar app on the same network.
  const [feedUrl, setFeedUrl] = useState('');
  const [feedCopied, setFeedCopied] = useState(false);
  useEffect(() => {
    const base = getBaseUrl();
    if (!base) return;
    fetch(`${base}/api/calendar-feed`, { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then((d) => { if (d?.token) setFeedUrl(`${base}/calendar/${d.token}.ics`); })
      .catch(() => {});
  }, []);
  const copyFeed = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setFeedCopied(true);
      setTimeout(() => setFeedCopied(false), 1500);
    } catch {
      /* WebView clipboard blocked — the code block stays selectable */
    }
  };

  return (
    <div className="m-modal-backdrop" onClick={onClose}>
      <div className="m-modal" onClick={(e) => e.stopPropagation()} style={swipe.style} {...swipe.handlers}>
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

        {feedUrl && (
          <div className="m-settings-info">
            Kalender-Feed (ICS) — in Proton/Thunderbird abonnieren:<br />
            <code style={{ wordBreak: 'break-all', userSelect: 'all' }}>{feedUrl}</code>
            <button className="m-btn-ghost" onClick={copyFeed}>
              {feedCopied ? '✓ kopiert' : '📋 Link kopieren'}
            </button>
          </div>
        )}

        <button className="m-btn-ghost" onClick={syncNow} disabled={busy}>↻ Jetzt synchronisieren</button>
        <div className="m-settings-hint">
          Läuft automatisch, sobald wieder eine Verbindung besteht — dieser Knopf erzwingt es sofort.
        </div>

        <label className="m-toggle">
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
          <span>Dark Mode</span>
        </label>

        <button className="m-btn-ghost" onClick={checkUpdate}>⬆ Nach Updates suchen</button>
        {updateMsg && (
          <div className={updateMsg.startsWith('✓') ? 'm-ok' : updateMsg.startsWith('✕') ? 'm-fail' : ''}>
            {updateUrl ? (
              <button className="m-update-banner" onClick={() => openApk(updateUrl)}>
                {updateMsg} — tippen zum Installieren
              </button>
            ) : updateMsg}
          </div>
        )}

        <div className="m-settings-info">
          App-Version: <code>{APP_VERSION === 'dev' ? 'Entwicklungs-Build' : 'v' + APP_VERSION}</code>
        </div>

        <div className="m-modal-foot">
          <button className="m-btn-save" onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  );
}

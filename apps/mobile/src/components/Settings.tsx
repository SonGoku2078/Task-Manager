import { useState } from 'react';
import { useStore } from '../store';
import { getBaseUrl, setBaseUrl, flushOutbox } from '../api';

export default function Settings({ onClose }: { onClose: () => void }) {
  const theme = useStore((s) => s.settings.theme);
  const setTheme = useStore((s) => s.setTheme);
  const loadAll = useStore((s) => s.loadAll);

  const [url, setUrl] = useState(getBaseUrl());
  const [test, setTest] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [syncing, setSyncing] = useState(false);

  const testConn = async () => {
    setTest('testing');
    try {
      const base = url.trim().replace(/\/+$/, '');
      const r = await fetch(`${base}/health`, { signal: AbortSignal.timeout(4000) });
      setTest(r.ok ? 'ok' : 'fail');
    } catch {
      setTest('fail');
    }
  };

  const save = () => {
    setBaseUrl(url);
    onClose();
    loadAll();
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      await flushOutbox();
      await loadAll();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="m-modal-backdrop" onClick={onClose}>
      <div className="m-modal" onClick={(e) => e.stopPropagation()}>
        <div className="m-modal-head">
          <span className="m-title">Einstellungen</span>
          <button className="m-modal-x" onClick={onClose}>✕</button>
        </div>

        <label className="m-field">
          <span>Server-URL (Backend im WLAN)</span>
          <input
            value={url}
            placeholder="http://192.168.1.193:3002"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(e) => { setUrl(e.target.value); setTest('idle'); }}
          />
        </label>
        <div className="m-settings-row">
          <button className="m-btn-ghost" onClick={testConn}>
            {test === 'testing' ? '… teste' : 'Verbindung testen'}
          </button>
          {test === 'ok' && <span className="m-ok">✓ erreichbar</span>}
          {test === 'fail' && <span className="m-fail">✕ nicht erreichbar</span>}
        </div>

        <button className="m-btn-ghost" onClick={syncNow} disabled={syncing}>
          {syncing ? '… synchronisiere' : '↻ Jetzt synchronisieren'}
        </button>

        <label className="m-toggle">
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
          <span>Dark Mode</span>
        </label>

        <div className="m-modal-foot">
          <button className="m-btn-save" onClick={save}>Speichern</button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { getBaseUrl, flushOutbox } from './api';
import { useStore } from './store';

// Mobile auto-sync. Polls the configured backend's /health; whenever it is
// reachable we drain the outbox (push queued local writes) and, if we never
// managed an initial load, load now. Mirrors the desktop logic in
// src/App.tsx, but hits the ABSOLUTE getBaseUrl()+'/health' because the
// Capacitor app isn't same-origin with the API.
//
// Returns whether the server currently looks reachable, so the UI can tell
// "syncing" apart from "offline with pending changes".
export function useAutoSync(): boolean {
  const [serverOnline, setServerOnline] = useState(false);
  const loadAll = useStore((s) => s.loadAll);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      const base = getBaseUrl();
      if (!base) { setServerOnline(false); return; }
      fetch(`${base}/health`, { signal: AbortSignal.timeout(4000) })
        .then((r) => {
          if (cancelled) return;
          setServerOnline(r.ok);
          if (r.ok) {
            // Always drain while online so a write that failed once keeps
            // getting retried (not only on an offline→online transition).
            // Do the very first load here if it never happened.
            flushOutbox();
            if (!useStore.getState().dataLoaded) loadAll();
          }
        })
        .catch(() => { if (!cancelled) setServerOnline(false); });
    };

    check();
    const id = window.setInterval(check, 12000);
    const onOnline = () => check();
    // Re-check the moment the app comes back to the foreground — interval
    // timers can be suspended while the app is backgrounded, so reopening it
    // at home should sync immediately rather than after the next tick.
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadAll]);

  return serverOnline;
}

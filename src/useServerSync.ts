import { useCallback, useEffect, useRef, useState } from 'react';
import { flush as flushOutbox } from './api/outbox';
import { useStore } from './store';

// Wie oft im Hintergrund frische Daten geholt werden, wenn das Fenster offen
// liegen bleibt. Fokuswechsel laedt unabhaengig davon sofort (#86).
const BACKGROUND_MS = 60_000;
// Gesundheitspruefung des Servers (Online/Offline-Banner).
const HEALTH_MS = 15_000;

export type RefreshState = 'idle' | 'refreshing' | 'done' | 'error';

export interface ServerSync {
  serverOnline: boolean | null;
  refreshState: RefreshState;
  /** Manueller Refresh (Button): Outbox leeren + neu laden. */
  refresh: () => Promise<void>;
}

// Tippt der Nutzer gerade irgendwo? Dann setzt der Hintergrund-Takt aus
// (AC4), damit ein Nachladen keine laufende Eingabe stoert. Der manuelle
// Button und der Fokus-Load ignorieren das bewusst.
function isEditing(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

// Server-Sync fuer Desktop/Web (#86). Ersetzt die alte Schleife, die nach dem
// ersten loadAll nie wieder gepullt hat — dadurch blieben Aenderungen von
// anderen Geraeten unsichtbar bis zum Neustart.
export function useServerSync(): ServerSync {
  const loadAll = useStore((s) => s.loadAll);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [refreshState, setRefreshState] = useState<RefreshState>('idle');
  // Verhindert ueberlappende Ladevorgaenge (Button-Klick waehrend Auto-Load).
  const loading = useRef(false);

  // loadAll() flusht zuerst die Outbox (Push vor Pull), gespeicherte lokale
  // Aenderungen gehen also nie verloren (AC5). Gibt zurueck, ob geladen wurde.
  const pull = useCallback(async (): Promise<boolean> => {
    if (loading.current) return false;
    loading.current = true;
    try {
      await loadAll();
      return useStore.getState().dataLoaded;
    } finally {
      loading.current = false;
    }
  }, [loadAll]);

  const refresh = useCallback(async () => {
    setRefreshState('refreshing');
    const ok = await pull();
    setRefreshState(ok ? 'done' : 'error');
    window.setTimeout(() => setRefreshState('idle'), ok ? 1500 : 4000);
  }, [pull]);

  // --- Health-Poll + erster Load ---
  useEffect(() => {
    let cancelled = false;
    const check = () =>
      fetch('/health', { signal: AbortSignal.timeout(3000) })
        .then((r) => {
          if (cancelled) return;
          setServerOnline(r.ok);
          if (r.ok) {
            // Immer draenen, damit ein einmal fehlgeschlagener Schreibvorgang
            // weiter versucht wird; der allererste Load passiert hier.
            void flushOutbox();
            if (!useStore.getState().dataLoaded) void pull();
          }
        })
        .catch(() => { if (!cancelled) setServerOnline(false); });
    check();
    const id = window.setInterval(check, HEALTH_MS);
    const onOnline = () => { void flushOutbox(); void pull(); };
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('online', onOnline);
    };
  }, [pull]);

  // --- Hintergrund-Takt: frische Daten holen, wenn nicht getippt wird (AC3/AC4) ---
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return; // im Hintergrund unnoetig
      if (isEditing()) return;                             // Eingabe nicht stoeren
      if (!useStore.getState().dataLoaded) return;         // Health-Poll macht den ersten
      void pull();
    }, BACKGROUND_MS);
    return () => window.clearInterval(id);
  }, [pull]);

  // --- Fokus/Sichtbarkeit: sofort nachladen (AC2, der 'zurueck im Heimnetz'-Fall) ---
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState !== 'visible') return;
      void pull();
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [pull]);

  return { serverOnline, refreshState, refresh };
}

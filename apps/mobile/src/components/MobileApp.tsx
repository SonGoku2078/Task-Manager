import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { outboxOnChange, getBaseUrl, flushOutbox } from '../api';
import { useAutoSync } from '../useAutoSync';
import Navigation, { type MobileTab } from './Navigation';
import QuickAdd from './QuickAdd';
import Projects from './Projects';
import Inbox from './Inbox';
import NextWeek from './NextWeek';
import NextAction from './NextAction';
import Calendar from './Calendar';
import TaskDetailModal from './TaskDetailModal';
import Settings from './Settings';
import ShareCapture from './ShareCapture';
import { checkForUpdate, openApk, type UpdateInfo } from '../update';
import { consumeSharedIntent, onShareReceived, type SharedPayload } from '../shareTarget';

export default function MobileApp() {
  const theme = useStore((s) => s.settings.theme);
  const dataLoaded = useStore((s) => s.dataLoaded);
  const loadAll = useStore((s) => s.loadAll);
  const [tab, setTab] = useState<MobileTab>('projekte');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [share, setShare] = useState<SharedPayload | null>(null);
  // Auto-sync runs on its own (health poll + online/visibility); this is just
  // so the banner can show "syncing" vs "offline with pending changes".
  const serverOnline = useAutoSync();

  // Tapping a pending banner forces an immediate sync (loadAll flushes the
  // outbox first, then reloads). Optional — sync also happens automatically.
  const syncNow = () => { flushOutbox(); loadAll(); };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => outboxOnChange(setPending), []);
  // On launch, ask GitHub whether a newer signed APK is published.
  useEffect(() => {
    checkForUpdate().then((u) => { if (u?.available && u.apkUrl) setUpdate(u); });
  }, []);
  // Pick up content shared into the app (Android "Share → SelfManaged"): pull on
  // launch (cold start), on resume (visibilitychange), and on the warm-start ping.
  useEffect(() => {
    let active = true;
    const pull = async () => {
      const p = await consumeSharedIntent();
      if (active && (p.text || p.subject)) setShare(p);
    };
    pull();
    const onVis = () => { if (document.visibilityState === 'visible') pull(); };
    document.addEventListener('visibilitychange', onVis);
    const off = onShareReceived(pull);
    return () => { active = false; document.removeEventListener('visibilitychange', onVis); off(); };
  }, []);

  // Which environment are we connected to? Derived from the server port so the
  // user always knows whether they're touching real (Prod) or test (Dev) data.
  const apiUrl = getBaseUrl();
  const port = apiUrl.match(/:(\d+)(?:\/|$)/)?.[1] ?? '';
  const envKind = port === '3001' ? 'prod' : port === '3002' ? 'dev' : 'other';

  return (
    <div className="m-app">
      {update?.apkUrl && (
        <button className="m-update-banner" onClick={() => openApk(update.apkUrl!)}>
          ⬆ Update {update.latest.replace(/^mobile-v/, 'v')} verfügbar — tippen zum Installieren
        </button>
      )}
      {envKind === 'prod' ? (
        <div className="m-env-prod">🔴 PRODUKTION — echte Daten</div>
      ) : envKind === 'dev' ? (
        <div className="m-env-dev">🟡 DEV / TEST — getrennte Datenbank</div>
      ) : (
        <div className="m-env-other">⚙ Kein Server gewählt — in ⚙ Einstellungen eintragen</div>
      )}
      {pending > 0 ? (
        serverOnline ? (
          <button className="m-sync-banner" onClick={syncNow}>
            ↻ {pending} Änderung(en) werden synchronisiert…
          </button>
        ) : (
          <button className="m-pending-offline" onClick={syncNow}>
            ⏳ {pending} lokale Änderung(en) — offline, wird automatisch synchronisiert
          </button>
        )
      ) : !serverOnline && !dataLoaded ? (
        <div className="m-offline-banner">⚠ Offline — lokaler Stand.</div>
      ) : null}

      <header className="m-header">
        <span className="m-title">
          {tab === 'projekte' && 'Projekte'}
          {tab === 'inbox' && 'Inbox'}
          {tab === 'nextweek' && 'Next Week'}
          {tab === 'nextaction' && 'Next Action'}
          {tab === 'calendar' && 'Kalender'}
        </span>
        <button className="m-header-gear" title="Einstellungen" onClick={() => setSettingsOpen(true)}>⚙️</button>
      </header>

      {tab !== 'calendar' && tab !== 'projekte' && <QuickAdd />}

      <main className="m-main">
        {tab === 'projekte' && <Projects onOpenTask={setOpenTaskId} />}
        {tab === 'inbox' && <Inbox onOpenTask={setOpenTaskId} />}
        {tab === 'nextweek' && <NextWeek onOpenTask={setOpenTaskId} />}
        {tab === 'nextaction' && <NextAction onOpenTask={setOpenTaskId} />}
        {tab === 'calendar' && <Calendar onOpenTask={setOpenTaskId} />}
      </main>

      <Navigation tab={tab} onChange={setTab} />

      {openTaskId && (
        <TaskDetailModal taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
      )}
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
      {share && <ShareCapture payload={share} onClose={() => setShare(null)} />}
    </div>
  );
}

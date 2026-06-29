import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { outboxOnChange, getBaseUrl } from '../api';
import Navigation, { type MobileTab } from './Navigation';
import QuickAdd from './QuickAdd';
import Projects from './Projects';
import Inbox from './Inbox';
import NextWeek from './NextWeek';
import NextAction from './NextAction';
import Calendar from './Calendar';
import TaskDetailModal from './TaskDetailModal';
import Settings from './Settings';

export default function MobileApp() {
  const theme = useStore((s) => s.settings.theme);
  const dataLoaded = useStore((s) => s.dataLoaded);
  const [tab, setTab] = useState<MobileTab>('projekte');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => outboxOnChange(setPending), []);

  // Which environment are we connected to? Derived from the server port so the
  // user always knows whether they're touching real (Prod) or test (Dev) data.
  const apiUrl = getBaseUrl();
  const port = apiUrl.match(/:(\d+)(?:\/|$)/)?.[1] ?? '';
  const envKind = port === '3001' ? 'prod' : port === '3002' ? 'dev' : 'other';

  return (
    <div className="m-app">
      {envKind === 'prod' ? (
        <div className="m-env-prod">🔴 PRODUKTION — echte Daten</div>
      ) : envKind === 'dev' ? (
        <div className="m-env-dev">🟡 DEV / TEST — getrennte Datenbank</div>
      ) : (
        <div className="m-env-other">⚙ Kein Server gewählt — in ⚙ Einstellungen eintragen</div>
      )}
      {pending > 0 ? (
        <div className="m-sync-banner">↻ {pending} Änderung(en) werden synchronisiert…</div>
      ) : !dataLoaded ? (
        <div className="m-offline-banner">⚠ Offline — lokaler Stand. Verbindung in „Mehr" prüfen.</div>
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
    </div>
  );
}

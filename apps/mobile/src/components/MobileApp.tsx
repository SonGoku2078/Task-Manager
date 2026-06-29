import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { outboxOnChange } from '../api';
import Navigation, { type MobileTab } from './Navigation';
import QuickAdd from './QuickAdd';
import Inbox from './Inbox';
import NextWeek from './NextWeek';
import NextAction from './NextAction';
import Calendar from './Calendar';
import TaskDetailModal from './TaskDetailModal';
import Settings from './Settings';

export default function MobileApp() {
  const theme = useStore((s) => s.settings.theme);
  const dataLoaded = useStore((s) => s.dataLoaded);
  const [tab, setTab] = useState<MobileTab>('inbox');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => outboxOnChange(setPending), []);

  const appEnv = (import.meta.env.VITE_APP_ENV as string | undefined) ?? 'development';

  return (
    <div className="m-app">
      {appEnv !== 'production' && (
        <div className="m-env-banner">🚧 ENTWICKLUNG &amp; TEST — getrennte Datenbank</div>
      )}
      {pending > 0 ? (
        <div className="m-sync-banner">↻ {pending} Änderung(en) werden synchronisiert…</div>
      ) : !dataLoaded ? (
        <div className="m-offline-banner">⚠ Offline — lokaler Stand. Verbindung in „Mehr" prüfen.</div>
      ) : null}

      <header className="m-header">
        <span className="m-title">
          {tab === 'inbox' && 'Inbox'}
          {tab === 'nextweek' && 'Next Week'}
          {tab === 'nextaction' && 'Next Action'}
          {tab === 'calendar' && 'Kalender'}
        </span>
      </header>

      {tab !== 'calendar' && <QuickAdd />}

      <main className="m-main">
        {tab === 'inbox' && <Inbox onOpenTask={setOpenTaskId} />}
        {tab === 'nextweek' && <NextWeek onOpenTask={setOpenTaskId} />}
        {tab === 'nextaction' && <NextAction onOpenTask={setOpenTaskId} />}
        {tab === 'calendar' && <Calendar onOpenTask={setOpenTaskId} />}
      </main>

      <Navigation tab={tab} onChange={setTab} onOpenSettings={() => setSettingsOpen(true)} />

      {openTaskId && (
        <TaskDetailModal taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
      )}
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

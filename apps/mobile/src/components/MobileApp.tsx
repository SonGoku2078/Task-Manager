import { useEffect, useState } from 'react';
import { useStore } from '../store';
import Navigation, { type MobileTab } from './Navigation';
import QuickAdd from './QuickAdd';
import Inbox from './Inbox';
import NextWeek from './NextWeek';
import NextAction from './NextAction';
import Calendar from './Calendar';
import TaskDetailModal from './TaskDetailModal';

export default function MobileApp() {
  const theme = useStore((s) => s.settings.theme);
  const [tab, setTab] = useState<MobileTab>('inbox');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const appEnv = (import.meta.env.VITE_APP_ENV as string | undefined) ?? 'development';

  return (
    <div className="m-app">
      {appEnv !== 'production' && (
        <div className="m-env-banner">🚧 ENTWICKLUNG &amp; TEST — getrennte Datenbank</div>
      )}

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

      <Navigation tab={tab} onChange={setTab} />

      {openTaskId && (
        <TaskDetailModal taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
      )}
    </div>
  );
}

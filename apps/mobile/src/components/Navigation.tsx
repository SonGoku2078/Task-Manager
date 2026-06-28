import { useStore } from '../store';

export type MobileTab = 'inbox' | 'nextweek' | 'nextaction' | 'calendar';

const TABS: { key: MobileTab; label: string; icon: string }[] = [
  { key: 'inbox', label: 'Inbox', icon: '📥' },
  { key: 'nextweek', label: 'Woche', icon: '🗓️' },
  { key: 'nextaction', label: 'Aktion', icon: '⭐' },
  { key: 'calendar', label: 'Kalender', icon: '📅' },
];

export default function Navigation({
  tab,
  onChange,
}: {
  tab: MobileTab;
  onChange: (t: MobileTab) => void;
}) {
  const theme = useStore((s) => s.settings.theme);
  const setTheme = useStore((s) => s.setTheme);

  return (
    <nav className="m-nav">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`m-nav-btn ${tab === t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          <span className="m-nav-icon">{t.icon}</span>
          <span className="m-nav-label">{t.label}</span>
        </button>
      ))}
      <button
        className="m-nav-btn"
        title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <span className="m-nav-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
        <span className="m-nav-label">Theme</span>
      </button>
    </nav>
  );
}

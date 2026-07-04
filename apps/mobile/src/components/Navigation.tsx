export type MobileTab = 'projekte' | 'inbox' | 'today' | 'nextweek' | 'nextaction' | 'calendar';

const TABS: { key: MobileTab; label: string; icon: string }[] = [
  { key: 'projekte', label: 'Projekte', icon: '📁' },
  { key: 'inbox', label: 'Inbox', icon: '📥' },
  { key: 'today', label: 'Heute', icon: '☀️' },
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
    </nav>
  );
}

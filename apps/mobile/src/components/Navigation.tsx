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
  onOpenSettings,
}: {
  tab: MobileTab;
  onChange: (t: MobileTab) => void;
  onOpenSettings: () => void;
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
      <button className="m-nav-btn" title="Einstellungen" onClick={onOpenSettings}>
        <span className="m-nav-icon">⚙️</span>
        <span className="m-nav-label">Mehr</span>
      </button>
    </nav>
  );
}

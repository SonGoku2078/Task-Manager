import './Sidebar.css';

interface SidebarProps {
  projects?: any[];
}

export default function Sidebar({ projects = [] }: SidebarProps) {
  const mainItems = [
    { id: 'priority', icon: '📌', label: 'Priorität' },
    { id: 'inbox', icon: '📥', label: 'Inbox' },
    { id: 'projects', icon: '📂', label: 'Projekte' },
    { id: 'categories', icon: '🏷️', label: 'Kategorien' },
    { id: 'calendar', icon: '📅', label: 'Kalender' },
    { id: 'templates', icon: '📋', label: 'Vorlagen' },
    { id: 'team', icon: '👥', label: 'Sie + Team' },
  ];

  const bottomItems = [
    { id: 'search', icon: '🔍', label: 'Suchen' },
    { id: 'settings', icon: '⚙️', label: 'Einstellungen' },
    { id: 'news', icon: '🔔', label: 'Neuigkeiten' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-items">
        {mainItems.map((item) => (
          <div key={item.id} className="sidebar-item">
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="sidebar-separator"></div>
      <div className="sidebar-items">
        {bottomItems.map((item) => (
          <div key={item.id} className="sidebar-item">
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

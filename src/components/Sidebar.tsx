import { useStore } from '../store';
import type { ViewType } from '../types';
import './Sidebar.css';

const navItems: { id: ViewType; icon: string; label: string }[] = [
  { id: 'priority', icon: '📌', label: 'Priorität' },
  { id: 'inbox', icon: '📥', label: 'Inbox' },
  { id: 'today', icon: '⭐', label: 'Heute' },
  { id: 'projects', icon: '📂', label: 'Projekte' },
  { id: 'categories', icon: '🏷️', label: 'Kategorien' },
  { id: 'calendar', icon: '📅', label: 'Kalender' },
  { id: 'templates', icon: '📋', label: 'Vorlagen' },
];

const bottomItems: { id: ViewType; icon: string; label: string }[] = [
  { id: 'search', icon: '🔍', label: 'Suchen' },
  { id: 'activity', icon: '✅', label: 'Erledigt' },
  { id: 'reports', icon: '📊', label: 'Berichte' },
  { id: 'settings', icon: '⚙️', label: 'Einstellungen' },
];

export default function Sidebar() {
  const currentView = useStore((s) => s.ui.currentView);
  const setView = useStore((s) => s.setView);
  const savedViews = useStore((s) => s.savedViews);
  const applySavedView = useStore((s) => s.applySavedView);
  const deleteSavedView = useStore((s) => s.deleteSavedView);
  const activeSavedViewId = useStore((s) => s.ui.activeSavedViewId);

  return (
    <div className="sidebar">
      <div className="sidebar-brand" title="Nozbe">
        ✅
      </div>

      <div className="sidebar-items">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)}
            title={item.label}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </div>

      {savedViews.length > 0 && (
        <>
          <div className="sidebar-separator" />
          <div className="sidebar-items">
            {savedViews.map((v) => (
              <div
                key={v.id}
                className={`sidebar-item saved-view-item ${
                  activeSavedViewId === v.id ? 'active' : ''
                }`}
                onClick={() => applySavedView(v.id)}
                title={v.name}
              >
                <span className="sidebar-icon">🔎</span>
                <span className="sidebar-label">{v.name}</span>
                <button
                  className="saved-view-del"
                  title="Ansicht löschen"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSavedView(v.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sidebar-spacer" />
      <div className="sidebar-separator" />

      <div className="sidebar-items">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)}
            title={item.label}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

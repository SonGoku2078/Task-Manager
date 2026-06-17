import { useStore } from '../store';
import type { ActivityAction } from '../types';
import './ActivityLog.css';

const ACTION_META: Record<ActivityAction, { icon: string; label: string }> = {
  created: { icon: '➕', label: 'erstellt' },
  completed: { icon: '✅', label: 'erledigt' },
  reopened: { icon: '↺', label: 'wieder geöffnet' },
  deleted: { icon: '🗑️', label: 'gelöscht' },
  'project-created': { icon: '📂', label: 'Projekt erstellt' },
};

export default function ActivityLog() {
  const activityLog = useStore((s) => s.activityLog);

  if (activityLog.length === 0) {
    return (
      <div className="activity-empty">
        <div className="empty-icon">📜</div>
        <p>Noch keine Aktivität. Lege Aufgaben an oder hake welche ab.</p>
      </div>
    );
  }

  return (
    <div className="activity-log">
      {activityLog.map((e) => {
        const meta = ACTION_META[e.action];
        return (
          <div className="activity-item" key={e.id}>
            <span className="activity-icon">{meta.icon}</span>
            <div className="activity-body">
              <div className="activity-line">
                <strong>{e.actor}</strong> hat <em>{e.subject}</em> {meta.label}.
              </div>
              <div className="activity-time">
                {e.at.toLocaleDateString('de-DE', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

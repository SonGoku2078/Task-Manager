import { useStore } from '../store';
import { isOverdue } from '../selectors';
import type { Priority } from '../types';
import './ReportsView.css';

export default function ReportsView() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);

  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const open = total - done;
  const overdue = tasks.filter(isOverdue).length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 864e5);
  const doneThisWeek = tasks.filter(
    (t) => t.completed && t.updatedAt >= weekAgo
  ).length;

  const byProject = [
    ...projects.map((p) => ({
      id: p.id,
      name: `${p.icon} ${p.name}`,
      total: tasks.filter((t) => t.projectId === p.id).length,
      done: tasks.filter((t) => t.projectId === p.id && t.completed).length,
    })),
    {
      id: '__inbox',
      name: '📥 Inbox',
      total: tasks.filter((t) => !t.projectId).length,
      done: tasks.filter((t) => !t.projectId && t.completed).length,
    },
  ].filter((row) => row.total > 0);

  const priorityMeta: { key: Priority; label: string; color: string }[] = [
    { key: 'high', label: 'Hoch', color: '#e5484d' },
    { key: 'medium', label: 'Mittel', color: '#f59e0b' },
    { key: 'low', label: 'Niedrig', color: '#9ca3af' },
  ];
  const openByPriority = priorityMeta.map((m) => ({
    ...m,
    count: tasks.filter((t) => !t.completed && t.priority === m.key).length,
  }));
  const maxPrio = Math.max(1, ...openByPriority.map((p) => p.count));

  return (
    <div className="reports-view">
      <div className="report-cards">
        <div className="report-card">
          <div className="report-num">{total}</div>
          <div className="report-label">Aufgaben gesamt</div>
        </div>
        <div className="report-card">
          <div className="report-num">{open}</div>
          <div className="report-label">Offen</div>
        </div>
        <div className="report-card">
          <div className="report-num accent">{done}</div>
          <div className="report-label">Erledigt</div>
        </div>
        <div className="report-card">
          <div className={`report-num ${overdue > 0 ? 'danger' : ''}`}>{overdue}</div>
          <div className="report-label">Überfällig</div>
        </div>
        <div className="report-card">
          <div className="report-num">{doneThisWeek}</div>
          <div className="report-label">Erledigt (7 Tage)</div>
        </div>
      </div>

      <div className="report-section">
        <h3 className="report-title">Abschlussquote</h3>
        <div className="rate-bar">
          <div className="rate-fill" style={{ width: `${rate}%` }}>
            {rate > 8 && <span>{rate}%</span>}
          </div>
        </div>
        {rate <= 8 && <div className="rate-caption">{rate}%</div>}
      </div>

      <div className="report-section">
        <h3 className="report-title">Nach Projekt</h3>
        {byProject.length === 0 && <p className="report-empty">Keine Aufgaben.</p>}
        {byProject.map((row) => {
          const pct = row.total === 0 ? 0 : Math.round((row.done / row.total) * 100);
          return (
            <div className="report-row" key={row.id}>
              <span className="report-row-name" title={row.name}>{row.name}</span>
              <div className="report-row-bar">
                <div className="report-row-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="report-row-val">
                {row.done}/{row.total}
              </span>
            </div>
          );
        })}
      </div>

      <div className="report-section">
        <h3 className="report-title">Offene Aufgaben nach Priorität</h3>
        {openByPriority.map((p) => (
          <div className="report-row" key={p.key}>
            <span className="report-row-name">{p.label}</span>
            <div className="report-row-bar">
              <div
                className="report-row-fill"
                style={{
                  width: `${(p.count / maxPrio) * 100}%`,
                  background: p.color,
                }}
              />
            </div>
            <span className="report-row-val">{p.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

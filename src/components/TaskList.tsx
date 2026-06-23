import { useState } from 'react';
import type { Task } from '../types';
import { useStore } from '../store';
import { isOverdue } from '../selectors';
import './TaskList.css';

interface TaskListProps {
  tasks: Task[];
  emptyHint?: string;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export default function TaskList({
  tasks,
  emptyHint,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
}: TaskListProps) {
  const toggleTask = useStore((s) => s.toggleTask);
  const toggleStar = useStore((s) => s.toggleStar);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.ui.selectedTaskId);
  const currentView = useStore((s) => s.ui.currentView);
  const selectedProjectId = useStore((s) => s.ui.selectedProjectId);
  const selectedProjectIds = useStore((s) => s.ui.selectedProjectIds);
  const projects = useStore((s) => s.projects);
  const categories = useStore((s) => s.categories);
  const sections = useStore((s) => s.sections);
  const reorderTasks = useStore((s) => s.reorderTasks);
  const dropTaskOnTask = useStore((s) => s.dropTaskOnTask);
  const assignTaskSection = useStore((s) => s.assignTaskSection);
  const reorderSections = useStore((s) => s.reorderSections);
  const addSection = useStore((s) => s.addSection);
  const renameSection = useStore((s) => s.renameSection);
  const deleteSection = useStore((s) => s.deleteSection);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [overSectionId, setOverSectionId] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  const dragEnabled = !selectionMode;
  // Sections only make sense for a single project (not a multi-project combined list).
  const inProject =
    currentView === 'projects' && !!selectedProjectId && selectedProjectIds.length <= 1;
  const hideProject = inProject; // quieter: project name is the page title already
  const projectSections = inProject
    ? sections.filter((s) => s.projectId === selectedProjectId)
    : [];

  if (tasks.length === 0 && !inProject) {
    return (
      <div className="task-list-empty">
        <div className="empty-icon">🗒️</div>
        <p>{emptyHint ?? 'Keine Aufgaben hier. Füge oben eine neue hinzu.'}</p>
      </div>
    );
  }

  const renderTask = (task: Task) => {
    const project = projects.find((p) => p.id === task.projectId);
    const taskCats = categories.filter((c) => task.categoryIds.includes(c.id));
    return (
      <div
        key={task.id}
        className={`task-item ${selectedTaskId === task.id ? 'selected' : ''} ${
          task.completed ? 'is-completed' : ''
        } ${selectionMode && selectedIds?.has(task.id) ? 'bulk-selected' : ''} ${
          overId === task.id ? 'drag-over' : ''
        } ${dragId === task.id ? 'dragging' : ''}`}
        draggable={dragEnabled}
        onDragStart={(e) => {
          if (!dragEnabled) return;
          setDragId(task.id);
          e.dataTransfer.setData('text/plain', task.id);
        }}
        onDragOver={(e) => {
          if (!dragEnabled || !dragId) return;
          e.preventDefault();
          setOverId(task.id);
        }}
        onDragLeave={() => setOverId((cur) => (cur === task.id ? null : cur))}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (dragEnabled && dragId) {
            if (inProject) dropTaskOnTask(dragId, task.id);
            else reorderTasks(dragId, task.id);
          }
          setDragId(null);
          setOverId(null);
        }}
        onDragEnd={() => {
          setDragId(null);
          setOverId(null);
        }}
        onClick={() =>
          selectionMode
            ? onToggleSelect?.(task.id)
            : selectTask(selectedTaskId === task.id ? null : task.id)
        }
      >
        <input
          type="checkbox"
          className="task-checkbox"
          checked={selectionMode ? !!selectedIds?.has(task.id) : task.completed}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            if (selectionMode) onToggleSelect?.(task.id);
            else toggleTask(task.id);
          }}
        />
        <span className={`priority-dot priority-${task.priority}`} title={task.priority} />
        <div className="task-content">
          <div className={`task-title ${task.completed ? 'completed' : ''}`}>
            {task.title}
          </div>
          <div className="task-meta">
            {project && !hideProject && (
              <span className="task-project" style={{ color: project.color }}>
                {project.icon} {project.name}
              </span>
            )}
            {task.dueDate && (
              <span className={`task-time ${isOverdue(task) ? 'overdue' : ''}`}>
                📅{' '}
                {task.dueDate.toLocaleDateString('de-DE', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {task.recurrence !== 'none' && (
              <span className="task-recurring" title={`Wiederholt: ${task.recurrence}`}>
                ↻
              </span>
            )}
            {task.starred && (
              <span className="task-flag flag-na" title="Nächste Aktion">★</span>
            )}
            {task.thisWeek && (
              <span className="task-flag flag-week" title="Next Week">🗓️</span>
            )}
            {task.someday && (
              <span className="task-flag flag-someday" title="Someday">🌥️</span>
            )}
            {(task.comments?.length ?? 0) > 0 && (
              <span
                className="task-comments"
                title={`${task.comments!.length} Kommentar${
                  task.comments!.length === 1 ? '' : 'e'
                }`}
              >
                💬 {task.comments!.length}
              </span>
            )}
            {taskCats.map((c) => (
              <span key={c.id} className="task-cat" style={{ background: c.color }}>
                {c.name}
              </span>
            ))}
          </div>
        </div>
        <div className="task-actions">
          <button
            className={`task-star ${task.starred ? 'starred' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(task.id);
            }}
            title={task.starred ? 'Stern entfernen' : 'Markieren'}
          >
            {task.starred ? '★' : '☆'}
          </button>
        </div>
      </div>
    );
  };

  // --- Flat list (non-project views) ---
  if (!inProject) {
    return <div className="task-list">{tasks.map(renderTask)}</div>;
  }

  // --- Grouped list (inside a project) ---
  // Open tasks stay in their group; completed tasks all sink to a final block.
  const ungrouped = tasks.filter((t) => !t.sectionId && !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const submitSection = () => {
    const name = newSectionName.trim();
    if (name && selectedProjectId) addSection(selectedProjectId, name);
    setNewSectionName('');
    setAddingSection(false);
  };

  return (
    <div className="task-list">
      {/* Ungrouped tasks (drop here to remove a task from its section) */}
      <div
        className={`section-dropzone ${overSectionId === '__none__' ? 'drop-over' : ''}`}
        onDragOver={(e) => {
          if (dragId) {
            e.preventDefault();
            setOverSectionId('__none__');
          }
        }}
        onDragLeave={() => setOverSectionId((c) => (c === '__none__' ? null : c))}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId) assignTaskSection(dragId, null);
          setDragId(null);
          setOverSectionId(null);
        }}
      >
        {ungrouped.map(renderTask)}
        {ungrouped.length === 0 && (
          <p className="section-empty-hint">
            {tasks.length === 0
              ? (emptyHint ?? 'Noch keine Aufgaben in diesem Projekt.')
              : 'Keine Aufgaben ohne Gruppe.'}
          </p>
        )}
      </div>

      {projectSections.map((sec) => {
        const secTasks = tasks.filter((t) => t.sectionId === sec.id);
        const done = secTasks.filter((t) => t.completed).length;
        return (
          <div key={sec.id} className="task-section">
            <div
              className={`section-header ${overSectionId === sec.id ? 'drop-over' : ''} ${
                dragSectionId === sec.id ? 'dragging' : ''
              }`}
              draggable
              onDragStart={(e) => {
                setDragSectionId(sec.id);
                e.stopPropagation();
              }}
              onDragOver={(e) => {
                if (dragId || dragSectionId) {
                  e.preventDefault();
                  setOverSectionId(sec.id);
                }
              }}
              onDragLeave={() => setOverSectionId((c) => (c === sec.id ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragSectionId) reorderSections(dragSectionId, sec.id);
                else if (dragId) assignTaskSection(dragId, sec.id);
                setDragId(null);
                setDragSectionId(null);
                setOverSectionId(null);
              }}
              onDragEnd={() => {
                setDragSectionId(null);
                setOverSectionId(null);
              }}
            >
              <span className="section-grip" title="Gruppe ziehen">⠿</span>
              <input
                className="section-name"
                value={sec.name}
                onChange={(e) => renameSection(sec.id, e.target.value)}
              />
              <span className="section-count">
                {done}/{allSecTasks.length}
              </span>
              <button
                className="section-del"
                title="Gruppe löschen (Aufgaben bleiben erhalten)"
                onClick={() => {
                  if (window.confirm(`Gruppe „${sec.name}" löschen? Aufgaben wandern aus der Gruppe heraus.`))
                    deleteSection(sec.id);
                }}
              >
                ×
              </button>
            </div>
            <div
              className={`section-body ${overSectionId === sec.id ? 'drop-over' : ''}`}
              onDragOver={(e) => {
                if (dragId) {
                  e.preventDefault();
                  setOverSectionId(sec.id);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) assignTaskSection(dragId, sec.id);
                setDragId(null);
                setOverSectionId(null);
              }}
            >
              {secTasks.map(renderTask)}
              {secTasks.length === 0 && (
                <p className="section-empty-hint">Aufgaben hierher ziehen…</p>
              )}
            </div>
          </div>
        );
      })}

      {addingSection ? (
        <input
          autoFocus
          className="section-add-input"
          placeholder="Gruppenname… (Enter)"
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitSection();
            if (e.key === 'Escape') {
              setAddingSection(false);
              setNewSectionName('');
            }
          }}
          onBlur={submitSection}
        />
      ) : (
        <button className="section-add-btn" onClick={() => setAddingSection(true)}>
          + Gruppe / Sektion
        </button>
      )}

      {/* All completed tasks, below every group; reopen sends them back up. */}
      {completedTasks.length > 0 && (
        <div className="task-section completed-section">
          <div className="section-header">
            <span className="section-grip" style={{ visibility: 'hidden' }}>⠿</span>
            <span className="section-name section-name-static">✓ Erledigt</span>
            <span className="section-count">{completedTasks.length}</span>
          </div>
          <div className="section-body">{completedTasks.map(renderTask)}</div>
        </div>
      )}
    </div>
  );
}

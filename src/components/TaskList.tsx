import { useRef, useState } from 'react';
import type { Task } from '../types';
import { useStore } from '../store';
import { isOverdue } from '../selectors';
import { readTaskIds, writeTaskIds } from '../dnd';
import AvatarStack from './AvatarStack';
import { assigneesOf } from '../members';
import { formatDuration } from './TaskDetailPanel';
import './TaskList.css';

interface TaskListProps {
  tasks: Task[];
  emptyHint?: string;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onCtrlSelect?: (id: string) => void;
  onShiftSelect?: (id: string) => void;
}

export default function TaskList({
  tasks,
  emptyHint,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
  onCtrlSelect,
  onShiftSelect,
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
  const members = useStore((s) => s.members);
  // Full task list to look up subtasks (the `tasks` prop excludes them).
  const allTasks = useStore((s) => s.tasks);
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
  // Refs to each rendered section, so the index bar can scroll to one.
  const sectionElRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Which parent rows have their subtasks expanded inline (local, not persisted).
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Index subtasks by parent once per render.
  const childrenByParent = new Map<string, Task[]>();
  for (const t of allTasks) {
    if (t.parentId) {
      const arr = childrenByParent.get(t.parentId);
      if (arr) arr.push(t);
      else childrenByParent.set(t.parentId, [t]);
    }
  }

  // Tasks stay draggable in selection mode too, so a multi-selection can be moved.
  const dragEnabled = true;
  // Ids that a drag carries: the whole selection if the dragged task is selected.
  const dragPayload = (id: string) =>
    selectionMode && selectedIds?.has(id) ? [...selectedIds] : undefined;
  const assignAll = (ids: string[], sectionId: string | null) =>
    ids.forEach((id) => assignTaskSection(id, sectionId));
  // Grouping works for a single project OR for the list-style GTD views.
  const singleProject =
    (currentView === 'projects' || currentView === 'someday') &&
    !!selectedProjectId &&
    selectedProjectIds.length <= 1;
  const VIEW_GROUPABLE = ['priority', 'today', 'nextweek', 'someday'];
  const viewGrouping = VIEW_GROUPABLE.includes(currentView) && !singleProject;
  const grouped = singleProject || viewGrouping;
  // Scope key: project id for a project, otherwise a per-view key.
  const scopeKey = singleProject ? selectedProjectId! : `view:${currentView}`;
  // Only hide the project name inside a real project (it's the page title there);
  // in the list views tasks come from many projects, so keep the (coloured) name.
  const hideProject = singleProject;
  const scopeSections = grouped
    ? sections.filter((s) => s.scope === scopeKey)
    : [];

  if (tasks.length === 0 && !grouped) {
    return (
      <div className="task-list-empty">
        <div className="empty-icon">🗒️</div>
        <p>{emptyHint ?? 'Keine Aufgaben hier. Füge oben eine neue hinzu.'}</p>
      </div>
    );
  }

  // Compact row for an inline subtask (no drag / section / bulk handling).
  const renderChild = (child: Task) => (
    <div
      key={child.id}
      className={`task-item is-child ${selectedTaskId === child.id ? 'selected' : ''} ${
        child.completed ? 'is-completed' : ''
      }`}
      onClick={() => selectTask(selectedTaskId === child.id ? null : child.id)}
    >
      <input
        type="checkbox"
        className="task-checkbox"
        checked={child.completed}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          toggleTask(child.id);
        }}
      />
      <span className="task-child-marker" title="Unteraufgabe">↳</span>
      <span className={`priority-dot priority-${child.priority}`} title={child.priority} />
      <div className="task-content">
        <div className={`task-title ${child.completed ? 'completed' : ''}`}>
          {child.title}
        </div>
      </div>
      <div className="task-actions">
        <button
          className={`task-star ${child.starred ? 'starred' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleStar(child.id);
          }}
          title={child.starred ? 'Stern entfernen' : 'Markieren'}
        >
          {child.starred ? '★' : '☆'}
        </button>
      </div>
    </div>
  );

  const renderTask = (task: Task) => {
    const project = projects.find((p) => p.id === task.projectId);
    const taskCats = categories.filter((c) => task.categoryIds.includes(c.id));
    const kids = childrenByParent.get(task.id) ?? [];
    const doneKids = kids.filter((k) => k.completed).length;
    const expanded = expandedIds.has(task.id);
    return (
      <div key={task.id} className="task-row">
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
          writeTaskIds(e, task.id, dragPayload(task.id));
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
          const ids = readTaskIds(e).filter((id) => id !== task.id);
          if (dragEnabled && ids.length) {
            if (grouped) ids.forEach((id) => dropTaskOnTask(id, task.id));
            else ids.forEach((id) => reorderTasks(id, task.id));
          }
          setDragId(null);
          setOverId(null);
        }}
        onDragEnd={() => {
          setDragId(null);
          setOverId(null);
        }}
        onClick={(e) => {
          if (e.shiftKey) onShiftSelect?.(task.id);
          else if (selectionMode) onToggleSelect?.(task.id);
          else if (e.ctrlKey || e.metaKey) onCtrlSelect?.(task.id);
          else selectTask(selectedTaskId === task.id ? null : task.id);
        }}
      >
        {kids.length > 0 ? (
          <button
            className="task-subtoggle"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(task.id);
            }}
            title={expanded ? 'Unteraufgaben ausblenden' : 'Unteraufgaben anzeigen'}
          >
            {expanded ? '−' : '+'}
          </button>
        ) : (
          <span className="task-subtoggle-spacer" />
        )}
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
                <span className="task-project-dot" style={{ background: project.color }} />
                {project.name}
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
            {task.durationMin != null && task.durationMin > 0 && (
              <span className="task-duration" title="Dauer">
                ⏱ {formatDuration(task.durationMin)}
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
            {task.waiting && (
              <span
                className="task-flag flag-waiting"
                title={task.waitingFor ? `Warten auf ${task.waitingFor}` : 'Warten auf jemand anderes'}
              >
                ⏳{task.waitingFor ? ` ${task.waitingFor}` : ''}
              </span>
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
            {kids.length > 0 && (
              <span
                className="task-subcount"
                title={`${kids.length} Unteraufgabe${kids.length === 1 ? '' : 'n'}`}
              >
                ⤷ {doneKids}/{kids.length}
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
          <AvatarStack members={assigneesOf(task, members)} size={20} />
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
      {expanded && kids.length > 0 && (
        <div className="task-subtasks">{kids.map(renderChild)}</div>
      )}
      </div>
    );
  };

  // --- Flat list (ungrouped views) ---
  if (!grouped) {
    return <div className="task-list">{tasks.map(renderTask)}</div>;
  }

  // --- Grouped list (project or list view) ---
  // Open tasks stay in their group; completed tasks all sink to a final block.
  // A task belongs to a section only if that section exists in the CURRENT scope.
  // Otherwise (e.g. a project-section task shown in the Next Week view) it's treated
  // as ungrouped here, so it never silently disappears.
  const scopeSectionIds = new Set(scopeSections.map((s) => s.id));
  const ungrouped = tasks.filter(
    (t) => !t.completed && !(t.sectionId && scopeSectionIds.has(t.sectionId))
  );
  const completedTasks = tasks.filter((t) => t.completed);
  const submitSection = () => {
    const name = newSectionName.trim();
    if (name) addSection(scopeKey, name);
    setNewSectionName('');
    setAddingSection(false);
  };

  return (
    <div className="task-list">
      {/* Section index: jump to a section or drop a task straight onto it. */}
      {scopeSections.length > 0 && (
        <div className="section-index">
          {scopeSections.map((sec) => {
            const cnt = tasks.filter((t) => t.sectionId === sec.id);
            const done = cnt.filter((t) => t.completed).length;
            return (
              <button
                key={sec.id}
                className={`section-index-chip ${overSectionId === sec.id ? 'drop-over' : ''}`}
                onClick={() =>
                  sectionElRefs.current[sec.id]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }
                onDragOver={(e) => {
                  if (dragId) {
                    e.preventDefault();
                    setOverSectionId(sec.id);
                  }
                }}
                onDragLeave={() => setOverSectionId((c) => (c === sec.id ? null : c))}
                onDrop={(e) => {
                  e.preventDefault();
                  const ids = readTaskIds(e);
                  if (ids.length) assignAll(ids, sec.id);
                  setDragId(null);
                  setOverSectionId(null);
                }}
                title={`Zu „${sec.name}" springen · Aufgabe hierher ziehen`}
              >
                {sec.name}
                <span className="section-index-count">
                  {done}/{cnt.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

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

      {scopeSections.map((sec) => {
        const secTasks = tasks.filter((t) => t.sectionId === sec.id);
        const done = secTasks.filter((t) => t.completed).length;
        return (
          <div
            key={sec.id}
            className="task-section"
            ref={(el) => {
              sectionElRefs.current[sec.id] = el;
            }}
          >
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                }}
              />
              <span className="section-count">
                {done}/{secTasks.length}
              </span>
              <button
                className="section-del"
                title="Gruppe löschen (Aufgaben bleiben erhalten)"
                onClick={() => deleteSection(sec.id)}
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
                const ids = readTaskIds(e);
                if (ids.length) assignAll(ids, sec.id);
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

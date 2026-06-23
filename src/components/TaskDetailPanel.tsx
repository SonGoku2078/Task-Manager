import { useEffect, useState } from 'react';
import type { ClipboardEvent } from 'react';
import type { Task } from '../types';
import { useStore } from '../store';
import { taskShareUrl } from '../config';
import ClearableInput from './ClearableInput';
import './TaskDetailPanel.css';

interface TaskDetailPanelProps {
  task: Task;
}

// Split text on URLs and render the URLs as clickable links.
const URL_RE = /(https?:\/\/[^\s]+)/g;
const renderWithLinks = (text: string) =>
  text.split(URL_RE).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="comment-url"
      >
        {part}
      </a>
    ) : (
      part
    )
  );

const toDateInput = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';

const formatSize = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function TaskDetailPanel({ task }: TaskDetailPanelProps) {
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const selectTask = useStore((s) => s.selectTask);
  const toggleStar = useStore((s) => s.toggleStar);
  const projects = useStore((s) => s.projects);
  const categories = useStore((s) => s.categories);
  const members = useStore((s) => s.members);
  const addComment = useStore((s) => s.addComment);
  const deleteComment = useStore((s) => s.deleteComment);
  const addAttachment = useStore((s) => s.addAttachment);
  const deleteAttachment = useStore((s) => s.deleteAttachment);
  const tasks = useStore((s) => s.tasks);
  const addSubtask = useStore((s) => s.addSubtask);
  const toggleTask = useStore((s) => s.toggleTask);

  const storedWidth = useStore((s) => s.settings.detailPanelWidth);
  const setDetailPanelWidth = useStore((s) => s.setDetailPanelWidth);
  const [width, setWidth] = useState(storedWidth ?? 420);

  useEffect(() => {
    if (storedWidth) setWidth(storedWidth);
  }, [storedWidth]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const clamp = (px: number) => Math.max(320, Math.min(720, px));
    const onMove = (ev: MouseEvent) => {
      setWidth(clamp(window.innerWidth - ev.clientX));
    };
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setDetailPanelWidth(clamp(window.innerWidth - ev.clientX));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const [commentText, setCommentText] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [attachError, setAttachError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const comments = task.comments ?? [];
  const attachments = task.attachments ?? [];
  const subtasks = tasks.filter((t) => t.parentId === task.id);
  const doneSubtasks = subtasks.filter((s) => s.completed).length;
  const parent = task.parentId ? tasks.find((t) => t.id === task.parentId) : null;

  const MAX_ATTACH_BYTES = 1.5 * 1024 * 1024; // 1.5 MB (localStorage gesamt ~5 MB)

  const submitSubtask = () => {
    const t = subtaskTitle.trim();
    if (t) {
      addSubtask(task.id, t);
      setSubtaskTitle('');
    }
  };

  const copyLink = async () => {
    const url = taskShareUrl(task.number);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard may be blocked; still update the hash below */
    }
    window.location.hash = `#/t/${task.number}`;
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1500);
  };

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          handleFile(file);
          e.preventDefault();
        }
      }
    }
  };

  const handleFile = (file: File | undefined) => {
    setAttachError('');
    if (!file) return;
    if (file.size > MAX_ATTACH_BYTES) {
      setAttachError(
        `Datei zu groß (max. 1.5 MB). „${file.name}" ist ${formatSize(file.size)}.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      addAttachment(task.id, {
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: String(reader.result),
      });
    };
    reader.readAsDataURL(file);
  };

  const submitComment = () => {
    const text = commentText.trim();
    if (text) {
      addComment(task.id, text);
      setCommentText('');
    }
  };

  const toggleCategory = (id: string) => {
    const has = task.categoryIds.includes(id);
    updateTask(task.id, {
      categoryIds: has
        ? task.categoryIds.filter((c) => c !== id)
        : [...task.categoryIds, id],
    });
  };

  return (
    <div className="task-detail-panel" onPaste={handlePaste} style={{ width }}>
      <div
        className="detail-resize"
        title="Breite ziehen"
        onMouseDown={startResize}
      />
      <div className="panel-header">
        <h3>
          <span className="detail-number">#{task.number}</span>{' '}
          {parent ? 'Unteraufgabe' : 'Aufgabe'}
        </h3>
        <div className="panel-header-actions">
          <button
            className="detail-link"
            onClick={copyLink}
            title="Link zu dieser Aufgabe kopieren"
          >
            {linkCopied ? '✓ kopiert' : '🔗'}
          </button>
          <button
            className={`detail-star ${task.starred ? 'starred' : ''}`}
            onClick={() => toggleStar(task.id)}
            title="Markieren"
          >
            {task.starred ? '★' : '☆'}
          </button>
          <button className="panel-close" onClick={() => selectTask(null)}>
            ✕
          </button>
        </div>
      </div>

      <div className="panel-content">
        {parent && (
          <button
            className="detail-parent-link"
            onClick={() => selectTask(parent.id)}
            title="Zur Hauptaufgabe"
          >
            ↑ Hauptaufgabe: #{parent.number} {parent.title}
          </button>
        )}

        {/* GTD quick flags for this single task */}
        <div className="detail-flags">
          <button
            className={`detail-flag ${task.starred ? 'on' : ''}`}
            onClick={() => toggleStar(task.id)}
            title="Nächste Aktion (Stern)"
          >
            ★ Nächste Aktion
          </button>
          <button
            className={`detail-flag ${task.thisWeek ? 'on' : ''}`}
            onClick={() => updateTask(task.id, { thisWeek: !task.thisWeek })}
            title="Für diese Woche (Next Week)"
          >
            🗓️ Next Week
          </button>
          <button
            className={`detail-flag ${task.someday ? 'on' : ''}`}
            onClick={() => updateTask(task.id, { someday: !task.someday })}
            title="Nach Someday parken"
          >
            🌥️ Someday
          </button>
        </div>

        <div className="detail-field">
          <label className="detail-label">Titel</label>
          <ClearableInput
            type="text"
            className="detail-input"
            value={task.title}
            onChange={(e) => updateTask(task.id, { title: e.target.value })}
            onClear={() => updateTask(task.id, { title: '' })}
          />
        </div>

        <div className="detail-field">
          <label className="detail-label">Beschreibung</label>
          <textarea
            className="detail-input detail-textarea"
            value={task.description}
            onChange={(e) => updateTask(task.id, { description: e.target.value })}
            placeholder="Notizen hinzufügen..."
          />
        </div>

        <div className="detail-field">
          <label className="detail-label">
            Anhänge {attachments.length > 0 && `(${attachments.length})`}
          </label>
          <div className="attach-list">
            {attachments.map((a) => {
              const remote = !!a.url && !a.dataUrl;
              return (
              <div key={a.id} className="attach-item">
                <a
                  href={a.url || a.dataUrl}
                  download={remote ? undefined : a.name}
                  target={remote ? '_blank' : undefined}
                  rel={remote ? 'noopener noreferrer' : undefined}
                  className="attach-link"
                  title={remote ? a.name : `${a.name} (${formatSize(a.size)})`}
                >
                  {a.type === 'link' ? '🔗' : '📎'} {a.name}
                </a>
                <span className="attach-size">
                  {remote ? '↗' : formatSize(a.size)}
                </span>
                <button
                  className="attach-del"
                  title="Entfernen"
                  onClick={() => deleteAttachment(task.id, a.id)}
                >
                  ×
                </button>
              </div>
              );
            })}
          </div>
          <label className="attach-add-btn">
            + Datei anhängen
            <input
              type="file"
              hidden
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <p className="attach-hint">
            Tipp: Screenshot/Datei direkt hier einfügen (Strg/Cmd+V). Max. 1.5 MB pro
            Datei (lokaler Speicher ~5 MB gesamt).
          </p>
          {attachError && <p className="attach-error">{attachError}</p>}
        </div>

        {!parent && (
          <div className="detail-field">
            <label className="detail-label">
              Unteraufgaben{' '}
              {subtasks.length > 0 && `(${doneSubtasks}/${subtasks.length})`}
            </label>
            <div className="subtask-list">
              {subtasks.map((s) => (
                <div key={s.id} className="subtask-item">
                  <input
                    type="checkbox"
                    className="subtask-check"
                    checked={s.completed}
                    onChange={() => toggleTask(s.id)}
                  />
                  <span className="subtask-num">#{s.number}</span>
                  <span
                    className={`subtask-title ${s.completed ? 'done' : ''}`}
                    onClick={() => selectTask(s.id)}
                  >
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
            <div className="subtask-add">
              <ClearableInput
                wrapperClassName="grow"
                type="text"
                className="detail-input"
                placeholder="Unteraufgabe hinzufügen…"
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                onClear={() => setSubtaskTitle('')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitSubtask();
                }}
              />
              <button className="btn btn-primary subtask-send" onClick={submitSubtask}>
                +
              </button>
            </div>
          </div>
        )}

        <div className="detail-field">
          <label className="detail-label">
            Kommentare {comments.length > 0 && `(${comments.length})`}
          </label>
          <div className="comment-list">
            {comments.map((c) => (
              <div key={c.id} className="comment-item">
                <div className="comment-head">
                  <span className="comment-author">{c.author}</span>
                  <span className="comment-date">
                    {c.createdAt.toLocaleDateString('de-DE', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <button
                    className="comment-del"
                    title="Löschen"
                    onClick={() => deleteComment(task.id, c.id)}
                  >
                    ×
                  </button>
                </div>
                <div className="comment-text">{renderWithLinks(c.text)}</div>
              </div>
            ))}
          </div>
          <div className="comment-add">
            <ClearableInput
              wrapperClassName="grow"
              type="text"
              className="detail-input"
              placeholder="Kommentar hinzufügen…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onClear={() => setCommentText('')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitComment();
              }}
            />
            <button className="btn btn-primary comment-send" onClick={submitComment} title="Kommentar hinzufügen (Enter)">
              +
            </button>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-field">
            <label className="detail-label">Projekt</label>
            <select
              className="detail-select"
              value={task.projectId ?? ''}
              onChange={(e) =>
                updateTask(task.id, { projectId: e.target.value || null })
              }
            >
              <option value="">Inbox (kein Projekt)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="detail-field">
            <label className="detail-label">Priorität</label>
            <select
              className="detail-select"
              value={task.priority}
              onChange={(e) =>
                updateTask(task.id, { priority: e.target.value as Task['priority'] })
              }
            >
              <option value="low">Niedrig</option>
              <option value="medium">Mittel</option>
              <option value="high">Hoch</option>
            </select>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-field">
            <label className="detail-label">Fälligkeit</label>
            <input
              type="date"
              className="detail-input"
              value={toDateInput(task.dueDate)}
              onChange={(e) =>
                updateTask(task.id, {
                  dueDate: e.target.value ? new Date(e.target.value) : null,
                })
              }
            />
          </div>

          <div className="detail-field">
            <label className="detail-label">Wiederholung</label>
            <select
              className="detail-select"
              value={task.recurrence}
              onChange={(e) =>
                updateTask(task.id, {
                  recurrence: e.target.value as Task['recurrence'],
                })
              }
            >
              <option value="none">Keine</option>
              <option value="daily">Täglich</option>
              <option value="weekly">Wöchentlich</option>
              <option value="monthly">Monatlich</option>
              <option value="yearly">Jährlich</option>
              <option value="custom">Benutzerdefiniert…</option>
            </select>
          </div>
        </div>

        {task.recurrence === 'custom' && (
          <div className="detail-field">
            <label className="detail-label">Benutzerdefinierte Wiederholung</label>
            <div className="recur-custom">
              <span>Alle</span>
              <input
                type="number"
                min={1}
                className="detail-input recur-interval"
                value={task.recurInterval ?? 1}
                onChange={(e) =>
                  updateTask(task.id, { recurInterval: Math.max(1, Number(e.target.value)) })
                }
              />
              <select
                className="detail-select"
                value={task.recurUnit ?? 'day'}
                onChange={(e) =>
                  updateTask(task.id, { recurUnit: e.target.value as Task['recurUnit'] })
                }
              >
                <option value="day">Tage</option>
                <option value="week">Wochen</option>
                <option value="month">Monate</option>
                <option value="year">Jahre</option>
              </select>
            </div>
            {(task.recurUnit ?? 'day') === 'month' && (
              <select
                className="detail-select recur-monthday"
                value={task.recurMonthDay ?? 'date'}
                onChange={(e) =>
                  updateTask(task.id, {
                    recurMonthDay: e.target.value as Task['recurMonthDay'],
                  })
                }
              >
                <option value="date">am gleichen Tag</option>
                <option value="first">am 1. des Monats</option>
                <option value="last">am letzten Tag des Monats</option>
              </select>
            )}
          </div>
        )}

        {task.recurrence !== 'none' && (
          <div className="detail-field">
            <label className="detail-label">Wiederholung endet (optional)</label>
            <input
              type="date"
              className="detail-input"
              value={toDateInput(task.recurrenceEnd ?? null)}
              onChange={(e) =>
                updateTask(task.id, {
                  recurrenceEnd: e.target.value ? new Date(e.target.value) : null,
                })
              }
            />
            <p className="detail-hint">
              ↻ Beim Abhaken wird automatisch die nächste Aufgabe erstellt.
            </p>
          </div>
        )}

        <div className="detail-field">
          <label className="detail-label">Kategorien</label>
          <div className="cat-chips">
            {categories.length === 0 && (
              <span className="cat-empty">Noch keine Kategorien angelegt</span>
            )}
            {categories.map((c) => {
              const active = task.categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  className={`cat-chip ${active ? 'active' : ''}`}
                  style={active ? { background: c.color, borderColor: c.color } : { borderColor: c.color, color: c.color }}
                  onClick={() => toggleCategory(c.id)}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {members.length > 0 && (
          <div className="detail-field">
            <label className="detail-label">Zugewiesen an</label>
            <select
              className="detail-select"
              value={task.assigneeId ?? ''}
              onChange={(e) =>
                updateTask(task.id, { assigneeId: e.target.value || null })
              }
            >
              <option value="">Niemand</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="panel-actions">
        <button
          className="btn btn-danger"
          onClick={() => {
            deleteTask(task.id);
          }}
        >
          Löschen
        </button>
        <button className="btn btn-primary" onClick={() => selectTask(null)}>
          Fertig
        </button>
      </div>
    </div>
  );
}

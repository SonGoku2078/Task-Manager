import { useCallback, useRef, useState } from 'react';
import { useStore } from '../store';
import './BulkAddTasks.css';

interface BulkAddTasksProps {
  projectId: string | null;
  projectName: string;
  onClose: () => void;
}

interface RowData {
  section: string;
  title: string;
  duration: string;
  recurrence: string;
  description: string;
  reference: string;
}

const COLS: { key: keyof RowData; label: string; placeholder: string; width: string }[] = [
  { key: 'section',     label: 'Gruppe / Sektion', placeholder: 'z.B. Phase 1', width: '130px' },
  { key: 'title',       label: 'Titel',             placeholder: 'Aufgabe…',     width: '200px' },
  { key: 'duration',    label: 'Dauer',             placeholder: '30m / 1h',     width: '80px'  },
  { key: 'recurrence',  label: 'Wiederholung',      placeholder: 'täglich…',     width: '110px' },
  { key: 'description', label: 'Beschreibung',      placeholder: 'Notizen…',     width: '1fr'   },
  { key: 'reference',   label: 'Referenz / Quelle', placeholder: 'https://…',    width: '160px' },
];

const emptyRow = (): RowData => ({ section: '', title: '', duration: '', recurrence: '', description: '', reference: '' });

// Excel-style TSV parser (handles quoted cells with embedded newlines/tabs).
function parseTSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (text[i] === '"') {
      i++;
      while (i < n) {
        if (text[i] === '"' && text[i + 1] === '"') { cell += '"'; i += 2; }
        else if (text[i] === '"') { i++; break; }
        else cell += text[i++];
      }
    } else if (text[i] === '\t') {
      row.push(cell.trim()); cell = ''; i++;
    } else if (text[i] === '\r' && text[i + 1] === '\n') {
      row.push(cell.trim()); rows.push(row); row = []; cell = ''; i += 2;
    } else if (text[i] === '\n' || text[i] === '\r') {
      row.push(cell.trim()); rows.push(row); row = []; cell = ''; i++;
    } else cell += text[i++];
  }
  if (cell.trim() || row.length) { row.push(cell.trim()); if (row.some(c => c)) rows.push(row); }
  return rows;
}

// Map a header string to a column key.
function colKeyOf(raw: string): keyof RowData | null {
  const s = raw.toLowerCase().replace(/\s*[\(/].*/, '').trim();
  if (['gruppe / sektion', 'gruppe/sektion', 'gruppe', 'sektion'].includes(s)) return 'section';
  if (s === 'titel') return 'title';
  if (['dauer', 'aufwand', 'zeit'].includes(s)) return 'duration';
  if (['wiederholung', 'wiederkehrend', 'recurrence', 'recurring', 'repeat'].includes(s)) return 'recurrence';
  if (s === 'beschreibung') return 'description';
  if (['referenz', 'quelle', 'reference', 'source', 'link', 'url'].includes(s)) return 'reference';
  return null;
}

export default function BulkAddTasks({ projectId, projectName, onClose }: BulkAddTasksProps) {
  const bulkCreateTasks = useStore((s) => s.bulkCreateTasks);
  const [rows, setRows] = useState<RowData[]>([emptyRow(), emptyRow(), emptyRow()]);
  // Track which cell is focused for paste targeting.
  const focusRef = useRef<{ row: number; col: number }>({ row: 0, col: 0 });

  const setCell = (ri: number, key: keyof RowData, val: string) => {
    setRows((prev) => prev.map((r, i) => i === ri ? { ...r, [key]: val } : r));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const deleteRow = (ri: number) => {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== ri);
      return next.length ? next : [emptyRow()];
    });
  };

  // Paste TSV into the table starting at the focused cell.
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    const rawRows = parseTSV(text);
    if (!rawRows.length) return;
    e.preventDefault();

    // Detect header row: first row where ≥1 cell maps to a known key.
    let startRaw = 0;
    let colOrder: (keyof RowData | null)[] | null = null;
    const firstKeys = rawRows[0].map(colKeyOf);
    if (firstKeys.some((k) => k !== null)) {
      colOrder = firstKeys;
      startRaw = 1;
    }

    const { row: startRow, col: startCol } = focusRef.current;
    const colKeys = COLS.map((c) => c.key);

    setRows((prev) => {
      const next = prev.map((r) => ({ ...r }));
      for (let ri = startRaw; ri < rawRows.length; ri++) {
        const cells = rawRows[ri];
        const targetRow = startRow + (ri - startRaw);
        while (next.length <= targetRow) next.push(emptyRow());

        if (colOrder) {
          // Header-driven: map by column name regardless of start col.
          colOrder.forEach((key, ci) => {
            if (key && cells[ci]) next[targetRow][key] = cells[ci];
          });
        } else {
          // Positional: fill from startCol rightward.
          cells.forEach((val, ci) => {
            const colIdx = startCol + ci;
            if (colIdx < colKeys.length && val) {
              next[targetRow][colKeys[colIdx]] = val;
            }
          });
        }
      }
      return next;
    });
  }, []);

  // Tab on last cell of last row → add new row.
  const handleKeyDown = (e: React.KeyboardEvent, ri: number, ci: number) => {
    if (e.key === 'Tab' && !e.shiftKey && ri === rows.length - 1 && ci === COLS.length - 1) {
      e.preventDefault();
      addRow();
      // Focus first cell of new row after render.
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('.bulk-table-input');
        inputs[(ri + 1) * COLS.length]?.focus();
      }, 0);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputs = document.querySelectorAll<HTMLInputElement>('.bulk-table-input');
      const next = inputs[(ri + 1) * COLS.length + ci];
      if (next) next.focus();
      else if (ri === rows.length - 1) addRow();
    }
  };

  const validRows = rows.filter((r) => r.title.trim());
  const sectionCount = new Set(validRows.map((r) => r.section).filter(Boolean)).size;

  const submit = () => {
    if (!validRows.length) return;
    bulkCreateTasks(projectId, validRows.map((r) => {
      // Merge reference into description: reference goes on top, then blank line, then description.
      const parts = [r.reference.trim(), r.description.trim()].filter(Boolean);
      const description = parts.join('\n\n') || undefined;
      return {
        section: r.section || undefined,
        title: r.title,
        duration: r.duration || undefined,
        recurrence: r.recurrence || undefined,
        description,
      };
    }));
    onClose();
  };

  return (
    <div className="bulk-add-overlay" onMouseDown={onClose}>
      <div className="bulk-add-modal bulk-add-modal-wide" onMouseDown={(e) => e.stopPropagation()}>
        <div className="bulk-add-head">
          <h3>Mehrere Aufgaben einfügen</h3>
          <button className="bulk-add-close" onClick={onClose}>✕</button>
        </div>
        <p className="bulk-add-hint">
          Direkt in die Tabelle tippen oder aus Excel/Sheets einfügen — Zelle anklicken, dann Ctrl+V.
          Dauer: <code>30m</code>, <code>1h</code>, <code>1.5h</code>. Wiederholung: <code>täglich</code>,{' '}
          <code>wöchentlich</code>, <code>monatlich</code>. Alle Aufgaben landen in <strong>{projectName}</strong>.
        </p>

        <div className="bulk-table-wrap" onPaste={handlePaste}>
          <table className="bulk-table">
            <colgroup>
              {COLS.map((c) => <col key={c.key} style={{ width: c.width }} />)}
              <col style={{ width: '28px' }} />
            </colgroup>
            <thead>
              <tr>
                {COLS.map((c) => <th key={c.key}>{c.label}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={row.title.trim() ? '' : 'bulk-row-empty'}>
                  {COLS.map((col, ci) => (
                    <td key={col.key}>
                      <input
                        className="bulk-table-input"
                        value={row[col.key]}
                        placeholder={col.placeholder}
                        onChange={(e) => setCell(ri, col.key, e.target.value)}
                        onFocus={() => { focusRef.current = { row: ri, col: ci }; }}
                        onKeyDown={(e) => handleKeyDown(e, ri, ci)}
                      />
                    </td>
                  ))}
                  <td className="bulk-row-del-cell">
                    <button
                      className="bulk-row-del"
                      tabIndex={-1}
                      onClick={() => deleteRow(ri)}
                      title="Zeile entfernen"
                    >×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="bulk-add-row-btn" onClick={addRow}>+ Zeile</button>
        </div>

        <div className="bulk-add-foot">
          <span className="bulk-add-count">
            {validRows.length} Aufgabe{validRows.length === 1 ? '' : 'n'}
            {sectionCount > 0 && ` · ${sectionCount} Gruppe${sectionCount === 1 ? '' : 'n'}`}
          </span>
          <div className="bulk-add-actions">
            <button className="btn" onClick={onClose}>Abbrechen</button>
            <button className="btn btn-primary" disabled={!validRows.length} onClick={submit}>
              {validRows.length} anlegen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

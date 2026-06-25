import { useEffect, useRef, useState } from 'react';

// Insert/wrap text in a textarea while preserving the browser's undo stack.
export function insertAtCursor(ta: HTMLTextAreaElement, before: string, after = '') {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end);
  ta.focus();
  document.execCommand('insertText', false, before + selected + after);
  const newStart = start + before.length;
  ta.setSelectionRange(newStart, newStart + selected.length);
}

// Prepend a prefix to every selected line (or current line if no selection).
export function prefixLines(ta: HTMLTextAreaElement, prefix: string) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const val = ta.value;
  const lineStart = val.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = val.indexOf('\n', end);
  const block = val.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  const prefixed = block
    .split('\n')
    .map((l) => (l.startsWith(prefix) ? l : prefix + l))
    .join('\n');
  ta.setSelectionRange(lineStart, lineEnd === -1 ? val.length : lineEnd);
  ta.focus();
  document.execCommand('insertText', false, prefixed);
  ta.setSelectionRange(lineStart, lineStart + prefixed.length);
}

const COLOR_SWATCHES = [
  { color: '#e53935', label: 'Rot' },
  { color: '#fb8c00', label: 'Orange' },
  { color: '#fdd835', label: 'Gelb' },
  { color: '#43a047', label: 'Grün' },
  { color: '#1e88e5', label: 'Blau' },
  { color: '#8e24aa', label: 'Lila' },
  { color: '#6d4c41', label: 'Braun' },
  { color: '#546e7a', label: 'Grau' },
];

interface DescToolbarProps {
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  onSave: () => void;
  saveLabel?: string;
}

export function DescToolbar({ taRef, onSave, saveLabel = '✓ Speichern' }: DescToolbarProps) {
  const [colorOpen, setColorOpen] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!colorOpen) return;
    const handler = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node))
        setColorOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colorOpen]);

  const ta = () => taRef.current!;

  const btn = (label: string, title: string, action: () => void, extraClass = '') => (
    <button
      type="button"
      className={`desc-tb-btn${extraClass ? ' ' + extraClass : ''}`}
      title={title}
      onMouseDown={(e) => { e.preventDefault(); action(); }}
    >
      {label}
    </button>
  );

  const applyColor = (color: string) => {
    setColorOpen(false);
    const t = ta();
    const sel = t.value.slice(t.selectionStart, t.selectionEnd) || 'Text';
    insertAtCursor(t, `<span style="color:${color}">`, '</span>');
    const start = t.selectionStart - sel.length - '</span>'.length;
    t.setSelectionRange(start, start + sel.length);
    t.focus();
  };

  return (
    <div className="desc-toolbar">
      <div className="desc-tb-left">
        {btn('B', 'Fett', () => insertAtCursor(ta(), '**', '**'), 'tb-bold')}
        {btn('I', 'Kursiv', () => insertAtCursor(ta(), '*', '*'), 'tb-italic')}
        {btn('S', 'Durchgestrichen', () => insertAtCursor(ta(), '~~', '~~'), 'tb-strike')}
        <span className="desc-tb-sep" />
        {btn('H1', 'Überschrift 1', () => prefixLines(ta(), '# '))}
        {btn('H2', 'Überschrift 2', () => prefixLines(ta(), '## '))}
        {btn('H3', 'Überschrift 3', () => prefixLines(ta(), '### '))}
        <span className="desc-tb-sep" />
        {btn('•', 'Aufzählung', () => prefixLines(ta(), '- '))}
        {btn('1.', 'Nummerierte Liste', () => prefixLines(ta(), '1. '))}
        {btn('❝', 'Zitat', () => prefixLines(ta(), '> '))}
        {btn('`', 'Inline-Code', () => insertAtCursor(ta(), '`', '`'))}
        {btn('—', 'Trennlinie', () => insertAtCursor(ta(), '\n\n---\n\n'))}
        {btn('🔗', 'Link', () => {
          const t = ta();
          const sel = t.value.slice(t.selectionStart, t.selectionEnd);
          insertAtCursor(t, '[' + (sel || 'Linktext'), '](https://)');
        })}
        <span className="desc-tb-sep" />
        <div className="desc-tb-color-wrap" ref={colorRef}>
          <button
            type="button"
            className="desc-tb-btn desc-tb-color-btn"
            title="Textfarbe"
            onMouseDown={(e) => { e.preventDefault(); setColorOpen((v) => !v); }}
          >
            A
          </button>
          {colorOpen && (
            <div className="desc-tb-color-pop">
              {COLOR_SWATCHES.map((s) => (
                <button
                  key={s.color}
                  type="button"
                  className="desc-tb-swatch"
                  style={{ background: s.color }}
                  title={s.label}
                  onMouseDown={(e) => { e.preventDefault(); applyColor(s.color); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        className="desc-tb-save"
        onMouseDown={(e) => { e.preventDefault(); onSave(); }}
        title="Speichern (Ctrl+Enter)"
      >
        {saveLabel}
      </button>
    </div>
  );
}

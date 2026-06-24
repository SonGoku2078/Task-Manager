import { useEffect, useRef, useState } from 'react';
import './SearchSelect.css';

export interface SearchOption {
  value: string;
  label: string;
  group?: string;
  color?: string;
}

interface SearchSelectProps {
  options: SearchOption[];
  placeholder: string;
  onSelect: (value: string) => void;
  // When set, the trigger shows the matching option (coloured dot + neutral text).
  value?: string;
}

// Compact, searchable dropdown (native <select> has no filter). Click to open a
// panel with a search field + filtered, grouped option list. Closes on outside click.
export default function SearchSelect({
  options,
  placeholder,
  onSelect,
  value,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('mousedown', onDown);
    inputRef.current?.focus();
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q))
    : options;

  // Preserve group order as first seen.
  const groups: { name: string; items: SearchOption[] }[] = [];
  for (const o of filtered) {
    const name = o.group ?? '';
    let g = groups.find((x) => x.name === name);
    if (!g) {
      g = { name, items: [] };
      groups.push(g);
    }
    g.items.push(o);
  }

  const selected = value != null && value !== '' ? options.find((o) => o.value === value) : undefined;

  const choose = (v: string) => {
    onSelect(v);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="search-select" ref={rootRef}>
      <button
        type="button"
        className={`search-select-trigger ${selected ? 'has-value' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="search-select-current">
          {selected ? (
            <>
              {selected.color && (
                <span
                  className="search-select-dot"
                  style={{ background: selected.color }}
                />
              )}
              {selected.label}
            </>
          ) : (
            placeholder
          )}
        </span>
        <span className="search-select-caret">▾</span>
      </button>
      {open && (
        <div className="search-select-panel">
          <input
            ref={inputRef}
            className="search-select-input"
            placeholder="Suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="search-select-list">
            {groups.length === 0 && (
              <div className="search-select-empty">Keine Treffer</div>
            )}
            {groups.map((g) => (
              <div key={g.name || '_'}>
                {g.name && <div className="search-select-group">{g.name}</div>}
                {g.items.map((o) => (
                  <button
                    type="button"
                    key={o.value}
                    className="search-select-option"
                    onClick={() => choose(o.value)}
                  >
                    {o.color && (
                      <span
                        className="search-select-dot"
                        style={{ background: o.color }}
                      />
                    )}
                    {o.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

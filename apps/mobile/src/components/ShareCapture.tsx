import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { parseQuickAdd } from '../quickParse';
import type { SharedPayload } from '../shareTarget';

const URL_RE = /https?:\/\/[^\s]+/i;

// Quick-capture sheet shown when content is shared into the app. The link goes
// into the description; the project defaults to Inbox and is overridden by a
// `#Projekt` token in the title or by the dropdown.
export default function ShareCapture({ payload, onClose }: { payload: SharedPayload; onClose: () => void }) {
  const projects = useStore((s) => s.projects);
  const categories = useStore((s) => s.categories);
  const addTask = useStore((s) => s.addTask);

  const initial = useMemo(() => {
    const text = (payload.text ?? '').trim();
    const subject = (payload.subject ?? '').trim();
    const url = text.match(URL_RE)?.[0] ?? '';
    const rest = url ? text.replace(url, '').trim() : text;
    // Link → description; title prefers the page subject, else the non-link text.
    const title = subject || rest || url || '';
    const description = url || (subject ? text : '');
    return { title, description };
  }, [payload]);

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [projectChoice, setProjectChoice] = useState<string>(''); // '' = Inbox / follow #tag
  const [saved, setSaved] = useState(false);

  const visibleProjects = projects
    .filter((p) => !p.archived)
    .sort((a, b) => a.name.localeCompare(b.name));

  const save = () => {
    const parsed = parseQuickAdd(title);
    let projectId: string | null;
    if (projectChoice) projectId = projectChoice; // explicit dropdown wins
    else if (parsed.projectName) {
      const m = projects.find((p) => p.name.toLowerCase() === parsed.projectName!.toLowerCase());
      projectId = m ? m.id : null; // unknown #tag → Inbox (default)
    } else projectId = null;

    const categoryIds = parsed.categoryNames
      .map((n) => categories.find((c) => c.name.toLowerCase() === n.toLowerCase())?.id)
      .filter((x): x is string => !!x);

    addTask({
      title: parsed.title || 'Geteilte Aufgabe',
      description,
      projectId,
      categoryIds,
    });
    setSaved(true);
    setTimeout(onClose, 700);
  };

  return (
    <div className="m-modal-backdrop" onClick={onClose}>
      <div className="m-modal" onClick={(e) => e.stopPropagation()}>
        <div className="m-modal-head">
          <span className="m-title">Geteilten Inhalt erfassen</span>
          <button className="m-modal-x" onClick={onClose}>✕</button>
        </div>

        {saved ? (
          <div className="m-ok" style={{ padding: '16px 4px' }}>✓ Aufgabe erstellt</div>
        ) : (
          <>
            <label className="m-field">
              <span>Titel</span>
              <input
                value={title}
                placeholder="Titel… (#Projekt @Kategorie)"
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label className="m-field">
              <span>Projekt</span>
              <select value={projectChoice} onChange={(e) => setProjectChoice(e.target.value)}>
                <option value="">— Inbox (oder #Projekt im Titel) —</option>
                {visibleProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.kind === 'area' ? '∞ ' : ''}{p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="m-field">
              <span>Beschreibung</span>
              <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>

            <div className="m-modal-foot">
              <button className="m-btn-del" onClick={onClose}>Abbrechen</button>
              <button
                className="m-btn-save"
                onClick={save}
                disabled={!title.trim() && !description.trim()}
              >
                Speichern
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

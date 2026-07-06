import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { parseQuickAdd } from '../quickParse';
import { useSwipeDown } from '../gestures';
import { deriveShareFields } from '../shareFields';
import type { SharedPayload } from '../shareTarget';

// Quick-capture sheet shown when content is shared into the app. The link goes
// into the note; the project defaults to Inbox and can be searched/picked.
export default function ShareCapture({ payload, onClose }: { payload: SharedPayload; onClose: () => void }) {
  const projects = useStore((s) => s.projects);
  const categories = useStore((s) => s.categories);
  const addTask = useStore((s) => s.addTask);

  const initial = useMemo(() => deriveShareFields(payload), [payload]);

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [projectChoice, setProjectChoice] = useState<string>(''); // '' = Inbox / follow #tag
  const [projQuery, setProjQuery] = useState('');
  const [saved, setSaved] = useState(false);
  const swipe = useSwipeDown(onClose);

  const visibleProjects = projects
    .filter((p) => !p.archived)
    .sort((a, b) => a.name.localeCompare(b.name));
  const filteredProjects = projQuery.trim()
    ? visibleProjects.filter((p) => p.name.toLowerCase().includes(projQuery.trim().toLowerCase()))
    : visibleProjects;
  const chosenName = projectChoice
    ? projects.find((p) => p.id === projectChoice)?.name ?? 'Projekt'
    : 'Inbox';

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
      <div className="m-modal" onClick={(e) => e.stopPropagation()} style={swipe.style} {...swipe.handlers}>
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

            <div className="m-field">
              <span>Projekt: <strong>{chosenName}</strong></span>
              <input
                className="m-share-projsearch"
                placeholder="Projekt suchen… (leer = Inbox)"
                value={projQuery}
                onChange={(e) => setProjQuery(e.target.value)}
              />
              <div className="m-share-projlist">
                <button
                  className={`m-share-projitem ${projectChoice === '' ? 'on' : ''}`}
                  onClick={() => { setProjectChoice(''); setProjQuery(''); }}
                >
                  📥 Inbox (kein Projekt)
                </button>
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    className={`m-share-projitem ${projectChoice === p.id ? 'on' : ''}`}
                    onClick={() => { setProjectChoice(p.id); setProjQuery(''); }}
                  >
                    {p.kind === 'area' ? '∞ ' : '● '}{p.name}
                  </button>
                ))}
                {filteredProjects.length === 0 && (
                  <p className="m-settings-hint">Kein Projekt gefunden.</p>
                )}
              </div>
            </div>

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

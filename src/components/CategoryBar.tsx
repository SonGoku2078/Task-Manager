import { useState } from 'react';
import { useStore } from '../store';
import './CategoryBar.css';

export default function CategoryBar() {
  const categories = useStore((s) => s.categories);
  const tasks = useStore((s) => s.tasks);
  const addCategory = useStore((s) => s.addCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);
  const activeCategoryId = useStore((s) => s.ui.filters.categoryId);
  const setFilter = useStore((s) => s.setFilter);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const count = (catId: string) =>
    tasks.filter((t) => t.categoryIds.includes(catId) && !t.completed).length;

  const submit = () => {
    const n = name.trim();
    if (n) addCategory(n);
    setName('');
    setAdding(false);
  };

  return (
    <div className="category-bar">
      <button
        className={`cat-pill ${activeCategoryId === null ? 'active' : ''}`}
        onClick={() => setFilter('categoryId', null)}
      >
        Alle
      </button>
      {categories.map((c) => (
        <span key={c.id} className="cat-pill-wrap">
          <button
            className={`cat-pill ${activeCategoryId === c.id ? 'active' : ''}`}
            style={
              activeCategoryId === c.id
                ? { background: c.color, borderColor: c.color, color: '#fff' }
                : { borderColor: c.color, color: c.color }
            }
            onClick={() =>
              setFilter('categoryId', activeCategoryId === c.id ? null : c.id)
            }
          >
            {c.name} <span className="cat-pill-count">{count(c.id)}</span>
          </button>
          <button
            className="cat-pill-del"
            title="Kategorie löschen"
            onClick={() => {
              if (window.confirm(`Kategorie "${c.name}" löschen?`)) {
                if (activeCategoryId === c.id) setFilter('categoryId', null);
                deleteCategory(c.id);
              }
            }}
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          className="cat-add-input"
          placeholder="Name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') {
              setAdding(false);
              setName('');
            }
          }}
          onBlur={submit}
        />
      ) : (
        <button className="cat-pill cat-add" onClick={() => setAdding(true)}>
          + Kategorie
        </button>
      )}
    </div>
  );
}

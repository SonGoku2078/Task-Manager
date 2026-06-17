# Feature 11 — Filter & Sort

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Filter nach Projekt, Kategorie, Priorität und Status (offen/erledigt).
- **AC2:** Sortierung nach Standard/Priorität/Fälligkeit/Titel/Erstellt, auf-/absteigend.
- **AC3:** „Zurücksetzen" erscheint nur bei aktivem Filter.
- **AC4:** Filter/Sort gelten in Listenansichten (Inbox, Projekte, Heute, Kategorien, Suche).

## 2. Architektur
- `Filters` + `sortField`/`sortDir` in `ui` (Store-Actions `setFilter`, `resetFilters`, `setSort`).
- `matchesFilters` + `sortTasks` in `selectors.ts`.
- `FilterBar` (neu) gerendert in Listenansichten; Kategorie-Filter via `CategoryBar`.

## 3. Implementierung
- `src/components/FilterBar.tsx` (+ CSS), `src/store.ts`, `src/selectors.ts`, `src/App.tsx`.

## 4. Testdesign
- TC1 je Filter, TC2 Sort-Feld + Richtung, TC3 Reset-Sichtbarkeit, TC4 Kombination Filter+Sort.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

# Feature 08 — Categories / Contexts (Tagging)

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Kategorie anlegen und löschen (Kategorie-Ansicht).
- **AC2:** Kategorien einer Aufgabe zuweisen (Detail-Panel-Chips, Mehrfachauswahl).
- **AC3:** Nach Kategorie filtern (Pill-Leiste → `filters.categoryId`).
- **AC4:** Kategorie-Farbe sichtbar in Liste (Chips) und Filter-Pills.
- **AC5:** Beim Löschen einer Kategorie wird sie aus allen Aufgaben entfernt.

## 2. Architektur
- Store: `addCategory`, `updateCategory`, `deleteCategory` (entfernt `categoryId` aus Tasks).
- `Task.categoryIds: string[]`; `matchesFilters` prüft `filters.categoryId`.
- `CategoryBar` (neu) — Pills + Add/Delete; in der Kategorie-Ansicht über der Liste.

## 3. Implementierung
- `src/components/CategoryBar.tsx` (+ CSS), `src/store.ts`, `src/App.tsx`, `src/components/TaskDetailPanel.tsx`.

## 4. Testdesign
- TC1 add/delete category, TC2 assign via chips, TC3 filter by pill, TC4 Farbe, TC5 delete entfernt Zuordnung.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

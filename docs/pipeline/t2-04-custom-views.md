# Tier-2 Feature — Custom Views (Saved Filters)

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Aktuelle Filter/Sort/Suche als benannte Ansicht speichern.
- **AC2:** Gespeicherte Ansichten in der Sidebar; Klick wendet sie an.
- **AC3:** Ansicht löschen.
- **AC4:** Gespeicherte Ansichten überleben Reload (Persistenz).

## 2. Architektur
- `SavedView` (`types.ts`); Store: `savedViews`, `addSavedView`, `deleteSavedView`, `applySavedView`; `ui.activeSavedViewId`; View-Typ `custom` (kein View-Scoping → nur Filter/Sort/Suche).
- FilterBar „💾 Ansicht speichern"; Sidebar-Sektion „Ansichten"; App-Header zeigt Ansichtsnamen.
- `partialize` persistiert `savedViews`.

## 3. Implementierung
- `src/types.ts`, `src/store.ts`, `src/components/FilterBar.tsx` (+ CSS), `src/components/Sidebar.tsx` (+ CSS), `src/App.tsx`.

## 4. Testdesign
- TC1 Filter setzen→speichern, TC2 anwenden, TC3 löschen, TC4 Reload-Persistenz.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

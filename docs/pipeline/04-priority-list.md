# Feature 04 — Priority List (Top 5 für Heute)

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Priorität-Ansicht zeigt max. 5 offene Aufgaben.
- **AC2:** Reihenfolge: markiert (★) zuerst, dann Priorität (hoch→niedrig), dann Fälligkeit.
- **AC3:** Erledigte Aufgaben erscheinen nicht.
- **AC4:** Erklärender Hinweis + leerer-Zustand-Text.

## 2. Architektur
- `selectPriorityTasks(tasks, 5)` in `src/selectors.ts`.
- App nutzt diesen Selector statt `selectVisibleTasks`, wenn `currentView === 'priority'`.

## 3. Implementierung
- `src/App.tsx`, `src/selectors.ts`, `src/App.css`.

## 4. Testdesign
- TC1 max. 5, TC2 Sortierung ★→high→due, TC3 erledigte raus, TC4 leerer Zustand.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

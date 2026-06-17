# Feature 07 — Star / Favorite

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Stern-Button in Liste **und** Detail-Panel togglet `starred`.
- **AC2:** Visuelles Feedback (★ gefüllt / ☆ leer).
- **AC3:** Markierte Aufgaben werden in der Priority-Liste bevorzugt (s. Feature 04).

## 2. Architektur
- `toggleStar` in `store.ts`; `starred` als Sortier-Kriterium in `selectPriorityTasks`.

## 3. Implementierung
- `src/components/TaskList.tsx`, `src/components/TaskDetailPanel.tsx`, `src/store.ts`.

## 4. Testdesign
- TC1 toggle aus Liste, TC2 toggle aus Panel, TC3 Priority-Reihenfolge.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

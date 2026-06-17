# Feature 02 — Create / Edit / Delete Tasks (CRUD)

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Aufgabe anlegen (Quick-Add + Detail-Panel-Felder).
- **AC2:** Aufgabe bearbeiten — alle Felder im Detail-Panel, sofort persistiert.
- **AC3:** Aufgabe löschen über Detail-Panel; Auswahl wird zurückgesetzt.
- **AC4:** Änderungen überleben Reload; `updatedAt` wird aktualisiert.

## 2. Architektur
- Store-Actions `addTask` (typsicheres `NewTaskInput`), `updateTask` (Partial + `updatedAt`), `deleteTask` (räumt `selectedTaskId` auf).
- Bugfix Foundation: `ui.selectedTaskId` statt veraltetem `selectedTask`-Objekt → keine stale Edits mehr.

## 3. Implementierung
- `src/store.ts`, `src/components/TaskDetailPanel.tsx`.

## 4. Testdesign
- TC1 create, TC2 edit title/desc/date/priority, TC3 delete, TC4 reload-persistenz.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

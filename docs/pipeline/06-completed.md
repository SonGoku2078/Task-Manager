# Feature 06 — Completed Status

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Checkbox togglet `completed`.
- **AC2:** Erledigte Aufgabe → Titel durchgestrichen + gedimmt.
- **AC3:** Status persistiert; Checkbox-Klick selektiert die Aufgabe nicht (stopPropagation).

## 2. Architektur
- `toggleTask` in `store.ts` (inkl. Recurrence-Spawn, s. Feature 10).
- CSS `.task-title.completed` (line-through) + `.task-item.is-completed`.

## 3. Implementierung
- `src/components/TaskList.tsx`, `src/components/TaskList.css`, `src/store.ts`.

## 4. Testdesign
- TC1 toggle on/off, TC2 visuelles Strikethrough, TC3 Klick-Isolation.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

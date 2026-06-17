# Feature 01 — Inbox (Task Collection)

| Feld | Wert |
|---|---|
| Status | done |
| Nächste Rolle | — |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-06-18 |

> Orchestrator-Log:
> - 2026-06-18 gestartet → Foundation-Refactor (store/types/selectors) als Basis aller Tier-1-Features.
> - 2026-06-18 done → Inbox als Default-Sammelpunkt für projektlose Aufgaben.

## 1. Requirements
- **AC1:** Es gibt eine Inbox-Ansicht, erreichbar über die Sidebar.
- **AC2:** Inbox zeigt alle Aufgaben **ohne** Projektzuordnung (`projectId === null`).
- **AC3:** Über das Quick-Add-Feld lässt sich sofort eine Aufgabe in die Inbox legen.
- **AC4:** Aufgaben bleiben nach Reload erhalten (localStorage).

## 2. Architektur
- `selectVisibleTasks` filtert bei `currentView === 'inbox'` auf `!projectId`.
- Quick-Add in `App.tsx` ruft `addTask({ title, projectId: null })`.
- Persistenz über zustand `persist`-Middleware mit Date-Reviver (`store.ts`).

## 3. Implementierung
- Dateien: `src/store.ts`, `src/selectors.ts`, `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/TaskList.tsx`.
- Inbox-Filter + Quick-Add + leerer-Zustand-Hinweis.

## 4. Testdesign
- TC1: Neue Aufgabe via Quick-Add → erscheint in Inbox.
- TC2: Aufgabe einem Projekt zuordnen → verschwindet aus Inbox.
- TC3: Reload → Aufgaben weiterhin sichtbar.

## 5. Testausführung & Gate
- `npm run build` grün, `npm run lint` grün. Logik per Selector verifiziert. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit direkt auf `master` (Solo-MVP, vom Nutzer so gewählt).

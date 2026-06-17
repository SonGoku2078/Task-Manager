# Feature 03 — Projects Management

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Projekt anlegen (Sidebar „+").
- **AC2:** Aufgabe einem Projekt zuordnen (Detail-Panel-Select).
- **AC3:** Nach Projekt filtern = Projekt-Ansicht zeigt nur dessen Aufgaben.
- **AC4:** Projekt umbenennen (Header-Titel editierbar) und löschen (Aufgaben fallen in Inbox zurück).
- **AC5:** Sidebar zeigt offene-Aufgaben-Zähler je Projekt.

## 2. Architektur
- Store: `addProject`, `updateProject`, `deleteProject` (orphant Tasks → `projectId: null`).
- `selectVisibleTasks` Case `projects` → Filter auf `selectedProjectId`.
- Sidebar Inline-Add; App-Header Rename-Input + Delete mit Bestätigung.

## 3. Implementierung
- `src/store.ts`, `src/components/Sidebar.tsx`, `src/App.tsx` (+ CSS).

## 4. Testdesign
- TC1 add, TC2 assign via Panel, TC3 Projekt-Ansicht gefiltert, TC4 rename, TC5 delete→Inbox, TC6 Zähler korrekt.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

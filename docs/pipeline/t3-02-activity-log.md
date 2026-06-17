# Tier-3 Feature — Activity Log

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Protokolliert: Aufgabe erstellt/erledigt/wieder geöffnet/gelöscht, Projekt erstellt.
- **AC2:** Eigene Ansicht „Aktivität", neueste zuerst, mit Akteur + Zeitstempel.
- **AC3:** Log auf 200 Einträge begrenzt; persistiert.

## 2. Architektur
- `ActivityEntry` (`types.ts`); Store `activityLog` + `pushLog`/`makeEntry`-Helper; Logging in addTask/toggleTask/deleteTask/addProject/createProjectFromTemplate.
- `ActivityLog`-Ansicht; Sidebar-Nav; Date-Reviver für `at`.

## 3. Implementierung
- `src/types.ts`, `src/store.ts`, `src/components/ActivityLog.tsx` (+ CSS), `src/App.tsx`, `src/components/Sidebar.tsx`.

## 4. Testdesign
- TC1 je Aktion erzeugt Eintrag, TC2 Reihenfolge neueste-zuerst, TC3 Cap 200, TC4 Reload-Persistenz.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

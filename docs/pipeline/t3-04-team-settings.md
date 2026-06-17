# Tier-3 Feature — Team Sharing & Permissions + User Settings (lokal)

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |
| Hinweis | Lokaler Stub ohne Backend: keine echte Synchronisation/Rechte-Durchsetzung. |

## 1. Requirements
- **AC1:** Einstellungen-Ansicht mit Profilname (Autor für Kommentare/Aktivität).
- **AC2:** Theme-Wahl Hell/Dunkel (Persistenz; Anwendung s. Tier-4 Dark Mode).
- **AC3:** Team: Mitglieder hinzufügen/entfernen, Rolle (Admin/Editor/Viewer) setzen.
- **AC4:** Aufgaben einem Mitglied zuweisen (Detail-Panel, sichtbar wenn Mitglieder existieren).
- **AC5:** Einstellungen/Team persistieren über localStorage.

## 2. Architektur
- `Member`, `Settings`, `Theme`, `MemberRole` (`types.ts`); `Task.assigneeId?`.
- Store: `members` + CRUD, `settings` + `setUserName`/`setTheme`; `currentUser` → `settings.userName`.
- `SettingsView` (Profil/Theme/Team); Assignee-Select im Detail-Panel; persistiert via `partialize`.

## 3. Implementierung
- `src/types.ts`, `src/store.ts`, `src/components/SettingsView.tsx` (+ CSS), `src/App.tsx`, `src/components/TaskDetailPanel.tsx`.

## 4. Testdesign
- TC1 Name ändern→Autor in neuem Kommentar, TC2 Theme persistiert, TC3 Member CRUD + Rolle, TC4 Assignee setzen, TC5 Reload.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.** Damit ist Tier-3 vollständig.

## 6. CI/CD & Deployment
- Commit auf `master`.

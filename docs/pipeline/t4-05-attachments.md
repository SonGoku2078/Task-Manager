# Inbox-Idee — Attachments on Tasks

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |
| Hinweis | localStorage-basiert (Data-URL), Größenlimit 400 KB/Datei. |

## 1. Requirements
- **AC1:** Datei an Aufgabe anhängen (Detail-Panel).
- **AC2:** Anhänge auflisten mit Name + Größe; herunterladen (Download-Link).
- **AC3:** Anhang entfernen.
- **AC4:** Größenlimit 400 KB mit Fehlermeldung; persistiert via localStorage.

## 2. Architektur
- `Attachment` (`types.ts`), `Task.attachments?`; Store `addAttachment`, `deleteAttachment`.
- `FileReader` → Data-URL; Download via `<a download>`.

## 3. Implementierung
- `src/types.ts`, `src/store.ts`, `src/components/TaskDetailPanel.tsx` (+ CSS).

## 4. Testdesign
- TC1 anhängen, TC2 Download, TC3 löschen, TC4 zu große Datei → Fehler, TC5 Reload-Persistenz.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

# Feature 05 — Task Fields (alle Felder)

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Felder Titel, Beschreibung, Fälligkeit, Priorität (low/medium/high), Projekt, Kategorien, Wiederholung sind editierbar.
- **AC2:** Datentyp-Korrektheit: `dueDate: Date|null`, `priority: Priority`, `recurrence: RecurrenceType`.

## 2. Architektur
- `Task`-Interface in `src/types.ts` deckt alle Felder ab; `null`-fähige `projectId`/`dueDate`.
- Detail-Panel rendert pro Feld das passende Control (input/select/textarea/chips).

## 3. Implementierung
- `src/types.ts`, `src/components/TaskDetailPanel.tsx`.

## 4. Testdesign
- TC pro Feld: Wert setzen → in Liste/Persistenz reflektiert.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

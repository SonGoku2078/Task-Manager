# Erweiterung — Nummern, Subtasks, Historie, Erledigt-Filter, Paste, URL-Sharing

| Feld | Wert |
|---|---|
| Status | done (lokal) |
| Datum | 2026-06-18 |
| Verifikation | build+lint grün; Brave Nightly headless Screenshots (`#/t/1` öffnet Detail) |

## Requirements (ACs)
- **AC1:** Jede Aufgabe hat eine eindeutige Nummer `#N` (auch Bestand via Migration).
- **AC2:** Unteraufgaben sind vollwertige Aufgaben (eigene Nummer/URL, datierbar), unter dem Parent
  verwaltet, beim Parent-Löschen kaskadierend entfernt.
- **AC3:** „Aktivität" zeigt feldgenaue Änderungen (alt→neu), nach Aufgabe gruppiert.
- **AC4:** „Erledigt" filterbar (Projekt/Kategorie/Priorität/Status/Datum) + auf-/absteigend.
- **AC5:** Screenshots/Dateien per Paste anhängbar (≤1.5 MB, Warnung).
- **AC6:** Jede Aufgabe per `#/t/<nr>` referenzierbar; „Link kopieren"; austauschbare `BASE_URL`.

## Architektur / Implementierung
- `types.ts`: `Task.number/parentId`, `Filters.dueFrom/dueTo`, `Attachment.url?`, `ActivityEntry`
  (kind/field/from/to/taskId/taskNumber/taskTitle), ViewType `completed`.
- `store.ts`: `nextTaskNumber` (persist v2 + `migrate`), `addSubtask`, kaskadiertes `deleteTask`,
  `updateTask`-Diff-Logging (`TRACKED_FIELDS`, `fmtVal`), `taskEntry`/`plainEntry`/`pushLogs`.
- `selectors.ts`: Subtask-Ausschluss aus flachen Listen, `completed`-Case, Datums-/Kategorie-Filter.
- Komponenten: `ActivityLog.tsx` (gruppiert), `FilterBar.tsx` (Kategorie+Datum), `TaskDetailPanel.tsx`
  (Nummer, Subtasks, Paste, Link kopieren, Parent-Breadcrumb), `Sidebar.tsx` (Erledigt+Aktivität),
  `App.tsx` (Routing, View-Branches), neu `config.ts`.

## Gate
- Build/Lint grün; Detail-Panel + Sidebar + Filter visuell via Brave verifiziert. **GO.**

## Server-Anteile (separat, s. docs/ROADMAP.md)
- Echtes geräte-/nutzerübergreifendes Sharing, Anhänge-Upload→URL, Sync/Auth, live-`webcal://`.

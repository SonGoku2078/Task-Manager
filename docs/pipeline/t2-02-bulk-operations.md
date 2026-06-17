# Tier-2 Feature — Bulk Operations

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Auswahlmodus über Header-Button (☑).
- **AC2:** Mehrfachauswahl per Zeilen-Checkbox; „Alle auswählen" (indeterminate-Status).
- **AC3:** Bulk-Aktionen: Erledigen, Öffnen, Markieren (★), Projekt setzen, Priorität setzen, Löschen.
- **AC4:** Auswahl beenden setzt Modus + Auswahl zurück.

## 2. Architektur
- Store: `bulkUpdate(ids, updates)`, `bulkDelete(ids)` (Set-basiert, räumt selectedTaskId).
- App hält Auswahl-State (Set) + `bulkMode`; `TaskList` rendert im Auswahlmodus Selektion statt Completion.
- `BulkActionBar` (neu) für Aktionen.

## 3. Implementierung
- `src/components/BulkActionBar.tsx` (+ CSS), `src/components/TaskList.tsx`, `src/App.tsx`, `src/store.ts`.

## 4. Testdesign
- TC1 Modus an/aus, TC2 Select-all/indeterminate, TC3 je Bulk-Aktion, TC4 Löschen mit Confirm.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

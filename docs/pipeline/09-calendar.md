# Feature 09 — Calendar View

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Monatskalender mit Vor/Zurück-Navigation und „Heute".
- **AC2:** Klick auf einen Tag → Kalender-Ansicht zeigt die Aufgaben dieses Tages.
- **AC3:** Tage mit Aufgaben zeigen Punkt-Indikator (Anzahl).
- **AC4:** Neue Aufgabe in Kalender-Ansicht bekommt das gewählte Datum als Fälligkeit.
- **AC5:** Heute + ausgewählter Tag sind visuell hervorgehoben (Montag-first Grid).

## 2. Architektur
- `CalendarPanel` an Store gebunden (`ui.currentDate`, `setCurrentDate`, `setView`).
- `selectVisibleTasks` Case `calendar` filtert auf `isSameDay(dueDate, currentDate)`.
- `tasksOnDate` für Tages-Indikatoren; `App` setzt `dueDate = currentDate` beim Quick-Add.

## 3. Implementierung
- `src/components/CalendarPanel.tsx` (+ CSS), `src/selectors.ts`, `src/App.tsx`.

## 4. Testdesign
- TC1 Monat blättern, TC2 Tag klicken→Liste, TC3 Punkt-Indikator, TC4 Quick-Add datiert, TC5 Highlights.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

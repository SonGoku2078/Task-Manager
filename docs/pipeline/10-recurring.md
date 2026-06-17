# Feature 10 — Recurring Tasks (Daily/Weekly/Monthly)

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Wiederholung pro Aufgabe wählbar: keine / täglich / wöchentlich / monatlich.
- **AC2:** Beim Abhaken einer wiederkehrenden Aufgabe wird automatisch die nächste Instanz erzeugt (Fälligkeit um 1 Intervall verschoben).
- **AC3:** Optionales Enddatum — nach diesem wird keine neue Instanz mehr erzeugt.
- **AC4:** Wiederkehr-Indikator (🔁) in der Liste.

## 2. Architektur
- `nextRecurrence(date, type)` in `store.ts`; `toggleTask` spawnt neue Instanz bei `completing && recurrence !== 'none' && dueDate`.
- Enddatum-Guard: `!recurrenceEnd || nextDue <= recurrenceEnd`.
- Detail-Panel: Recurrence-Select + bedingtes Enddatum + Hinweistext.

## 3. Implementierung
- `src/store.ts`, `src/components/TaskDetailPanel.tsx`, `src/components/TaskList.tsx`.

## 4. Testdesign
- TC1 set recurrence, TC2 abhaken→neue Instanz mit +1 Intervall, TC3 Enddatum stoppt Spawn, TC4 🔁-Indikator.

## 5. Testausführung & Gate
- Build/Lint grün. Recurrence-Logik per Code-Review verifiziert. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

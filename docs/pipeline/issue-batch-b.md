# Batch B: Bug-Fixes (Issues #18, #17, #15)

| Feld | Wert |
|---|---|
| Status | done |
| Nächste Rolle | — |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-05 |

## 1. Requirements
- **#18**: Next Week zeigte eine erst am 26.7. fällige wiederkehrende Task in der aktuellen Woche.
- **#17**: Verlinkte (inaktive) Projekte fielen nach Reload aus ihren Sektionen.
- **#15**: Projekt aus Someday abschließen sprang zur Projekte-Ansicht.

## 2.–3. Diagnose & Fix
| Issue | Root Cause | Fix | Commit |
|---|---|---|---|
| #18 | `buildOccurrence` kopiert alle Felder — gespawnte Occurrence erbte `thisWeek`/`todayDate` und blieb dadurch in Next Week gepinnt | Occurrence startet ohne Wochen-/Tages-Commitments; Regressionstest-Assertion ergänzt | 2836676 |
| #17 | **Bereits behoben** durch #21-Fix (09214b2): `dropTaskOnTask`/`assignTaskSection` enqueuen sectionId+Reorder; gilt auch für Projekt-Referenzen | kein Code nötig — empirisch verifiziert (Drag → Server-sectionId → Reload → in Sektion) | — |
| #15 | Archive-Confirm wechselte pauschal `setView('projects')` | View-Wechsel nur noch außerhalb der Someday-Ansicht | 996bb24 |

Hinweis zu #18-Altdaten: bereits falsch gepinnte Occurrences in bestehenden DBs behalten ihr `thisWeek` — einmalig manuell entfernen (Klick auf 🗓️ Next Week im Task).

## 4. Testdesign
TC-M27 (auto, recurrence.test.ts), TC-M28, TC-M29 in `docs/testcases.json`.

## 5. Testausführung & Gate
- npm test 3/3 pass (inkl. neuer #18-Assertion), Builds pass.
- TC-M28/M29 per Playwright gegen Dev (:3002) verifiziert (Details in testcases.json).
- **GATE: GO**

## 6. CI/CD & Deployment
Commits auf master; Deploy nach Testreport-Approve durch User.

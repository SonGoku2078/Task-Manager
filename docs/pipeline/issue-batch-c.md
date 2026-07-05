# Batch C: Features (Issues #26, #9, #16, #14)

| Feld | Wert |
|---|---|
| Status | done |
| Nächste Rolle | — |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-06 |

## 1. Requirements
- **#26**: Tasks direkt in einer Sektion erstellen (nicht nur zuoberst).
- **#9**: Innerhalb eines Projekts nach Taskname suchen.
- **#16**: Kommentare mehrzeilig mit Editor (wie Notiz); bestehende Kommentare editierbar.
- **#14**: Mehrere Projekte selektieren und gemeinsam verschieben.

## 2.–3. Architektur & Implementierung
| Issue | Ansatz | Commit |
|---|---|---|
| #26 | Inline „+ Aufgabe"-Quick-Add am Ende jeder Sektion (`addTask` mit `sectionId` + Projekt) | 4facd2f (mit #9 zusammengefasst — Commit-Message-Panne, Inhalt korrekt) |
| #9 | Titel-Filterfeld in der FilterBar (auch eingeklappt), gebunden an `ui.searchQuery` — `selectVisibleTasks` wendet `matchesSearch` in jeder View an; `setView` resettet die Query automatisch | 4facd2f |
| #16 | Kommentar-Eingabe → Textarea + `DescToolbar` (Strg+Enter sendet), Anzeige als Markdown (GFM-Autolinks ersetzen renderWithLinks); neue Store-Action `updateComment` + ✎-Edit-Modus | f126026 |
| #14 | Ctrl-Selektion existierte; Drag bewegt jetzt die ganze Selektion (Reorder & Area-Zuordnung), reihenfolgeerhaltend | 9a201e3 |

## 4. Testdesign
TC-M30–TC-M33 in `docs/testcases.json`.

## 5. Testausführung & Gate
- Auto: npm test 3/3 pass, Builds Web/Server/Mobile pass (2026-07-06).
- Manuell: TC-M30–M33 Playwright-verifiziert gegen Dev (:3002) — Sektions-Task serverseitig persistiert, Filter live, Markdown-Kommentar + Edit im Server-JSON, Multi-Drag reihenfolgeerhaltend.
- **GATE: GO**

## 6. CI/CD & Deployment
Commits auf master; Deploy nach Testreport-Approve durch User.

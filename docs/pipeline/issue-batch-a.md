# Batch A: Quick-Fixes (Issues #2, #7, #12, #19, #10, #1)

| Feld | Wert |
|---|---|
| Status | implementation-done → Testausführung läuft |
| Nächste Rolle | test-manager |
| Owner-Rolle | developer |
| Datum | 2026-07-05 |

> Orchestrator-Log:
> - 2026-07-05 Sechs kleine UI-Fixes als Batch; Architektur-Stufe je Fix bewusst verkürzt (triviale Mini-Änderungen, Abkürzung hier dokumentiert).

## 1. Requirements (je Issue, ACs aus Issue-Text)
- **#2**: Zeilen-/Listenabstand in der gerenderten Markdown-Beschreibung kompakt (kein Scrollen wegen Leerraum).
- **#7**: Custom-Recurrence-Editor (mobil): Zahl nicht überdimensioniert, Einheit ohne horizontales Scrollen sichtbar.
- **#12**: Farbwahl im Projekt-Picker über die ganze Zeile (Punkt + Text), nicht nur den Punkt.
- **#19**: Suchseite ohne Quick-Add-Leiste.
- **#10**: Beim Verschieben innerhalb der Areas-Sektion grüner Drop-Indikator wie bei Projekten.
- **#1**: Subtask-Zeilen zeigen dieselbe Meta wie Haupttasks (Datum, ↻, ⏱, Flags, 💬, Kategorien; ohne Projekt-Chip).

## 2.–3. Architektur & Implementierung (verkürzt, je Fix)
| Issue | Ursache/Ansatz | Commit |
|---|---|---|
| #2 | `white-space: pre-wrap` auf gerendertem Markdown zeigte Quell-Newlines als Leerzeilen → `normal` + line-height 1.45 (TaskDetailPanel.css) | f3d1e64 |
| #7 | `m-field-row` ohne wrap/min-width:0 → Overflow; Zahlfeld auf 88px fixiert (`m-field-num`) | f582346 |
| #12 | onClick vom Swatch-Button auf die `projects-swatch-wrap`-Zeile gehoben | 721fee4 |
| #10 | Sektions-onDragOver überschrieb per-Item `overId`; jetzt yield bei `.projects-item`-Treffer. Zusatzbefund: Item-Drop bubbelte in Sektions-Drop und machte Projekte ungewollt zu Areas → stopPropagation | 721fee4 |
| #19 | Quick-Add-Render zusätzlich bei `currentView==='search'` unterdrückt (App.tsx) | baa1e11 |
| #1 | Meta-Zeile in `renderMeta(task, hideProject)` extrahiert; `renderChild` nutzt sie mit hideProject=true (TaskList.tsx) | 4cb4a30 |

## 4. Testdesign
Testfälle TC-M21–TC-M26 in `docs/testcases.json` registriert (Batch A); Auto-Regression TC-A01–A05 unverändert gültig.

## 5. Testausführung & Gate
- Auto: npm test 3/3 pass, Build Web+Server pass, Build Mobile pass (2026-07-05).
- Manuell: TC-M21–M26 — Ausführung folgt (Browser-Verifikation).

## 6. CI/CD & Deployment
Commits auf master (siehe Tabelle). Issues werden nach Testausführung geschlossen.

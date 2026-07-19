# UI — Soll und Ist nebeneinander im Task-Detail (#73, schließt #42)

| Feld | Wert |
|---|---|
| Status | done |
| Nächste Rolle | — (Web wirkt nach User-Deploy) |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-19 |

> Orchestrator-Log:
> - 2026-07-19 Kompakt-Pipeline (Abkürzung dokumentiert: kleine UI-Änderung, Requirements→Deployment in einem Durchlauf). Grill-Interview vorab, Entscheidungen vom User bestätigt.

## 1. Requirements

- **Issue:** [#73](https://github.com/SonGoku2078/Task-Manager/issues/73), AC1–AC6 dort.
- **Problem:** `⏱ Dauer` (geplant) stand in der Datumszeile, `🍅 Fokuszeit gesamt` (tatsächlich) als eigene Zeile darunter — der Soll/Ist-Bezug war nicht erkennbar und die eigene Zeile verbrauchte Höhe.
- **User-Entscheidungen (Grill):** vier Spalten `Fälligkeit | Uhrzeit | ⏱ Soll | 🍅 Ist`; Labels bewusst kurz (`Soll`/`Ist` statt `Dauer (Soll)`); nur Web/Desktop.
- **Vorab geklärt:** Die Fokuszeit war bereits editierbar (seit `9d4cdeb`, Teil von #47) — **#42 war faktisch erledigt, nur nie geschlossen**. Wurde mit diesem PR mitgeschlossen.

## 2./3. Architektur & Implementierung

- **Branch:** `feature/issue-73-soll-ist`, **PR** [#74](https://github.com/SonGoku2078/Task-Manager/pull/74) → `f15fa97`
- `TaskDetailPanel.tsx`: Fokuszeit-Feld aus der eigenen Zeile in die bestehende `.detail-row` verschoben; Labels `⏱ Soll` / `🍅 Ist`; Dauer-Tooltip präzisiert („Geplante Dauer"). Editier-Logik (parseDuration, Enter/Escape/Blur, leer = 0, `—`) unverändert.
- `TaskDetailPanel.css`: **Kern der Nacharbeit** — vier Spalten passen bei 320 px Panelbreite nicht nebeneinander. `flex-wrap: wrap` + `flex: 1 1 116px` + `min-width: 0` (auch auf Inputs, sonst blockiert die intrinsische Breite der Datums-/Zeit-Eingaben das Schrumpfen) → bricht sauber auf 2×2 um.

## 4./5. Test & Gate

Playwright gegen Vite-Dev `:5173` (kein `npm run build` im Live-Repo, da lokaler :3001 noch läuft), Testdaten per API aufgeräumt:

| Prüfung | Ergebnis |
|---|---|
| AC1 vier Spalten in einer Zeile, gleiche Y-Position; alte Labels weg | ✅ `Fälligkeit \| Uhrzeit \| ⏱ Soll \| 🍅 Ist`, tops `[835,835,835,835]` |
| AC2 Labels exakt `⏱ Soll` / `🍅 Ist` | ✅ |
| AC3 beide per Klick editierbar (45m / 1h 30m), Wert bleibt nach Escape | ✅ |
| AC4 `—` ohne Wert (beide) | ✅ |
| AC5 kein Überlauf bei 320 px | ✅ **nach CSS-Nacharbeit** (erster Wurf lief über) |
| AC6 Tooltips aussagekräftig | ✅ |
| Regression `npm test` / Lint | ✅ 9/9, Lint identisch zu master (0 neue) |

**13/13. GATE: GO.**

## 6. CI/CD & Deployment

- PR #74 squash-merged, CI grün; #73 **und** #42 automatisch geschlossen. Kein Release-Tag (Web wirkt nach User-Deploy via `npm run release`).

## Nebenbefund (eigenes Thema)

`Escape` in einem Eingabefeld des Detail-Panels schließt das **ganze Panel**, statt nur die Bearbeitung abzubrechen — ein globaler Tastatur-Handler (`src/App.tsx`, Escape → `selectTask(null)`) greift durch. Verifiziert als **Bestandsverhalten**: bei `Soll` (unverändertes altes Dauer-Feld) identisch wie bei `Ist`, also keine Regression aus #73. Kandidat für ein eigenes Issue.

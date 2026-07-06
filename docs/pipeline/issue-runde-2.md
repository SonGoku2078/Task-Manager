# Runde 2: Reopens + neue Issues (#13R, #7R, #28, #27, #29, #6-Close)

| Feld | Wert |
|---|---|
| Status | done |
| Nächste Rolle | — |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-06 |

## 1. Requirements / Diagnosen (Issue-Screenshots ausgewertet)
- **#13R**: User klickte das Heute-Pill im Detail-Panel bei 2 selektierten Tasks — wirkte nur auf die offene Task. Erwartung: Panel-Flags wirken auf die Auswahl.
- **#7R**: Es ging um das WEB-Panel (Runde 1 fixte nur Mobile): Zahlenfeld volle Breite, Einheit zerquetscht; gewünscht: alles einzeilig.
- **#28**: Hängender `drop-over`-Zustand der Sektion (Drop auf Zeile stoppt Propagation → `overSectionId` nie zurückgesetzt) → Sektion dauerhaft grün, Zeilen wirken selektiert.
- **#27**: Vorschau für PDF/Text/HTML/Excel/Word analog Bild-Lightbox (Beschluss: voll inkl. Excel/Word, lazy geladen).
- **#29**: PROD→DEV-Datenkopie per Knopf (Beschluss: nur DEV sichtbar, PROD read-only, Backup, Doppel-Bestätigung).
- **#6**: Reopen war versehentlich → wieder geschlossen.

## 2.–3. Fixes/Implementierung
| Issue | Fix | Commit |
|---|---|---|
| #28 | Row-`dragend`/`drop` räumen `overSectionId`; `section-body` bekam `dragleave` | deda1ba |
| #7R | `recur-row`: Select+„alle"+Zahl(64px fix)+Einheit einzeilig; Monatsmodus darunter | 14e3b53 |
| #13R | `bulkSelectedIds`-Prop → `applyFlag` nutzt `bulkUpdate` für ★/☀️/🗓️/🌥️/⏳; Hinweis-Banner | 14e3b53 |
| #27 | `AttachmentPreview` (PDF Blob-URL, Text UTF-8-`<pre>`, HTML/XLSX/DOCX sandboxed iframe); xlsx=SheetJS 0.20.3 CDN-Tarball (npm-`xlsx` hat offene CVEs), mammoth.browser; beide lazy als eigene Chunks | ac47e2e |
| #29 | `POST /api/admin/import-prod` (Guard, Temp-Kopie des Datei-Trios, `backupDb('pre-prod-import')`, Transaktion mit Quellspalten-Inserts); Settings-Sektion nur bei Port 3002 | aeecae2 |

## 4. Testdesign
TC-M37–TC-M41 in `docs/testcases.json` (M37/M39 als Regression markiert).

## 5. Testausführung & Gate
- Playwright gegen Dev: 14/14 Checks pass (Drag-State, Layout-Metriken, 4/4 Bulk-Flags serverseitig, alle 5 Vorschau-Typen inkl. XSS-Probe, Fallback).
- #29 Echtlauf: 972 Tasks = PROD-Zähler, PROD-mtime unverändert, Backup angelegt; Dev spiegelt jetzt PROD. Hinweis: 403-Guard auf PROD erst nach Release live testbar (Route dort noch nicht deployt) — Guard code-seitig doppelt (UI unsichtbar + Server 403).
- npm test 3/3, Builds Web/Server/Mobile pass. **GATE: GO**

## 6. CI/CD & Deployment
Commits auf master; Deploy nach Testreport-Approve durch User.

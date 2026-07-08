# Runde 5: #36 (Projekt löschen), #37 (Kommentare), #38 (Sektion-Sprung), #39 (Pomodoro), #40 (Kalender-Blocker)

| Feld | Wert |
|---|---|
| Status | done (Pomodoro-Ton = Gerätetest beim User) |
| Nächste Rolle | User (Web-Release) |
| Owner-Rolle | fullstack |
| Datum | 2026-07-08 |

## 1. Requirements
- **#36** Bug: Ein gelöschtes Projekt kippte seine Aufgaben in die Inbox. Löschen soll Projekt **und** Aufgaben entfernen. (Archivieren bleibt: Aufgaben werden als erledigt markiert.)
- **#37** Bug: Kommentare sollen absteigend (neueste zuerst) sortiert sein.
- **#38** Bug: Beim Klick auf einen aufgeklappten Sektions-Chip verdeckte die sticky Leiste die Tasks. Tasks der Sektion sollen sichtbar bleiben.
- **#39** Bug+Feature: Pomodoro-Umbau (pomofocus.io-Stil) — Ton am Ende, übersteht Refresh, optionales Ticken, Seitenpanel, Pomodoro pro Task aus Heute/Next-Week, Tages-Zusammenfassung, Mini-Timer→Panel.
- **#40** Feature: Blocker im Kalender per Maus aufziehen und danach ein Projekt (mit Wochen-Tasks) wählen — statt Formular.

## 2.–3. Architektur & Implementierung
| Issue | Ansatz | Dateien |
|---|---|---|
| #36 | Server-DELETE `/projects/:id`: `UPDATE tasks SET project_id=NULL` → `DELETE FROM tasks WHERE project_id=?` (+ `DELETE FROM sections WHERE scope=?`). Deckt sich mit dem Client-`deleteProject`. Outbox-Pfad `project.remove`. | `server/src/routes/projects.ts` |
| #37 | Anzeige-Sortierung: `[...comments].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))` vor dem Rendern. | `src/components/TaskDetailPanel.tsx` |
| #38 | Chip-`onClick`: statt `scrollIntoView({block:'start'})` manuell im `.task-list` scrollen und die Höhe der sticky `.section-index(-head)` abziehen (dynamisch gemessen, da die Leiste umbrechen kann). | `src/components/TaskList.tsx` |
| #40 | `WeekView`: `onMouseDown` auf `.week-col` (nur leerer Hintergrund) startet einen Drag → Vorschau-Rechteck (`yToMinutes`) → beim Loslassen Projekt-Popover (Wochen-Projekte = `blockerProjects`) → `addBlocker({weekdays:[weekdayIndex(day)],startMinutes,durationMin})`. Formular bleibt als Fallback. | `src/components/WeekView.tsx` + `.css` |
| #39 | Reine Phasenlogik `nextPomodoroPhase` (unit-getestet). Live-Timer + Tagesrunden in `localStorage` (`pomodoro:v1`, endsAt=Epoch → driftfreier Resume). Neue Actions `pomodoroSetPhase/StartForTask/SetTask`, `currentTaskId`, Auto-Start-Handling in `advance`. Sound-Modul (`pomodoroSound.ts`): Alarm + optionales Ticken (WebAudio, auf Start entsperrt). Seitenpanel `PomodoroPanel` (SidePanel-Union +`'pomodoro'`), Mini-Timer-Klick öffnet es. 🍅-Button pro Task in Heute/Next-Week. Settings: Ton/Ticken/Auto-Start (numerisch 1/0, in `NUMERIC_KEYS`). | `src/pomodoro.ts` (neu), `src/pomodoroSound.ts` (neu), `src/store.ts`, `src/types.ts`, `server/src/routes/settings.ts`, `src/components/PomodoroWidget.tsx`, `PomodoroPanel.tsx`/`.css` (neu), `TaskList.tsx`, `SettingsView.tsx`, `App.tsx` |

## 4. Testdesign
- Auto: TC-A08 (`scripts/pomodoro.test.ts`) — Phasenübergänge, Long-Break-Intervall, `focusCompleted`. In `npm test` + `run-tests.mjs`.
- Manuell/Playwright: TC-M55 (#36), TC-M56 (#37), TC-M57 (#38), TC-M58 (#40), TC-M59 (#39).

## 5. Testausführung & Gate
- **npm test 6/6** grün (inkl. Pomodoro-Logik). Builds Web/Server/Mobile ✓.
- **Playwright/API gegen Dev (:5173/:3002)** — alle grün:
  - #36 (API): Haupttask + Subtask nach Projekt-Delete weg, nicht in der Inbox; Projekt weg.
  - #37: zwei Kommentare → neuester steht oben.
  - #38: Sektions-Chip klicken → Beta-Kopf (354px) unter der Leisten-Unterkante (261px), erste Task nicht verdeckt.
  - #39: Timer läuft nach Reload weiter (localStorage/endsAt); Mini-Timer-Klick öffnet Panel (Tabs/Uhr); Phasen-Tab wechselt Phase; 🍅 an Task setzt aktuelle Aufgabe; abgeschlossener Fokus → Tagesrunden=1.
  - #40: Aufziehen zeigt Vorschau → Popover mit Wochen-Projekt (B40) → Blocker `weekdays=[1]`, `start=540`, `dur=120`.
- **GATE: GO für Code.** Der Pomodoro-**Ton/Ticken** ist WebAudio (autoplay-entsperrt beim Start) — die tatsächliche Hörbarkeit prüft der User am Gerät.

## 6. CI/CD & Deployment
Reine Web-Änderungen (+ Server). Kein Mobile-Tag nötig. Ein Commit pro Issue auf master; Web-Deploy durch den User via `npm run release` nach Freigabe auf der 🧪 Testreport-Seite.

## 6b. Nachtrag #39 — Zeiterfassung pro Aufgabe (2026-07-08)
Erweiterung des Pomodoro auf User-Wunsch:
- **Fokus-Zeit pro Aufgabe**: Segment-basierte Zurechnung (`focusSegmentStart` in `PomodoroState`), nur während laufender Fokus-Phase; Verrechnung an jedem Übergang (Pause/Phasenwechsel/Task-Wechsel/Reset).
- **Task-Wechsel im laufenden Slot ohne Reset**: `pomodoroStartForTask` wechselt bei laufendem Fokus nur die Aufgabe (Timer/`endsAt` unverändert), verbucht die bisherige Zeit auf die alte Aufgabe.
- **„Heute bearbeitet"-Liste** im Panel (`pomodoroTaskLog` = Tag→{taskId→Sek.}, localStorage); Klick übernimmt die Aufgabe als aktuelle (Wechsel bei laufendem Timer).
- **Gesamt-Fokuszeit (Lebensdauer)** dauerhaft als `tasks.focus_seconds` (Server, via `ensureColumns`-Migration) + Anzeige „🍅 Fokuszeit gesamt" im TaskDetail. Gilt in **Heute UND Next Week** (🍅 pro Task).
- Verifiziert: `npm test` (TC-A08 inkl. `fmtFocus`), Build Web/Server/Mobile, Playwright 13/13 (TC-M60). Ton-Auswahl (pomofocus) bleibt parkiert.

## 7. Nebenbefund (nicht gefixt)
`sectionsCollapsed`/`filtersCollapsed` werden als String ("true"/"false") vom Server zurückgegeben; `?? false` fängt nur null/undefined ab, sodass "false" truthy ist → die Sektionsleiste kann nach einem Reload fälschlich eingeklappt wirken. Kein Teil dieser Runde; als eigener Bool-als-String-Fix vorzumerken (analog zu den numerischen 1/0-Settings).

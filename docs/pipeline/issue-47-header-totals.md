# Feature: Total Aufwand pro Ansicht im Header (Issue #47)

| Feld | Wert |
|---|---|
| Status | testdesign-done |
| Nächste Rolle | /test-manager |
| Owner-Rolle | test-designer |
| Datum | 2026-07-16 |

> Orchestrator-Log:
> - 2026-07-16 Verständnis per /grill-me mit User erarbeitet und bestätigt; Artefakt angelegt → /req-engineer
> - 2026-07-16 requirements-done (ACs in Issue #47 kommentiert) → /architect
> - 2026-07-16 architecture-done (Selector + Header-Pill + Click-to-Edit-Fokuszeit) → /developer
> - 2026-07-16 implementation-done (Commit 7cc86ce auf feat/47-header-totals, Build+Tests grün) → /test-designer
> - 2026-07-16 testdesign-done (TC-A10 neu in npm test; TC-M64–66 in testcases.json) → /test-manager

## 0. Vorgaben (fix, per /grill-me bestätigt — nicht neu verhandeln)

- **Wo:** Kombinierter Pill im Header rechts neben dem Pomodoro-Widget (erweitert den Count-Pill, [src/App.tsx:492-493](../../src/App.tsx)) — **nur** in Inbox, Heute, Woche, Nächste Aktion, Nächste Woche, Projektansicht. Andere Views behalten den schlichten Task-Count.
- **Was:** `Anzahl · ⏱ geplant · 🍅 tatsächlich`, ausgeschriebene Details im Tooltip.
- **Zählbasis:** Exakt die sichtbaren Tasks (`selectVisibleTasks`, [src/selectors.ts:172](../../src/selectors.ts)) — FilterBar/Erledigt-Filter wirken direkt aufs Total.
- **Geplant:** Summe `durationMin` (Minuten); ohne Schätzung = 0.
- **Tatsächlich:** Summe `focusSeconds` (Sekunden), nur gebuchte Zeit — kein Live-Ticken bei laufendem Pomodoro.
- **Manuell überschreiben:** „🍅 Fokuszeit gesamt" im TaskDetailPanel wird editierbar (Syntax `30m`/`1h`/`1.5h`); Wert ersetzt `focusSeconds`, künftige Pomodoros addieren weiter. Server persistiert `focus_seconds` bereits.
- **Mobile:** Nie — reine Web-Funktion.
- **Defaults:** Ganze Minuten, Format wie `fmtFocus` („1h 15m"); Null-Segmente ausblenden (leere Liste ⇒ nur Anzahl).
- **Workflow:** Feature-Branch → PR auf master mit „Closes #47"; nur Dev/Test, Produktion (:3001/data.db) tabu.

## 1. Requirements

- **GitHub Issue:** [#47](https://github.com/SonGoku2078/Task-Manager/issues/47) — ACs als [Kommentar](https://github.com/SonGoku2078/Task-Manager/issues/47#issuecomment-4992099204) ergänzt (AC1–AC11).
- **Feature:** Total Aufwand (Anzahl · geplant · tatsächlich) pro Ansicht im Header, plus manuell editierbare Fokuszeit im Detail-Panel.
- **Nozbe-Referenz:** Nozbe Classic zeigt pro Liste ein Zeit-Total (Screenshots im Issue-Body).
- **Acceptance Criteria (Kurzfassung):** AC1/2 Scope-Views vs. Rest; AC3/4 Format + Tooltip; AC5–7 Berechnung = exakt sichtbare Tasks (durationMin, focusSeconds, Filter wirken); AC8–10 Fokuszeit manuell überschreibbar mit Dauer-Syntax, persistiert, Pomodoro addiert weiter; AC11 Mobile unverändert.
- **Technical Interfaces:** Input = `visibleTasks` (Ergebnis `selectVisibleTasks`) + `ui.currentView`; Output = Aggregat `{ count, plannedMin, actualMin }` für den Header-Pill. Fokuszeit-Edit läuft über bestehendes `task.update`-Patch-Feld `focusSeconds`.
- **Data Model:** Keine Schema-Änderung — nutzt bestehende Felder `durationMin` (min) und `focusSeconds` (sek, DB `focus_seconds`).
- **Plattform:** Nur Web-Frontend (React/Vite); Mobile explizit außen vor.

## 2. Architektur

### Aggregation (Datenschicht, unit-testbar)
Neuer purer Selector in [src/selectors.ts](../../src/selectors.ts):
```ts
export interface TaskTotals { count: number; plannedMin: number; actualMin: number }
export function selectTaskTotals(tasks: Task[]): TaskTotals
// plannedMin = Σ (durationMin ?? 0); actualMin = round(Σ (focusSeconds ?? 0) / 60)
```
Aufruf in App.tsx auf dem bestehenden `visibleTasks`-Ergebnis (Zeile ~287) → Zählbasis ist automatisch „exakt sichtbar" inkl. Filter/Suche (AC5–7). Kein Live-Ticken: `focusSeconds` ändert sich nur durch Buchung (`addTaskFocusTime`), der Header rerendert dann über den Store (AC6). Optional `useMemo` auf `[visibleTasks]` — bei üblichen Listengrößen unkritisch.

### Header-Pill (UI)
Scope-Konstante in App.tsx: `TOTALS_VIEWS: ReadonlySet<ViewType> = {'inbox','today','week','priority','nextweek','projects'}`. An der bestehenden Stelle [src/App.tsx:493](../../src/App.tsx) wird der `.task-count`-Span erweitert: in Scope-Views `<n> · ⏱ <geplant> · 🍅 <tatsächlich>` (Null-Segmente weglassen), sonst unverändert nur `<n>`. Tooltip via `title`: `«n Tasks · Geplant: … · Tatsächlich: …»` (AC4). Formatierung beider Zeiten über bestehendes `fmtFocus` ([src/pomodoro.ts:28](../../src/pomodoro.ts)) — geplant als `fmtFocus(plannedMin * 60)` → einheitlich „12 Min" / „1h 5m". CSS: nur `white-space: nowrap` für den erweiterten Pill in App.css, sonst bestehende `.task-count`-Optik.

### Fokuszeit manuell editierbar (Detail-Panel)
[TaskDetailPanel.tsx:787-794](../../src/components/TaskDetailPanel.tsx): Read-only-Anzeige wird zum Click-to-Edit-Feld nach dem **identischen Muster des ⏱ Dauer-Felds** (Zeilen 748-784): lokaler State `editingFocus`/`focusInput`, Eingabe via `parseDuration` ([src/duration.ts](../../src/duration.ts)), Speichern = `updateTask(task.id, { focusSeconds: min * 60 })`. Verhalten: leere Eingabe ⇒ 0 (Reset); ungültige Eingabe ⇒ keine Änderung (AC10). Das Feld wird **immer** angezeigt (bisher nur bei `> 0`), sonst wäre ein Erst-Setzen unmöglich; Anzeige `—` bei 0. Läuft gerade ein Pomodoro auf dem Task, addiert dessen nächste Buchung normal auf den neuen Wert (AC9) — gewollt.

### Schnittstellen & Persistenz
Kein Schema-/Server-Change: `task.update`-Patch transportiert `focusSeconds` bereits (server/src/routes/tasks.ts, Spalte `focus_seconds`). Mobile importiert `selectors.ts` zwar via Re-Export, nutzt den neuen Selector aber nicht → keine Mobile-Auswirkung (AC11).

### Trade-offs
- **Selector in selectors.ts statt Inline-Reduce in App.tsx:** minimal mehr Struktur, dafür unit-testbar und mobil wiederverwendbar, falls „Mobile nie" doch mal kippt.
- **`fmtFocus` für beide Zeiten statt `formatDuration`:** eine Formatlogik, konsistente Optik im Pill; `formatDuration` bleibt dem Dauer-Feld vorbehalten.
- **Kein Live-Ticken:** bewusst (Vorgabe) — spart Sekunden-Rerenders; laufende Zeit ist im Pomodoro-Widget daneben sichtbar.

## 3. Implementierung

- **Branch:** `feat/47-header-totals` · **Commit:** `7cc86ce`
- **Files Changed:**
  - [src/selectors.ts](../../src/selectors.ts) — `TaskTotals` + `selectTaskTotals` (pur, direkt nach `selectVisibleTasks`).
  - [src/App.tsx](../../src/App.tsx) — `TOTALS_VIEWS`-Set; Pill rendert in Scope-Views `n · ⏱ … · 🍅 …` mit Tooltip (`fmtFocus`, Null-Segmente ausgeblendet), sonst unverändert `n`.
  - [src/components/TaskDetailPanel.tsx](../../src/components/TaskDetailPanel.tsx) — Fokuszeit-Feld immer sichtbar, Click-to-Edit im Dauer-Feld-Muster; leer ⇒ 0, ungültig ⇒ verworfen; Vorbelegung in parseDuration-tauglicher Form (`45m`/`2h`/`1h 15m`), da `fmtFocus`-Labels („12 Min") nicht rund-trip-sicher sind.
  - [src/App.css](../../src/App.css) — `.task-count-totals { white-space: nowrap }`.
- **Abweichungen von der Architektur:** keine inhaltlichen; Enter im Fokuszeit-Feld delegiert per `blur()` an den Commit-Pfad statt Logik zu duplizieren.
- **Local Verification:**
  - [x] `tsc -b` + `vite build` grün.
  - [x] `npm test` — alle 7 Suiten PASS.
  - [x] Selector-Smoke: `[30m/90s, –, 60m/3630s]` ⇒ `{count:3, plannedMin:90, actualMin:62}`; leere Liste ⇒ `0/0/0`.
  - [ ] Browser-E2E gegen Dev → Stufe 5 (Test Manager).

## 4. Testdesign

### Teststrategie
Zwei Ebenen, dem Projektmuster folgend: (1) **Auto-Test** [scripts/totals.test.ts](../../scripts/totals.test.ts) (in `npm test` registriert) deckt die Berechnungslogik deterministisch ab — Summen, Rundung, Filter-Konsistenz über `selectVisibleTasks`, parseDuration-Round-trip der Prefill-Formate. (2) **Manuelle Playwright-Tests gegen Dev (:3002)** decken das Sichtbare ab — Pill-Rendering pro View, Tooltip, Click-to-Edit inkl. Server-Persistenz. Mobile braucht keinen eigenen Fall: AC11 ist durch Build-Regression TC-A05 + Mobile-Smoke TC-M19 abgedeckt (keine Mobile-Datei geändert).

### Testfälle (docs/testcases.json)
| ID | Typ | Deckt | Kern |
|---|---|---|---|
| TC-A10 | auto | AC5, AC6, AC7, AC10 | Summen (90/62 min), 119s→2min, Erledigt-Filter verkleinert Basis, Prefill-Round-trip, `abc`→null |
| TC-M64 | manuell | AC1–AC4 | Pill in allen 6 Scope-Views mit Format+Tooltip; plain Count in Kategorien/Kalender/Someday/Suche/Erledigt; Null-Segmente ausgeblendet |
| TC-M65 | manuell | AC5–AC7 | Filter/Suche/Erledigt-Toggle ändern alle 3 Werte synchron; 🍅 springt erst bei Pomodoro-Pause (kein Live-Ticken) |
| TC-M66 | manuell | AC8–AC10 | Fokuszeit setzen (1h 15m ⇒ 4500s serverseitig, Reload-fest), leer ⇒ 0, ungültig ⇒ unverändert, Header spiegelt |
| TC-A04 | auto (Regression) | — | `npm run build` (Web+Server) |
| TC-A05/TC-M19 | Regression | AC11 | Mobile-Build + Mobile-Smoke unverändert grün |

### Hinweise für den Test Manager
- Dev-Umgebung verwenden (`:3002`/`dev.db`), niemals `:3001`.
- Für TC-M65 (Pomodoro-Buchung) reicht: Pomodoro auf Task starten, nach ein paar Sekunden pausieren → 🍅-Total muss um die gebuchte Zeit steigen.
- TC-M66 prüft Persistenz am besten via `GET /api/tasks` (focusSeconds) nach Hard-Reload.

# Feature — Erledigt-Animation: Ausgrauen, Verschieben, Datum & Sortierung

| Feld | Wert |
|---|---|
| Status | gate-go |
| Nächste Rolle | /cicd-engineer |
| Owner-Rolle | test-manager |
| Datum | 2026-07-18 |

> Orchestrator-Log:
> - 2026-07-18 Grill-me-Interview abgeschlossen, alle Scope-Entscheidungen gefallen → Artefakt angelegt → /req-engineer. Issue #53.
> - 2026-07-18 requirements-done: Issue #53 bereinigt (Titel ohne „syncen") + AC1–AC9, Label `enhancement` → /architect.
> - 2026-07-18 architecture-done: Hold-Mechanik „virtuell offen" + FLIP entworfen, offene Punkte 1–3 + reduced-motion entschieden → /developer.
> - 2026-07-18 implementation-done: Branch `feature/issue-53-erledigt-animation`, Web-E2E-Smoke 16/17 (1 racy Timing-Sonde), Builds+Unit-Tests grün → /test-designer.
> - 2026-07-18 testdesign-done: 16 Testfälle (Web T1–T9, Mobile M1–M4, Regression R1–R3), Timing-Sonden als informativ markiert → /test-manager.
> - 2026-07-18 GATE: GO — Web 21/21, Mobile 11/11, Regression grün, 0 Defekte → /cicd-engineer.

## 0. Briefing (Ergebnis Grill-me-Interview, 2026-07-18)

**GitHub Issue:** [#53](https://github.com/SonGoku2078/Task-Manager/issues/53) — „Feat: Tasks syncen + und nach erledigt verschieben"

**Scope-Klärung:** Rein visuelles Feature — **kein Sync-Thema** (Issue-Titel irreführend; „syncen" gestrichen). Plattformen: **Web/Electron UND Mobile-App**.

**Entscheidungen des Users:**

1. **Abhaken-Ablauf:** Task wird sofort ausgegraut + durchgestrichen, bleibt **~0,5 s** an seiner Position, gleitet dann in **~0,4 s** flüssig nach unten in den „✓ Erledigt"-Block.
2. **Views ohne Erledigt-Bereich** (z. B. Priorität, wo erledigte Tasks ausgefiltert werden): ausgrauen, dann sanft rausgleiten/kollabieren statt schlagartig verschwinden.
3. **Undo:** Haken-Entfernen während Grau-Phase oder Gleiten bricht die Animation sofort ab; Task steht wieder normal an alter Position.
4. **„✓ Erledigt"-Block** (Überschrift + Zähler) überall einführen, wo erledigte Tasks sichtbar sind — auch in flachen Listen (bisher liegen sie dort unmarkiert unten).
5. **Erledigt-Datum nur im Erledigt-Bereich** anzeigen: Web hat die Anzeige „✓ <Datum>" bereits in der Meta-Zeile → auf den Erledigt-Kontext beschränken; Mobile hat keine Anzeige → neu einbauen.
6. **Sortierung absteigend nach `completedAt`** (neuestes zuerst) in allen Erledigt-Blöcken + der Erledigt-Ansicht (Sidebar). Mobile sortiert bereits so; Desktop nicht.

**Randnotizen:** Recurring-Tasks (nächste Instanz beim Abhaken) und Subtask-Auto-Complete bleiben unverändert; Animation läuft auf der abgehakten Zeile. Mobile braucht am Ende `mobile-v*`-Tag für APK-Release.

**Relevante Code-Stellen (Vorab-Analyse):** `src/store.ts:1154-1216` (toggleTask, setzt completed/completedAt sofort), `src/components/TaskList.tsx:475-485` (Checkbox) / `:808-818` (bestehender Erledigt-Block gruppierter Views), `src/components/TaskList.css:241/310-312` (nur Background-Transition; Ausgrauen ohne Animation), `src/selectors.ts:123-151/290-292` (Sortierung, completed ans Ende ohne Datums-Sort), `apps/mobile/src/selectors.ts:35-36` (Mobile sortiert bereits absteigend).

## 1. Requirements

- **GitHub Issue:** [#53](https://github.com/SonGoku2078/Task-Manager/issues/53) — Titel bereinigt zu „[FEATURE] Erledigte Tasks: ausgrauen, animiert in Erledigt-Block verschieben, Datum & Sortierung", Label `enhancement`. AC1–AC9 im Issue.
- **Feature:** Abhaken visuell nachvollziehbar machen (ausgrauen → gleiten in Erledigt-Block) + Erledigt-Block vereinheitlichen + Erledigt-Datum nur im Erledigt-Bereich + Sortierung absteigend nach Erledigt-Datum.
- **Nozbe-Referenz:** Nozbe blendet erledigte Tasks aus der aktiven Liste aus und führt sie in einer „Completed"-Ansicht mit Erledigt-Zeitpunkt (help.nozbe.com, „Completed tasks"). Unser Clone geht beim visuellen Feedback (Animation) bewusst über Nozbe hinaus — User-Entscheidung.

### Acceptance Criteria (Kopie aus Issue #53)

**Abhak-Animation**
- **AC1:** Abhaken in Ansicht mit Erledigt-Bereich → sofort ausgrauen + durchstreichen, ~0,5 s an Position, dann ~0,4 s flüssig nach unten in den „✓ Erledigt"-Block gleiten. Kein schlagartiges Verschwinden.
- **AC2:** Ansichten ohne erledigte Tasks (z. B. Priorität) → ~0,5 s ausgrauen, dann sanft rausgleiten/kollabieren.
- **AC3:** Haken-Entfernen während Grau-Phase/Gleiten → Animation bricht sofort ab, Task unverändert an alter Position.
- **AC4:** Mehrere Tasks schnell hintereinander abhaken → jede Zeile animiert unabhängig, kein Task geht verloren oder hängt im Grau-Zustand.

**Erledigt-Block**
- **AC5:** Jede Listenansicht mit sichtbaren erledigten Tasks hat unten einen „✓ Erledigt"-Block mit Überschrift + Zähler — auch flache Listen.

**Datum & Sortierung**
- **AC6:** Erledigt-Datum ausschließlich im Erledigt-Bereich (Block + Erledigt-Ansicht); in aktiven Listen kein Erledigt-Datum. Web: bestehende Meta-Anzeige beschränken; Mobile: Anzeige neu.
- **AC7:** Sortierung absteigend nach Erledigt-Datum (neuestes zuerst) in allen Erledigt-Blöcken + Erledigt-Ansicht, Web/Electron und Mobile.

**Plattformen & Regression**
- **AC8:** AC1–AC7 gelten auf Web, Electron und Android-App.
- **AC9:** Unverändert: Recurring-Tasks (nächste Instanz beim Abhaken), Subtask-Auto-Complete, Persistenz `completed`/`completedAt` (Outbox → Server).

### Technical Interfaces

- **Input:** Checkbox-Klick auf Task-Zeile (Web: `TaskList.tsx`; Mobile: `apps/mobile/src/components/*`); bestehende Store-Action `toggleTask(id)`.
- **Output/Verhalten:** Zwei-Phasen-Visualisierung (Grau-Phase → Positionswechsel) rein im Frontend; Datenfluss unverändert: `toggleTask` → Zustand-Store → Outbox (`task.update` mit `completed`, `completedAt`) → Server/SQLite.
- **Keine API-/Schema-Änderung:** `completedAt` existiert bereits in `src/types.ts` und `server` (`completed_at TEXT`).

### Data Model

Unverändert — vorhandene Felder genügen:
```json
{ "id": "…", "completed": true, "completedAt": "2026-07-18T14:32:00.000Z" }
```

### Browser-/Plattform-Anforderungen

- Web/Electron (gleiche Codebasis, React + Zustand), Android via Capacitor (eigene UI, geteilter Store).
- Animation mit CSS-Transitions/`transform`/`opacity` (GPU-freundlich, kein Layout-Thrash); muss bei schnellem Mehrfach-Abhaken stabil bleiben (AC4).
- **Empfehlung an Architekt (nicht vom User entschieden, Standard-A11y):** `prefers-reduced-motion` respektieren — bei reduzierter Bewegung Grau-Phase behalten, Gleiten durch harten Wechsel ersetzen. Entscheidung beim Architekten.

### Offene Punkte für den Architekten

1. Wo lebt der Zwei-Phasen-Zustand (Task bleibt 0,5 s „optisch aktiv", ist aber im Store schon `completed`)? Vorschlag-Richtung: UI-seitige „pending completion"-Liste statt Store-Delay, damit Persistenz/Recurring sofort laufen (AC9) und Undo trivial abbricht (AC3).
2. Technik für den Positionswechsel (FLIP-Animation vs. Höhe kollabieren + im Ziel einblenden) — einheitlich für AC1 und AC2.
3. Mobile: welche Komponenten in `apps/mobile/src/components` betroffen sind (Zeilen-Rendering, Erledigt-Listen).

## 2. Architektur

### Kernentscheidung 1 — Zwei-Phasen-Zustand: „Completion Hold" im UI-State, Task bleibt **virtuell offen**

Der Store bleibt die Wahrheit und flippt **sofort** (`toggleTask` unverändert: `completed`/`completedAt` setzen, Outbox, Recurring, Subtask-Auto-Complete → AC9). Zusätzlich bekommt der geteilte Zustand-Store (Web + Mobile nutzen `src/store.ts`) einen **nicht persistierten UI-Slice**:

```ts
// src/store.ts — neu (UI-only, nie in Outbox/Server)
completionHold: Record<string, 'hold' | 'exit'>;   // taskId → Phase
completionPulse: number;                            // ++ bei jedem Hold-Release (Trigger für FLIP)
completeTaskAnimated(id, releaseMode: 'move' | 'exit'): void;
// intern: Modul-Map holdTimers: Map<string, number> (setTimeout-Handles)
// Konstanten: COMPLETION_HOLD_MS = 500, COMPLETION_ANIM_MS = 400
```

Ablauf `completeTaskAnimated(id, mode)`:
1. `toggleTask(id)` — Persistenz/Recurring laufen sofort.
2. `completionHold[id] = 'hold'`; Timer 500 ms.
3. Nach 500 ms: bei `mode='move'` → Eintrag löschen + `completionPulse++` (Task sortiert sich in den Erledigt-Block um; FLIP animiert). Bei `mode='exit'` → Phase `'exit'`, weitere 400 ms (Zeile kollabiert), dann Eintrag löschen.
4. **Undo (AC3):** `toggleTask(id)` auf einen Task mit Hold-Eintrag (Wiedereröffnen) löscht Timer + Eintrag → Zeile ist sofort wieder normal, sie hat sich nie bewegt.

**Selektor-Trick (der Kern):** Neuer Helper in `src/selectors.ts`:

```ts
applyCompletionHold(tasks: Task[], hold: Record<string, Phase>): Task[]
// hält gehaltene Tasks als { ...t, completed: false } — „virtuell offen"
```

Angewendet am Listen-Einspeisepunkt (Web: vor `selectVisibleTasks` in `App.tsx`; Mobile: in den Listen-Komponenten vor den `mobile*`-Selektoren). Dadurch behandeln **alle** bestehenden Filter/Sortierer/Gruppierer den Task als offen → er bleibt exakt an seiner alten Position, in jeder View, ohne dass ein einziger Selektor angefasst wird. Die Zeile selbst liest `completionHold` für die Optik (grau + durchgestrichen + Haken). Views, in denen der Task offen sichtbar war, zeigen ihn auch gehalten (gleiche Prädikate) — kein Sonderfall nötig.

- Checkbox-Logik (Web `TaskList.tsx`, Mobile `TaskRow.tsx`): `checked = task.completed || isHolding`; onChange: `isHolding → toggleTask(id)` (Undo) · `!task.completed → completeTaskAnimated(id, mode)` · sonst `toggleTask(id)` (Reopen aus Erledigt-Block, ohne Animation).
- **Subtask-Checkboxen bleiben plain `toggleTask`** — Subtasks liegen unter ihrem Parent, es gibt keinen Ziel-Block; heutiges Verhalten (sofort grau an Ort) bleibt.
- AC4 (Mehrfach-Abhaken): jeder Task hat unabhängigen Map-Eintrag + Timer.
- Drag & Drop ist auf Zeilen mit Hold-Eintrag deaktiviert (Randfall-Absicherung).
- Recurring: die neue Instanz erscheint sofort, während die alte grau gehalten wird — gewollt (Fortschritt sichtbar).

### Kernentscheidung 2 — Positionswechsel per **FLIP** (move) + **Höhen-Kollaps** (exit)

- **`mode='move'`** (View zeigt Erledigte): Neuer Hook **`src/hooks/useListFlip.ts`** — `useListFlip(containerRef, pulse)`: misst bei jedem Render die `top`-Positionen aller `[data-flip-id]`-Elemente; wenn `completionPulse` sich geändert hat, wendet er für alle verschobenen Zeilen `translateY(alt−neu)` an und transitioniert in 0,4 s auf 0 (`transform`-only, GPU-freundlich). Matching per Task-ID, nicht DOM-Knoten → funktioniert auch, wenn die Zeile im Erledigt-Block neu gemountet wird. Auch die nachrückenden offenen Zeilen gleiten (kein Springen). FLIP läuft **nur** bei Pulse-Änderung — Drag-Reorder/Sortierwechsel bleiben unangetastet.
- **`mode='exit'`** (View blendet Erledigte aus, AC2): Während Phase `'exit'` bleibt die Zeile gerendert (virtuell offen) mit Klasse `is-exiting`: Höhe wird gemessen, als Inline-Höhe gesetzt, dann Transition auf `height: 0; opacity: 0` in 0,4 s; danach Hold-Eintrag weg → Unmount.
- **Verworfene Alternativen:** Store-Delay (completed erst nach 0,5 s setzen) — bricht AC9-Sofort-Persistenz und macht Undo/Recurring fummelig. `react-transition-group`/`framer-motion` — neue Dependency für einen Effekt, den ein ~60-Zeilen-FLIP-Hook leistet (Leitplanke „Einfachheit"). CSS-only ohne FLIP — kann Positionswechsel zwischen Listenbereichen nicht animieren.
- **`prefers-reduced-motion` (entschieden: ja):** Bei aktivierter Systemeinstellung entfallen Gleiten/Kollaps (harter Wechsel nach der Grau-Phase); die 0,5-s-Grau-Phase bleibt (informativ, keine Bewegung). Prüfung per `matchMedia` im Hook + CSS-`@media`.

### Mode-Zuordnung der Views

| Plattform | `move` (zeigt Erledigte → Block) | `exit` (blendet aus → Kollaps) |
|---|---|---|
| Web/Electron | Inbox, Projekte, Today, Next Week, Someday, Kalender, Suche, Erledigt-View | **Priorität** |
| Mobile | Heute (✓-Sektion), Woche (✓-Sektion) | Inbox, Next Action, Projekte, Suche |

Web ermittelt das als `viewShowsCompleted(currentView)` (Konstante in `selectors.ts`), Mobile setzt den Mode pro Listen-Komponente.

### Erledigt-Block vereinheitlichen (AC5)

- **Flache Listen** (`TaskList.tsx`, `!grouped`-Zweig): Split in offene/erledigte Zeilen; erledigte in denselben `.completed-section`-Block wie im grouped-Zweig (Header „✓ Erledigt" + Zähler). Gemeinsame Render-Funktion statt Copy-Paste.
- **Ausnahme Erledigt-View** (`currentView === 'completed'`): kein zusätzlicher Block (die View IST der Erledigt-Bereich); Zeilen gelten als „im Erledigt-Bereich".

### Datum & Sortierung (AC6/AC7)

- **Sortierung:** `selectVisibleTasks`-Endsplit (`selectors.ts:292`) wird zu `[...open, ...completed.sort(byCompletedAtDesc)]` (null-sicher, Fallback ans Ende) → wirkt global für flache Listen + Erledigt-View. Der grouped-Block sortiert seine `completedTasks` mit demselben exportierten Comparator `byCompletedAtDesc`. Mobile sortiert bereits.
- **Datum:** `renderMeta(task, …, inCompletedSection)` — `task-completed-at` („✓ 12. Juli 2026") nur noch bei `inCompletedSection === true` (Block + Erledigt-View). Mobile: `TaskRow` bekommt Prop `showCompletedDate` (nur von den ✓-Sektionen in Heute/Woche gesetzt) und rendert `✓ <Datum>` in `m-row-meta`.
- Während der Grau-Phase (virtuell offen, noch im aktiven Bereich) erscheint kein Datum — konsistent mit AC6.

### CSS (Web `TaskList.css`, Mobile `styles.css`)

- `.task-item`-Transition erweitern: `background 0.1s, opacity 0.2s ease` (Grau-Phase blendet weich ein statt hart).
- Neu: `.task-item.is-completing` (= Optik von `.is-completed`: opacity 0.55 + Titel durchgestrichen) für Hold/Exit-Phase; `.task-row.is-exiting { overflow: hidden; height/opacity-Transition 0.4s }`.
- FLIP-Zeilen: `will-change: transform` nur während der Animation (Hook setzt/entfernt).
- `@media (prefers-reduced-motion: reduce)` → Transitionen aus.
- Mobile analog: `.m-row.completing`, `.m-row.exiting`.

### Betroffene Dateien (Entwickler-Checkliste)

| Datei | Änderung |
|---|---|
| `src/store.ts` | `completionHold`/`completionPulse`/`completeTaskAnimated`, Cancel-Hook in `toggleTask`, Konstanten |
| `src/selectors.ts` | `applyCompletionHold`, `byCompletedAtDesc`, Endsplit-Sortierung, `viewShowsCompleted` |
| `src/App.tsx` | Hold auf Task-Feed anwenden, `viewShowsCompleted` an `TaskList` |
| `src/components/TaskList.tsx` | Checkbox-Logik, `data-flip-id`, Hold/Exit-Klassen, einheitlicher Erledigt-Block flach, Block-Sortierung, `inCompletedSection`-Datum, Drag-Sperre bei Hold |
| `src/components/TaskList.css` | Klassen/Transitions/reduced-motion s. o. |
| `src/hooks/useListFlip.ts` | **neu** — FLIP-Hook |
| `apps/mobile/src/components/TaskRow.tsx` | Checkbox-Logik, `completing/exiting`-Klassen, `showCompletedDate`, `data-flip-id` |
| `apps/mobile/src/components/{Today,NextWeek}.tsx` | Hold-Feed, `mode='move'`, FLIP-Hook, Datum-Prop an ✓-Sektion |
| `apps/mobile/src/components/{Inbox,NextAction,Projects,Search}.tsx` | Hold-Feed, `mode='exit'` |
| `apps/mobile/src/styles.css` | Mobile-Klassen/Transitions/reduced-motion |
| `apps/mobile/src/selectors.ts` | Re-Export `applyCompletionHold` |

Keine Schema-/API-/Server-Änderung. Kein neues Package.

## 3. Implementierung

- **Branch:** `feature/issue-53-erledigt-animation`
- **Commit:** `fda97f5` — 15 Dateien, +378/−55
- **Umsetzung exakt nach Architektur**, mit zwei dokumentierten Abweichungen:
  1. **`data-flip-id` + Exit-Kollaps liegen auf `.task-item`, nicht `.task-row`** — `.task-row` ist `display: contents` (TaskList.css:577) und hat damit keine messbare Box; FLIP/Kollaps auf dem Wrapper liefen ins Leere (im Smoke-Test entdeckt und gefixt). Expandierte Subtask-Container bekommen eine eigene Flip-ID (`<id>:subs`) und gleiten mit.
  2. **Mobile Suche unverändert** (Architektur sagte `exit`): Die Suche filtert Erledigte NICHT aus — ein `exit`-Kollaps wäre falsch (Task bliebe Treffer und würde wieder auftauchen). Default `move` ohne Bewegung ist dort korrekt.
- **Files Changed:** `src/store.ts` (Hold-Slice + `completeTaskAnimated` + Abbruch in `toggleTask`), `src/selectors.ts`, `src/App.tsx` (Hold-Feed), `src/components/TaskList.tsx` (+`TaskList.css`), **neu** `src/hooks/useListFlip.ts` (FLIP + `beginExitCollapse` + reduced-motion), `apps/mobile/src/{hooks.ts(neu),selectors.ts,styles.css}`, `apps/mobile/src/components/{TaskRow,Today,NextWeek,Inbox,NextAction,Projects}.tsx`
- **Local Verification:**
  - [x] `npm run build` (Web+Server-tsc) grün, `npm run build:mobile` grün
  - [x] `npm test` (8 Unit-Suiten) grün
  - [x] Lint: 0 neue Findings (5 Bestandsfehler in App.tsx, Zeilen 118–264, unverändert)
  - [x] Playwright-E2E gegen Dev :3002/dev.db (nie Prod): **16/17 Checks grün** — AC1 (Grau an Ort + Landung im Block), AC2 (Priorität: grau → kollabiert raus), AC3 (Undo während Hold), AC4 (2 schnelle Checks), AC5 (Block in flacher Inbox), AC6 (Datum nur im Block/Erledigt-View), AC7 (D>C>A absteigend). FLIP-Transition „transform 400ms" im Vorlauf nachgewiesen; die eine rote Sonde ist eine timing-sensitive Mid-Glide-Messung (racy, im Vorlauf grün) — kein Funktionsdefekt, Hinweis ans Testdesign.
  - [ ] Mobile-Runtime (dev:mobile :5174) — an Test Manager delegiert (Build + geteilter Store verifiziert)
- **Testdaten:** Smoke legt `SMK<rand>-A…E` an und räumt sie wieder ab (Cleanup verifiziert 0 Reste); Script liegt im Session-Scratchpad (`smoke-53.mjs`), wiederverwendbar für Stufe 5.

## 4. Testdesign

### Teststrategie

- **Automatisiert per Playwright (Chromium)** gegen die Dev-Umgebung — Web: Express-Dev-Server `127.0.0.1:3002` (dev.db, dient den frischen `npm run build`); Mobile: Vite-Dev `127.0.0.1:5174` (`npm run dev:mobile`) mit `tm-api-url` auf den Dev-Server. **Produktion (`:3001`/data.db) wird nie berührt.**
- **Zustands-Checks statt Pixel-Checks:** Animationen werden über Klassen (`is-completing`), DOM-Position (im/außerhalb `.completed-section`), Bounding-Box-Stabilität und Inline-Styles (`transition`) verifiziert — nicht über Screenshots.
- **Timing-Disziplin:** Feste Wartefenster aus den Konstanten (Hold 500 ms, Anim 400 ms): Asserts „während Hold" bei t≈150 ms, „nach Landung" bei t≥1100 ms. **Mid-Glide-Sonden (t≈670 ms) sind INFORMATIV** — racy per Konstruktion (Transition kann je nach Renderlast schon beendet sein); sie zählen nicht als Defekt, wenn Endzustand + eine frühere Glide-Beobachtung stimmen.
- **Unabhängigkeit:** Jeder Lauf nutzt eindeutige Titel (`SMK<rand>-…`) und räumt selbst auf; Reihenfolge der Fälle beliebig.
- **Browser-Matrix:** Chromium automatisiert (Pflicht-Gate); Firefox/Safari/Electron teilen dieselbe CSS-Transition/rAF-Basis → Sichtprüfung optional, kein Gate-Kriterium (Projektstandard seit #51).

### Web-Testfälle (Playwright, Basis: smoke-53.mjs erweitern)

| # | AC | Fall | Schritte (kondensiert) | Erwartung |
|---|----|------|------------------------|-----------|
| T1 | AC1 | Grau-Phase an Ort | Task in Inbox anlegen, abhaken, t≈150 ms | `.is-completing` gesetzt, Checkbox checked, y-Position unverändert (±2 px), nicht im `.completed-section` |
| T2 | AC1 | Landung im Block | weiter warten bis t≥1100 ms | Zeile im `.completed-section`, `.is-completed`, nicht mehr `.is-completing` |
| T2i | AC1 | Glide aktiv *(informativ)* | t≈670 ms | Inline-`transition`/`transform` auf `.task-item` gesetzt |
| T3 | AC3 | Undo in Grau-Phase | abhaken, bei t≈150 ms erneut klicken, bis t≥1100 ms warten | Zeile offen an alter Position, kein Datum, nicht im Block, Checkbox leer |
| T3b | AC3 | Undo in Gleit-Phase | abhaken, bei t≈650 ms (nach Release, während Anim) erneut klicken | Task wieder offen; keine Zombie-Klassen; Position normal (Task war schon im Block → kehrt in offenen Bereich zurück) |
| T4 | AC4 | 3 Tasks schnell hintereinander (<150 ms Abstand) | alle 3 abhaken, t≥1400 ms | alle 3 im Block, keiner hängt in `.is-completing` |
| T5 | AC5 | Block in flacher Liste | Inbox mit ≥1 erledigtem Task | `.completed-section` mit Header „✓ Erledigt" + Zähler |
| T6 | AC6 | Datum nur im Erledigt-Bereich | offene Zeile + Block-Zeile + Erledigt-View prüfen | `.task-completed-at` NUR im Block und in der Erledigt-View; Erledigt-View ohne eigenen Block |
| T7 | AC7 | Sortierung | A, dann C, dann D abhaken | Block-Reihenfolge D > C > A (neueste zuerst); gleiche Ordnung in Erledigt-View |
| T8 | AC2 | Exit in „Nächste Aktion" | Task ★ markieren, in Priorität abhaken | t≈150 ms: grau an Ort; t≥1000 ms: aus Liste verschwunden (kein `.completed-section`-Eintrag in dieser View) |
| T9 | AC9 | Recurring + Subtasks + Reopen | (a) Recurring-Task (täglich, fällig heute) abhaken: neue Instanz erscheint sofort, alte grau gehalten, landet im Block. (b) Subtask-Checkbox im aufgeklappten Parent: sofort grau, KEIN Hold/Move (Verhalten wie bisher). (c) Erledigten Task im Block abhaken (reopen): sofort zurück in offenen Bereich, ohne Animation | wie beschrieben; Parent-Abhaken hakt Subtasks mit ab |

### Mobile-Testfälle (Playwright gegen :5174, `tm-api-url` = Dev :3002)

| # | Fall | Erwartung |
|---|------|-----------|
| M1 | Heute-Tab: Task mit Heute-Flag/fällig heute abhaken | grau an Ort (`.m-row.completing`), nach t≥1100 ms in „✓ Heute erledigt" mit `✓ <Datum>` (`.m-row-doneat`), absteigend sortiert |
| M2 | Inbox-Tab: Task abhaken | grau an Ort, dann Kollaps raus (Zeile weg nach t≥1000 ms), taucht NICHT wieder auf |
| M3 | Undo in Grau-Phase (beliebiger Tab) | Zeile normal, Checkbox leer, bleibt in Liste |
| M4 | Woche-Tab: „✓ Erledigt (letzte 7 Tage)" | frisch erledigter Task erscheint dort mit Datum, neueste zuerst |

### Regression (Pflicht vor Gate)

| # | Prüfung | Erwartung |
|---|---------|-----------|
| R1 | `npm test` (8 Unit-Suiten) + `npm run lint` | Tests grün; Lint: keine NEUEN Findings ggü. Bestand (5 Alt-Fehler App.tsx) |
| R2 | `npm run build` + `npm run build:mobile` | beide grün |
| R3 | Persistenz: nach T2 via API `GET :3002/api/tasks` | Task hat `completed=true` + `completed_at` gesetzt; nach T3-Undo `completed=false`/`completed_at` null — Outbox→Server-Roundtrip intakt |

### Nozbe-Vergleich

Nozbe entfernt Erledigte aus aktiven Listen und führt sie in „Completed" mit Zeitpunkt — unser Erledigt-Block + Erledigt-View entsprechen dem; die Animation ist eine bewusste, vom User beauftragte Erweiterung (Abschnitt 0). Kein 1:1-Pixel-Vergleich erforderlich.

### Nicht-Gate-Kriterien (dokumentieren, nicht blocken)

- T2i/Mid-Glide-Sonden (racy).
- `prefers-reduced-motion` (Sichtprüfung wünschenswert; CSS/JS-Guards vorhanden).
- APK-Optik auf echtem Gerät → User-Nachtest nach Release (wie #51).

## 5. Testausführung & Gate

Ausführung 2026-07-18, Playwright/Chromium, ausschließlich Dev-Umgebung (Web: Express :3002/dev.db mit frischem Build; Mobile: Vite :5174 → API :3002). Produktion (:3001) unberührt. Scripts: `t53-web.mjs`, `t53-mobile.mjs` (Session-Scratchpad); alle Testdaten mit eindeutigem Präfix, Pre-/Post-Cleanup verifiziert (0 Reste auf dem Server).

### Web (T1–T9 + R3): **21/21 PASS** ✅

| Fall | Ergebnis | Evidenz |
|---|---|---|
| T1 Grau-Phase an Ort | ✅ | `is-completing` + checked bei t≈150 ms, y-Position 519.5→519.5, nicht im Block |
| T2 Landung im Block | ✅ | im `.completed-section`, kein `is-completing`-Rest |
| T2i Glide-Sonde *(informativ)* | ✅ | Inline `transition: transform 400ms` mid-flight beobachtet |
| T3 Undo Grau-Phase | ✅ | offen, unchecked, kein Datum |
| T3b Undo Gleit-Phase | ✅ | einzelne offene Zeile zurück im offenen Bereich, keine Zombie-Klassen |
| T4 3× schnell abhaken | ✅ | alle 3 im Block, 0 hängende `is-completing` |
| T5 Block in flacher Liste | ✅ | Header „✓ Erledigt" + Zähler in Inbox |
| T6 Datum nur im Erledigt-Bereich | ✅ | Datum im Block ✓, offene Zeile ohne Datum ✓ |
| T7 Sortierung | ✅ | Block-Ordnung G > D > C > A (neueste zuerst) |
| T8 Exit in Priorität | ✅ | grau an Ort → nach Animation aus Liste verschwunden |
| T9a Recurring | ✅ | Original grau gehalten → im Block; neue Instanz sofort offen (block=1, total=2) |
| T9b Subtask | ✅ | sofort `is-completed`, kein Hold, bleibt unter Parent |
| T9c Reopen aus Block | ✅ | sofort zurück im offenen Bereich, unchecked |
| R3 Persistenz | ✅ | API: erledigt → `completed=true` + `completedAt` ISO-Zeitstempel; Undo → `false`/null |

### Mobile (M1–M4): **11/11 PASS** ✅

| Fall | Ergebnis | Evidenz |
|---|---|---|
| M1 Heute: move + Datum | ✅ | `.completing` an Ort → „✓ Heute erledigt" mit `✓ <Datum>`; kein Datum außerhalb Done-Gruppen |
| M2 Inbox: exit | ✅ | grau an Ort → Zeile nach Animation weg |
| M3 Undo Grau-Phase | ✅ | Zeile bleibt, unchecked, nicht grau |
| M4 Woche: Done-Gruppe | ✅ | beide Tasks in „✓ Erledigt (letzte 7 Tage)", neueste zuerst, mit Datum |

### Regression (R1–R2): PASS ✅

- `npm test`: 8/8 Unit-Suiten grün. Builds: `npm run build` + `npm run build:mobile` grün.
- Lint: **identische 34 Bestandsprobleme auf master und Feature-Branch** (gleiche Dateien/Zeilen, u. a. App.tsx 118–264, DescToolbar, TaskDetailModal) — **0 neue Findings**; keine der geänderten Dateien im Fehlerbericht.

### Defekte

Keine. (Zwei Fehlläufe während der Ausführung waren Test-Infrastrukturfehler, keine Produktdefekte: (1) Detail-Panel war nach Quick-Add bereits offen → Klick schloss es wieder — Script prüft jetzt den Panel-Zustand; (2) Mobile-Datumszählung verglich gegen falsche Referenz bei Alt-Testdaten — Assertion korrigiert auf „kein Datum außerhalb `.m-group-done`".)

### Nozbe-Vergleich

Erledigt-Verhalten (aus aktiver Liste in Erledigt-Bereich mit Zeitpunkt) entspricht Nozbe; Animation ist beauftragte Erweiterung. ✅

### Quality Gate Decision

**GATE: GO** — alle gate-relevanten Tests grün (Web 21/21, Mobile 11/11, Regression vollständig), 0 Defekte.
Offen (nicht blockierend): Sichtprüfung `prefers-reduced-motion`, APK-Optik auf echtem Gerät nach Release (User-Nachtest).
Nächste Rolle: `/cicd-engineer`.

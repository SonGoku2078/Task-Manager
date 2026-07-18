# Feature — Erledigt-Animation: Ausgrauen, Verschieben, Datum & Sortierung

| Feld | Wert |
|---|---|
| Status | implementation-done |
| Nächste Rolle | /test-designer |
| Owner-Rolle | developer |
| Datum | 2026-07-18 |

> Orchestrator-Log:
> - 2026-07-18 Grill-me-Interview abgeschlossen, alle Scope-Entscheidungen gefallen → Artefakt angelegt → /req-engineer. Issue #53.
> - 2026-07-18 requirements-done: Issue #53 bereinigt (Titel ohne „syncen") + AC1–AC9, Label `enhancement` → /architect.
> - 2026-07-18 architecture-done: Hold-Mechanik „virtuell offen" + FLIP entworfen, offene Punkte 1–3 + reduced-motion entschieden → /developer.
> - 2026-07-18 implementation-done: Branch `feature/issue-53-erledigt-animation`, Web-E2E-Smoke 16/17 (1 racy Timing-Sonde), Builds+Unit-Tests grün → /test-designer.

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

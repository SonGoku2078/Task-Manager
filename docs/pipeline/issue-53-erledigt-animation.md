# Feature — Erledigt-Animation: Ausgrauen, Verschieben, Datum & Sortierung

| Feld | Wert |
|---|---|
| Status | requirements-done |
| Nächste Rolle | /architect |
| Owner-Rolle | req-engineer |
| Datum | 2026-07-18 |

> Orchestrator-Log:
> - 2026-07-18 Grill-me-Interview abgeschlossen, alle Scope-Entscheidungen gefallen → Artefakt angelegt → /req-engineer. Issue #53.
> - 2026-07-18 requirements-done: Issue #53 bereinigt (Titel ohne „syncen") + AC1–AC9, Label `enhancement` → /architect.

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

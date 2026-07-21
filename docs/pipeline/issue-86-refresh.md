# Feature — Refresh-Button + Auto-Refresh für Desktop/Web (#86)

| Feld | Wert |
|---|---|
| Status | done (Wirkung auf Prod nach User-Deploy) |
| Nächste Rolle | — (User: `npm run release`) |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-21 |

> Orchestrator-Log:
> - 2026-07-21 Kompakt-Pipeline nach Grill-Interview (4 Entscheidungen). PR #87 → `063e445`.

## 1. Requirements & Ursache

- **Issue:** [#86](https://github.com/SonGoku2078/Task-Manager/issues/86), AC1–AC7.
- **Symptom:** Handy-Änderungen erschienen in der Windows-App erst nach Schließen/Öffnen.
- **Ursache (verifiziert):** Die Sync-Schleife in `App.tsx` rief `loadAll()` nur bei `!dataLoaded` und schob danach nur noch die Outbox hoch (Push), zog aber nie wieder vom Server (Pull). Nach dem ersten Load blieben Fremdänderungen unsichtbar bis zum Neustart. Der fehlende Button war nur das Symptom.

## 2./3. Architektur & Implementierung

- **`src/useServerSync.ts` (neu):** ersetzt die Schleife. Health-Poll (15 s) + erster Load wie bisher; NEU: Hintergrund-Takt (60 s), Fokus-/`visibilitychange`-Load, manueller `refresh()`. Wächter `isEditing()` pausiert nur den periodischen Takt, solange ein Eingabefeld/Detail-Panel aktiv ist (AC4); Button und Fokus-Load ignorieren das bewusst. `loadAll` flusht zuerst die Outbox → Push vor Pull (AC5). `loading`-Ref verhindert überlappende Ladevorgänge.
- **`App.tsx`:** alte Effekt-Schleife entfernt, Hook eingebunden; ↻-Button im `task-header-right` mit Zuständen refreshing/done/error, sichtbar in Desktop + Browser. + `App.css` (Spin-Animation, `prefers-reduced-motion`).

## 4./5. Test & Gate

| Prüfung | Ergebnis |
|---|---|
| Hauptfälle (Playwright, Vite-Dev + Dev-Backend) | ✅ **10/10** — Button da; fremde Änderung per Button ohne Reload sichtbar (AC1); `visibilitychange` lädt automatisch (AC2); lokaler Task überlebt Refresh + wird gepusht (AC5); Fehlerfall am Button ehrlich, App bedienbar (AC6) |
| AC4 Takt-Pause beim Tippen | ✅ **3/3** — läuft ohne Eingabe, pausiert bei fokussiertem Feld, läuft nach Fokusverlust wieder |
| Regression | ✅ `npm test` 10/10, TypeScript sauber, Lint: neue Datei 0 Findings, App.tsx einer weniger (alte Schleife raus) |

**GATE: GO.**

## 6. CI/CD & Deployment

- PR [#87](https://github.com/SonGoku2078/Task-Manager/pull/87) squash-merged → `063e445`, CI grün, #86 geschlossen. Kein Release-Tag.
- Desktop = Thin Client → erbt es beim nächsten Laden vom Server, **kein EXE-Build nötig**. Wirkt auf Prod nach `npm run release`.

# Feature 13 — Keyboard Shortcuts (Basic)

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** `n` fokussiert das Quick-Add-Feld (neue Aufgabe).
- **AC2:** `/` öffnet die Suche.
- **AC3:** `Esc` schließt das Detail-Panel bzw. verlässt das fokussierte Feld.
- **AC4:** `Delete` löscht die ausgewählte Aufgabe.
- **AC5:** `Enter` legt aus Quick-Add eine Aufgabe an (bereits in F1/F2).
- **AC6:** Shortcuts feuern nicht, während in Eingabefeldern getippt wird.

## 2. Architektur
- Globaler `keydown`-Listener in `App` (useEffect), liest aktuellen State via `useStore.getState()` um Stale-Closures zu vermeiden.
- Guard gegen INPUT/TEXTAREA/SELECT/contentEditable.

## 3. Implementierung
- `src/App.tsx` (Listener + Quick-Add-Ref).

## 4. Testdesign
- TC1 n→Fokus, TC2 /→Suche, TC3 Esc→Panel zu, TC4 Del→Löschen, TC6 kein Trigger beim Tippen.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

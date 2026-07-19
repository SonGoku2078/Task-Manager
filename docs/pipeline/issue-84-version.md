# Bug — Web-Version zeigte „unbekannt", Deploy nannte irreführende Version (#84)

| Feld | Wert |
|---|---|
| Status | done (Wirkung auf Prod beim nächsten Deploy) |
| Nächste Rolle | — (User: `npm run release`, dann AC1 nachprüfen) |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-19 |

> Orchestrator-Log:
> - 2026-07-19 Kompakt-Pipeline nach Grill-Interview (4 Entscheidungen). PR #85 → `3e75786`.

## 1. Requirements & Ursachen

- **Issue:** [#84](https://github.com/SonGoku2078/Task-Manager/issues/84), AC1–AC8.
- **Ursache „unbekannt":** Der Prod-Build läuft **im Docker-Container** ohne Git-Repo → `git describe` schlug fehl, der Fallback `'unbekannt'` griff. Die Versionsanzeige aus #56 war auf Prod damit wirkungslos.
- **Ursache irreführende Deploy-Zeile:** `git describe` ohne `--match` nimmt den neuesten Tag überhaupt — zuletzt `desktop-v1.3.0`. Es sah aus, als liefe die Desktop-Version im Browser.
- **Einschränkung:** `Dockerfile`/`docker-compose.yml` liegen auf dem Server, nicht im Repo — die Lösung durfte sie nicht voraussetzen.

## 2./3. Architektur & Implementierung

- **Versionsquelle mit Reihenfolge** (`vite.config.ts`): `VITE_APP_VERSION` > `.version`-Datei > `git describe --match "v*"` > `'unbekannt'`. Das Deploy-Skript schreibt `.version` vor dem Build in den Checkout — ohne Eingriff in Dockerfile/compose. `.version` ist gitignoriert.
- **Meta-Tag** `<meta name="app-version">` in der `index.html` (kleines Vite-Plugin): Damit ist die **ausgelieferte** Version ohne JavaScript abfragbar — die Grundlage für die Live-Prüfung.
- **`scripts/release-remote.ps1`**: erfasst Version vorher/nachher (`--match "v*"`), schreibt `.version`, liest nach dem Neustart den Meta-Tag der ausgelieferten Seite.
- **`scripts/deploy-summary.ps1`**: `Version: … -> … (NEU)` bzw. `(unveraendert)`, dazu `Live: … (ausgeliefert)`; weicht die Live-Version vom gebauten Stand ab, erscheint eine deutliche Warnung.
- **Einstellungen** (`SettingsView.tsx`, neue Komponente `VersionSection`): laufende Version (Web; zusätzlich Desktop-EXE über die Bridge aus #62 — neu `tm.getAppVersion()`) plus zuletzt veröffentlichte Desktop-/Android-Version aus den GitHub-Releases (`src/version.ts`, `fetchReleasedVersions`).

## 4./5. Test & Gate

| Prüfung | Ergebnis |
|---|---|
| Oberfläche (Playwright, Vite-Dev) | ✅ **9/9** — echte Version statt `unbekannt`, Format `v0.2.9-…` ohne Desktop-Prefix, veröffentlichte Versionen `desktop-v1.3.0`/`mobile-v0.5.13`, Hinweis zur installierten Handy-Version, **offline neutraler Platzhalter statt Fehler**, Server-Zeile unverändert |
| Deploy-Logik (`npm run test:deploy`) | ✅ **31/31** — vorher→nachher, NEU/unverändert, Live-Version, Warnung bei Abweichung, ehrlicher Hinweis wenn nicht ermittelbar |
| `.version`-Vorrang am echten Build | ✅ Datei gewinnt; ohne Datei wieder `git describe` |
| Regression | ✅ `npm test` 10/10, TypeScript (Web + Electron), Lint ohne Findings |

**GATE: GO.**

Stolperstein unterwegs: Ein `<<` in einer PowerShell-Ausgabezeile machte die Datei unparsbar (`<` ist dort ein reservierter Operator) — ersetzt, Datei ist wieder ASCII-rein, Parser-Prüfung ergänzt.

## 6. CI/CD & Deployment

- PR [#85](https://github.com/SonGoku2078/Task-Manager/pull/85) squash-merged → `3e75786`, CI grün, #84 geschlossen. Kein Release-Tag nötig.

## Offene Unbekannte (bewusst benannt)

Ob die `.version`-Datei im Docker-Build ankommt, hängt vom **Build-Kontext der serverseitigen Dockerfile** ab, die ich nicht einsehen kann. **Entscheidet sich beim nächsten `npm run release`:** Steht in der Deploy-Zusammenfassung unter `Live` eine echte Version, hat es geklappt (AC1 erfüllt). Falls dort weiterhin nichts oder `unbekannt` steht, ist der dokumentierte Fallback ein Build-Argument in `docker-compose.yml`/`Dockerfile` — die zwei Zeilen liefere ich dann nach.

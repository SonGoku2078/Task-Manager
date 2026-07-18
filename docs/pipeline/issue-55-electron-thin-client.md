# Bugfix — Windows-App startet nicht (Electron → Thin Client)

| Feld | Wert |
|---|---|
| Status | done |
| Nächste Rolle | — (User: neue EXE installieren) |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-18 |

> Orchestrator-Log:
> - 2026-07-18 Kompakt-Pipeline (Abkürzung dokumentiert): Grill-Interview + Explore-Diagnose + Plan-Mode-Freigabe durch User; Requirements/Architektur/Implementierung/Test in einem Durchlauf. Issue #55.

## 1. Requirements & Diagnose

- **GitHub Issue:** [#55](https://github.com/SonGoku2078/Task-Manager/issues/55) — „Windows App startet nicht": Klick aufs Icon → kurz Sanduhr, dann nichts. App hat **nie** funktioniert; Prod-Server (:3001) läuft beim User immer parallel.
- **Root Cause (verifiziert):** Die gepackte App startete einen **eigenen** Express-Server in-process, hart auf **Port 3001** und ohne `DB_FILE` → **dieselbe `data.db` wie Prod** (löschte beim Start sogar dessen DB-Lock, `db.ts:162-170`). `app.listen` hatte keinen Error-Handler (`server/src/index.ts:87`) → asynchrones `EADDRINUSE` = uncaught exception → Prozess stirbt **vor** `createWindow()`. Dazu: kein Single-Instance-Lock, kein Logging, Bundle seit 25.06. nicht neu gebaut (keine CI baut Electron).
- **User-Entscheidungen (Grill-Interview):** (1) App wird **Thin Client** — Fenster zum laufenden Prod-Server, kein eigener Server/keine eigene DB; (2) Server offline → **Hinweisseite + Auto-Retry**; (3) Härtung: EADDRINUSE-Handler im Server, Single-Instance-Lock, Startup-Logdatei.

## 2./3. Architektur & Implementierung

- **Branch:** `fix/issue-55-electron-thin-client`
- `electron/src/main.ts` (+ regeneriertes `main.js`): kompletter Thin-Client-Umbau. Ziel `http://127.0.0.1:<PORT>` (127.0.0.1 statt localhost — ::1-Falle Win11); `PORT = TM_DESKTOP_PORT || (isPackaged ? 3001 : 5173)`. Health-Check (1,5 s Timeout) → laden oder `fallback.html` + 2-s-Polling mit Auto-Umschalten; `did-fail-load`-Handler (gefiltert) → zurück zur Hinweisseite statt weißem Fenster; `requestSingleInstanceLock` (2. Start fokussiert Fenster); `uncaughtException` → `userData/startup.log` + Fehlerdialog; `TM_USER_DATA_DIR` für Test-Isolation; Timer-Guards gegen Poll-nach-Close.
- `electron/fallback.html` (**neu**): deutsche Hinweisseite („Server nicht erreichbar — starte ihn mit `npm run prod`…", Spinner, zeigt Ziel-URL).
- `electron/package.json`: `extraResources` (Server + node_modules + SPA) komplett entfernt → Installer schrumpft von ~x00 MB Ressourcen auf app.asar; Build-Script auf `tsc && electron-builder` (nutzt strict-tsconfig); Version **1.1.0**. `electron/tsconfig.json`: explizites `exclude` (outDir-`.`-Falle).
- Root `package.json`: `build:electron` ohne Root-Build (EXE hat keine Inputs mehr aus `src/`/`server/` → Kommando im Live-Repo ungefährlich).
- `server/src/index.ts`: `server.on('error')` — `EADDRINUSE` → klare Meldung + `process.exit(1)` statt Crash. (Wirkt auf Prod erst nach User-Deploy.)
- **Bekannte Rest-Gefahr** (separates Thema): `db.ts` löscht beim Doppelstart des Standalone-Servers weiterhin das Lock des laufenden Prozesses, bevor `listen` scheitert — Port-Preflight wäre ein eigenes Issue.

## 4./5. Testdesign, Ausführung & Gate

`scripts/e2e-desktop.mjs` (**neu**, Playwright `_electron`, committtet; Dev-Backend :3002 aus Quelle, Wegwerf-Server via tsx + `DB_PATH` im Temp — Prod nie berührt). Stolperstein behoben: VS-Code-Terminals vererben `ELECTRON_RUN_AS_NODE=1` → wird im Script gestrippt, sonst läuft electron.exe als nacktes Node.

| Test | Ergebnis |
|---|---|
| A: `TM_DESKTOP_PORT=3002` → Fenster lädt Dev-UI (`waitForURL` + `.quick-add-input`) | ✅ |
| B1: toter Port 3999 → Hinweisseite „Server nicht erreichbar" | ✅ |
| B2: Wegwerf-Server auf 3999 startet → App lädt automatisch um (≤25 s) | ✅ |
| C: zweiter Server auf belegtem Port → saubere Meldung „bereits belegt", Prozess endet (Exit-Code auf Win durch cmd/tsx-Kette verfälscht; Meldung stammt nachweislich aus dem neuen Handler) | ✅ |
| Regression: `npm test` 8/8, Lint auf geänderten Dateien 0 Findings | ✅ |

**GATE: GO.** Packaged-Smoke nach dem EXE-Build: **4/4 grün mit der echten gepackten EXE** (win-unpacked, isPackaged=true) — Fenster lädt UI, Fallback, Auto-Recovery, EADDRINUSE-Meldung.

## 6. CI/CD & Deployment

- **PR:** [#57](https://github.com/SonGoku2078/Task-Manager/pull/57) squash-merged → `436ae45`; Issue #55 geschlossen. CI (build + GitGuardian) grün.
- **EXE-Build:** aus master (`ca03f86`, inkl. #56) im **Worktree** gebaut (Live-Repo unberührt; electron-builder-winCodeSign-Symlink-Falle via manuell entpacktem Cache `winCodeSign-2.6.0` umgangen). Installer: **`dist-electron/SelfManaged Setup 1.1.0.exe`** (78 MB, unsigniert — SmartScreen-Hinweis möglich). Installation durch den User; alte App vorher schließen.
- Kein Mobile-Release (Mobile unberührt). Kein Prod-Eingriff: Server-Fix (EADDRINUSE-Meldung) erreicht Prod erst über den User-Deploy-Flow — die neue EXE funktioniert unabhängig davon sofort gegen den laufenden Prod.

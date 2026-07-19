# Change — Prod-Server-Umzug auf 192.168.8.50 (+ Desktop-Server-Eingabe #62)

| Feld | Wert |
|---|---|
| Status | done |
| Nächste Rolle | — |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-19 |

> Orchestrator-Log:
> - 2026-07-19 Grill-Interview (8 Fragen) + Fakten-Checks abgeschlossen; Kompakt-Pipeline gestartet. Issues #60 + #62 (Desktop-Eingabe, hier mitgelöst). Folge-Issue #61 (ICS/NetBird) NACH #60.

## 0./1. Briefing & Requirements (Grill-Ergebnis 2026-07-18/19)

**Verifizierte Fakten:** Neuer Server `192.168.8.50:3001` läuft mit aktuellem master (Bundle enthält #56-Versions-Sektion; per Asset-Check bestätigt). Lokaler :3001 lief zuletzt parallel (Drift-Risiko → Rückbau). Dev :3002 bleibt lokal. Repo ist **öffentlich** → SSH-Ziel (`dante@192.168.8.50`) wird NICHT committet.

**Entscheidungen:**
1. **Server:** Linux + SSH (`dante@192.168.8.50`, Passwort-Login — Script läuft interaktiv; Empfehlung SSH-Key in Doku). App als Docker-Compose-Service `server-taskmanager-1`, Projekt `~/server/`, Repo `~/server/taskmanager`, restart `unless-stopped`. Docker ohne sudo.
2. **Deploy:** SSH-Script von lokal ersetzt den `release.ps1`-Flow: `ssh <ziel> 'cd ~/server && git -C taskmanager pull && docker compose up -d --build taskmanager'` + Health-Poll `http://192.168.8.50:3001/health` von lokal. Ziel aus gitignorierter `scripts/deploy.local.json` (Beispieldatei committet). Auslöser: **nur der User**.
3. **Desktop-App (inkl. #62):** Ziel-URL **in der App änderbar + persistent** — Eingabefeld + „Verbinden" auf der Fallback-Seite UND Menüpunkt „Server ändern…"; gespeichert in `userData/config.json`. Auflösung: `TM_DESKTOP_URL` > `TM_DESKTOP_PORT` (Tests) > gespeicherte URL > Default `http://192.168.8.50:3001` (packaged) / `:5173` (dev). Fallback-Text ohne „npm run prod". Neue EXE **1.2.0** (Worktree-Build), Installation durch User.
4. **Daten:** Server maßgeblich; lokale `data.db` beim Rückbau NUR archivieren (Proton-Drive-Ordner), kein Rückimport.
5. **Rückbau lokal** (LETZTER Schritt, nur mit expliziter User-Freigabe): :3001-Prozess stoppen, `data.db` archivieren, Autostart-Reste prüfen. Danach entfällt der Live-Repo-Build-Trap.
6. **Clients:** Mobile-Default-Platzhalter → neue IP (kein Mobile-Release nötig — fährt mit dem nächsten mit); ICS-Abo + Lesezeichen = User-Checkliste.
7. **Doku:** README + SETUP-SPEC auf neue Topologie; `src/api/client.ts`-Default auf same-origin.

**Harte Regeln:** Neuer Server wird von der Pipeline nie verändert (nur read-only GET/health); keine Builds im Live-Repo, solange lokaler :3001 läuft (Worktree); kein `mobile-v*`-Tag ohne Freigabe.

## 2. Architektur (kompakt)

- **`scripts/release-remote.ps1`** (neu): liest `scripts/deploy.local.json` (`{ "sshTarget": "user@host", "healthUrl": "http://192.168.8.50:3001/health" }`; gitignoriert, `deploy.local.json.example` committet); Ablauf: Vorab-Anzeige + Bestätigung → `ssh` (ein Aufruf, interaktive Passwortabfrage ok) → Health-Poll von lokal → Versions-Hinweis. `-DryRun` druckt nur die Kommandos (testbar ohne Serverkontakt). `npm run release` zeigt auf das neue Script; altes `release.ps1` → `release-local-legacy.ps1` (Kopf: DEPRECATED, fliegt mit dem Rückbau).
- **Electron:** `main.ts` bekommt Config-Layer (`loadConfig`/`saveConfig` auf `userData/config.json`) + dynamisches `currentTarget`; `preload.ts` (contextBridge: `tm.getTarget()`, `tm.setServerUrl(url)` via `ipcMain.handle`, URL-Validierung im Main); `fallback.html` erweitert um vorbefülltes Eingabefeld + „Verbinden" (Modi: `error` = mit Auto-Poll, `change` = ohne); Menü mit „Server ändern…" (lädt fallback.html im change-Modus). Version 1.2.0.
- **`src/api/client.ts`:** `DEFAULT_BASE_URL`-Fallback von `http://localhost:3001` auf `''` (same-origin) — nach Rückbau zeigt localhost:3001 ins Leere; same-origin ist in jedem realen Szenario korrekt (Prod-Build same-origin, Dev via VITE_API_URL, Mobile via tm-api-url).
- **Mobile:** nur Platzhalter-Konstante in `Settings.tsx`.

## 3. Implementierung

- **Branch:** `feature/issue-60-server-umzug`
- **Electron (inkl. #62):** `main.ts` — Config-Layer (`userData/config.json`), Ziel-Auflösung `TM_DESKTOP_URL > TM_DESKTOP_PORT > gespeichert > Default 192.168.8.50:3001/5173`, IPC `tm:get-target`/`tm:set-server-url` (URL-Validierung im Main), Menü „Datei → Server ändern…"; **neu** `preload.ts` (contextBridge `window.tm`); `fallback.html` mit vorbefülltem Eingabefeld + „Verbinden" (Modi error/change); DevTools zusätzlich bei `TM_USER_DATA_DIR` unterdrückt (E2E-firstWindow-Falle); v1.2.0.
- **Deploy:** **neu** `scripts/release-remote.ps1` (DryRun-Flag, Bestätigung, ein SSH-Kommando, Health-Poll von lokal, ASCII-Ausgaben wegen PS-5.1-Encoding) + `deploy.local.json.example`; echte `deploy.local.json` (dante@…) lokal angelegt, **gitignoriert**; `npm run release` → remote, altes Script → `release-local-legacy.ps1` (DEPRECATED-Header, `npm run release:local-legacy`).
- **Clients/Doku:** `src/api/client.ts` Default `''` (same-origin), Mobile-Platzhalter → `192.168.8.50`, README-Umgebungstabelle neu, SETUP-SPEC mit Überholt-Hinweis.

## 4./5. Testdesign, Ausführung & Gate

`scripts/e2e-desktop.mjs` erweitert (A–G); Dev-Backend :3002 (Neustart nötig — lief nicht mehr), Wegwerf-Server via tsx; Prod nur read-only:

| Test | Ergebnis |
|---|---|
| A `TM_DESKTOP_PORT=3002` → App lädt Dev-UI | ✅ |
| B1/B2 toter Port → Fallback; Server erscheint → Auto-Connect | ✅ |
| C Doppelstart-Server → saubere Meldung | ✅ |
| D `TM_DESKTOP_URL`-Override | ✅ |
| E gespeicherte `config.json`-URL wird genutzt | ✅ |
| F (#62) Eingabe auf Fallback-Seite → verbindet + persistiert | ✅ |
| G (#62) Menü „Server ändern…" öffnet Change-Seite | ✅ |
| Deploy-Script `-DryRun` (Config gelesen, Kommandos korrekt, nichts ausgeführt) | ✅ |
| Regression: `npm test` 8/8, Lint geänderte Dateien 0 Findings | ✅ |

Gefixt unterwegs: Test-Sequenz-Bug (Wegwerf-Server belegte :3999 noch), DevTools-firstWindow-Race (Scenario E flaky). **GATE: GO.** Packaged-Smoke folgt nach EXE-Build.

## 6. CI/CD & Deployment

- **PR:** [#65](https://github.com/SonGoku2078/Task-Manager/pull/65) squash-merged → `a189ab3`; Issues #60 + #62 geschlossen. CI grün.
- **EXE:** aus master im Worktree gebaut, **Packaged-Smoke 8/8 mit der echten `SelfManaged.exe` 1.2.0**. Installer: `dist-electron/SelfManaged Setup 1.2.0.exe` (78 MB, unsigniert). `deploy.local.json` (dante@192.168.8.50) lokal angelegt, DryRun ok.
- **Offen (User):** Client-Umstellung + explizite Freigabe für den lokalen Rückbau; danach letzter Pipeline-Schritt (:3001 stoppen, data.db archivieren).
- **Nebenprodukt-Issues** aus den Grill-Zwischenfragen: #61 (ICS/NetBird), #63 (Pull-to-Refresh), #64 (Woche-Überfällig).

**Übergabe-Checkliste User (nach Merge/EXE-Build):**
- [ ] `scripts/deploy.local.json` anlegen (Vorlage kopieren, `dante@192.168.8.50` eintragen)
- [ ] Erster Deploy-Lauf `npm run release` (mit Passwortabfrage; DryRun vorher möglich)
- [ ] Neue EXE 1.2.0 installieren (alte schließen)
- [ ] Handy: Server-URL auf `http://192.168.8.50:3001`
- [ ] ICS-Abo + Browser-Lesezeichen auf neue Adresse
- [ ] Freigabe für lokalen Rückbau geben → Pipeline stoppt :3001, archiviert data.db

## 7. Lokaler Rückbau (2026-07-19, nach User-Freigabe)

**Ausgangsbefund:** Auf `:3001` lauschte lokal bereits **nichts mehr** — der Prozess war schon gestoppt (nur ausgehende Verbindungen zum neuen Server sichtbar). Die lokale `data.db` stammte vom **18. Juli 14:32**, also von vor dem Umzug.

**Datenvergleich vor dem Rückbau:**

| | Tasks | davon offen | Projekte |
|---|---|---|---|
| Neuer Server (192.168.8.50) | **1243** | 759 | 122 |
| Lokale `data.db` (Archiv) | 1120 | 763 | 122 |

Der Server ist deutlich weiter — die lokale DB ist ein reiner Altbestand, kein Rückimport nötig (wie entschieden).

**Archiv:** `../archiv-lokale-prod-db-2026-07-19/` (neben dem Repo im Proton-Drive-Ordner, also gesichert und außerhalb von git)
- `data.db` — **bitgenau identisch** zum Original (gleiche MD5, gültiger `SQLite format 3`-Header, gleiche Größe)
- `backups/` — die vorhandenen Server-Backups mitgesichert
- Inhalt verifiziert an einer **Wegwerf-Kopie** (temporärer Server auf :3010), damit das Archiv unangetastet blieb; Prüfsumme danach erneut kontrolliert: unverändert.

**Original belassen:** `~/.task-manager/data.db` wurde **nicht gelöscht**. Das Löschen bringt keinen Nutzen, zerstört aber den Rückfallweg; der Ordner enthält ohnehin weiterhin die aktiv genutzte `dev.db`.

**Autostart:** keine Reste — weder im Autostart-Ordner noch in der Aufgabenplanung noch in den Registry-Run-Keys.

**Folge für die Arbeitsweise:** Der „Live-Repo-Build-Trap" ist damit erledigt. Da lokal kein Prod-Server mehr aus dem Repo ausliefert, ist `npm run build` im Arbeitsverzeichnis wieder ungefährlich — Worktree-Builds sind nicht mehr zwingend.

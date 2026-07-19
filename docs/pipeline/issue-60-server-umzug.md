# Change — Prod-Server-Umzug auf 192.168.8.50 (+ Desktop-Server-Eingabe #62)

| Feld | Wert |
|---|---|
| Status | implementation |
| Nächste Rolle | /developer (Kompakt-Pipeline) |
| Owner-Rolle | orchestrator |
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

## 3.–6. Implementierung, Test, Gate, Deployment

_Wird von den Stufen ergänzt._

**Übergabe-Checkliste User (nach Merge/EXE-Build):**
- [ ] `scripts/deploy.local.json` anlegen (Vorlage kopieren, `dante@192.168.8.50` eintragen)
- [ ] Erster Deploy-Lauf `npm run release` (mit Passwortabfrage; DryRun vorher möglich)
- [ ] Neue EXE 1.2.0 installieren (alte schließen)
- [ ] Handy: Server-URL auf `http://192.168.8.50:3001`
- [ ] ICS-Abo + Browser-Lesezeichen auf neue Adresse
- [ ] Freigabe für lokalen Rückbau geben → Pipeline stoppt :3001, archiviert data.db

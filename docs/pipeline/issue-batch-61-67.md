# Batch — Issues #61, #63, #64, #66, #67

| Feld | Wert |
|---|---|
| Status | merged (Releases ausstehend) |
| Nächste Rolle | — (User: Release-Freigabe + Server-Schritte #61) |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-19 |

> Orchestrator-Log:
> - 2026-07-19 Auftrag „alle genannten Issues angehen"; Kompakt-Pipeline je Issue (eigener Branch, Test, PR, Merge). Reihenfolge: #67 → #64 → #63 → #66 → #61.

## Ergebnisse

| Issue | PR | Kern | Verifikation |
|---|---|---|---|
| **#67** Deploy-Statistik | [#68](https://github.com/SonGoku2078/Task-Manager/pull/68) `13e75c4` | Abschluss-Banner + Zusammenfassung (Commits, Version, Image neu/Cache, Dauer je Schritt, Health, Task-/Projektzahlen); Fehlerfälle rot mit Diagnosehinweis; ASCII-Fix (`â†'`) | `npm run test:deploy` 24/24 + Pipeline-Mechanik 11/11 (stderr-Mitschnitt ohne PS-5.1-Abbruch) |
| **#64** Woche-Tab | [#69](https://github.com/SonGoku2078/Task-Manager/pull/69) `18b451d` | Eigene Gruppe „Überfällig" (rot, älteste zuerst); `relevant`-Filter hatte keine Untergrenze | `scripts/mobileweek.test.ts` 11/11 (in `npm test`) + Sichttest 4/4: „Diese Woche" 27 → 2 Einträge |
| **#63** Pull-to-Refresh | [#70](https://github.com/SonGoku2078/Task-Manager/pull/70) `72f3c5b` | `usePullToRefresh` an `.m-main` (alle Tabs); nur am Listenanfang + dominant vertikal; Zustände bis „✓ Aktualisiert"/„✕ Server nicht erreichbar" | Gestentest via CDP-Touch 8/8 inkl. „kurzer Zug löst nicht aus" + Fehlerfall |
| **#66** Desktop-Auto-Update | [#71](https://github.com/SonGoku2078/Task-Manager/pull/71) `81ce838` | `electron-updater` (Hintergrund-Download, Installation beim Beenden), Menüpunkt + Versionsanzeige; **neuer Workflow `desktop-exe.yml`** (Tag `desktop-v*` → EXE + `latest.yml`) | Packaged-Smoke 9/9 mit echter EXE (Updater in asar), `latest.yml` erzeugt, Graceful-Failure 4/4 |
| **#61** ICS öffentlich | [#72](https://github.com/SonGoku2078/Task-Manager/pull/72) `53f7e89` | nginx-Pfad-Filter (nur `GET /calendar/<token>.ics`), Compose-Snippet (Port nur `127.0.0.1`), Anleitung, Prüfskript | Skript gegen ungefilterten Dev-Server: meldet korrekt 5 offene Pfade → erkennt echte Exposition |

## Entscheidungen aus den Grill-Interviews

- **#66:** echtes Auto-Update statt Mobile-Muster (Windows erlaubt, was Android verbietet); UI **nativ in der EXE**, nicht in den Web-Einstellungen — die Desktop-App ist Thin Client, ihre Settings kommen vom Server und hingen sonst am Deployment-Stand. Kein Code-Signing.
- **#61:** NetBird Cloud Reverse Proxy (persistenter Dashboard-Service, nicht das ephemere `netbird expose`); Pfad-Filter zwingend, weil die App keine Auth hat.
- **#64:** Überfällige sichtbar behalten, aber getrennt — statt sie wie im Web ganz auszublenden.

## Bewusste Grenzen

- **#61 nicht end-to-end getestet:** Docker fehlt auf dem Arbeitsrechner, der nginx-Filter lief hier nie. Statt Blindvertrauen liegt `scripts/verify-ics-public.mjs` bei; sein Erkennungsvermögen ist gegen den ungefilterten Server belegt (4/9). **Vor dem Proton-Abo muss der Lauf gegen die echte URL 9/9 zeigen.**
- **#66 Umstieg:** Das installierte 1.2.0 hat noch keinen Updater — 1.3.0 muss **einmalig** von Hand installiert werden, danach läuft es automatisch.
- Lint: unverändert 2 Bestandsfindings in `MobileApp.tsx` (identisch auf master), 0 neue.

## Offen (User)

- [ ] Freigabe `mobile-v0.5.12` (enthält #63 + #64) → CI baut APK → In-App-Update
- [ ] Freigabe `desktop-v1.3.0` (enthält #66 + #60/#62) → CI baut EXE + `latest.yml`; danach 1.3.0 einmalig manuell installieren
- [ ] #61 Server-Schritte nach `docs/ICS-PUBLIC-SETUP.md` (ics-proxy starten, NetBird-Service anlegen, Prüfskript 9/9, dann Proton-Abo)
- [ ] Prod-Deploy für #67 (`npm run release`) — die neue Statistik zeigt sich beim nächsten Lauf
- [ ] Weiterhin offen aus #60: lokaler Rückbau (`:3001` stoppen, `data.db` archivieren) — nur auf ausdrückliche Freigabe

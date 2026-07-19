# Release — desktop-v1.3.0 (erster Auto-Update-fähiger Desktop-Release)

| Feld | Wert |
|---|---|
| Status | done |
| Nächste Rolle | — (User: 1.3.0 einmalig manuell installieren) |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-19 |

> Orchestrator-Log:
> - 2026-07-19 Release nach User-Freigabe. Vier Fehlschläge bis zur funktionierenden Kette — jeder Schritt unten dokumentiert, damit der nächste Release nicht erneut hineinläuft.

## Was released wurde

- **Release:** [`desktop-v1.3.0`](https://github.com/SonGoku2078/Task-Manager/releases/tag/desktop-v1.3.0) — `SelfManaged-Setup-1.3.0.exe` (78 MB) + `latest.yml`
- **Inhalt:** #66 (Auto-Update), #60/#62 (Thin Client, Server-Eingabe), #55 (Startfix)

## Vier Fehler auf dem Weg dorthin

| # | Symptom | Ursache | Fix |
|---|---|---|---|
| 1 | Workflow grün, aber kein nutzbares Release | electron-builders Publisher legt Releases als **Entwurf** an, unter Tag `v1.3.0` statt `desktop-v1.3.0` | PR [#76](https://github.com/SonGoku2078/Task-Manager/pull/76): `--publish never` + `action-gh-release` an den gepushten Tag |
| 2 | Updater hätte nie etwas gefunden | electron-updater fragt `/releases/latest` ab — das war `mobile-v0.5.12` (nur APK, kein `latest.yml`) → 404 | PR #76: Mobile-Releases `make_latest: false`, Desktop `make_latest: true` |
| 3 | Update gefunden, Download 404 | `latest.yml` nennt `SelfManaged-Setup-1.3.0.exe`, hochgeladen wurde `SelfManaged.Setup.1.3.0.exe` (GitHub ersetzt Leerzeichen durch Punkte) | PR [#77](https://github.com/SonGoku2078/Task-Manager/pull/77): `artifactName` ohne Leerzeichen |
| 4 | Build brach ab | `"//artifactName"` als Kommentar — JSON kennt keine Kommentare, electron-builder validiert streng | PR [#78](https://github.com/SonGoku2078/Task-Manager/pull/78): entfernt, Begründung in den Workflow |

**Gemeinsamer Nenner:** Die ersten drei Fehler waren in der CI unsichtbar (Workflow „grün"), weil niemand die Kette *nach* dem Build geprüft hat. Lehre: Ein grüner Release-Workflow beweist nur, dass gebaut wurde — nicht, dass das Ergebnis brauchbar ist.

## Verifikation der vollständigen Kette

Genau die Schritte, die electron-updater geht (`GitHubProvider.getLatestTagName` → `latest.yml` → Datei):

| Schritt | Ergebnis |
|---|---|
| `/releases/latest` löst auf | ✅ `desktop-v1.3.0` |
| Release-Zustand | ✅ `draft=false prerelease=false`, Assets: `latest.yml`, `SelfManaged-Setup-1.3.0.exe` |
| `latest.yml` abrufbar + Inhalt | ✅ `version: 1.3.0`, `url: SelfManaged-Setup-1.3.0.exe` |
| Datei aus `latest.yml` | ✅ HTTP 200, 78 573 797 Bytes |
| **Echter App-Test:** lokal gebaute **1.2.9** gegen das Release | ✅ `update-available 1.3.0` → `update-downloaded 1.3.0`, danach Dialog „Jetzt neu starten" |

Der letzte Test ist der aussagekräftigste: Eine ältere App hat das Update selbstständig gefunden, vollständig heruntergeladen und den Neustart angeboten — die Mechanik funktioniert also von innen, nicht nur auf URL-Ebene.

## Für den nächsten Desktop-Release

1. Version in `electron/package.json` bumpen (oder allein vom Tag steuern lassen — CI schreibt sie aus dem Tag).
2. `git tag desktop-v<version> && git push origin desktop-v<version>`.
3. **Danach die Kette prüfen** (nicht nur „Workflow grün"): `/releases/latest` → Tag, `latest.yml` → 200, die darin genannte EXE → 200.
4. Installierte Apps ziehen das Update dann selbst.

## Offen

- **User:** 1.3.0 **einmalig manuell** installieren (das vorhandene 1.2.0 hat noch keinen Updater). Danach laufen Updates automatisch.

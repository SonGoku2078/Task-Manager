# Feature — Versions-Anzeige in den Einstellungen (Version, Build, Umgebung)

| Feld | Wert |
|---|---|
| Status | done |
| Nächste Rolle | — |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-18 |

> Orchestrator-Log:
> - 2026-07-18 Kompakt-Pipeline (Abkürzung dokumentiert): User-Anforderung „welche Version läuft auf welcher Umgebung", Plan-Mode-Freigabe zusammen mit #55. Issue #56.

## 1. Requirements

- **GitHub Issue:** [#56](https://github.com/SonGoku2078/Task-Manager/issues/56) — AC1–AC5 dort.
- Web/Desktop hatte keinerlei Versionsanzeige; Mobile zeigt sie bereits (`Settings.tsx:212`, CI-Bake via `VITE_APP_VERSION`). Kontext: Der Live-Repo-Trap aus #53 hat gezeigt, dass ohne sichtbare Version niemand weiß, welcher Stand wo läuft.

## 2./3. Architektur & Implementierung

- **Branch:** `feature/issue-56-version-anzeige`
- `vite.config.ts`: `define` backt `__APP_VERSION__` (Env `VITE_APP_VERSION` ?? `git describe --tags --always --dirty`, try/catch → 'unbekannt') + `__BUILD_TIME__` (ISO) ein — gilt für Build UND Dev-Server.
- `src/version.ts` (**neu**): `APP_VERSION`/`BUILD_TIME` mit typeof-Guards (mobile-/tsx-sicher) + pure `apiEnvironment(base, origin)`: Port 3001 → „Produktion", 3002 → „Dev/Test", sonst „Custom"; leere Base (Prod-Build, same-origin) → `window.location.origin`.
- `src/components/SettingsView.tsx`: neue erste Sektion „ℹ️ Version & Umgebung" (Version, Build-Zeit de-DE, Profil aus `VITE_APP_ENV`, Server-URL + farbiges Umgebungs-Badge); nutzt bestehendes `getBaseUrl()` aus `src/api/client.ts`. + Badge-Styles in `SettingsView.css`.
- Mobile unverändert; Electron (Thin Client, #55) zeigt die Sektion, sobald der Prod-Server das neue Frontend ausliefert (**User-Deploy nötig**).

## 4./5. Test & Gate

| Test | Ergebnis |
|---|---|
| `apiEnvironment` pur (tsx): 8 Fälle inkl. same-origin, LAN-IP, kaputte URL + `APP_VERSION`-Fallback ohne define | ✅ 8/8 + Fallback |
| Playwright gegen Vite-Dev :5177 (kein Build im Live-Repo): Sektion vorhanden, Version = git describe (`mobile-v0.5.11-3-g436ae45-dirty`), Build-Zeit de-DE, Profil `development`, Server `:3002`, Badge „Dev/Test"/`env-dev` | ✅ 6/6 |
| Regression: `npm test` 8/8, Lint geänderte Dateien 0 Findings | ✅ |

**GATE: GO.**

## 6. CI/CD & Deployment

- PR → squash-merge → master (Link im Issue). Kein Mobile-Release. **Auf Prod sichtbar erst nach User-Deploy** (dann zeigt :3001 z. B. `mobile-v0.5.11-4-g<sha>` + rotes „Produktion"-Badge; :3002 zeigt „Dev/Test").

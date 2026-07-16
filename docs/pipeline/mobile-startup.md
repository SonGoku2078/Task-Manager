# Feature — Mobile: Schnellstart, grüner Splash, Verbindungstest

| Feld | Wert |
|---|---|
| Status | done |
| Nächste Rolle | — (User-Nachtest Splash auf Gerät) |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-16 |

> Orchestrator-Log:
> - 2026-07-16 Kompakt-Pipeline (Abkürzung dokumentiert): Diagnose + Plan im Plan-Mode vom User genehmigt; Requirements/Architektur/Implementierung/Test in einem Durchlauf. Issue #51.

## 1. Requirements

- **GitHub Issue:** [#51](https://github.com/SonGoku2078/Task-Manager/issues/51) — AC1–AC7 dort.
- Drei User-Meldungen: (1) App-Start ~20 s → Ziel ≤ 3 s, (2) grüner Splash nie sichtbar, (3) „Verbindung testen"-Button in Settings.

## 2. Architektur (Diagnose + Entwurf)

- **20 s-Ursache:** `apps/mobile/src/main.tsx` blockierte Rendering mit `await loadAll()`; bei totem LAN-Server 10 s Outbox-Flush + 10 s `Promise.all`(9 GETs). Lösung: nicht-blockierender Boot (Snapshot-Hydration läuft synchron bis zum ersten `await`) + **Koaleszenz-Guard** für `loadAll` (sonst könnte der AutoSync-Retry parallel laufen und Server-Zustand von vor dem Outbox-Flush einlesen).
- **Splash-Ursache:** targetSdk 36 — Android-12+-System-Splash ignoriert `android:background`; `windowSplashScreen*`-Attribute + values-v31 fehlten. Lösung: reine XML-Theme-Konfiguration (Framework-Attribute, kein `installSplashScreen()`, kein Splash-Plugin, keine neue Dependency); Pre-12: `android:windowBackground` statt `android:background`.
- **Verbindungstest:** `normalizeBaseUrl()` aus `setBaseUrl` extrahiert (eine Normalisierung für Speichern UND Testen); reiner `/health`-Check mit 5-s-Timeout, ohne Persistenz, ohne Datenladen.

## 3. Implementierung

- **Branch:** `feature/mobile-startup-splash-conntest`
- `src/store.ts`: `loadAllInFlight`-Guard (Modulebene), Action gibt laufendes Promise zurück.
- `apps/mobile/src/main.tsx` + `src/main.tsx` (Desktop, User-Entscheidung): `loadAll()` fire-and-forget vor `render()`, Placeholder entfernt.
- `apps/mobile/android/.../res`: NEU `values/colors.xml` (splash_background → ic_launcher_background), NEU `values-v31/styles.xml` (`windowSplashScreenBackground` grün + `windowSplashScreenAnimatedIcon` = ic_launcher_monochrome + `windowBackground` grün), EDIT `values/styles.xml` (`android:windowBackground=@drawable/splash` für API 24–30).
- `src/api/client.ts`: `normalizeBaseUrl()` exportiert; Re-Exports in `src/api/index.ts` + `apps/mobile/src/api.ts`.
- `apps/mobile/src/components/Settings.tsx`: `testConnection`-Handler + „Verbindung testen"-Button neben „Verbinden & Daten laden" (`.m-settings-row`), eigene `testStatus`/`testing`-States, Meldungen nach ✓/✕/…-Konvention mit Latenz in ms.

## 4./5. Testdesign, Ausführung & Gate

Playwright-Suite (Chromium, Mobile-Dev :5174 gegen Dev-Backend :3002/dev.db — 127.0.0.1 statt localhost, da auf ::1 ein fremder User-Dev-Server lauscht):

| Test | Ergebnis |
|---|---|
| T1 Start mit UNERREICHBAREM Server (TEST-NET-IP) interaktiv < 3 s | ✅ **615 ms** (vorher ~20 000 ms) |
| T1 Offline-Hinweis sichtbar | ✅ |
| T2 Start mit erreichbarem Server interaktiv < 3 s | ✅ 539 ms |
| T2 loadAll koalesziert: genau 1× GET /api/tasks beim Boot | ✅ 1× |
| T3 „Verbindung testen" Erfolgsfall | ✅ „✓ Server erreichbar (12 ms)" |
| T3 tm-api-url bleibt unverändert, keine /api/-Requests | ✅ |
| T3 Fremdserver (HTML auf /health) erkannt | ✅ „✕ … kein SelfManaged-Server" |
| T3 Timeout-Fall (~5 s) | ✅ „✕ Zeitüberschreitung (5013 ms)" |
| T3 „Verbinden & Daten laden" weiterhin intakt | ✅ |
| Builds: `npm run build`, `npm run build:mobile` | ✅ grün |
| Lint | ✅ keine Findings in geänderten Dateien (Bestandsfehler unverändert; +3 Meldungen stammen aus gitignorierten Gradle-Build-Artefakten) |
| `gradlew assembleDebug` (AAPT2 validiert Splash-XML) | ✅ grün |

**Bekannte Einschränkung:** Optik des System-Splash (vollgrün + weißer Haken) ist nur auf einem echten Android-12+-Gerät prüfbar → User-Nachtest nach APK-Update auf v0.5.10.

**GATE: GO.**

## 6. CI/CD & Deployment

- **PR:** [#52](https://github.com/SonGoku2078/Task-Manager/pull/52) squash-merged → `86e3890`; Issue #51 automatisch geschlossen.
- **Release:** Tag `mobile-v0.5.10` → CI-Build grün, Release-Asset `SelfManaged-0.5.10.apk` veröffentlicht (In-App-Update).
- Kein Prod-Zugriff (Web-Prod unverändert; Fix A wirkt dort erst nach User-Deploy).

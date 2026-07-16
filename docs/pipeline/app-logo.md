# Feature — App-Logo & Icons (SelfManaged)

| Feld | Wert |
|---|---|
| Status | implementation-done |
| Nächste Rolle | /test-designer |
| Owner-Rolle | developer |
| Datum | 2026-07-16 |

> Orchestrator-Log:
> - 2026-07-16 gestartet. Design & Scope vorab im Grill-Interview mit dem User final abgestimmt (siehe Design-Vorgaben unten) → /product-manager (Briefing + Backlog), dann /req-engineer.
> - 2026-07-16 PM: Item 015 in PM_TASKS.md (Tier-4, HIGH, IN-REQ-ENG), Briefing dort hinterlegt → /req-engineer.
> - 2026-07-16 Req-Eng: Issue #49 mit 12 ACs erstellt, Requirements-Sektion geschrieben → /architect.
> - 2026-07-16 Architekt: Generator-Design (Konstanten im Script, Playwright-Rendering, ICO ohne Dependency), Ziel-Layout mit verifizierten Pixelmaßen, Monochrome als VectorDrawable → /developer. Befund: vite outDir = server/public (automatisch), dist/ ist Altlast.
> - 2026-07-16 Developer: Branch feature/app-logo-icons — Generator + 30 Assets + XML/HTML-Änderungen, idempotent verifiziert, Build grün → /test-designer.

## 0. Design-Vorgaben (final, vom User bestätigt — bindend für alle Stufen)

**Logo:** Weißer Checkmark-Haken auf grüner Kachel.
- SVG viewBox `0 0 64 64`, Kachel `rect` 64×64, `rx=14`, Füllung `#2b8a3e` (App-Akzentgrün).
- Haken: `<path d="M16.5 33.5 L27.5 44.5 L47.5 21.5" fill="none" stroke="#fff" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round"/>` (Variante „A — Klassisch rund" aus der Vorschau-Auswahl).

**Scope:**
1. **Web:** `public/favicon.svg` ersetzen (Bolt-Platzhalter raus), zusätzlich `favicon.png` 32 px + `apple-touch-icon.png` 180 px; Head-Links in `index.html`. Kein PWA-Manifest. `server/public/` als Quelle mitziehen; **Prod-Deploy macht der User selbst**.
2. **Android** (`apps/mobile/android`): Launcher-Icons alle Dichten (eckig + rund), Adaptive Icon (Foreground = Haken, Background = Vollfläche `#2b8a3e`), Monochrome-Layer für Android-13-Themed-Icons, alle 12 Splashscreens vollflächig grün `#2b8a3e` mit weißem Haken zentriert (User-Entscheidung: „Vollflächig Grün").
3. **Electron:** `public/icon.ico` Multi-Size 16–256 px (Pfad wird von `electron/package.json` → `build.win.icon` bereits erwartet, Datei fehlt bisher). Keine `.icns`.
4. **Kein** In-App-Branding (UI unverändert).

**Tooling:** `scripts/generate-icons.mjs` — das SVG ist Single Source of Truth; Script rendert per Playwright (bereits installiert, keine neue Dependency) alle PNGs + ICO. Generierte Dateien werden committet.

**Prozess/Release:** Volle Pipeline; nach Merge auf `master` wird ein `mobile-v*`-Tag gepusht → CI baut APK, In-App-Update liefert das Icon aufs Gerät. Leitplanke: Nur Dev/Test anfassen, niemals Production (`:3001`/`data.db`).

## 1. Requirements

- **GitHub Issue:** [#49](https://github.com/SonGoku2078/Task-Manager/issues/49)
- **Feature:** App-Logo & Icons — Favicon (Web), Launcher/Themed/Splash (Android), icon.ico (Electron)
- **Nozbe-Referenz:** N/A — eigenes SelfManaged-Branding, bewusst kein Nozbe-Clone-Element.
- **Acceptance Criteria:** AC1–AC12, vollständig im Issue #49 (Web AC1–4, Android AC5–9, Electron AC10, Tooling AC11–12). Out of scope: PWA-Manifest, .icns, In-App-Branding, Prod-Deploy.
- **Technical Interfaces:**
  - Input: `public/favicon.svg` (Single Source of Truth, Design lt. Sektion 0).
  - Generator: `scripts/generate-icons.mjs` (Node, nutzt vorhandenes Playwright) → schreibt PNG/ICO an feste Zielpfade (Web `public/` + `server/public/`, Android `apps/mobile/android/app/src/main/res/**`, Electron `public/icon.ico`).
  - Konsumenten: `index.html` (Head-Links), Android-Ressourcensystem (mipmap/drawable), electron-builder (`build.win.icon`).
- **Data Model:** Keine Laufzeitdaten — reine Build-/Static-Assets. Android-Farbwert in `values/ic_launcher_background.xml` (`#2b8a3e`).
- **Browser-Anforderungen:** SVG-Favicon (Chrome/Firefox/Edge), PNG-Fallback 32 px (Safari/Legacy), apple-touch-icon 180 px (iOS). Erkennbarkeit bei 16 px in hellen und dunklen Tab-Leisten.

## 2. Architektur

### Grundentscheidung: Source of Truth
`scripts/generate-icons.mjs` hält die **Design-Konstanten** (Grün `#2b8a3e`, Haken-Pfad `M16.5 33.5 L27.5 44.5 L47.5 21.5`, stroke 9.5 round/round, Kachel rx 14, viewBox 64) und erzeugt daraus **alles** — inkl. `public/favicon.svg` selbst. Damit gibt es genau eine Stelle für Designänderungen; das Script ist idempotent (feste Zielpfade, deterministisches Rendering).
*Trade-off:* Alternative wäre ein separates Quell-SVG + Script, das es einliest; verworfen, weil Foreground/Splash/Monochrome **Varianten** (Haken ohne Kachel, andere Skalierung) brauchen — die lassen sich aus Konstanten sauberer komponieren als aus einem fertigen SVG geparst.

### Rendering-Pipeline
- Playwright (`playwright-core`, bereits in node_modules; Launch-Fallback chromium → msedge → chrome) rendert pro Ziel ein `page.setContent()`-HTML mit exakt dimensioniertem Inline-SVG, `deviceScaleFactor 1`, Screenshot mit `omitBackground: true` für transparente PNGs.
- ICO-Komposition ohne Dependency: ICONDIR-Header + ICONDIRENTRYs + PNG-Blobs (PNG-in-ICO, von Windows Vista+ und electron-builder unterstützt; 256er-Eintrag mit Größe 0 kodiert).

### Ziel-Layout (alle Pfade vom Script geschrieben)

**Web** (`public/` — landet via `vite build` automatisch in `server/public/`, das ist das outDir):
| Datei | Inhalt | Größe |
|---|---|---|
| `favicon.svg` | Kachel rx14 + Haken | vektoriell |
| `favicon.png` | wie favicon.svg | 32×32 |
| `apple-touch-icon.png` | **vollflächig** grün + Haken 0.72 (iOS maskt selbst, keine Transparenz) | 180×180 |
| `icon.ico` | Kachel-Look, Multi-Size | 16/24/32/48/64/128/256 |

**Android** (`apps/mobile/android/app/src/main/res/`):
| Ziel | Inhalt | Größen (mdpi→xxxhdpi) |
|---|---|---|
| `mipmap-*/ic_launcher.png` | Kachel (rx ∝ 14/64) mit 4 % transparentem Rand, Haken 1:1 | 48/72/96/144/192 |
| `mipmap-*/ic_launcher_round.png` | grüner Kreis (Ø 98 %), Haken 0.8 | 48/72/96/144/192 |
| `mipmap-*/ic_launcher_foreground.png` | transparent, weißer Haken **0.72 um Zentrum skaliert** (Safe-Zone 66/108 ⇒ max. Radius-Faktor ≈ 0.735, verifiziert gegen Haken-BBox 40.5×32.5) | 108/162/216/324/432 |
| `values/ic_launcher_background.xml` | Farbe `#FFFFFF` → **`#2b8a3e`** (Adaptive-Background bleibt `@color`-Referenz) | — |
| `drawable/ic_launcher_monochrome.xml` | **VectorDrawable** (kein PNG): viewport 64, `<group pivot 32/32, scale 0.72>`, Pfad als Stroke 9.5 round/round | vektoriell |
| `mipmap-anydpi-v26/ic_launcher.xml` + `ic_launcher_round.xml` | je `<monochrome android:drawable="@drawable/ic_launcher_monochrome"/>` ergänzen | — |
| `drawable*/splash.png` (11 Dateien: base + 5×land + 5×port) | vollflächig `#2b8a3e`, weißer Haken zentriert in Box `0.35·min(B,H)` | verifizierte Bestandsgrößen (320×480 … 1920×1280) |
| Cleanup | `drawable/ic_launcher_background.xml` + `drawable-v24/ic_launcher_foreground.xml` löschen (nachweislich unreferenziert — Adaptive-Icon nutzt `@color`/`@mipmap`) | — |

**Electron:** nutzt `public/icon.ico` über bestehendes `build.win.icon` — keine Config-Änderung.

### Schnittstellen-Änderungen (manuell, nicht generiert)
- `index.html`: `<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">` + `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` ergänzen (SVG-Link bleibt erste Wahl).
- Die beiden `mipmap-anydpi-v26/*.xml` um den Monochrome-Layer erweitern.

### Nicht-Ziele / Risiken
- `dist/` (Repo-Root) ist Build-Altlast der Web-App — wird bewusst nicht angefasst.
- AC12-Idempotenz gilt pro Maschine/Chromium-Version (Screenshot-Determinismus); Cross-Version-Bitgleichheit ist nicht zugesichert und nicht gefordert.
- Splash nutzt weiterhin die statischen Capacitor-PNGs (kein Wechsel auf Android-12-SplashScreen-API — außerhalb des Scopes).

## 3. Implementierung

- **Branch:** `feature/app-logo-icons`
- **Files Changed:**
  - `scripts/generate-icons.mjs` (neu) — Generator, Design-Konstanten als Single Source of Truth; `npm run icons` als Alias (package.json).
  - `public/`: `favicon.svg` (ersetzt Bolt-Platzhalter), `favicon.png` 32², `apple-touch-icon.png` 180² (neu), `icon.ico` 7 Größen (neu).
  - `index.html`: PNG-Fallback + apple-touch-icon Head-Links ergänzt.
  - Android `res/`: 15 Launcher-PNGs (3 Varianten × 5 Dichten), 11 Splash-PNGs, `values/ic_launcher_background.xml` → `#2B8A3E`, `drawable/ic_launcher_monochrome.xml` (neu, VectorDrawable), `mipmap-anydpi-v26/ic_launcher{,_round}.xml` + `<monochrome>`.
  - Gelöscht (unreferenziert): `drawable/ic_launcher_background.xml`, `drawable-v24/ic_launcher_foreground.xml`.
- **Local Verification:**
  - [x] Generator idempotent: zwei Läufe, md5-Hashes aller 30 Assets identisch (AC12).
  - [x] Sichtprüfung: Launcher eckig/rund, Splash (vollgrün + weißer Haken), apple-touch korrekt; Foreground per Alpha-Kanal verifiziert (weiß deckend auf transparent, Ecken transparent).
  - [x] `public/icon.ico` lädt als Windows-Icon (16er- und 256er-Eintrag; 256 als PNG-in-ICO).
  - [x] `npm run build` grün; `server/public/` enthält alle neuen Icons, gebaute `index.html` referenziert favicon.png + apple-touch-icon (AC3).
  - [x] `npm run lint`: keine neuen Findings (40 vorbestehende Probleme, mit `git stash` gegengeprüft).

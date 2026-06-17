# Feature 14 — Nozbe-Exact UI Polish

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Kohärente Farb-Tokens (Sidebar/Kalender dunkel, Hauptbereich hell, grüner Akzent).
- **AC2:** Konsistente Typografie, Font-Smoothing, Basis-Zeilenhöhe.
- **AC3:** Klare Hover/Active/Selected-Zustände (Sidebar, Liste, Buttons).
- **AC4:** Responsives Verhalten — Kalender-Panel < 1080px aus, Sidebar kompakt < 860px, Detail-Panel als Overlay.

## 2. Architektur
- Zentrale CSS-Variablen in `App.css :root`; globale Basis in `index.css`.
- Media-Queries für drei Breakpoints.

## 3. Implementierung
- `src/index.css`, `src/App.css`, `src/components/Sidebar.css` (+ feinjustierte Komponenten-Styles).

## 4. Testdesign
- TC1 Farbkohärenz, TC2 Typo, TC3 Zustände sichtbar, TC4 Layout bei 1280/1000/800px.

## 5. Testausführung & Gate
- Build/Lint grün, Dev-Server rendert (HTTP 200, Module transformieren fehlerfrei). **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`. Damit sind alle 14 Tier-1-Features abgeschlossen.

# Tier-4 Feature — Dark Mode

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Hell/Dunkel umschaltbar (Einstellungen).
- **AC2:** Auswahl persistiert und wird beim Start angewendet.
- **AC3:** Hauptflächen (Liste, Detail-Panel, Bars, Reports, Settings) im Dark-Theme lesbar.

## 2. Architektur
- `settings.theme` (persistiert); `App` setzt `document.documentElement.dataset.theme`.
- `[data-theme='dark']` überschreibt CSS-Variablen + hartkodierte helle Flächen.

## 3. Implementierung
- `src/App.tsx` (Effekt), `src/App.css` (Dark-Overrides), Toggle in `SettingsView`.

## 4. Testdesign
- TC1 Toggle wechselt sofort, TC2 Reload behält Theme, TC3 Kontrast/Lesbarkeit der Flächen.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

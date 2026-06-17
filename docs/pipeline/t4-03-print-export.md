# Tier-4 Feature — Print / PDF Export

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Druck-Button löst Druckdialog aus (PDF via „Als PDF speichern" des Browsers).
- **AC2:** Druck-Layout zeigt nur die Aufgabenliste der aktuellen Ansicht (ohne Sidebar/Panels/Bars).
- **AC3:** Kopfzeile mit Ansicht + Datum; erledigte Aufgaben gedimmt.

## 2. Architektur
- Header-Button `window.print()`.
- `@media print` in `App.css` blendet UI-Chrome aus; `.print-meta` nur im Druck sichtbar.

## 3. Implementierung
- `src/App.tsx`, `src/App.css`.

## 4. Testdesign
- TC1 Dialog öffnet, TC2 nur Liste sichtbar, TC3 Kopf + Datum, Browser „PDF speichern" funktioniert.

## 5. Testausführung & Gate
- Build/Lint grün; Druck-CSS per Review. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

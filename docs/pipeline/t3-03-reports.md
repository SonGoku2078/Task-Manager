# Tier-3 Feature — Reports / Completion Metrics

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Kennzahlen: gesamt, offen, erledigt, überfällig, erledigt in 7 Tagen.
- **AC2:** Abschlussquote als Balken.
- **AC3:** Aufgaben nach Projekt (done/total) und offene Aufgaben nach Priorität.

## 2. Architektur
- `ReportsView` berechnet alles aus `tasks` + `projects` (rein abgeleitet, kein State).
- Eigene Hauptansicht `reports`; Sidebar-Nav „Berichte".

## 3. Implementierung
- `src/components/ReportsView.tsx` (+ CSS), `src/App.tsx`.

## 4. Testdesign
- TC1 Kennzahlen stimmen, TC2 Quote = done/total, TC3 Projekt-/Prioritäts-Balken.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

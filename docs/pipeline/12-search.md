# Feature 12 — Full-Text Search

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Suche über Titel **und** Beschreibung.
- **AC2:** Echtzeit-Ergebnisse (Filter beim Tippen, case-insensitive).
- **AC3:** Eingabe löschbar (✕).
- **AC4:** Suchbegriff ist auf die Such-Ansicht beschränkt (kein „Leak" in andere Ansichten).

## 2. Architektur
- `ui.searchQuery` + `setSearchQuery`; `matchesSearch` in `selectors.ts`.
- `setView` löscht den Suchbegriff beim Verlassen der Such-Ansicht.
- Such-Eingabe in `App` (Such-Ansicht), kombinierbar mit FilterBar.

## 3. Implementierung
- `src/App.tsx`, `src/store.ts`, `src/selectors.ts`, `src/App.css`.

## 4. Testdesign
- TC1 Titel-Treffer, TC2 Beschreibungs-Treffer, TC3 Echtzeit, TC4 clear, TC5 kein Leak nach Ansichtswechsel.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

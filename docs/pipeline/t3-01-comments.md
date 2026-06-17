# Tier-3 Feature — Task Comments (lokal / Single-User)

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |
| Hinweis | Lokale Variante ohne Backend; Autor = aktueller Nutzername (Settings). |

## 1. Requirements
- **AC1:** Kommentar an einer Aufgabe hinzufügen (Detail-Panel).
- **AC2:** Kommentare mit Autor + Zeitstempel anzeigen.
- **AC3:** Kommentar löschen.
- **AC4:** Persistenz über localStorage.

## 2. Architektur
- `Comment` (`types.ts`), `Task.comments?`; Store `addComment`, `deleteComment`; `ui.currentUser` als Autor.
- Date-Reviver deckt `createdAt` der Kommentare ab.

## 3. Implementierung
- `src/types.ts`, `src/store.ts`, `src/components/TaskDetailPanel.tsx` (+ CSS).

## 4. Testdesign
- TC1 add (Enter/Button), TC2 Anzeige Autor/Datum, TC3 delete, TC4 Reload.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

# Tier-2 Feature — Today View

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** „Heute"-Ansicht zeigt heute fällige Aufgaben.
- **AC2:** Überfällige offene Aufgaben erscheinen ebenfalls (typisches Nozbe-Verhalten).
- **AC3:** Filter/Sort/Search gelten auch hier.

## 2. Architektur
- `selectVisibleTasks` Case `today` → `isSameDay(dueDate, now) || isOverdue(t)`.
- Sidebar-Navigation „Heute" bereits vorhanden.

## 3. Implementierung
- `src/selectors.ts`.

## 4. Testdesign
- TC1 heute fällig sichtbar, TC2 überfällig offen sichtbar, TC3 überfällig erledigt NICHT (isOverdue prüft !completed).

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

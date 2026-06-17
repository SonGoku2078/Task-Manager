# Tier-2 Feature — Project Labels

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Projekt kann ein optionales Label tragen.
- **AC2:** Sidebar gruppiert Projekte nach Label (unbeschriftet zuerst, danach alphabetisch).
- **AC3:** Label im Projekt-Header editierbar; leeres Label = keine Gruppe.

## 2. Architektur
- `Project.label?: string` (`types.ts`); `updateProject` setzt es.
- Sidebar gruppiert via Map; `App` rendert Label-Input neben dem Titel.

## 3. Implementierung
- `src/types.ts`, `src/components/Sidebar.tsx` (+ CSS), `src/App.tsx` (+ CSS).

## 4. Testdesign
- TC1 Label setzen, TC2 Gruppierung sichtbar, TC3 Label leeren → Gruppe weg.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

# Tier-2 Feature — Project Templates

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** Vorlagen-Galerie mit vorgefertigten Projektstrukturen (Umzug, Produkt-Launch, Wochenplanung, Event).
- **AC2:** „Projekt erstellen" legt Projekt + alle Vorlagen-Aufgaben an.
- **AC3:** Anschließend Navigation in das neue Projekt.
- **AC4:** Vorlagen-Reihenfolge bleibt erhalten (gestaffeltes `createdAt`).

## 2. Architektur
- `src/templates.ts` (Daten); Store `createProjectFromTemplate(template)`.
- `TemplatesGallery` als eigene Hauptansicht (`view='templates'`); Sidebar-Nav „Vorlagen".

## 3. Implementierung
- `src/templates.ts`, `src/store.ts`, `src/components/TemplatesGallery.tsx` (+ CSS), `src/App.tsx`, `src/components/Sidebar.tsx`, `src/types.ts`.

## 4. Testdesign
- TC1 Galerie sichtbar, TC2 erstellen→Projekt+Tasks, TC3 Navigation, TC4 Reihenfolge.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.** Damit ist Tier-2 vollständig (5/5).

## 6. CI/CD & Deployment
- Commit auf `master`.

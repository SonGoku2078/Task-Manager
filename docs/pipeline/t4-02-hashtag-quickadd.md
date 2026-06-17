# Tier-4 Feature — Hashtag Quick-Add (#Projekt @Kategorie)

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |

## 1. Requirements
- **AC1:** `#Projekt` im Quick-Add weist die Aufgabe einem Projekt zu (existierendes match oder neu anlegen).
- **AC2:** `@Kategorie` weist Kategorie(n) zu (match oder neu).
- **AC3:** Tokens werden aus dem Titel entfernt; mehrwortig via Unterstrich (`#Mein_Projekt`).
- **AC4:** Ohne Token greift der Kontext (aktuelles Projekt / Kalendertag).

## 2. Architektur
- `parseQuickAdd` (`quickParse.ts`) extrahiert Tokens + Resttitel.
- `App.handleAddTask` löst Namen gegen Store auf (`addProject`/`addCategory` bei Bedarf).

## 3. Implementierung
- `src/quickParse.ts`, `src/App.tsx`.

## 4. Testdesign
- TC1 #Projekt neu/bestehend, TC2 @Kategorie (mehrere), TC3 Titel ohne Tokens, TC4 Unterstrich→Leerzeichen.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.**

## 6. CI/CD & Deployment
- Commit auf `master`.

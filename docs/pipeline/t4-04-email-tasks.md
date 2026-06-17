# Tier-4 Feature — Email to Task (lokaler Stub)

| Feld | Wert |
|---|---|
| Status | done |
| Datum | 2026-06-18 |
| Hinweis | Demo ohne echten Mailserver — Einfügen statt Weiterleiten. |

## 1. Requirements
- **AC1:** Anzeige einer (fiktiven) Inbox-Adresse.
- **AC2:** E-Mail-Text einfügen → Aufgabe in der Inbox; „Subject:"-Zeile wird Titel, Rest Beschreibung.
- **AC3:** Ohne Subject-Zeile: erste Zeile = Titel, Rest = Beschreibung.
- **AC4:** Bestätigung + Sprung zur Inbox.

## 2. Architektur
- `SettingsView` Sektion „E-Mail zu Aufgabe"; nutzt `addTask` (projektlos → Inbox).

## 3. Implementierung
- `src/components/SettingsView.tsx` (+ CSS).

## 4. Testdesign
- TC1 mit Subject-Zeile, TC2 ohne Subject, TC3 leerer Input ignoriert, TC4 Aufgabe in Inbox sichtbar.

## 5. Testausführung & Gate
- Build/Lint grün. **Gate: GO.** Damit ist Tier-4 vollständig.

## 6. CI/CD & Deployment
- Commit auf `master`.

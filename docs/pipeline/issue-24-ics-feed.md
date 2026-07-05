# Feature: ICS-Kalender-Feed + Uhrzeit-Erfassung (Issues #24, #11)

| Feld | Wert |
|---|---|
| Status | done |
| Nächste Rolle | — |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-05 |

> Orchestrator-Log:
> - 2026-07-04 Pipeline verkürzt durchlaufen (Requirements→Architektur→Implementierung→Test→Gate in einer Session; nachträglich dokumentiert)
> - 2026-07-05 gate-go → Commit auf master, Issues #24/#11 geschlossen

## 1. Requirements
- **#24**: Abonnierbarer Kalender-Link (ICS), damit externe Kalender die geplanten Tasks anzeigen. ACs: Feed-URL mit geheimem Token; offene UND erledigte Tasks mit Fälligkeitsdatum (erledigt = „✓ "-Präfix); URLs in Web- und Mobile-Settings kopierbar; falsches Token → 404.
- **#11** (Ergänzung während Planung): Uhrzeit muss pro Task erfassbar sein (Feld existierte im Datenmodell als `startMinutes`, aber ohne UI) — Voraussetzung für terminierte Kalender-Events.
- Grenze (dokumentiert): Proton/Google **online** können nicht abonnieren (kein öffentliches HTTPS). Feed ist für LAN-Clients (Thunderbird, ICSx⁵) gedacht.

## 2. Architektur
- `todayDate`-Muster übernommen: Server-eigenes ICS-Modul `server/src/ics.ts` (server-tsconfig rootDir verhindert Import aus /src; bewusste Duplikation von src/ics.ts mit Mehrumfang: Ganztags-Events, Dauer, RRULE, oktett-bewusstes Folding).
- Token: `crypto.randomBytes(24)` → Settings-Tabelle Key `icsToken`, lazy beim ersten `GET /api/calendar-feed`; Feed-Route `GET /calendar/:token.ics` mit `timingSafeEqual`, registriert vor SPA-Fallback ([server/src/routes/calendar.ts](../../server/src/routes/calendar.ts)).
- RRULE nur für **offene** Tasks (Erledigen spawnt nächste Occurrence als eigene Zeile — sonst doppelte Serien).
- Uhrzeit-UI: `<input type="time">` ↔ `startMinutes` via `minutesToTimeInput`/`timeInputToMinutes` in [src/duration.ts](../../src/duration.ts) (shared Web+Mobile).

## 3. Implementierung
- Server: `ics.ts`, `routes/calendar.ts`, `lan.ts` (extrahiert), `index.ts` (Router-Registrierung).
- Web: SettingsView `CalendarFeedSection` (URLs + Copy), TaskDetailPanel Uhrzeit-Feld.
- Mobile: Settings Feed-URL + Copy, TaskDetailModal Uhrzeit-Feld.
- Nebenbefund gefixt (Teil von #23-Commit): `updateTask` enqueuede rohen statt invariant-korrigierten Patch.

## 4. Testdesign
Testfälle in `docs/testcases.json`: TC-A03 (auto, scripts/ics.test.ts — Escaping, Ganztags/Timed, RRULE-Mapping inkl. Completed-Regel, UNTIL, Folding), TC-M17 (Feed-Endpoints), TC-M18 (Uhrzeit-Roundtrip).

## 5. Testausführung & Gate
- 2026-07-04/05: TC-A03 pass; Builds pass; Live-Smoke am Dev (:3002): Token persistent, Feed 200/text-calendar mit korrektem DTSTART/DTEND/RRULE, falsches Token 404, /api/lan-Regression ok.
- **GATE: GO**

## 6. CI/CD & Deployment
- Direkter Commit auf master (Beschluss User: kein PR-Flow). Deploy auf :3001 erfolgt durch User per `npm run release` nach Testreport-Approve.

# Feature: Manuelles „Heute"-Flag (Issue #23)

| Feld | Wert |
|---|---|
| Status | done |
| Nächste Rolle | — |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-04 |

> Orchestrator-Log:
> - 2026-07-04 Pipeline verkürzt durchlaufen; Commit `43db2b2` auf master
> - 2026-07-05 Issue #23 geschlossen (Deploy folgt nach Testreport-Approve)

## 1. Requirements
Heute-View zeigt nur fällige Tasks; zusätzlich manuelles „Today"-Flag analog Next Week/Someday/Warten auf, das **über Nacht verfällt**. Abgestimmt: Mobile bekommt eigenen Heute-Tab; Today setzen ⇒ ★ Nächste Aktion + verlässt Someday.

## 2. Architektur
Ein Feld `todayDate: string | null` (lokaler dateKey des Setz-Tages, DB `today_date TEXT` via ensureColumns-Migration). Aktiv ⇔ `todayDate === dateKey(now)` (`isTodayFlagActive` in [src/selectors.ts](../../src/selectors.ts)) → Verfall automatisch, kein Mitternachts-Job. GTD-Invarianten in `gtdInvariants` erweitert; Outbox-Fix: `updateTask` enqueued korrigierten Patch.

## 3. Implementierung
Web: ☀️-Button im Detail-Panel, Row-Icon, Bulk-Aktion, Such-Keywords, Mitternachts-Tick. Mobile: Heute-Tab (Today.tsx, Navigation, MobileApp), QuickAdd-Seeding, Detail-Toggle, Row-Icon. Server: Spalte + Mapping in allen Routen.

## 4. Testdesign
`docs/testcases.json`: TC-A02 (auto, scripts/todayflag.test.ts), TC-M13 (Heute-View manuell).

## 5. Testausführung & Gate
2026-07-04: Auto-Tests pass, Builds pass, API-Roundtrip am Dev (:3002) inkl. Migration-Log verifiziert. **GATE: GO**

## 6. CI/CD & Deployment
Commit `43db2b2` auf master. Deploy durch User nach Testreport-Approve.

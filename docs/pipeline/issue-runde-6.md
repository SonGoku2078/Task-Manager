# Runde 6: #8 Evernote-Integration (Notiz-Verlinkung)

| Feld | Wert |
|---|---|
| Status | done (Deeplink-Öffnen = Gerätetest beim User) |
| Nächste Rolle | User (Web-Release + APK-Test) |
| Owner-Rolle | fullstack |
| Datum | 2026-07-09 |

## 1. Requirements
Evernote ist das Archiv; aus Tasks soll **auf Notizen darin verwiesen** werden (#8). Abgestimmt (nach dem zurückgestellten Status): **kein API-Sync** (Evernote-API zu stark eingeschränkt), sondern **Notiz-Links** — first-class am Task, **beide Formate** (Web `https://…evernote.com/…` + Deeplink `evernote:///view/…`), auf **Web und Mobile**.

## 2.–3. Architektur & Implementierung
- **Kein neues Server-Schema nötig**: Der bestehende `TaskLink` (`links`-Spalte, JSON) wird um die Variante `type: 'evernote'` (+ `url`, `title`) erweitert; der Server round-trippt die JSON-Objekte unverändert, `addTaskLink`/`removeTaskLink` funktionieren generisch (id = generierte uid). [src/types.ts](src/types.ts)
- **Erkennung** als reine, unit-getestete Funktion: [src/evernote.ts](src/evernote.ts) — `isEvernoteUrl` (evernote:/// & (www.|app.)evernote.com), `isEvernoteDeepLink`, `DEFAULT_EVERNOTE_TITLE`.
- **Web-UI**: [src/components/TaskDetailPanel.tsx](src/components/TaskDetailPanel.tsx) — in „Verknüpfungen" ein grüner 🐘-Chip als `<a href>` (Web → `target=_blank`; Deeplink → OS/App) + Entfernen; darunter eine Eingabe (Link + optionaler Titel + „+ Evernote", Ungültig-Guard). (+ `.detail-link-evernote`/`.detail-evernote-add` CSS)
- **Mobile-UI**: [apps/mobile/src/components/TaskDetailModal.tsx](apps/mobile/src/components/TaskDetailModal.tsx) `LinksSection` analog; Shim `apps/mobile/src/evernote.ts` → `../../../src/evernote`. (+ `.m-link-evernote` CSS)

## 4. Testdesign
- Auto: **TC-A09** (`scripts/evernote.test.ts`) — Erkennung Web/Deeplink + Negative (Lookalike-Host, leer). In `npm test` + `run-tests.mjs`.
- Manuell/Playwright: **TC-M63** — hinzufügen/anzeigen/öffnen/persistieren/entfernen (Web); Deeplink-Öffnen = Gerätetest.

## 5. Testausführung & Gate
- `npm test` grün (inkl. TC-A09), Builds Web/Server/**Mobile** grün.
- **Playwright/Dev 11/11**: Eingabe vorhanden; ungültige URL → Hinweis, kein Chip; Web-Link → 🐘-Chip als `<a>` mit korrekter `href` + `target=_blank` + Titel; Deeplink → zweiter Chip mit `evernote:///`-href; **beide Links serverseitig in `task.links` persistiert**; Entfernen reduziert korrekt.
- **GATE: GO für Code.** Das tatsächliche Öffnen des **`evernote:///`-Deeplinks** (öffnet die Evernote-Desktop-/Android-App) = Gerätetest durch den User.

## 6. CI/CD & Deployment
Web-Änderung **und** Mobile-Änderung → Web-Deploy durch User (`npm run release`) **und** neuer APK via `mobile-v*`-Tag (Gerätetest Deeplink/Verlinkung). Commit mit Ref #8; Issue #8 geschlossen.

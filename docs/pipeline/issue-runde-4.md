# Runde 4: #34 (Share→Task) + #33 (Kalender einklappen) + #32 (Inbox-Projektpanel) + #35 (Subtasks wandern mit)

| Feld | Wert |
|---|---|
| Status | done (Gerätetest #34 beim User offen) |
| Nächste Rolle | User (Web-Release + APK-Test #34) |
| Owner-Rolle | fullstack + cicd-engineer |
| Datum | 2026-07-06 |

## 1. Requirements
- **#34** (Mobile, abgestimmt): Beim Teilen einer Notiz/Website in die App wird ein Task erzeugt. (a) Instagram/X liefern nur die URL (kein Subject) → die nackte URL landete fälschlich im Titel. Neu: URL immer in die **Notiz**, Titel = erste Textzeile bzw. Subject, sonst **leer + Autofokus** (User tippt das Thema). Kein Online-Titel-Fetch. (b) Standard-Projekt ist Inbox → **Suchfeld** statt Dropdown, um andere Projekte (inkl. Someday/inaktiv) zu wählen.
- **#33** (Web): In der Projektsicht soll das Kalender-Panel **standardmäßig eingeklappt** sein.
- **#32** (Web, nur Web): Aus der Inbox Tasks per **Panel links** einem Projekt zuweisen (analog Projektsicht, aber mit **allen** Projekten inkl. Someday/inaktiv) statt über das Dropdown im Task.
- **#35** (Bug): Beim Verschieben eines Haupttasks in ein Projekt blieben die **Subtasks in der Inbox** zurück. Sie sollen mitwandern.

## 2.–3. Architektur & Implementierung
| Thema | Ansatz | Dateien |
|---|---|---|
| #34 Titel/Notiz-Ableitung | Reine, testbare Funktion `deriveShareFields(payload)`: URL(s) per Regex aus dem Text ziehen → Notiz; Titel = `subject \|\| ersteTextzeile`, **nie** die nackte URL. `import type` auf `SharedPayload`, damit der tsx-Test @capacitor/core nicht lädt. | `apps/mobile/src/shareFields.ts` (neu) |
| #34 Share-UI | `ShareCapture`: `initial`-useMemo → `deriveShareFields`; Titel-`<input>` behält `autoFocus` (leer → Cursor steht im Feld); `save()`-Fallback „Geteilte Aufgabe". Projekt-`<select>` → Suchfeld + gefilterte Projekt-Buttons (`visibleProjects`, inkl. Someday), Inbox-Option oben, gewählter Name angezeigt. | `apps/mobile/src/components/ShareCapture.tsx`, `apps/mobile/src/styles.css` |
| #33 Kalender-Default | `projCalShown` war lokaler `useState(true)` → persistiertes Numeric-Setting `projectCalendarShown` (Default 0 = eingeklappt). Toggle → `patchSettings({ projectCalendarShown })`. | `src/types.ts`, `server/src/routes/settings.ts` (NUMERIC_KEYS), `src/App.tsx` |
| #32 Inbox-Panel | Neuer `ProjectsPanel`-`mode='all'`: wie `'projects'` (aktive + Areas + Archiv), plus eine **Someday-Sektion**, damit wirklich alle Projekte als Ziel sichtbar sind. `onClose`-Prop (✕ im Header). In der Inbox gerendert (`inboxProjectPanel`-Setting, Default 1) + 📂-Toggle in `task-header-right`. Sidebar kollabiert in der Inbox, wenn das Panel offen ist. | `src/App.tsx`, `src/components/ProjectsPanel.tsx`, `src/components/Sidebar.tsx`, `src/types.ts`, `server settings` |
| #35 Subtasks folgen | `updateTask`: wird bei einem Root-Task (`!before.parentId`) `projectId` geändert, bekommen alle direkten Kinder dieselbe `projectId` (lokal + `enqueue('task.update')`). Deckt automatisch auch die #32-DnD-Zuweisung ab. | `src/store.ts` |

Die Panel-Settings sind numerisch (1/0) — umgeht das Bool-als-String-Problem des Settings-Sync (nur NUMERIC_KEYS/JSON_KEYS werden serverseitig zurück-gecastet).

## 4. Testdesign
- Auto: TC-A07 (`scripts/sharefields.test.ts`) — nur-URL → Titel leer + URL in Notiz; Textzeile → erste Zeile Titel; Subject → Subject als Titel; Mehrzeiler → Zusatzzeilen + URL in Notiz. In `npm test` + `run-tests.mjs` eingehängt.
- Manuell/Playwright: TC-M51 (#33), TC-M52 (#32 Panel + Someday), TC-M53 (#32/#35 DnD → parent+sub projectId), TC-M54 (#34 Share-UI, Gerätetest).

## 5. Testausführung & Gate
- **npm test 5/5** grün (recurrence, todayflag, ics, widgetmeta, sharefields). Builds Web/Server/Mobile ✓.
- **Playwright gegen Dev (:5173 / :3002)**, 10/10 Checks PASS:
  - #33: `.calendar-mid-dock` initial 0 → 📅-Toggle → 1 → Reload bleibt 1 (persistiert).
  - #32: `.projects-panel` „Zu Projekt zuweisen" in der Inbox sichtbar, inkl. Someday-Projekt; 📂-Toggle blendet aus.
  - #32/#35: Fixture-Task per synthetischem DnD auf ein Projekt gezogen → serverseitig bekommen **Haupttask UND Subtask** `projectId=r4-proj`.
- **GATE: GO für Code.** Native Share-Bedienung (#34: Autofokus, Projekt-Suche im Android-Share-Sheet) = Gerätetest durch User nach `mobile-v*`-Release.

## 6. CI/CD & Deployment
- Web (#33/#32/#35): Deploy durch User via `npm run release` nach Freigabe auf der 🧪 Testreport-Seite.
- Mobile (#34): `mobile-v0.5.7`-Tag → GitHub-Actions-APK-Build; Gerätetest des Share-Flows durch User.

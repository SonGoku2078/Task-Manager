# Runde 3: #31 (Testreport nur DEV) + #30 (Reminder + Home-Screen-Widget)

| Feld | Wert |
|---|---|
| Status | done (Gerätetest #30 beim User offen) |
| Nächste Rolle | User (APK-Test) |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-06 |

## 1. Requirements
- **#31**: 🧪 Testreport ist ein Dev-Werkzeug → auf PROD ausblenden.
- **#30** (abgestimmt): (a) Fällige Tasks als Benachrichtigung — zur Uhrzeit + tägliche 08:00-Übersicht; (b) natives Android-Widget mit wählbarer Ansicht (Heute/Next Week/Nächste Aktion/Inbox), Tap → grüner Haken, Kopf-Button erledigt die markierten (Mehrfachauswahl). Ich verifiziere bis zum APK-Build; Gerätetest durch User.

## 2.–3. Architektur & Implementierung
| Thema | Ansatz | Commit |
|---|---|---|
| #31 | Sidebar-`devOnly`-Flag, Env via `GET /api/lan` (Port 3002) | 950ca1e |
| Reminder | `apps/mobile/src/notifications.ts` (@capacitor/local-notifications): pending stornieren → Uhrzeit-Notifications (id = task.number) + tägliche 08:00-Übersicht; Re-Scheduling debounced nach jedem Sync; Permission-Request beim Start | 26d9236 |
| Widget-Datenbrücke | `widgetBridge.ts`: Snapshot (serverUrl + 4 Views, je ≤40 offene Tasks) via @capacitor/preferences → SharedPreferences "CapacitorStorage"; `WidgetRefresh`-Plugin stößt Redraw an | 26d9236 |
| Widget nativ | `TaskWidgetProvider` (RemoteViews-Header mit ✓-N-erledigen + ↻, ListView, PendingIntent-Template), `TaskWidgetService` (Factory liest Snapshot + Auswahl; grüner Haken pro selektierter Zeile), `TaskWidgetConfigActivity` (Ansicht wählen), Manifest-Einträge, `task_widget_info.xml` (30-min-Autoupdate, resizable) | 26d9236 |
| Erledigen aus dem Widget | Hintergrund-Thread → `POST /api/tasks/:id` mit `X-HTTP-Method-Override: PATCH` (HttpURLConnection kann kein PATCH) — Server-Middleware übersetzt; danach Snapshot lokal bereinigt + Widgets aktualisiert | 26d9236 |
| **Nebenbefund gefixt** | `apps/mobile/package.json` hatte keine dependencies → `cap sync` registrierte NIE native Plugins; selbst @capacitor/app (Hardware-Zurück) war bisher nur JS. Jetzt registriert: app, local-notifications, preferences | 26d9236 |

## 4. Testdesign
TC-M42–TC-M45 in `docs/testcases.json` (M45 = Gerätetest, bleibt offen bis User-Rückmeldung).

## 5. Testausführung & Gate
- #31: Playwright — DEV zeigt Menüpunkt, simuliertes PROD (Port-Mock 3001) versteckt ihn. ✓
- #30: Mobile-Web-Smoke 0 Fehler; Widget-Snapshot nachweislich publiziert (serverUrl + today-Liste). Builds Web/Server/Mobile ✓. APK-Build via GitHub Actions (workflow_dispatch) — kompiliert die Java-Klassen.
- **GATE: GO für Code**; native Funktion (Notification-Verhalten, Widget-Bedienung) = Gerätetest durch User nach `mobile-v*`-Release.

## 6. CI/CD & Deployment
Commits gepusht (origin/master aktualisiert — nötig für den CI-APK-Build). Web-Release + mobile-Tag nach User-Go.

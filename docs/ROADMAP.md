# Roadmap & Anforderungs-Status

Stand: 2026-06-18. Der Klon ist aktuell **lokal-first** (React/Vite/Zustand, Daten in
`localStorage` via `persist`). Diese Datei hält fest, welche Anforderungen **jetzt lokal**
umgesetzt sind und welche **einen Server/DB brauchen** (nur vorbereitet/dokumentiert).

## ✅ Umgesetzt (lokal)

| Anforderung | Status | Wo |
|---|---|---|
| Eindeutige Task-Nummer `#N` | ✅ | `Task.number`, `nextTaskNumber` (store), persist v2 `migrate` |
| Vollwertige Unteraufgaben (eigene Nummer/URL, datierbar) | ✅ | `Task.parentId`, `addSubtask`, kaskadiertes `deleteTask`, `TaskDetailPanel` |
| Änderungshistorie (Versionskontrolle, feldgenau) | ✅ | `ActivityEntry` (kind/field/from/to), `updateTask`-Diff, `ActivityLog.tsx` (Menü „Aktivität") |
| „Erledigt"-Ansicht mit Filter + Sortierung | ✅ | View `completed`, `FilterBar` (Projekt/Kategorie/Priorität/Status/**Datum**) + Sortierung |
| Filter nach Kategorie + Datumsbereich | ✅ | `Filters.categoryId` (UI ergänzt), `Filters.dueFrom/dueTo`, `selectors.matchesFilters` |
| Screenshots/Dateien per Paste anhängen | ✅ | `onPaste` im Detail-Panel; Limit 1.5 MB/Datei + Warnung |
| URL-Referenz je Aufgabe (`#/t/<nr>`) + „Link kopieren" | ✅ | `src/config.ts` (`taskShareUrl`, `parseTaskHash`), Hash-Routing in `App.tsx` |
| Erledigte Aufgaben grau / Mehrtages-Kalender / kontextuelles Panel | ✅ | frühere Iterationen |

## 🕓 Vorbereitet, aber erst mit Server/DB voll funktionsfähig

| Anforderung | Warum Server nötig | Vorbereitung (Tauschpunkt) |
|---|---|---|
| **Echtes Sharing per URL** (andere Geräte/Nutzer öffnen die Aufgabe) | Daten liegen nur im lokalen `localStorage`; fremde Browser kennen sie nicht. Braucht Backend + Persistenz + Auth. | URL-Schema steht. **`BASE_URL` in `src/config.ts`** ist der einzige Tauschpunkt (lokal `''` → später `https://…`). Routing/Copy-Link funktionieren dann unverändert. |
| **Anhänge-Hosting** (große Dateien, stabile URLs) | base64 in `localStorage` ist auf ~5 MB gesamt begrenzt. | `Attachment.url?` existiert bereits: später Upload → `url` setzen statt `dataUrl`. UI kann beide rendern. |
| **Geräteübergreifende Synchronisation** | Kein gemeinsamer Speicher. | Store-Actions sind die einzige Mutations-Schicht → später leicht gegen API-Calls/Optimistic-Sync austauschbar. |
| **Mehrbenutzer-Rechte real durchsetzen** | Aktuell sind Rollen (`Member`) nur organisatorisch. | Datenmodell (Member/Rolle/Assignee) vorhanden. |
| **Live-`webcal://`-Kalender-Abo** | Auto-aktualisierender Feed muss serverseitig generiert/gehostet werden. | Lokal gibt es `.ics`-Export (`src/ics.ts`); serverseitig dieselbe Logik als Endpoint. |
| **Native Mobile App / Touch-Gesten** | Eigener Build-Target bzw. Touch-Hardware. | — (separates Epic) |

## Migrations-Leitfaden (lokal → Server)
1. **Persistenz:** zustand-`persist` (localStorage) → API-/DB-Layer; `partialize`-Felder bleiben das Schema.
2. **`BASE_URL`** in `src/config.ts` auf die Server-Domain setzen → Share-Links sind sofort extern gültig.
3. **Anhänge:** beim Hinzufügen Upload → `Attachment.url`; `dataUrl` nur noch Fallback.
4. **Auth/Rollen:** `Member`/`role`/`assigneeId` an echte Nutzer/Permissions koppeln.
5. **Aktivität/Historie:** `activityLog` serverseitig persistieren (Audit-Trail).

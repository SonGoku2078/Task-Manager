# ICS-Feed oeffentlich machen (Proton Calendar) — #61

Ziel: Proton Calendar (online) abonniert den Task-Feed. Dafuer braucht Proton eine
**oeffentlich erreichbare HTTPS-URL** — der Server steht aber im Heimnetz.

Loesung: **NetBird Reverse Proxy** stellt genau eine Route ins Internet, davor
haengt ein **Pfad-Filter**, damit niemals die ganze App exponiert wird.

```
Proton Calendar  ──HTTPS──▶  NetBird Reverse Proxy  ──▶  ics-proxy (nginx)  ──▶  taskmanager:3001
   (Internet)                 (TLS, oeffentl. Domain)     nur GET /calendar/<token>.ics    (nie direkt oeffentlich)
```

**Warum der Filter Pflicht ist:** Die App hat keine Authentifizierung. Wuerde der
NetBird-Dienst direkt auf `taskmanager:3001` zeigen, waeren `/api/tasks` & Co. fuer
jeden im Internet lesbar UND schreibbar. Der Filter laesst ausschliesslich den
Feed-Pfad durch; der geheime Token in der URL bleibt der Zugriffsschutz (Proton
kann sich nicht anmelden).

---

## 1. Filter-Proxy einrichten (auf dem Server)

```bash
ssh dante@192.168.8.50
cd ~/server
git -C taskmanager pull            # bringt deploy/ics-proxy/ mit
```

Den Dienst aus `taskmanager/deploy/ics-proxy/compose.snippet.yml` in den
`services:`-Abschnitt von `~/server/docker-compose.yml` uebernehmen, dann:

```bash
docker compose up -d ics-proxy
docker compose ps ics-proxy         # muss "running" zeigen
```

Der Port ist absichtlich nur an `127.0.0.1:8088` gebunden — weder LAN noch
Internet kommen direkt heran, nur der NetBird-Agent auf demselben Host.

**Direkt auf dem Server gegenpruefen:**

```bash
TOKEN=$(curl -s localhost:3001/api/calendar-feed | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -s -o /dev/null -w "Feed:   %{http_code}\n" "localhost:8088/calendar/$TOKEN.ics"   # 200
curl -s -o /dev/null -w "API:    %{http_code}\n" "localhost:8088/api/tasks"             # 404
curl -s -o /dev/null -w "Root:   %{http_code}\n" "localhost:8088/"                      # 404
```

## 2. NetBird-Service anlegen (NetBird Cloud)

Im Dashboard auf [app.netbird.io](https://app.netbird.io):

1. Sicherstellen, dass der Server (`192.168.8.50`) als **Peer** verbunden ist.
2. **Reverse Proxy → Service anlegen** (persistent, *nicht* das ephemere
   `netbird expose` — das laeuft nur, solange das Kommando offen ist).
3. Ziel: der Filter-Proxy auf diesem Peer — **`127.0.0.1:8088`**, Protokoll HTTP.
4. NetBird vergibt Domain + TLS-Zertifikat. Die oeffentliche URL notieren.

Die Feed-URL lautet dann:

```
https://<netbird-domain>/calendar/<token>.ics
```

Den Token zeigen die App-Einstellungen (Web + Mobile, Abschnitt Kalender-Feed).

## 3. Absicherung pruefen (Pflicht vor dem Abo)

Vom Arbeitsrechner aus:

```bash
node scripts/verify-ics-public.mjs "https://<netbird-domain>/calendar/<token>.ics"
```

Erwartet: **9/9 bestanden** — Feed liefert einen gueltigen Kalender, falscher
Token gibt 404, und `/`, `/api/tasks`, `/api/projects`, `/health`, `/calendar/`
sind von aussen **nicht** erreichbar; POST wird abgewiesen.

> Schlaegt eine "nicht erreichbar"-Pruefung fehl, zeigt der NetBird-Dienst auf
> den Server statt auf den Filter — Dienst sofort stoppen und Ziel korrigieren.

## 4. In Proton Calendar abonnieren

Proton Calendar → **Andere Kalender → Kalender hinzufuegen → Aus URL abonnieren**
→ die HTTPS-Feed-URL einfuegen.

Proton legt das Aktualisierungsintervall selbst fest (typisch mehrere Stunden) —
Aenderungen erscheinen also verzoegert. Das ist eine Eigenschaft von Proton, kein
Fehler des Feeds.

## Betrieb

- **Token wechseln** (falls die URL je durchsickert): Eintrag `icsToken` in der
  Settings-Tabelle loeschen — beim naechsten Aufruf der Einstellungen entsteht ein
  neuer Token. Danach das Proton-Abo mit der neuen URL neu anlegen.
- **Abschalten**: `docker compose stop ics-proxy` plus NetBird-Service im Dashboard
  entfernen.
- Der Feed enthaelt alle Tasks mit Faelligkeitsdatum (offene und erledigte, mit
  `✓`-Praefix) — wer die URL hat, sieht diese Titel. Deshalb behandeln wie ein
  Passwort.

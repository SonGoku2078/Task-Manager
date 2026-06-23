# SelfManaged – Protonmail → Task (Brave/Chromium-Erweiterung)

Hängt die gerade in Protonmail geöffnete E-Mail als Aufgabe an die SelfManaged-App
an. MVP, Manifest V3 – läuft in Brave, Chrome und Edge.

## Funktionsweise

Da SelfManaged (noch) kein Backend hat und seinen Zustand im `localStorage` hält,
übergibt die Erweiterung die Aufgabe per **Deep-Link** an die App:

```
<App-URL>/#/add?title=<Betreff>&note=<Absender + Link + Auszug>
```

Die App (`src/App.tsx` → `parseAddTaskHash` in `src/config.ts`) erkennt diesen
Hash beim Laden, legt die Aufgabe in der **Inbox** an, öffnet sie und bereinigt
anschließend die URL.

## Installation (Entwicklermodus)

1. Brave öffnen → `brave://extensions`
2. Oben rechts **Entwicklermodus** aktivieren.
3. **Entpackte Erweiterung laden** → diesen Ordner
   (`apps/brave-protonmail-task`) wählen.
4. Erweiterung anpinnen.
5. Über **Optionen** die App-URL setzen (Standard `http://localhost:5173`).

## Nutzung

1. In Protonmail (`https://mail.proton.me`) eine E-Mail öffnen.
2. Auf das Erweiterungs-Icon klicken.
3. Titel/Notiz ggf. anpassen → **Zu SelfManaged hinzufügen**.
4. Ein Tab mit der App öffnet sich, die Aufgabe liegt in der Inbox.

## Grenzen / TODO

- Die Auslese-Selektoren in `extract.js` sind heuristisch; Proton ändert sein DOM
  gelegentlich. Bei Fehlbetreff dort die Selektoren nachziehen.
- Öffnet pro Aufgabe einen neuen Tab. Später: bestehenden App-Tab fokussieren
  bzw. – sobald ein Backend existiert – direkt per API anlegen.
- Keine eigenen Icons hinterlegt (optional in `manifest.json` ergänzbar).

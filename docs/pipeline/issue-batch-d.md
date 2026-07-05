# Batch D: Attachments-UX (#4, #25, #5) + Pomodoro (#3)

| Feld | Wert |
|---|---|
| Status | done |
| Nächste Rolle | — |
| Owner-Rolle | cicd-engineer |
| Datum | 2026-07-06 |

## 1. Requirements
- **#4/#25**: Bilder im Task ansehen ohne Download — kleine Vorschau, Klick → Großansicht mit Download-Option; Dateien per Ctrl+V (existierte bereits).
- **#5**: Dateien per Drag&Drop an Tasks anhängen.
- **#3**: Pomodoro-Timer (25/5, Langpause nach 4 Runden; Intervalle einstellbar; Start/Pause/Reset/Skip; Countdown im Header; Benachrichtigung + Ton). Optionale Teile (Task-Kopplung, Tagesstatistik) bewusst zurückgestellt — bei Bedarf neues Issue.

## 2.–3. Architektur & Implementierung
| Thema | Ansatz | Commit |
|---|---|---|
| Thumbnails + Lightbox | `attach-thumbs`-Grid für image/*-Anhänge; Lightbox-Overlay (Escape im Capture-Mode, damit das Panel offen bleibt); Nicht-Bilder behalten den Download-Link | 6b80d1c |
| Drag&Drop | Datei-Drop-Handler auf dem Panel-Root (nur bei `Files` im DataTransfer, Task-Drags unberührt), visuelles Outline-Feedback | 6b80d1c |
| **Zusatzbefund/Datenverlust-Fix**: `addAttachment`/`deleteAttachment` enqueueten nie → Anhänge (auch via bestehendem Paste!) verschwanden beim Reload | beide Actions enqueuen jetzt das attachments-Patch | 6b80d1c |
| Pomodoro | Runtime-State im Store (absolute `endsAt` → driftfrei, überlebt View-Wechsel); Widget im Header (▶⏸⏭⟲, Rundenzähler); WebAudio-Beep + Browser-Notification am Phasenende; 4 Einstellungen in SettingsView, persistiert via settings.patch (Server-NUMERIC_KEYS erweitert) | 6b5351f |

## 4. Testdesign
TC-M34–TC-M36 in `docs/testcases.json` (TC-M35 als Regression markiert — Anhang-Persistenz).

## 5. Testausführung & Gate
- Auto: npm test 3/3 pass, Builds Web/Server/Mobile pass (2026-07-06).
- Manuell (Playwright, Dev :3002): Thumbnail/Lightbox/Escape ✓, Datei-Drop → serverseitig 2 Anhänge ✓, Pomodoro-Countdown/Skip/Settings ✓.
- **GATE: GO**

## 6. CI/CD & Deployment
Commits auf master; Deploy nach Testreport-Approve durch User.

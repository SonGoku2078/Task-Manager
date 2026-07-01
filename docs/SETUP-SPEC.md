# Setup-Spec: Dev/Test-Umgebung + CI/CD + manuelle Prod-Freigabe

Portable Beschreibung des kompletten Setups, damit es **1:1 in ein anderes Projekt übertragen**
werden kann: zwei getrennte Umgebungen (Dev/Test ↔ Produktion), die GitHub-Actions-Pipelines, die
**manuelle Freigabe** vor jedem Prod-Release, der signierte Mobile-APK-Flow und die
Skill-/Agenten-Pipeline (inkl. `cicd-engineer`).

> Konventionen hier: **Prod-Backend = Port 3001 + `data.db`**, **Dev/Test-Backend = Port 3002 +
> `dev.db`**. Ports/Namen sind frei wählbar — wichtig ist die **Trennung**.

---

## 1. Zwei-Umgebungen-Modell

| | Dev / Test | Produktion |
|---|---|---|
| Zweck | Entwickeln & Testen | Echte Daten |
| Backend-Port | `3002` | `3001` |
| Datenbank | `dev.db` | `data.db` |
| Frontend (Desktop) | Vite Dev-Server `:5173` | vom Express-Server ausgeliefert (`server/public`) |
| Frontend (Mobile) | Vite Dev-Server `:5174` | im APK gebündelt |
| `VITE_APP_ENV` | `development` | `production` |
| `VITE_API_URL` | `http://localhost:3002` | *(leer → same-origin)* |
| Start | `npm run dev:server` + `npm run dev` | `npm run start:prod` |

**Eiserne Regel:** Dev/Test fasst **niemals** `data.db` / den Prod-Server an. Getrennte DB-Dateien +
getrennte Ports garantieren das. (Im realen Betrieb: den Prod-Server beim Entwickeln nie
stoppen/neu starten — Änderungen gehen nur über den Release-Flow unten nach Prod.)

### Env-Dateien (Vite lädt sie automatisch nach `--mode`)

`.env.development` (genutzt von `vite` / `vite build --mode development`):
```dotenv
VITE_APP_ENV=development
VITE_API_URL=http://localhost:3002
```

`.env.production` (genutzt von `vite build`, Default-Mode `production`):
```dotenv
VITE_APP_ENV=production
# leer → API-Calls gehen an dieselbe Origin, die die App ausgeliefert hat (Prod-Server)
VITE_API_URL=
```

### npm-Scripts (root `package.json`)
```jsonc
"dev":        "vite",                                   // Desktop Dev-Frontend :5173
"dev:server": "cd server && npm run dev",               // Dev-Backend :3002 / dev.db
"build":      "tsc -b && vite build && cd server && npm run build",
"start:prod": "npm run build && cross-env DB_FILE=data.db PORT=3001 node server/dist/index.js",
"dev:mobile": "vite --config apps/mobile/vite.config.ts",   // Mobile Dev :5174
"build:mobile":"vite build --config apps/mobile/vite.config.ts"
```

Server (`server/package.json`) — die Trennung passiert über Env-Vars beim Start:
```jsonc
"dev":   "cross-env DB_FILE=dev.db PORT=3002 ts-node-dev --respawn --transpile-only src/index.ts",
"build": "tsc",
"start": "node dist/index.js"          // Prod startet mit DB_FILE=data.db PORT=3001 (s. start:prod)
```
Der Server liest `process.env.DB_FILE` und `process.env.PORT` — sonst nichts Umgebungsspezifisches.

### Vite-Proxy (nur Dev) — `vite.config.ts`
```ts
server: { proxy: {
  '/api':    { target: 'http://localhost:3002', changeOrigin: true },
  '/health': { target: 'http://localhost:3002', changeOrigin: true },
}},
build: { outDir: 'server/public', emptyOutDir: true }   // Prod-Build landet dort, wo der Server serviert
```
Mobile (`apps/mobile/vite.config.ts`): eigener Port `5174`, `host: true` (Handy im WLAN),
`build.outDir = dist/mobile`, proxyt ebenfalls auf `:3002`.

---

## 2. CI/CD-Pipelines (GitHub Actions)

Vier Workflows unter `.github/workflows/`:

| Datei | Trigger | Zweck |
|---|---|---|
| `ci.yml` | push/PR auf `master` | Build + Typecheck-Gate (fängt Breaking Changes) |
| `release.yml` | Tag `v*` | Prod-Bundle bauen **+ manuelle Freigabe** → GitHub Release |
| `mobile-apk.yml` | Tag `mobile-v*` | Stabil-signiertes Android-APK → an Release anhängen |
| `gen-keystore.yml` | manuell (1×) | Signing-Keystore erzeugen |

### 2.1 `ci.yml` — Build-Gate
```yaml
on: { push: { branches: [master] }, pull_request: { branches: [master] } }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24 }
      - run: npm install
      - run: npm install
        working-directory: server
      - name: Typecheck + build (frontend + server)
        run: npm run build
```

### 2.2 `release.yml` — Prod-Release MIT manueller Freigabe
Zwei Jobs. Job 1 baut immer das Bundle; Job 2 (`publish-production`) ist durch die **GitHub-Environment
`production`** gated und **wartet auf manuelle Bestätigung**.
```yaml
on: { push: { tags: ['v*'] } }
permissions: { contents: write }
jobs:
  build:                       # baut + zippt das Prod-Bundle, lädt es als Artifact hoch
    runs-on: ubuntu-latest
    steps: [ checkout, setup-node@24, npm install (root+server), npm run build,
             "Assemble bundle" (server/dist + public + START-PROD.cmd → zip), upload-artifact ]

  publish-production:          # <-- die Freigabe-Stufe
    needs: build
    runs-on: ubuntu-latest
    environment: production    # ⟵ DAS ist der manuelle Gate (required reviewer)
    permissions: { contents: write }
    steps:
      - uses: actions/download-artifact@v4
        with: { name: prod-bundle }
      - uses: softprops/action-gh-release@v2
        with: { generate_release_notes: true, files: selfmanaged-${{ github.ref_name }}.zip }
```

### 2.3 Die **manuelle Freigabe** einrichten (einmal pro Repo)
1. GitHub → Repo → **Settings → Environments → New environment** → Name exakt `production`.
2. Im Environment **„Required reviewers"** aktivieren und **dich selbst** (bzw. die Freigabe-Person)
   hinzufügen. Speichern.
3. Fertig. Jeder Job mit `environment: production` **pausiert** nun und wartet, bis ein Reviewer im
   **Actions-Run → „Review deployments" → Approve** klickt. Ohne Klick kein Prod-Release.

**Ablauf eines Prod-Releases:**
```bash
git tag -a v0.1.0 -m "Release 0.1.0" && git push origin v0.1.0
# → release.yml startet, baut das Bundle, und HÄLT bei publish-production an.
# → In GitHub: Actions → Run öffnen → "Review deployments" → production ✓ Approve.
# → Erst dann wird das GitHub Release veröffentlicht.
```
Mehrere Änderungen sammeln = einfach erst taggen, wenn alles drin ist. Notfall-Fix vorziehen =
früher taggen. Der Gate bleibt immer derselbe.

### 2.4 Mobile-APK-Flow (stabil signiert + In-App-Update)
- **Einmalig:** `gen-keystore.yml` manuell starten (Actions → Run) → Artifact `keystore.b64`
  herunterladen → als Secret setzen:
  ```bash
  gh secret set ANDROID_KEYSTORE_B64 < keystore.b64
  ```
  ⚠️ **Gotcha:** Secret per Tool/Shell setzen, die **rohe Bytes** schickt (z.B. Git-Bash/`<`).
  PowerShell `Get-Content | gh secret set` kann ein **BOM** voranstellen → `base64: invalid input`.
  Defensive im Workflow: vor dem Dekodieren alles Nicht-Base64 strippen:
  `printf '%s' "$SECRET" | tr -cd 'A-Za-z0-9+/=' | base64 -d > keystore`.
- `apps/mobile/android/app/build.gradle`: `signingConfigs.release` nutzt den Keystore; `versionCode`
  = `-PversionCode` (CI `run_number`, monoton), `versionName` = `-PversionName` (Tag).
- `mobile-apk.yml` (Tag `mobile-v*`): Web bauen mit `VITE_APP_VERSION=<tag>` → `cap sync android` →
  `assembleRelease` signiert → `app-release.apk` ans Release hängen.
- In-App-Update: `apps/mobile/src/update.ts` fragt die GitHub-Releases-API nach dem höchsten
  `mobile-v*`-Tag, vergleicht mit der gebackenen Version und bietet den APK-Download an. **Gleicher
  Keystore über alle Builds** → Updates installieren **in-place** (kein Deinstallieren, wichtig auf
  GrapheneOS).

### 2.5 Lokaler Release (`npm run release`) — Freigabe ohne Hoster
Für einen **lokal laufenden Prod-Server** (`npm run start:prod`, `localhost:3001`, DB in
`~/.task-manager/`) braucht es den GitHub-Gate nicht — „Deploy" heißt hier nur *bauen + lokalen Server
neu starten*. Das erledigt `scripts/release.ps1` (`npm run release`), mit dir als Freigeber:
1. bricht ab, wenn der Working-Tree nicht sauber ist (deployt exakt das Committete);
2. zeigt die Commits seit dem letzten `v*`-Tag;
3. `npm run build` + `npm test` (fail-fast — kein Deploy bei Rot);
4. fragt Version + eine **explizite Freigabe** (`j/N`);
5. setzt ein lokales Tag, stoppt den alten Prod auf `:3001`, startet den frisch gebauten in einem
   eigenen Fenster und pollt `/health` bis „OK".

Vorschau ohne irgendetwas anzufassen: `npm run release -- -DryRun`. Daten sicher (gleiche `data.db` +
Auto-Backup beim Start; DB-Pfad `~/.task-manager/`). Deshalb ist **`release.yml` stillgelegt** (nur
noch `workflow_dispatch`) — gepushte `v*`-Tags lösen den alten Gate nicht mehr aus. GitHub bleibt für
Backup (`git push`), den CI-Build-Check und die **Mobile-APKs**.

---

## 3. Skill-/Agenten-Pipeline (`.claude/skills/`)

Feature-Entwicklung läuft als Kette spezialisierter Claude-Skills (jede `SKILL.md` = eine Rolle):
```
req-engineer → architect → developer → test-designer → test-manager (gate) → cicd-engineer → DONE
```
- **`cicd-engineer`** (`.claude/skills/cicd-engineer/SKILL.md`): nimmt das `gate-go` vom Test-Manager,
  reviewt den Feature-Branch, erstellt den PR (`gh pr create`), reviewt/approved, merged nach `main`,
  dokumentiert `## 6. CI/CD & Deployment` im Feature-Artefakt und markiert das Feature `done`.
- Weitere Skills: `product-manager`, `req-engineer`, `architect`, `developer`, `test-designer`,
  `test-manager`, `orchestrator`.

**Mapping auf das Release:** Der `cicd-engineer` bringt Code nach `main`. Das eigentliche **Prod-Deploy**
ist davon entkoppelt und passiert über `release.yml` + manuelle Freigabe (Abschnitt 2.3) — so kann man
mehrere gemergte Features sammeln und gemeinsam taggen/releasen.

---

## 4. Übertragungs-Checkliste (neues Projekt)

1. **Env-Trennung:** `.env.development` / `.env.production` anlegen; Server liest `DB_FILE` + `PORT`;
   Dev nutzt `dev.db`/`3002`, Prod `data.db`/`3001`. npm-Scripts (`dev:server`, `start:prod`) übernehmen.
2. **Vite:** Dev-Proxy auf das Dev-Backend; `build.outDir` = dort, wo der Server das SPA serviert.
3. **`ci.yml`** kopieren (Build/Typecheck-Gate auf push/PR).
4. **`release.yml`** kopieren; Bundle-Schritt an dein Artefakt anpassen.
5. **GitHub-Environment `production`** anlegen + **Required reviewer** setzen (Abschnitt 2.3) — sonst
   greift die manuelle Freigabe nicht.
6. **Mobile (optional):** `gen-keystore.yml` 1× laufen lassen, `ANDROID_KEYSTORE_B64` setzen,
   `build.gradle`-Signing + `mobile-apk.yml` + `update.ts` übernehmen.
7. **Skills:** `.claude/skills/` mitkopieren und Projektname/Pfade in den `SKILL.md` anpassen.
8. **Branch-Schutz (optional):** `main`/`master` schützen, CI als required check.

## 5. Stolpersteine (real aufgetreten)
- **Prod-DB anfassen:** Nie. Strikt über Ports/DB-Dateien trennen; Prod-Server beim Entwickeln in Ruhe lassen.
- **Secret-BOM** beim `gh secret set` (s. 2.4) → defensive Dekodierung im Workflow.
- **SQLite-Lock** (`*.db.lock`) nach Crash kann den Start blockieren → Server entfernt stale Locks beim Start selbst.
- **Numerische Settings** aus SQLite kommen als Strings → beim Laden defensiv `Number()`-coercen.
- **Node 20 deprecation**-Warnungen in Actions sind harmlos (Runner zwingt auf Node 24).

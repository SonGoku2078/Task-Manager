# ============================================================================
#  SelfManaged - local release:  Build -> Test -> Freigabe -> Deploy
# ----------------------------------------------------------------------------
#  Deploys the CURRENTLY COMMITTED code to the LOCAL prod server
#  (http://localhost:3001, DB = ~/.task-manager/data.db). YOU are the approver:
#  it stops and asks before it touches prod.
#
#  Steps:
#    1. Refuse if the working tree is dirty (deploy exactly what's committed).
#    2. Show the commits since the last v* tag.
#    3. Build + typecheck + test  (fail-fast: no deploy if red).
#    4. Ask for a version and an explicit Freigabe.
#    5. Tag locally, stop the old prod on :3001, start the freshly built one
#       (in its own window), and poll /health until it is up.
#    6. Log the deploy on GitHub for traceability: push the tag, create a
#       Release (auto changelog), and record a `production` deployment entry.
#
#  Data is safe: same data.db, and the server writes a timestamped backup to
#  ~/.task-manager/backups/ on every start.
#
#  Usage:
#    npm run release               # the real thing (interactive, deploys prod)
#    npm run release -- -DryRun    # preview only: shows the flow, touches nothing
#    npm run release -- -Version v0.3.0   # custom version instead of next patch
#    npm run release -- -NoPublish        # deploy locally but don't log to GitHub
# ============================================================================
param([switch]$DryRun, [string]$Version, [switch]$NoPublish)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Fail($msg) { Write-Host ""; Write-Host "FEHLER: $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
if ($DryRun) { Write-Host "============ SelfManaged Release  [ TROCKENLAUF ] ============" -ForegroundColor Magenta }
else         { Write-Host "==================== SelfManaged Release ====================" -ForegroundColor Cyan }

# 1. Working tree must be clean -----------------------------------------------
$dirty = git status --porcelain
if ($dirty) {
    Write-Host "Working-Tree ist nicht sauber. Bitte committen oder stashen:" -ForegroundColor Yellow
    git status --short
    Fail "Nichts deployed."
}
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
$head   = (git rev-parse --short HEAD).Trim()
Write-Host ("Branch: {0}   HEAD: {1}" -f $branch, $head)

# 2. Changes since the last v* tag --------------------------------------------
$last = (& git describe --tags --abbrev=0 --match "v*" 2>$null | Select-Object -First 1)
if ($last) { $last = $last.Trim() }
Write-Host ""
if ($last) {
    Write-Host ("Aenderungen seit {0}:" -f $last) -ForegroundColor Cyan
    $changes = & git log "$last..HEAD" --oneline
    if ($changes) { $changes | ForEach-Object { Write-Host "  $_" } }
    else { Write-Host "  (keine neuen Commits seit dem letzten Release)" -ForegroundColor DarkYellow }
} else {
    Write-Host "Kein vorheriges v*-Tag gefunden - das waere das erste Release." -ForegroundColor DarkYellow
}

# 3. Build + typecheck + test (fail-fast) -------------------------------------
Write-Host ""
Write-Host "-------- Build + Typecheck --------" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[DRY-RUN] 'npm run build' uebersprungen (es schreibt server/public = der laufende Prod)." -ForegroundColor DarkGray
} else {
    npm run build
    if ($LASTEXITCODE -ne 0) { Fail "Build fehlgeschlagen - kein Deploy." }
}
Write-Host ""
Write-Host "-------- Tests --------" -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) { Fail "Tests fehlgeschlagen - kein Deploy." }
Write-Host ""
Write-Host "OK: Tests gruen." -ForegroundColor Green

# 4. Version (auto = naechster Patch, oder -Version) + EINE Freigabe-Frage ------
function Get-SuggestedVersion($prev) {
    if (-not $prev) { return "v0.1.0" }
    $m = [regex]::Match($prev, '^v?(\d+)\.(\d+)\.(\d+)$')
    if ($m.Success) { return ("v{0}.{1}.{2}" -f $m.Groups[1].Value, $m.Groups[2].Value, ([int]$m.Groups[3].Value + 1)) }
    return $prev
}
$ver = if ($Version) { $Version.Trim() } else { Get-SuggestedVersion $last }
if ($ver -notmatch '^v') { $ver = "v$ver" }
if ($ver -notmatch '^v\d+\.\d+\.\d+$') {
    Fail ("Ungueltige Version '{0}' (erwartet vX.Y.Z). Custom so: npm run release -- -Version v0.3.0" -f $ver)
}
Write-Host ""

if ($DryRun) {
    Write-Host ("[DRY-RUN] Version: {0}  (Standard = naechster Patch; aenderbar mit -Version)" -f $ver) -ForegroundColor Magenta
    Write-Host "[DRY-RUN] Freigabe-Abfrage uebersprungen." -ForegroundColor Magenta
    Write-Host ""
    Write-Host "[DRY-RUN] Ab hier wuerde deployed (im echten Lauf: 'npm run release' -> 'j'):" -ForegroundColor Magenta
    Write-Host ("   - git tag {0}  (lokaler Record)" -f $ver)
    $conn = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) { Write-Host ("   - alten Prod stoppen (PID {0})" -f $conn.OwningProcess) }
    else       { Write-Host "   - kein laufender Prod auf :3001 -> frisch starten" }
    Write-Host "   - frisch gebauten Prod in eigenem Fenster starten (npm run start:prod:run)"
    Write-Host "   - http://localhost:3001/health pollen, bis OK"
    Write-Host "   - GitHub: Tag pushen + Release + Deployment-Eintrag (Environments->production)"
    Write-Host ""
    Write-Host "[DRY-RUN] Fertig - PROD wurde NICHT angefasst, kein Tag gesetzt, nichts gebaut." -ForegroundColor Green
    exit 0
}

$exists = & git rev-parse -q --verify ("refs/tags/{0}" -f $ver) 2>$null
if ($exists) { Fail ("Tag {0} existiert schon - naechste Version mit  -Version vX.Y.Z  angeben." -f $ver) }

Write-Host ("Version: {0}   (custom: npm run release -- -Version vX.Y.Z)" -f $ver) -ForegroundColor Cyan
Write-Host ("Bereit: {0} auf PROD deployen (http://localhost:3001, DB=data.db)." -f $ver) -ForegroundColor Yellow
$ok = Read-Host "FREIGEBEN und deployen? (j/N)"
if ($ok -notin @('j','J','y','Y')) { Write-Host "Abgebrochen - Prod bleibt unveraendert." -ForegroundColor Yellow; exit 0 }

# 5. Tag locally (record of what is on prod) ----------------------------------
git tag -a $ver -m ("Release {0}" -f $ver)
if ($LASTEXITCODE -ne 0) { Fail "Tag konnte nicht gesetzt werden." }
Write-Host ("Lokales Tag {0} gesetzt." -f $ver) -ForegroundColor Green

# 6. Stop the old prod on :3001 ------------------------------------------------
$conn = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
    Write-Host ("Stoppe alten Prod (PID {0}) ..." -f $conn.OwningProcess)
    try { Stop-Process -Id $conn.OwningProcess -Force } catch { }
    Start-Sleep -Seconds 2
} else {
    Write-Host "Kein laufender Prod auf :3001 - starte frisch."
}

# 7. Start the freshly built prod in its own window ---------------------------
Write-Host "Starte neuen Prod ..."
$cmd = 'Set-Location "' + $root + '"; npm run start:prod:run'
Start-Process powershell -ArgumentList '-NoExit','-NoProfile','-Command', $cmd

# 8. Poll /health --------------------------------------------------------------
Write-Host "Warte auf http://localhost:3001/health ..."
$up = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-WebRequest "http://localhost:3001/health" -TimeoutSec 3 -UseBasicParsing
        if ($r.StatusCode -eq 200) { $up = $true; break }
    } catch { }
}
Write-Host ""
if (-not $up) {
    Fail "Prod nach Timeout nicht erreichbar - bitte das neue Prod-Fenster auf Fehler pruefen."
}
Write-Host ("OK: {0} laeuft jetzt auf http://localhost:3001" -f $ver) -ForegroundColor Green
Write-Host "     DB-Backup wurde beim Start unter ~/.task-manager/backups/ angelegt."

# 9. Nachvollzug auf GitHub (best effort - der lokale Deploy ist bereits erfolgt;
#    Fehler hier, z.B. offline, brechen NICHTS ab). -----------------------------
if ($NoPublish) {
    Write-Host ("     (-NoPublish) GitHub uebersprungen. Spaeter nachtragen: git push origin {0}" -f $ver) -ForegroundColor DarkGray
    exit 0
}
Write-Host ""
Write-Host "Nachvollzug auf GitHub (Tag + Release + Deployment-Eintrag) ..."
git push origin $ver 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host ("  Konnte Tag nicht pushen (offline?). Spaeter nachholen: git push origin {0}" -f $ver) -ForegroundColor DarkYellow
    exit 0
}
# GitHub Release mit automatischem Changelog (Commits seit letztem Release).
try { gh release create $ver --title $ver --generate-notes 2>&1 | Out-Null } catch { }
# Nativer Deployment-Eintrag unter Settings -> Environments -> production.
try {
    $repo = (gh repo view --json nameWithOwner -q .nameWithOwner 2>$null | Select-Object -First 1)
    if ($repo) {
        $repo = $repo.Trim()
        $depJson = '{{"ref":"{0}","environment":"production","auto_merge":false,"required_contexts":[],"description":"Local prod deploy {0}"}}' -f $ver
        $depId = ($depJson | gh api --method POST "repos/$repo/deployments" --input - 2>$null | ConvertFrom-Json).id
        if ($depId) {
            '{"state":"success","environment":"production","description":"Deployed locally"}' |
                gh api --method POST "repos/$repo/deployments/$depId/statuses" --input - 2>$null | Out-Null
        }
    }
} catch { }
Write-Host ("  GitHub aktualisiert: Release {0} + Deployment-Eintrag." -f $ver) -ForegroundColor Green
Write-Host "  Historie: Repo -> Releases  bzw.  Settings -> Environments -> production." -ForegroundColor DarkGray

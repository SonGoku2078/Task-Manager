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
#
#  Data is safe: same data.db, and the server writes a timestamped backup to
#  ~/.task-manager/backups/ on every start.
#
#  Run from the repo root:   npm run release
# ============================================================================

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Fail($msg) { Write-Host ""; Write-Host "FEHLER: $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "==================== SelfManaged Release ====================" -ForegroundColor Cyan

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
npm run build
if ($LASTEXITCODE -ne 0) { Fail "Build fehlgeschlagen - kein Deploy." }
Write-Host ""
Write-Host "-------- Tests --------" -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) { Fail "Tests fehlgeschlagen - kein Deploy." }
Write-Host ""
Write-Host "OK: Build + Tests gruen." -ForegroundColor Green

# 4. Version + explicit Freigabe ----------------------------------------------
function Suggest-Version($prev) {
    if (-not $prev) { return "v0.1.0" }
    $m = [regex]::Match($prev, '^v?(\d+)\.(\d+)\.(\d+)$')
    if ($m.Success) { return ("v{0}.{1}.{2}" -f $m.Groups[1].Value, $m.Groups[2].Value, ([int]$m.Groups[3].Value + 1)) }
    return $prev
}
$suggest = Suggest-Version $last
Write-Host ""
$ver = Read-Host ("Neue Version [{0}]" -f $suggest)
if (-not $ver) { $ver = $suggest }
$ver = $ver.Trim()
if ($ver -notmatch '^v') { $ver = "v$ver" }
$exists = & git rev-parse -q --verify ("refs/tags/{0}" -f $ver) 2>$null
if ($exists) { Fail ("Tag {0} existiert schon." -f $ver) }

Write-Host ""
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
if ($up) {
    Write-Host ("OK: {0} laeuft jetzt auf http://localhost:3001" -f $ver) -ForegroundColor Green
    Write-Host "     DB-Backup wurde beim Start unter ~/.task-manager/backups/ angelegt."
    Write-Host ("     Optional als Backup zu GitHub:  git push origin {0}" -f $ver) -ForegroundColor DarkGray
} else {
    Fail "Prod nach Timeout nicht erreichbar - bitte das neue Prod-Fenster auf Fehler pruefen."
}

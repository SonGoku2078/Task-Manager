# Remote-Deploy auf den Prod-Server (#60/#67) - ersetzt den lokalen release.ps1-Flow.
#
# Ablauf: liest scripts/deploy.local.json (gitignoriert; Vorlage: deploy.local.json.example),
# zeigt an, was passieren wird, und fuehrt nach Bestaetigung EIN SSH-Kommando aus:
#   cd ~/server && git -C taskmanager pull && docker compose up -d --build taskmanager
# Danach wird der Health-Endpoint von HIER gepollt und eine Zusammenfassung gezeigt
# (Commits, Version, Dauer je Schritt, Datenbestaetigung) - siehe deploy-summary.ps1.
#
# Genau EIN ssh-Aufruf: bei Passwort-Login wuerde jeder weitere erneut fragen.
# Deshalb liefert das Remote-Kommando seine Kennzahlen als TM_MARK-Zeilen mit.
#
# SSH fragt ggf. interaktiv nach dem Passwort. Empfehlung: einen SSH-Key hinterlegen
# (ssh-keygen + Key in ~/.ssh/authorized_keys auf dem Server), dann laeuft es ohne Eingabe.
#
#   npm run release            # echter Deploy (mit Bestaetigung)
#   npm run release -- -DryRun # zeigt nur die Kommandos, fuehrt nichts aus
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'deploy-summary.ps1')

$configFile = Join-Path $PSScriptRoot 'deploy.local.json'

if (-not (Test-Path $configFile)) {
    Write-Host "FEHLER: $configFile fehlt." -ForegroundColor Red
    Write-Host "Vorlage kopieren und SSH-Ziel eintragen:" -ForegroundColor Yellow
    Write-Host "  Copy-Item scripts\deploy.local.json.example scripts\deploy.local.json"
    exit 1
}

$cfg = Get-Content $configFile -Raw | ConvertFrom-Json
$sshTarget = $cfg.sshTarget
$healthUrl = $cfg.healthUrl

if (-not $sshTarget -or -not $healthUrl) {
    Write-Host "FEHLER: deploy.local.json braucht 'sshTarget' und 'healthUrl'." -ForegroundColor Red
    exit 1
}
$baseUrl = $healthUrl -replace '/health/?$', ''

# Remote-Skript: deployt UND meldet Kennzahlen als TM_MARK|<key>|<value>.
$remoteScript = @'
set -e
cd ~/server
B=$(git -C taskmanager rev-parse HEAD)
echo "TM_MARK|before|$B"
# --match "v*": nur Projekt-Tags, sonst kapern desktop-v*/mobile-v* die
# Versionsanzeige der Web-App (#84).
VB=$(git -C taskmanager describe --tags --match "v*" --always 2>/dev/null)
echo "TM_MARK|version_before|$VB"
echo "TM_MARK|image_before|$(docker compose images -q taskmanager 2>/dev/null | head -c 19)"
echo "TM_MARK|t_pull_start|$(date +%s)"
git -C taskmanager pull
echo "TM_MARK|t_pull_end|$(date +%s)"
A=$(git -C taskmanager rev-parse HEAD)
echo "TM_MARK|after|$A"
VA=$(git -C taskmanager describe --tags --match "v*" --always 2>/dev/null)
echo "TM_MARK|version_after|$VA"
echo "TM_MARK|describe|$VA"
# Versionsdatei fuer den Build: im Container gibt es kein Git-Repo, deshalb
# liest vite.config.ts diese Datei (#84).
printf '%s' "$VA" > taskmanager/.version
echo "TM_MARK|version_file|$(cat taskmanager/.version)"
git -C taskmanager log --oneline "$B..$A" | sed "s/^/TM_MARK|commit|/"
echo "TM_MARK|t_build_start|$(date +%s)"
docker compose up -d --build taskmanager
echo "TM_MARK|t_build_end|$(date +%s)"
echo "TM_MARK|image_after|$(docker compose images -q taskmanager 2>/dev/null | head -c 19)"
echo "TM_MARK|done|ok"
'@ -replace "`r`n", "`n"   # LF-Zeilenenden, sonst stolpert bash ueber CR

# Uebertragung base64-kodiert. Grund: Windows PowerShell 5.1 entfernt beim
# Aufruf nativer Programme die inneren Anfuehrungszeichen — aus "TM_MARK|x|y"
# wurde auf dem Server ein echter Pipe-Befehl und bash brach mit einem
# Syntaxfehler ab. Base64 enthaelt keine Sonderzeichen und ueberlebt das
# Quoting; die Pipes im Aufrufkommando interpretiert absichtlich erst die
# Remote-Shell.
$remoteB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($remoteScript))
$remoteCmd = "echo $remoteB64 | base64 -d | bash"

Write-Host ""
Write-Host "=== Remote-Deploy auf den Prod-Server ===" -ForegroundColor Cyan
Write-Host "  SSH-Ziel : $sshTarget"
Write-Host "  Server   : $baseUrl"
Write-Host "  Kommando : cd ~/server && git -C taskmanager pull && docker compose up -d --build taskmanager"
Write-Host ""

if ($DryRun) {
    Write-Host "[DryRun] Es wird nichts ausgefuehrt." -ForegroundColor Yellow
    Write-Host "  Aufruf : ssh $sshTarget `"echo <base64> | base64 -d | bash`""
    Write-Host ""
    Write-Host "Remote-Skript (wird base64-kodiert uebertragen):" -ForegroundColor DarkGray
    foreach ($l in $remoteScript -split "`n") { Write-Host "  $l" -ForegroundColor DarkGray }
    Write-Host ""
    # Gegenprobe: dekodiert das Kommando wirklich zum Skript zurueck?
    $back = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($remoteB64))
    Write-Host ("Base64-Roundtrip: {0}" -f $(if ($back -eq $remoteScript) { 'OK' } else { 'FEHLER' })) -ForegroundColor DarkGray
    exit 0
}

$answer = Read-Host "Deploy jetzt ausfuehren? (j/N)"
if ($answer -notin @('j', 'J', 'y', 'Y')) {
    Write-Host "Abgebrochen."
    exit 0
}

$sw = [System.Diagnostics.Stopwatch]::StartNew()

Write-Host ""
Write-Host ">> ssh $sshTarget (Passwortabfrage moeglich) ..." -ForegroundColor Cyan

# Live-Ausgabe zeigen UND mitschneiden. Docker schreibt seinen Fortschritt auf
# stderr; 'Continue' verhindert, dass PS 5.1 daraus einen abbrechenden
# NativeCommandError macht. Erfolg wird ueber $LASTEXITCODE geprueft, nicht $?.
$captured = New-Object System.Collections.Generic.List[string]
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
ssh $sshTarget $remoteCmd 2>&1 | ForEach-Object {
    $line = [string]$_
    $captured.Add($line)
    if ($line -notmatch '^TM_MARK\|') { Write-Host $line }
}
$sshExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap

$markers = Get-TmMarkers $captured

if ($sshExit -ne 0 -or -not $markers.ContainsKey('done')) {
    Write-TmBanner $false "DEPLOY FEHLGESCHLAGEN"
    Write-Host ("  SSH/Deploy-Exit-Code: {0}" -f $sshExit) -ForegroundColor Red
    if (-not $markers.ContainsKey('done')) {
        Write-Host "  Das Remote-Kommando lief nicht bis zum Ende durch." -ForegroundColor Red
    }
    Write-Host "  Naechster Schritt - Logs ansehen:" -ForegroundColor Yellow
    Write-Host "    ssh $sshTarget 'cd ~/server && docker compose logs --tail 50 taskmanager'"
    exit 1
}

# --- Health-Poll ---
Write-Host ""
Write-Host ">> Warte auf $healthUrl ..." -ForegroundColor Cyan
$healthSw = [System.Diagnostics.Stopwatch]::StartNew()
$ok = $false
$healthMs = -1
for ($i = 0; $i -lt 40; $i++) {
    try {
        $reqSw = [System.Diagnostics.Stopwatch]::StartNew()
        $r = Invoke-WebRequest $healthUrl -TimeoutSec 3 -UseBasicParsing
        $reqSw.Stop()
        if ($r.StatusCode -eq 200) { $ok = $true; $healthMs = $reqSw.Elapsed.TotalMilliseconds; break }
    } catch { Start-Sleep -Seconds 3 }
}
$healthSw.Stop()

if (-not $ok) {
    Write-TmBanner $false "DEPLOY FEHLGESCHLAGEN - SERVER ANTWORTET NICHT"
    Write-Host "  Der Deploy lief durch, aber $healthUrl antwortet nicht (~2 Minuten gewartet)." -ForegroundColor Red
    Write-Host "  Naechster Schritt - Logs ansehen:" -ForegroundColor Yellow
    Write-Host "    ssh $sshTarget 'cd ~/server && docker compose logs --tail 50 taskmanager'"
    exit 1
}

# --- Live ausgelieferte Version (#84) ---
# Aus dem Meta-Tag der ausgelieferten index.html: das ist, was wirklich im
# Browser ankommt — nicht nur, was gebaut wurde.
$liveVersion = ''
try {
    $html = (Invoke-WebRequest $baseUrl -TimeoutSec 10 -UseBasicParsing).Content
    $m = [regex]::Match($html, '<meta name="app-version" content="([^"]*)"')
    if ($m.Success) { $liveVersion = $m.Groups[1].Value }
} catch {
    $liveVersion = ''
}

# --- Datenbestaetigung (nur lesende GETs) ---
$counts = @{ ok = $false; tasks = 0; projects = 0; error = '' }
try {
    $t = Invoke-RestMethod "$baseUrl/api/tasks" -TimeoutSec 10
    $p = Invoke-RestMethod "$baseUrl/api/projects" -TimeoutSec 10
    $counts.tasks = @($t).Count
    $counts.projects = @($p).Count
    $counts.ok = $true
} catch {
    $counts.error = $_.Exception.Message
}

$sw.Stop()

Write-TmBanner $true "DEPLOY ERFOLGREICH ABGESCHLOSSEN"
Write-TmSummary -Markers $markers -HealthMs $healthMs -HealthWaitSec $healthSw.Elapsed.TotalSeconds `
    -TotalSec $sw.Elapsed.TotalSeconds -Counts $counts -HealthUrl $healthUrl -LiveVersion $liveVersion
Write-Host ""

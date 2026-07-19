# Remote-Deploy auf den Prod-Server (#60) — ersetzt den lokalen release.ps1-Flow.
#
# Ablauf: liest scripts/deploy.local.json (gitignoriert; Vorlage: deploy.local.json.example),
# zeigt an, was passieren wird, und fuehrt nach Bestaetigung EIN SSH-Kommando aus:
#   cd ~/server && git -C taskmanager pull && docker compose up -d --build taskmanager
# Danach wird der Health-Endpoint von HIER gepollt, bis der Server antwortet.
#
# SSH fragt ggf. interaktiv nach dem Passwort (Passwort-Login). Empfehlung: einen
# SSH-Key hinterlegen (ssh-keygen + Key in ~/.ssh/authorized_keys auf dem Server),
# dann laeuft der Deploy ohne Eingabe durch.
#
#   npm run release            # echter Deploy (mit Bestaetigung)
#   npm run release -- -DryRun # zeigt nur die Kommandos, fuehrt nichts aus
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
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
$remoteCmd = 'cd ~/server && git -C taskmanager pull && docker compose up -d --build taskmanager'

if (-not $sshTarget -or -not $healthUrl) {
    Write-Host "FEHLER: deploy.local.json braucht 'sshTarget' und 'healthUrl'." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Remote-Deploy auf den Prod-Server ===" -ForegroundColor Cyan
Write-Host "  SSH-Ziel : $sshTarget"
Write-Host "  Kommando : $remoteCmd"
Write-Host "  Health   : $healthUrl"
Write-Host ""

if ($DryRun) {
    Write-Host "[DryRun] Es wird nichts ausgefuehrt. Das echte Kommando waere:" -ForegroundColor Yellow
    Write-Host "  ssh $sshTarget `"$remoteCmd`""
    exit 0
}

$answer = Read-Host "Deploy jetzt ausfuehren? (j/N)"
if ($answer -notin @('j', 'J', 'y', 'Y')) {
    Write-Host "Abgebrochen."
    exit 0
}

Write-Host ""
Write-Host ">> ssh $sshTarget (Passwortabfrage moeglich) ..." -ForegroundColor Cyan
ssh $sshTarget $remoteCmd
if ($LASTEXITCODE -ne 0) {
    Write-Host "FEHLER: SSH/Deploy-Kommando endete mit Exit-Code $LASTEXITCODE." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host ">> Warte auf $healthUrl ..." -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
    try {
        $r = Invoke-WebRequest $healthUrl -TimeoutSec 3 -UseBasicParsing
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch { Start-Sleep -Seconds 3 }
}

if ($ok) {
    Write-Host ""
    Write-Host "OK: Server antwortet. Version pruefen: Einstellungen → 'Version & Umgebung'." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "WARNUNG: Health-Endpoint antwortet nicht innerhalb von ~2 Minuten." -ForegroundColor Red
    Write-Host "Auf dem Server pruefen: ssh $sshTarget 'cd ~/server && docker compose logs --tail 50 taskmanager'"
    exit 1
}

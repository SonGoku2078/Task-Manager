# Nozbe Classic — kombinierter Export (Aufgaben + Projekte + Kontexte)
#
# Holt alle drei Ressourcen über die Nozbe Classic REST API und schreibt sie in EINE
# JSON-Datei, die in der App unter Einstellungen → "Nozbe-Import" → "JSON-Datei importieren"
# hochgeladen werden kann.
#
# Credentials NICHT hardcoden. Reihenfolge der Quelle:
#   1. Parameter -Token / -ClientId
#   2. Umgebungsvariablen $env:NOZBE_TOKEN / $env:NOZBE_CLIENT_ID
#   3. -ConfigPath zu einer config.ps1 (setzt $accessToken / $clientId), z.B. aus nozbe-connect
#
# Beispiele:
#   $env:NOZBE_TOKEN="..."; $env:NOZBE_CLIENT_ID="..."; .\scripts\nozbe-export.ps1
#   .\scripts\nozbe-export.ps1 -Token abc -ClientId xyz -OutFile .\nozbe-export.json
#   .\scripts\nozbe-export.ps1 -ConfigPath "C:\pfad\zu\nozbe-connect\examples\config.ps1"

param(
    [string]$Token = $env:NOZBE_TOKEN,
    [string]$ClientId = $env:NOZBE_CLIENT_ID,
    [string]$ConfigPath = $null,
    [string]$ApiBaseUrl = "https://api.nozbe.com:3000",
    [string]$OutFile = "$PSScriptRoot\..\nozbe-export.json"
)

if ($ConfigPath -and (Test-Path $ConfigPath)) {
    . $ConfigPath
    if (-not $Token -and $accessToken) { $Token = $accessToken }
    if (-not $ClientId -and $clientId) { $ClientId = $clientId }
}

if (-not $Token -or -not $ClientId) {
    Write-Host "Fehlende Credentials. Setze -Token/-ClientId, NOZBE_TOKEN/NOZBE_CLIENT_ID oder -ConfigPath." -ForegroundColor Red
    exit 1
}

function Get-NozbeList {
    param([string]$Type)
    $uri = "$ApiBaseUrl/list?access_token=$Token&client_id=$ClientId&type=$Type"
    Write-Host "Lade $Type ..." -ForegroundColor Yellow
    $resp = Invoke-WebRequest -Uri $uri -Method Get -UseBasicParsing -TimeoutSec 30
    return ($resp.Content | ConvertFrom-Json)
}

try {
    $projects = Get-NozbeList -Type "project"
    $contexts = Get-NozbeList -Type "context"
    $tasks    = Get-NozbeList -Type "task"
}
catch {
    Write-Host "Fehler beim Abruf: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$export = [ordered]@{
    exportedAt = (Get-Date).ToString("s")
    projects   = $projects
    contexts   = $contexts
    tasks      = $tasks
}

$export | ConvertTo-Json -Depth 12 | Set-Content -Path $OutFile -Encoding UTF8

Write-Host ""
Write-Host ("Export geschrieben: {0}" -f $OutFile) -ForegroundColor Green
Write-Host ("  Projekte: {0}  Kontexte: {1}  Aufgaben: {2}" -f @($projects).Count, @($contexts).Count, @($tasks).Count) -ForegroundColor Cyan
Write-Host "In der App: Einstellungen -> Nozbe-Import -> 'JSON-Datei importieren'." -ForegroundColor Gray

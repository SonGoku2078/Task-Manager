# Nozbe Classic - OAuth-Tokens ermitteln (bewiesener Flow)
#
#   1) GET /oauth/secret/data?email=...&password=...  -> client_id + client_secret
#   2) API-Key (= access_token, aus Nozbe-Settings) + client_id -> Daten abfragen
#      GET /list?access_token=<API-Key>&client_id=<client_id>&type=task
#
# Eingaben:  E-Mail + Passwort + API-Schluessel (Nozbe -> Einstellungen -> API-Schluessel)
# Ergebnis:  Access Token + Client-ID fuer die App
#            (Einstellungen -> Nozbe-Verbindung -> "Verbinden & speichern")
#
# Sicherheit: Passwort als SecureString, nur an Nozbe gesendet. Token = Vollzugriff.

param(
    [string]$Email,
    [string]$Password,                                       # optional; sonst sichere Abfrage
    [string]$ApiKey,                                         # = access_token aus Nozbe-Settings
    [string]$ApiBaseUrl = "https://api.nozbe.com:3000"
)

Write-Host ""
Write-Host "=== Nozbe Classic - Tokens ermitteln ===" -ForegroundColor Cyan
Write-Host ""

# --- Eingaben ---
if (-not $Email)    { $Email = Read-Host "Nozbe E-Mail" }
if (-not $Password) {
    $s = Read-Host "Nozbe Passwort" -AsSecureString
    $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto($b)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)
}

try {
    # --- 1) OAuth: client_id + client_secret aus E-Mail + Passwort ---
    Write-Host "1) Authentifizierung (oauth/secret/data) ..." -ForegroundColor Yellow
    $emailEnc = [System.Uri]::EscapeDataString($Email)
    $pwEnc    = [System.Uri]::EscapeDataString($Password)
    $oauthUri = "$ApiBaseUrl/oauth/secret/data?email=$emailEnc&password=$pwEnc"

    $oauthResp = Invoke-WebRequest -Uri $oauthUri -Method Get -UseBasicParsing -TimeoutSec 20
    $oauthData = $oauthResp.Content | ConvertFrom-Json
    $clientId     = [string]$oauthData.client_id
    $clientSecret = [string]$oauthData.client_secret

    if (-not $clientId) {
        Write-Host "Keine client_id erhalten. Antwort:" -ForegroundColor Red
        Write-Host $oauthResp.Content
        exit 1
    }
    Write-Host "   OK - client_id ermittelt." -ForegroundColor Green

    # --- 2) API-Key abfragen + Daten testen ---
    if (-not $ApiKey) { $ApiKey = Read-Host "API-Schluessel (Nozbe -> Einstellungen -> API-Schluessel)" }

    Write-Host "2) Teste Datenzugriff (/list) ..." -ForegroundColor Yellow
    $testUri = "$ApiBaseUrl/list?access_token=$ApiKey&client_id=$clientId&type=task"
    $tasks = (Invoke-WebRequest -Uri $testUri -Method Get -UseBasicParsing -TimeoutSec 30).Content | ConvertFrom-Json
    $count = @($tasks).Count

    # --- Ergebnis ---
    Write-Host ""
    Write-Host "=== ERFOLG - $count Aufgaben geladen ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "In der App eintragen (Einstellungen -> Nozbe-Verbindung):" -ForegroundColor Cyan
    Write-Host "  Access Token : $ApiKey"   -ForegroundColor Green
    Write-Host "  Client-ID    : $clientId" -ForegroundColor Green
    Write-Host ""
    Write-Host "(client_secret: $clientSecret)" -ForegroundColor DarkGray
}
catch {
    Write-Host ""
    Write-Host "Fehler: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Pruefe E-Mail / Passwort / API-Schluessel." -ForegroundColor Yellow
    exit 1
}
finally {
    $Password = $null
}

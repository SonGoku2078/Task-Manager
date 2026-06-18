# Nozbe Classic - Tokens beschaffen / anzeigen
#
# Zweck: liefert dir Access Token + Client-ID, die du in der App
#        (Einstellungen -> Nozbe-Verbindung) einträgst.
#
# Zwei Wege:
#   A) Bestehende Tokens aus deiner config.ps1 anzeigen (zuverlässig):
#        .\scripts\get-nozbe-tokens.ps1 -ConfigPath "C:\...\nozbe-connect\examples\config.ps1"
#   B) Frischen Token per Login erzeugen (braucht eine gueltige Client-ID):
#        .\scripts\get-nozbe-tokens.ps1 -ClientId "DEINE_CLIENT_ID" -Login
#      (Client-ID kann auch aus -ConfigPath kommen.)
#
# Hinweis Sicherheit: Ein Access Token = Vollzugriff auf dein Nozbe-Konto.
#   Trage ihn bevorzugt direkt in die App ein. Wenn du mir beim Login-Format helfen
#   willst, teile nur die STRUKTUR der rohen Antwort (Token-Wert schwaerzen).

param(
    [string]$ConfigPath,
    [string]$ClientId,
    [string]$Email,
    [switch]$Login,
    [string]$ApiBaseUrl = "https://api.nozbe.com:3000"
)

$existingToken = $null

if ($ConfigPath) {
    if (Test-Path $ConfigPath) {
        . $ConfigPath
        if (-not $ClientId -and $clientId) { $ClientId = $clientId }
        if (-not $Email -and $email) { $Email = $email }
        if ($accessToken) { $existingToken = $accessToken }
    } else {
        Write-Host "config.ps1 nicht gefunden: $ConfigPath" -ForegroundColor Yellow
    }
}

if ($existingToken -and -not $Login) {
    Write-Host ""
    Write-Host "Bestehende Tokens aus config.ps1:" -ForegroundColor Green
    Write-Host "  Access Token : $existingToken"
    Write-Host "  Client-ID    : $ClientId"
    Write-Host ""
    Write-Host "-> Diese beiden in der App eintragen (Einstellungen -> Nozbe-Verbindung)." -ForegroundColor Cyan

    if ($ClientId) {
        Write-Host ""
        Write-Host "Teste Token via /list ..." -ForegroundColor Yellow
        try {
            $u = "$ApiBaseUrl/list?access_token=$existingToken&client_id=$ClientId&type=task"
            $r = Invoke-WebRequest -Uri $u -Method Get -UseBasicParsing -TimeoutSec 20
            $tasks = $r.Content | ConvertFrom-Json
            Write-Host "OK - Token gueltig. Aufgaben im Konto: $(@($tasks).Count)" -ForegroundColor Green
        } catch {
            Write-Host "Token-Test fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "-> Mit -Login einen frischen Token erzeugen." -ForegroundColor Gray
        }
    }
    return
}

# --- Login-Weg (frischer Token) ---
if (-not $ClientId) {
    Write-Host "Keine Client-ID. Gib -ClientId an oder nutze -ConfigPath." -ForegroundColor Red
    exit 1
}
if (-not $Email) { $Email = Read-Host "Nozbe E-Mail" }
$securePw = Read-Host "Nozbe Passwort" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePw)
$Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)

Add-Type -AssemblyName System.Web
$uri = "$ApiBaseUrl/login?email=$([System.Web.HttpUtility]::UrlEncode($Email))&password=$([System.Web.HttpUtility]::UrlEncode($Password))&client_id=$([System.Web.HttpUtility]::UrlEncode($ClientId))"

Write-Host ""
Write-Host "Rufe $ApiBaseUrl/login auf ..." -ForegroundColor Yellow
try {
    $resp = Invoke-WebRequest -Uri $uri -Method Get -UseBasicParsing -TimeoutSec 20
    Write-Host "HTTP $($resp.StatusCode)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "--- ROHE ANTWORT (Struktur ggf. teilen, Token schwaerzen) ---" -ForegroundColor Magenta
    Write-Host $resp.Content
    Write-Host "-------------------------------------------------------------"

    $token = $null
    try {
        $j = $resp.Content | ConvertFrom-Json
        foreach ($f in @('oauth_token','access_token','key','token')) {
            if (-not $token -and $j.$f) { $token = $j.$f }
        }
    } catch {}
    if (-not $token -and ($resp.Content.Trim() -match '^[\w.\-]{16,}$')) {
        $token = $resp.Content.Trim()
    }

    if ($token) {
        Write-Host ""
        Write-Host "Access Token : $token" -ForegroundColor Green
        Write-Host "Client-ID    : $ClientId" -ForegroundColor Green
        Write-Host ""
        Write-Host "-> In der App eintragen (Einstellungen -> Nozbe-Verbindung)." -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "Konnte keinen Token automatisch erkennen - siehe rohe Antwort oben." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Fehler: $($_.Exception.Message)" -ForegroundColor Red
}

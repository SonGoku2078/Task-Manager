# Nozbe Classic - Tokens beschaffen (interaktiv)
#
# Fragt deine Credentials ab (E-Mail, Passwort, API-Key/Client-ID) und zeigt dir den
# Access Token + die Client-ID, die du in der App eintraegst
# (Einstellungen -> Nozbe-Verbindung).
#
# Aufruf:
#   .\scripts\get-nozbe-tokens.ps1
#   (oder Werte direkt uebergeben:)
#   .\scripts\get-nozbe-tokens.ps1 -Email du@example.com -ClientId DEIN_API_KEY
#
# Sicherheit: Das Passwort wird als SecureString eingelesen und nur an Nozbe gesendet.
#   Ein Access Token = Vollzugriff auf dein Konto - trage ihn bevorzugt direkt in die App ein.

param(
    [string]$Email,
    [string]$ClientId,                       # = API-Key
    [string]$ApiBaseUrl = "https://api.nozbe.com:3000"
)

Write-Host ""
Write-Host "=== Nozbe Classic - Token abrufen ===" -ForegroundColor Cyan
Write-Host ""

# --- 1) Credentials abfragen ---
if (-not $Email)    { $Email    = Read-Host "Nozbe E-Mail (User)" }
$securePw = Read-Host "Nozbe Passwort" -AsSecureString
if (-not $ClientId) { $ClientId = Read-Host "API-Key / Client-ID" }

if (-not $Email -or -not $ClientId) {
    Write-Host "E-Mail und API-Key/Client-ID sind erforderlich." -ForegroundColor Red
    exit 1
}

# SecureString -> Klartext (nur fuer den Request)
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePw)
$Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

# --- 2) Login aufrufen ---
Add-Type -AssemblyName System.Web
$uri = "$ApiBaseUrl/login?email=$([System.Web.HttpUtility]::UrlEncode($Email))" +
       "&password=$([System.Web.HttpUtility]::UrlEncode($Password))" +
       "&client_id=$([System.Web.HttpUtility]::UrlEncode($ClientId))"

Write-Host ""
Write-Host "Rufe $ApiBaseUrl/login auf ..." -ForegroundColor Yellow

try {
    $resp = Invoke-WebRequest -Uri $uri -Method Get -UseBasicParsing -TimeoutSec 20
    $content = $resp.Content.Trim()

    Write-Host "HTTP $($resp.StatusCode)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "--- ROHE ANTWORT ---" -ForegroundColor Magenta
    Write-Host $content
    Write-Host "--------------------"

    # Fehlerkennung (API liefert teils HTTP 200 trotz Fehler)
    if ($content -match '(?i)bad client_id|invalid|error|unauthor|wrong|denied') {
        Write-Host ""
        Write-Host "Login fehlgeschlagen. Pruefe E-Mail / Passwort / API-Key." -ForegroundColor Red
        exit 1
    }

    # Token aus der Antwort lesen (JSON oder Klartext)
    $token = $null
    try {
        $j = $content | ConvertFrom-Json
        foreach ($f in @('oauth_token','access_token','key','token')) {
            if (-not $token -and $j.$f) { $token = [string]$j.$f }
        }
    } catch {}
    if (-not $token -and ($content -match '^[\w.\-]{16,}$')) { $token = $content }

    Write-Host ""
    if ($token) {
        Write-Host "=== ERFOLG ===" -ForegroundColor Green
        Write-Host "Access Token : $token" -ForegroundColor Green
        Write-Host "Client-ID    : $ClientId" -ForegroundColor Green
        Write-Host ""
        Write-Host "-> Beide Werte in der App eintragen:" -ForegroundColor Cyan
        Write-Host "   Einstellungen -> Nozbe-Verbindung -> 'Verbinden & speichern'" -ForegroundColor Cyan

        # Optionaler Schnelltest
        try {
            $u = "$ApiBaseUrl/list?access_token=$token&client_id=$ClientId&type=task"
            $r = Invoke-WebRequest -Uri $u -Method Get -UseBasicParsing -TimeoutSec 20
            $tasks = $r.Content | ConvertFrom-Json
            Write-Host ""
            Write-Host "Test OK - Aufgaben im Konto: $(@($tasks).Count)" -ForegroundColor Green
        } catch {
            Write-Host "Hinweis: Token-Test (/list) fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Konnte keinen Token automatisch erkennen - siehe rohe Antwort oben." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Fehler beim Login-Request: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    $Password = $null
}

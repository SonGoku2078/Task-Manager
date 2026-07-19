# Auswertung + Ausgabe fuer den Remote-Deploy (#67).
# Getrennt von release-remote.ps1, damit die Logik ohne SSH testbar ist
# (siehe scripts/deploy-summary.test.ps1). Alle Ausgaben bewusst ASCII-only —
# Windows PowerShell 5.1 verstuemmelt sonst Sonderzeichen in der Konsole.

# Sammelt die TM_MARK-Zeilen des Remote-Kommandos ein.
# Format: TM_MARK|<key>|<value>  (commit-Zeilen koennen mehrfach vorkommen)
function Get-TmMarkers {
    param([string[]]$Lines)

    $m = @{ commits = @() }
    foreach ($line in $Lines) {
        if ($null -eq $line) { continue }
        $s = [string]$line
        if ($s -notmatch '^TM_MARK\|') { continue }
        $parts = $s.Split('|', 3)
        if ($parts.Count -lt 3) { continue }
        $key = $parts[1]
        $val = $parts[2].TrimEnd()
        if ($key -eq 'commit') { $m.commits += $val } else { $m[$key] = $val }
    }
    return $m
}

function Format-TmDuration {
    param([double]$Seconds)
    if ($Seconds -lt 0) { return '-' }
    if ($Seconds -lt 60) { return ('{0:N1}s' -f $Seconds) }
    $min = [math]::Floor($Seconds / 60)
    $sec = [math]::Round($Seconds - ($min * 60))
    return ('{0}m {1}s' -f $min, $sec)
}

# Sekunden zwischen zwei Unix-Zeitstempel-Markern; -1 wenn unvollstaendig.
function Get-TmPhase {
    param($Markers, [string]$StartKey, [string]$EndKey)
    if (-not $Markers.ContainsKey($StartKey) -or -not $Markers.ContainsKey($EndKey)) { return -1 }
    $a = 0; $b = 0
    if (-not [int]::TryParse($Markers[$StartKey], [ref]$a)) { return -1 }
    if (-not [int]::TryParse($Markers[$EndKey], [ref]$b)) { return -1 }
    return [double]($b - $a)
}

function Write-TmBanner {
    param([bool]$Ok, [string]$Text)
    $color = if ($Ok) { 'Green' } else { 'Red' }
    $bar = '=' * 64
    Write-Host ""
    Write-Host $bar -ForegroundColor $color
    Write-Host ("   " + $Text) -ForegroundColor $color
    Write-Host $bar -ForegroundColor $color
    Write-Host ""
}

function Write-TmSummary {
    param(
        $Markers,
        [double]$HealthMs = -1,
        [double]$HealthWaitSec = -1,
        [double]$TotalSec = -1,
        $Counts = $null,
        [string]$HealthUrl = ''
    )

    Write-Host "DEPLOY-ZUSAMMENFASSUNG" -ForegroundColor Cyan
    Write-Host ("-" * 64) -ForegroundColor DarkGray

    # --- Was wurde deployt ---
    $commits = @($Markers.commits)
    if ($commits.Count -eq 0) {
        Write-Host "  Code      : bereits aktuell, keine neuen Commits" -ForegroundColor Yellow
    } else {
        $word = if ($commits.Count -eq 1) { 'neuer Commit' } else { 'neue Commits' }
        Write-Host ("  Code      : {0} {1}" -f $commits.Count, $word) -ForegroundColor Green
        foreach ($c in $commits) { Write-Host ("                - " + $c) }
    }
    if ($Markers.ContainsKey('before') -and $Markers.ContainsKey('after')) {
        $b = $Markers['before']; $a = $Markers['after']
        if ($b.Length -ge 7 -and $a.Length -ge 7) {
            Write-Host ("              {0} -> {1}" -f $b.Substring(0, 7), $a.Substring(0, 7)) -ForegroundColor DarkGray
        }
    }

    # --- Version / Image ---
    if ($Markers.ContainsKey('describe')) {
        Write-Host ("  Version   : {0}" -f $Markers['describe'])
    }
    if ($Markers.ContainsKey('image_before') -and $Markers.ContainsKey('image_after')) {
        if ($Markers['image_before'] -eq $Markers['image_after']) {
            Write-Host "  Image     : unveraendert (Build aus Cache)"
        } else {
            Write-Host ("  Image     : neu gebaut ({0})" -f $Markers['image_after'])
        }
    }

    # --- Dauer je Schritt ---
    $pull  = Get-TmPhase $Markers 't_pull_start'  't_pull_end'
    $build = Get-TmPhase $Markers 't_build_start' 't_build_end'
    $parts = @()
    if ($pull  -ge 0) { $parts += ("Pull " + (Format-TmDuration $pull)) }
    if ($build -ge 0) { $parts += ("Build+Restart " + (Format-TmDuration $build)) }
    if ($HealthWaitSec -ge 0) { $parts += ("Health " + (Format-TmDuration $HealthWaitSec)) }
    if ($parts.Count) { Write-Host ("  Dauer     : " + ($parts -join '  |  ')) }
    if ($TotalSec -ge 0) { Write-Host ("  Gesamt    : " + (Format-TmDuration $TotalSec)) }

    # --- Health ---
    if ($HealthMs -ge 0) {
        Write-Host ("  Health    : OK ({0} ms){1}" -f [math]::Round($HealthMs), $(if ($HealthUrl) { " - $HealthUrl" } else { '' })) -ForegroundColor Green
    }

    # --- Datenbestaetigung ---
    if ($null -ne $Counts) {
        if ($Counts.ok) {
            Write-Host ("  Daten     : {0} Tasks, {1} Projekte" -f $Counts.tasks, $Counts.projects) -ForegroundColor Green
        } else {
            Write-Host ("  Daten     : nicht pruefbar ({0})" -f $Counts.error) -ForegroundColor Yellow
        }
    }
    Write-Host ("-" * 64) -ForegroundColor DarkGray
}

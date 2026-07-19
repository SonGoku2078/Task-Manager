# Test fuer die Deploy-Auswertung (#67) - laeuft ohne SSH und ohne Server.
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-summary.test.ps1
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'deploy-summary.ps1')

$fails = 0
function Check([string]$name, [bool]$cond, [string]$extra = '') {
    if ($cond) { Write-Host "PASS  $name" -ForegroundColor Green }
    else { Write-Host ("FAIL  {0} {1}" -f $name, $extra) -ForegroundColor Red; $script:fails++ }
}

# --- Realistischer Mitschnitt: Docker-Rauschen + TM_MARK-Zeilen gemischt ---
$lines = @(
    'TM_MARK|before|1de49391aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'TM_MARK|image_before|sha256:aaaaaaaaaaa',
    'TM_MARK|t_pull_start|1000',
    'Updating 1de4939..a189ab3',
    'Fast-forward',
    'TM_MARK|t_pull_end|1004',
    'TM_MARK|after|a189ab3bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'TM_MARK|describe|v0.2.9-3-ga189ab3',
    'TM_MARK|commit|a189ab3 feat(infra): Prod-Umzug auf 192.168.8.50',
    'TM_MARK|commit|1de4939 docs(pipeline): EXE 1.2.0 gebaut',
    'TM_MARK|t_build_start|1004',
    '#14 exporting layers 14.8s done',
    ' Container server-taskmanager-1  Started',
    'TM_MARK|t_build_end|1064',
    'TM_MARK|image_after|sha256:bbbbbbbbbbb',
    'TM_MARK|done|ok'
)
$m = Get-TmMarkers $lines

Check 'Marker: before/after erkannt' ($m['before'].StartsWith('1de4939') -and $m['after'].StartsWith('a189ab3'))
Check 'Marker: 2 Commits gesammelt' (@($m.commits).Count -eq 2) ("count=" + @($m.commits).Count)
Check 'Marker: describe' ($m['describe'] -eq 'v0.2.9-3-ga189ab3')
Check 'Marker: done' ($m['done'] -eq 'ok')
Check 'Docker-Rauschen ignoriert' (-not $m.ContainsKey('Fast-forward'))

Check 'Phase Pull = 4s'  ((Get-TmPhase $m 't_pull_start'  't_pull_end')  -eq 4)
Check 'Phase Build = 60s' ((Get-TmPhase $m 't_build_start' 't_build_end') -eq 60)
Check 'Phase fehlend -> -1' ((Get-TmPhase $m 'nope_start' 'nope_end') -eq -1)

Check 'Dauer < 60s als Sekunden' ((Format-TmDuration 4.2) -eq '4.2s') (Format-TmDuration 4.2)
Check 'Dauer >= 60s als m/s' ((Format-TmDuration 64) -eq '1m 4s') (Format-TmDuration 64)

# --- Rendering: Ausgabe einfangen und pruefen ---
$out = (Write-TmSummary -Markers $m -HealthMs 12 -HealthWaitSec 6 -TotalSec 75 `
        -Counts @{ ok = $true; tasks = 834; projects = 41 } -HealthUrl 'http://x/health' 6>&1 |
    Out-String)
Check 'Ausgabe: Commit-Anzahl' ($out -match '2 neue Commits')
Check 'Ausgabe: Commit-Betreff' ($out -match 'Prod-Umzug')
Check 'Ausgabe: Kurz-SHAs' ($out -match '1de4939 -> a189ab3')
Check 'Ausgabe: Version' ($out -match 'v0\.2\.9-3-ga189ab3')
Check 'Ausgabe: Image neu gebaut' ($out -match 'neu gebaut')
Check 'Ausgabe: Dauern' (($out -match 'Pull 4\.0s') -and ($out -match 'Build\+Restart 1m 0s'))
Check 'Ausgabe: Gesamt' ($out -match '1m 15s')
Check 'Ausgabe: Health' ($out -match 'OK \(12 ms\)')
Check 'Ausgabe: Datenzahlen' ($out -match '834 Tasks, 41 Projekte')
Check 'Ausgabe: ASCII-only' (-not ($out -match '[^\x00-\x7F]')) 'Nicht-ASCII gefunden'

# --- Sonderfall: keine neuen Commits, Image unveraendert ---
$m2 = Get-TmMarkers @(
    'TM_MARK|before|abc1234000', 'TM_MARK|after|abc1234000',
    'TM_MARK|image_before|sha256:same', 'TM_MARK|image_after|sha256:same',
    'TM_MARK|done|ok'
)
$out2 = (Write-TmSummary -Markers $m2 -Counts @{ ok = $false; error = 'timeout' } 6>&1 | Out-String)
Check 'Leerfall: "bereits aktuell"' ($out2 -match 'bereits aktuell')
Check 'Leerfall: Image aus Cache' ($out2 -match 'Cache')
Check 'Leerfall: Daten nicht pruefbar' ($out2 -match 'nicht pruefbar')

# --- Banner ---
$okBanner = (Write-TmBanner $true 'DEPLOY ERFOLGREICH ABGESCHLOSSEN' 6>&1 | Out-String)
Check 'Banner: Text + Rahmen' (($okBanner -match 'DEPLOY ERFOLGREICH ABGESCHLOSSEN') -and ($okBanner -match '={10,}'))

Write-Host ""
if ($fails -eq 0) { Write-Host "ALLE TESTS BESTANDEN" -ForegroundColor Green; exit 0 }
Write-Host ("{0} TEST(S) FEHLGESCHLAGEN" -f $fails) -ForegroundColor Red
exit 1

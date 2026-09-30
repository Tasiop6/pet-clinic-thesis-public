param(
    [string]$TargetUrl = 'https://thesis-tasiopoulos.com/',
    [int]$TimeoutSeconds = 300,
    [int]$PollSeconds = 2,
    [string]$OutputDirectory = 'output/recovery'
)

$ErrorActionPreference = 'Stop'
$startedAt = [DateTimeOffset]::UtcNow
$deadline = $startedAt.AddSeconds($TimeoutSeconds)
$samples = [System.Collections.Generic.List[object]]::new()
$seenFailure = $false
$firstFailureAt = $null
$firstRecoveryAt = $null
$consecutiveSuccesses = 0

while ([DateTimeOffset]::UtcNow -lt $deadline) {
    $timestamp = [DateTimeOffset]::UtcNow
    $status = 0
    try {
        $rawStatus = & curl.exe -sS --max-time 4 -o NUL -w '%{http_code}' $TargetUrl 2>$null
        if ($LASTEXITCODE -eq 0) {
            $status = [int]$rawStatus
        }
    }
    catch {
        $status = 0
    }

    $ok = $status -ge 200 -and $status -lt 400
    $samples.Add([pscustomobject]@{
        timestampUtc = $timestamp.ToString('o')
        status = $status
        available = $ok
    })

    if (-not $ok) {
        if (-not $seenFailure) {
            $seenFailure = $true
            $firstFailureAt = $timestamp
        }
        $consecutiveSuccesses = 0
    }
    elseif ($seenFailure) {
        if ($null -eq $firstRecoveryAt) {
            $firstRecoveryAt = $timestamp
        }
        $consecutiveSuccesses++
        if ($consecutiveSuccesses -ge 3) {
            break
        }
    }

    Start-Sleep -Seconds $PollSeconds
}

$finishedAt = [DateTimeOffset]::UtcNow
$recovered = $seenFailure -and $null -ne $firstRecoveryAt -and $consecutiveSuccesses -ge 3
$report = [ordered]@{
    schemaVersion = 1
    target = $TargetUrl
    startedAtUtc = $startedAt.ToString('o')
    finishedAtUtc = $finishedAt.ToString('o')
    pollSeconds = $PollSeconds
    timeoutSeconds = $TimeoutSeconds
    failureObserved = $seenFailure
    firstFailureAtUtc = if ($firstFailureAt) { $firstFailureAt.ToString('o') } else { $null }
    firstRecoveryAtUtc = if ($firstRecoveryAt) { $firstRecoveryAt.ToString('o') } else { $null }
    observedUnavailableSeconds = if ($firstFailureAt -and $firstRecoveryAt) {
        [math]::Round(($firstRecoveryAt - $firstFailureAt).TotalSeconds, 2)
    } else { $null }
    stableRecoveryObserved = $recovered
    samples = $samples
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$stamp = $startedAt.ToString('yyyy-MM-ddTHH-mm-ss-fffZ')
$outputPath = Join-Path $OutputDirectory "ec2-recovery-$stamp.json"
$report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $outputPath -Encoding utf8
$report | Select-Object startedAtUtc,finishedAtUtc,failureObserved,firstFailureAtUtc,firstRecoveryAtUtc,observedUnavailableSeconds,stableRecoveryObserved | Format-List
Write-Output "Result written to $outputPath"

if (-not $recovered) {
    exit 1
}

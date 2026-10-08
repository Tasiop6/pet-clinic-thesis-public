param(
    [string]$TargetUrl = 'http://localhost',
    [string]$Username = 'perf_eval',
    [string]$PasswordFile = (Join-Path $env:TEMP 'happy-tails-perf-eval.password'),
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\..\output\security')
)

$ErrorActionPreference = 'Stop'

function Invoke-Status {
    param(
        [Parameter(Mandatory)] [string]$Uri,
        [ValidateSet('GET', 'POST')] [string]$Method = 'GET',
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
        [string]$Body,
        [string]$ContentType
    )

    try {
        $request = @{
            Uri = $Uri
            Method = $Method
            MaximumRedirection = 0
            UseBasicParsing = $true
        }
        if ($Session) { $request.WebSession = $Session }
        if ($PSBoundParameters.ContainsKey('Body')) { $request.Body = $Body }
        if ($PSBoundParameters.ContainsKey('ContentType')) { $request.ContentType = $ContentType }
        $response = Invoke-WebRequest @request
        return [int]$response.StatusCode
    }
    catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            return [int]$_.Exception.Response.StatusCode
        }
        throw
    }
}

if (-not (Test-Path -LiteralPath $PasswordFile)) {
    throw "Synthetic-account password file was not found: $PasswordFile"
}

$password = (Get-Content -LiteralPath $PasswordFile -Raw).Trim()
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$startedAt = (Get-Date).ToUniversalTime()

try {
    $checks = [ordered]@{}
    $checks.publicHome = Invoke-Status -Uri "$TargetUrl/"
    $checks.publicLoginPage = Invoke-Status -Uri "$TargetUrl/login"
    $checks.unauthenticatedDashboard = Invoke-Status -Uri "$TargetUrl/api/dashboard"
    $checks.unauthenticatedOwners = Invoke-Status -Uri "$TargetUrl/api/owners"
    $checks.unauthenticatedAdmin = Invoke-Status -Uri "$TargetUrl/api/admin/users/active"

    $invalidBody = @{ username = $Username; password = "$password-invalid" } | ConvertTo-Json -Compress
    $checks.invalidCredentials = Invoke-Status -Uri "$TargetUrl/api/auth/login" -Method POST -Body $invalidBody -ContentType 'application/json'

    $loginBody = @{ username = $Username; password = $password } | ConvertTo-Json -Compress
    $checks.validSyntheticLogin = Invoke-Status -Uri "$TargetUrl/api/auth/login" -Method POST -Session $session -Body $loginBody -ContentType 'application/json'
    $checks.authenticatedIdentity = Invoke-Status -Uri "$TargetUrl/api/auth/me" -Session $session
    $checks.staffReadOwners = Invoke-Status -Uri "$TargetUrl/api/owners" -Session $session
    $checks.staffAdminEndpoint = Invoke-Status -Uri "$TargetUrl/api/admin/users/active" -Session $session

    $expected = [ordered]@{
        publicHome = 200
        publicLoginPage = 200
        unauthenticatedDashboard = 401
        unauthenticatedOwners = 401
        unauthenticatedAdmin = 401
        invalidCredentials = 401
        validSyntheticLogin = 200
        authenticatedIdentity = 200
        staffReadOwners = 200
        staffAdminEndpoint = 403
    }

    $results = foreach ($name in $expected.Keys) {
        [ordered]@{
            check = $name
            expectedStatus = $expected[$name]
            actualStatus = $checks[$name]
            passed = ($checks[$name] -eq $expected[$name])
        }
    }

    $report = [ordered]@{
        startedAtUtc = $startedAt.ToString('o')
        completedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
        target = $TargetUrl
        account = $Username
        accountRole = 'STAFF'
        credentialsRecorded = $false
        checks = $results
        passed = (($results | Where-Object { -not $_.passed }).Count -eq 0)
    }

    New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
    $stamp = $startedAt.ToString('yyyy-MM-ddTHH-mm-ss-fffZ')
    $outputPath = Join-Path $OutputDirectory "authorization-$stamp.json"
    $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $outputPath -Encoding utf8
    [pscustomobject]@{
        Output = $outputPath
        Passed = $report.passed
        Checks = $results.Count
    }
}
finally {
    $password = $null
    $loginBody = $null
    $invalidBody = $null
}

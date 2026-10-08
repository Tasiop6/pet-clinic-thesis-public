param(
    [string]$TargetUrl = 'http://localhost',
    [string]$Username = 'perf_eval',
    [string]$PasswordFile = (Join-Path $env:TEMP 'happy-tails-perf-eval.password'),
    [long]$OwnerId = 1,
    [long]$PetId = 1,
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\..\output\security')
)

$ErrorActionPreference = 'Stop'
$oversizedBytes = (10 * 1024 * 1024) + 1
$temporaryFile = Join-Path $env:TEMP 'happy-tails-oversized-upload.bin'
$password = $null
$loginContent = $null
$multipart = $null
$fileStream = $null
$fileContent = $null
$client = $null
$handler = $null

if (-not (Test-Path -LiteralPath $PasswordFile)) {
    throw "Synthetic-account password file was not found: $PasswordFile"
}

try {
    $stream = [System.IO.File]::Open($temporaryFile, [System.IO.FileMode]::Create)
    try { $stream.SetLength($oversizedBytes) } finally { $stream.Dispose() }

    $handler = [System.Net.Http.HttpClientHandler]::new()
    $handler.CookieContainer = [System.Net.CookieContainer]::new()
    $client = [System.Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(60)

    $password = (Get-Content -LiteralPath $PasswordFile -Raw).Trim()
    $loginJson = @{ username = $Username; password = $password } | ConvertTo-Json -Compress
    $loginContent = [System.Net.Http.StringContent]::new($loginJson, [System.Text.Encoding]::UTF8, 'application/json')
    $loginResponse = $client.PostAsync("$TargetUrl/api/auth/login", $loginContent).GetAwaiter().GetResult()
    $loginStatus = [int]$loginResponse.StatusCode
    if ($loginStatus -ne 200) { throw "Synthetic login returned HTTP $loginStatus" }

    $multipart = [System.Net.Http.MultipartFormDataContent]::new()
    $multipart.Add([System.Net.Http.StringContent]::new('OTHER'), 'type')
    $multipart.Add([System.Net.Http.StringContent]::new('Oversized security boundary test'), 'title')
    $fileStream = [System.IO.File]::OpenRead($temporaryFile)
    $fileContent = [System.Net.Http.StreamContent]::new($fileStream)
    $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new('application/octet-stream')
    $multipart.Add($fileContent, 'files', 'oversized-security-test.bin')

    $startedAt = (Get-Date).ToUniversalTime()
    $uploadResponse = $client.PostAsync("$TargetUrl/api/owners/$OwnerId/pets/$PetId/records", $multipart).GetAwaiter().GetResult()
    $uploadStatus = [int]$uploadResponse.StatusCode

    $report = [ordered]@{
        startedAtUtc = $startedAt.ToString('o')
        completedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
        target = $TargetUrl
        account = $Username
        credentialsRecorded = $false
        configuredLimitBytes = 10 * 1024 * 1024
        submittedFileBytes = $oversizedBytes
        expectedStatus = 413
        actualStatus = $uploadStatus
        passed = ($uploadStatus -eq 413)
        temporaryPayloadDeleted = $true
    }

    New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
    $outputPath = Join-Path $OutputDirectory ("upload-limit-{0}.json" -f $startedAt.ToString('yyyy-MM-ddTHH-mm-ss-fffZ'))
    $report | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $outputPath -Encoding utf8
    [pscustomobject]@{ Output = $outputPath; Passed = $report.passed; ActualStatus = $uploadStatus }
}
finally {
    if ($fileContent) { $fileContent.Dispose() }
    if ($fileStream) { $fileStream.Dispose() }
    if ($multipart) { $multipart.Dispose() }
    if ($loginContent) { $loginContent.Dispose() }
    if ($client) { $client.Dispose() }
    if ($handler) { $handler.Dispose() }
    if (Test-Path -LiteralPath $temporaryFile) { Remove-Item -LiteralPath $temporaryFile -Force }
    $password = $null
    $loginJson = $null
}

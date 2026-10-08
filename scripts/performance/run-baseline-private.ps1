param(
    [Parameter(Mandatory)]
    [string]$TargetUrl,
    [Parameter(Mandatory)]
    [string]$Username
)

$ErrorActionPreference = 'Stop'

$securePassword = Read-Host "Enter the password for test user $Username" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $env:TARGET_URL = $TargetUrl
    $env:TEST_USERNAME = $Username
    $env:TEST_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $env:CONCURRENCY = '1'
    $env:DURATION_SECONDS = '60'

    node "$PSScriptRoot\run-http-evaluation.mjs"
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    Remove-Item Env:\TEST_PASSWORD -ErrorAction SilentlyContinue
}

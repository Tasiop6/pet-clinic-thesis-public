$ErrorActionPreference = 'Stop'

$securePassword = Read-Host 'Enter the password for test user tasiop6' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $env:TARGET_URL = 'https://thesis-tasiopoulos.com'
    $env:TEST_USERNAME = 'tasiop6'
    $env:TEST_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $env:CONCURRENCY = '1'
    $env:DURATION_SECONDS = '60'

    node "$PSScriptRoot\run-http-evaluation.mjs"
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    Remove-Item Env:\TEST_PASSWORD -ErrorAction SilentlyContinue
}

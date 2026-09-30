Add-Type -AssemblyName System.Drawing

$workspace = Split-Path -Parent $PSScriptRoot
$raw = Join-Path $workspace 'docs\evidence\screenshots\raw'
$output = Join-Path $workspace 'thesis-overleaf\figures\infrastructure'
$applicationOutput = Join-Path $workspace 'thesis-overleaf\figures\application'

New-Item -ItemType Directory -Force -Path $output | Out-Null

function Export-CroppedScreenshot {
    param(
        [Parameter(Mandatory)] [string] $Source,
        [Parameter(Mandatory)] [string] $Destination,
        [Parameter(Mandatory)] [System.Drawing.Rectangle] $Crop,
        [array] $Redactions = @()
    )

    $sourceImage = [System.Drawing.Bitmap]::FromFile($Source)
    try {
        $result = New-Object System.Drawing.Bitmap($Crop.Width, $Crop.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($result)
            try {
                $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
                $destinationRectangle = New-Object System.Drawing.Rectangle(0, 0, $Crop.Width, $Crop.Height)
                $graphics.DrawImage($sourceImage, $destinationRectangle, $Crop, [System.Drawing.GraphicsUnit]::Pixel)

                foreach ($redaction in $Redactions) {
                    $brush = New-Object System.Drawing.SolidBrush($redaction.Color)
                    try {
                        $graphics.FillRectangle($brush, $redaction.Rectangle)
                    }
                    finally {
                        $brush.Dispose()
                    }
                }
            }
            finally {
                $graphics.Dispose()
            }

            $result.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $result.Dispose()
        }
    }
    finally {
        $sourceImage.Dispose()
    }
}

$white = [System.Drawing.Color]::White
$black = [System.Drawing.Color]::Black

Export-CroppedScreenshot `
    -Source 'C:\Users\KonstantinosTasiopou\Downloads\IMG_4935.PNG' `
    -Destination (Join-Path $applicationOutput 'dashboard-mobile.png') `
    -Crop (New-Object System.Drawing.Rectangle(0, 145, 1206, 1993))

Export-CroppedScreenshot `
    -Source (Join-Path $raw 'AWS-01-ec2-instance-list-raw.png') `
    -Destination (Join-Path $output 'aws-ec2-instance-summary.png') `
    -Crop (New-Object System.Drawing.Rectangle(0, 140, 1455, 105)) `
    -Redactions @(
        @{ Rectangle = New-Object System.Drawing.Rectangle(225, 49, 250, 35); Color = $white }
    )

Export-CroppedScreenshot `
    -Source (Join-Path $raw 'AWS-02-security-group-inbound-raw.png') `
    -Destination (Join-Path $output 'aws-security-group-inbound.png') `
    -Crop (New-Object System.Drawing.Rectangle(20, 365, 1435, 265)) `
    -Redactions @(
        @{ Rectangle = New-Object System.Drawing.Rectangle(50, 132, 275, 115); Color = $white },
        @{ Rectangle = New-Object System.Drawing.Rectangle(715, 170, 121, 34); Color = $white }
    )

Export-CroppedScreenshot `
    -Source (Join-Path $raw 'AWS-03-ebs-volume-raw.png') `
    -Destination (Join-Path $output 'aws-ebs-volume-configuration.png') `
    -Crop (New-Object System.Drawing.Rectangle(390, 125, 1040, 330))

Export-CroppedScreenshot `
    -Source (Join-Path $raw 'AWS-05-route53-records-raw.png') `
    -Destination (Join-Path $output 'aws-route53-records.png') `
    -Crop (New-Object System.Drawing.Rectangle(15, 0, 1320, 326))

Export-CroppedScreenshot `
    -Source (Join-Path $raw 'AWS-06c-tls-certificate-details-raw.png') `
    -Destination (Join-Path $output 'tls-certificate-validity.png') `
    -Crop (New-Object System.Drawing.Rectangle(0, 0, 540, 430))

Export-CroppedScreenshot `
    -Source (Join-Path $raw 'AWS-07-docker-containers-raw.png') `
    -Destination (Join-Path $output 'docker-running-containers.png') `
    -Crop (New-Object System.Drawing.Rectangle(0, 305, 1679, 92))

Export-CroppedScreenshot `
    -Source (Join-Path $raw 'AWS-08-http-https-verification-raw.png') `
    -Destination (Join-Path $output 'http-https-verification.png') `
    -Crop (New-Object System.Drawing.Rectangle(0, 0, 1347, 700)) `
    -Redactions @(
        @{ Rectangle = New-Object System.Drawing.Rectangle(0, 0, 402, 27); Color = $black },
        @{ Rectangle = New-Object System.Drawing.Rectangle(0, 210, 402, 28); Color = $black },
        @{ Rectangle = New-Object System.Drawing.Rectangle(0, 673, 402, 27); Color = $black }
    )

Export-CroppedScreenshot `
    -Source (Join-Path $raw 'DEPLOY-01-cyberduck-sftp-files-raw.png') `
    -Destination (Join-Path $output 'deployment-sftp-files.png') `
    -Crop (New-Object System.Drawing.Rectangle(0, 65, 1278, 440))

Write-Output "Processed screenshots written to $output"

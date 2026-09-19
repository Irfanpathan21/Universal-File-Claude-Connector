param (
  [string]$RootDir = ""
)

if (-not $RootDir) {
  $RootDir = (Resolve-Path "$PSScriptRoot\..").Path
}

Add-Type -AssemblyName System.Drawing

$srcLogo = Join-Path $RootDir "assets\uftlogo.png"
$dstIco = Join-Path $RootDir "assets\app-icon.ico"
$frontendPublic = Join-Path $RootDir "packages\frontend\public"

if (Test-Path $srcLogo) {
  Write-Host "[*] Converting uftlogo.png to multi-resolution app-icon.ico..." -ForegroundColor Cyan
  $img = [System.Drawing.Image]::FromFile($srcLogo)

  # Create 256x256 high-res bitmap
  $bmp = New-Object System.Drawing.Bitmap 256, 256
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($img, 0, 0, 256, 256)

  $hIcon = $bmp.GetHicon()
  $icon = [System.Drawing.Icon]::FromHandle($hIcon)

  $fs = [System.IO.FileStream]::new($dstIco, [System.IO.FileMode]::Create)
  $icon.Save($fs)
  $fs.Close()
  $icon.Dispose()
  $bmp.Dispose()
  $img.Dispose()

  # Copy logo to frontend public directory
  if (-not (Test-Path $frontendPublic)) {
    New-Item -ItemType Directory -Path $frontendPublic -Force | Out-Null
  }
  Copy-Item -Path $srcLogo -Destination (Join-Path $frontendPublic "uftlogo.png") -Force
  Copy-Item -Path $srcLogo -Destination (Join-Path $frontendPublic "logo.png") -Force
  Copy-Item -Path $dstIco -Destination (Join-Path $frontendPublic "favicon.ico") -Force

  Write-Host "[OK] Successfully generated app-icon.ico and updated frontend public logo assets!" -ForegroundColor Green
} else {
  Write-Warning "Source logo assets\uftlogo.png not found."
}

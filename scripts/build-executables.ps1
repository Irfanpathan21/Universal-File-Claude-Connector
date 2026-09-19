param (
  [string]$RootDir = ""
)

if (-not $RootDir) {
  $RootDir = (Resolve-Path "$PSScriptRoot\..").Path
}
Set-Location $RootDir

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Building Enterprise Windows Executables (.exe)" -ForegroundColor Cyan
Write-Host " Universal File Toolkit" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Locate C# compiler (csc.exe) and WPF directory
$frameworkDir = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319"
if (-not (Test-Path $frameworkDir)) {
  $frameworkDir = "C:\Windows\Microsoft.NET\Framework\v4.0.30319"
}

$cscPath = Join-Path $frameworkDir "csc.exe"
$wpfDir = Join-Path $frameworkDir "WPF"

if (-not (Test-Path $cscPath)) {
  Write-Error "Microsoft .NET C# compiler (csc.exe) not found at standard Windows path."
  exit 1
}
Write-Host "[OK] Found .NET Compiler: $cscPath" -ForegroundColor Green

# 2. Ensure Icon exists from uftlogo.png
$iconPath = Join-Path $RootDir "assets\app-icon.ico"
if (-not (Test-Path $iconPath)) {
  Write-Host "[*] Generating application icon from uftlogo.png..." -ForegroundColor Yellow
  & powershell -ExecutionPolicy Bypass -File "$RootDir\scripts\create-icon.ps1" | Out-Null
}

$iconArg = ""
if (Test-Path $iconPath) {
  $iconArg = "/win32icon:`"$iconPath`""
}

$manifestPath = Join-Path $RootDir "src-installer\app.manifest"
$manifestArg = ""
if (Test-Path $manifestPath) {
  $manifestArg = "/win32manifest:`"$manifestPath`""
}

$assemblyInfo = Join-Path $RootDir "src-installer\AssemblyInfo.cs"

# 3. Compile Setup Wizard (Setup.exe)
Write-Host "[*] Compiling Setup.exe with embedded Manifest & AssemblyInfo..." -ForegroundColor Yellow
$setupSrc = Join-Path $RootDir "src-installer\SetupWizard.cs"
$setupOut = Join-Path $RootDir "Setup.exe"

$wpfRefs = "/r:`"$wpfDir\WindowsBase.dll`" /r:`"$wpfDir\PresentationCore.dll`" /r:`"$wpfDir\PresentationFramework.dll`" /r:`"$frameworkDir\System.Xaml.dll`" /r:System.dll /r:System.Core.dll /r:System.Xml.dll /r:Microsoft.CSharp.dll"

$pInfo = New-Object System.Diagnostics.ProcessStartInfo
$pInfo.FileName = $cscPath
$pInfo.Arguments = "/target:winexe /nologo /optimize+ $iconArg $manifestArg $wpfRefs /out:`"$setupOut`" `"$setupSrc`" `"$assemblyInfo`""
$pInfo.UseShellExecute = $false
$pInfo.RedirectStandardOutput = $true
$pInfo.RedirectStandardError = $true
$p = [System.Diagnostics.Process]::Start($pInfo)
$out = $p.StandardOutput.ReadToEnd()
$err = $p.StandardError.ReadToEnd()
$p.WaitForExit()

if ($p.ExitCode -eq 0 -and (Test-Path $setupOut)) {
  Write-Host "[OK] Successfully compiled Setup.exe" -ForegroundColor Green
} else {
  Write-Host $out
  Write-Host $err -ForegroundColor Red
  Write-Error "Failed to compile Setup.exe"
  exit 1
}

# 4. Compile App Launcher (UniversalFileToolkit.exe)
Write-Host "[*] Compiling UniversalFileToolkit.exe (Silent App Mode Launcher)..." -ForegroundColor Yellow
$launcherSrc = Join-Path $RootDir "src-installer\AppLauncher.cs"
$launcherOut = Join-Path $RootDir "UniversalFileToolkit.exe"

$launcherRefs = "/r:System.dll /r:System.Core.dll /r:System.Net.dll"

$pInfo2 = New-Object System.Diagnostics.ProcessStartInfo
$pInfo2.FileName = $cscPath
$pInfo2.Arguments = "/target:winexe /nologo /optimize+ $iconArg $manifestArg $launcherRefs /out:`"$launcherOut`" `"$launcherSrc`" `"$assemblyInfo`""
$pInfo2.UseShellExecute = $false
$pInfo2.RedirectStandardOutput = $true
$pInfo2.RedirectStandardError = $true
$p2 = [System.Diagnostics.Process]::Start($pInfo2)
$out2 = $p2.StandardOutput.ReadToEnd()
$err2 = $p2.StandardError.ReadToEnd()
$p2.WaitForExit()

if ($p2.ExitCode -eq 0 -and (Test-Path $launcherOut)) {
  Write-Host "[OK] Successfully compiled UniversalFileToolkit.exe" -ForegroundColor Green
} else {
  Write-Host $out2
  Write-Host $err2 -ForegroundColor Red
  Write-Error "Failed to compile UniversalFileToolkit.exe"
  exit 1
}

# 5. Package for Web Download (both .exe and .zip)
$frontendPublic = Join-Path $RootDir "packages\frontend\public"
if (-not (Test-Path $frontendPublic)) {
  New-Item -ItemType Directory -Path $frontendPublic -Force | Out-Null
}

Copy-Item -Path $setupOut -Destination (Join-Path $frontendPublic "Setup.exe") -Force -ErrorAction SilentlyContinue

# Create clean ZIP package for safe download
$zipOut = Join-Path $frontendPublic "UniversalFileToolkit-Setup.zip"
$rootZipOut = Join-Path $RootDir "UniversalFileToolkit-Setup.zip"
$tempPkgDir = Join-Path $env:TEMP "UFT-Package-$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $tempPkgDir -Force | Out-Null

Copy-Item -Path $setupOut -Destination (Join-Path $tempPkgDir "Setup.exe") -Force
Copy-Item -Path $launcherOut -Destination (Join-Path $tempPkgDir "UniversalFileToolkit.exe") -Force
$readmeText = "Universal File Toolkit - Windows App`r`n`r`n1. Double-click Setup.exe to install and configure.`r`n2. Click 'Start Setup' to register desktop and start menu shortcuts.`r`n3. Launch and search 'Universal File Toolkit' from Windows Search anytime."
Set-Content -Path (Join-Path $tempPkgDir "README.txt") -Value $readmeText

if (Test-Path $zipOut) { Remove-Item $zipOut -Force -ErrorAction SilentlyContinue }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempPkgDir, $zipOut)
Copy-Item -Path $zipOut -Destination $rootZipOut -Force -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $tempPkgDir -ErrorAction SilentlyContinue

Write-Host "[OK] Created safe download package: UniversalFileToolkit-Setup.zip" -ForegroundColor Green

# 6. Output Summary
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Build Complete! Created 2 Primary Windows Packages:" -ForegroundColor Green
Write-Host " 1. UniversalFileToolkit-Setup.zip (Recommended Web Download)" -ForegroundColor White
Write-Host " 2. Setup.exe                     (1-Click Windows Installer)" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan

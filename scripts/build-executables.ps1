param (
  [string]$RootDir = ""
)

if (-not $RootDir) {
  $RootDir = (Resolve-Path "$PSScriptRoot\..").Path
}
Set-Location $RootDir

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Building Native Windows Executables (.exe)" -ForegroundColor Cyan
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

# 2. Ensure Icon exists
$iconPath = Join-Path $RootDir "assets\app-icon.ico"
if (-not (Test-Path $iconPath)) {
  Write-Host "[*] Generating application icon..." -ForegroundColor Yellow
  & powershell -ExecutionPolicy Bypass -File "$RootDir\scripts\create-icon.ps1" | Out-Null
}

$iconArg = ""
if (Test-Path $iconPath) {
  $iconArg = "/win32icon:`"$iconPath`""
}

# 3. Compile Setup Wizard (UniversalFileToolkitSetup.exe & Setup.exe)
Write-Host "[*] Compiling Setup.exe (WPF Native Installer)..." -ForegroundColor Yellow
$setupSrc = Join-Path $RootDir "src-installer\SetupWizard.cs"
$setupOut = Join-Path $RootDir "Setup.exe"
$setupReleaseOut = Join-Path $RootDir "UniversalFileToolkitSetup.exe"

$wpfRefs = "/r:`"$wpfDir\WindowsBase.dll`" /r:`"$wpfDir\PresentationCore.dll`" /r:`"$wpfDir\PresentationFramework.dll`" /r:`"$frameworkDir\System.Xaml.dll`" /r:System.dll /r:System.Core.dll /r:System.Xml.dll /r:Microsoft.CSharp.dll"

$pInfo = New-Object System.Diagnostics.ProcessStartInfo
$pInfo.FileName = $cscPath
$pInfo.Arguments = "/target:winexe /nologo /optimize+ $iconArg $wpfRefs /out:`"$setupOut`" `"$setupSrc`""
$pInfo.UseShellExecute = $false
$pInfo.RedirectStandardOutput = $true
$pInfo.RedirectStandardError = $true
$p = [System.Diagnostics.Process]::Start($pInfo)
$out = $p.StandardOutput.ReadToEnd()
$err = $p.StandardError.ReadToEnd()
$p.WaitForExit()

if ($p.ExitCode -eq 0 -and (Test-Path $setupOut)) {
  try {
    Copy-Item -Path $setupOut -Destination $setupReleaseOut -Force -ErrorAction SilentlyContinue
  } catch {}
  Write-Host "[OK] Successfully compiled Setup.exe and UniversalFileToolkitSetup.exe" -ForegroundColor Green
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
$pInfo2.Arguments = "/target:winexe /nologo /optimize+ $iconArg $launcherRefs /out:`"$launcherOut`" `"$launcherSrc`""
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

# 5. Output Summary
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Build Complete! Created Windows Executables:" -ForegroundColor Green
Write-Host " 1. Setup.exe / UniversalFileToolkitSetup.exe  (Setup Wizard)" -ForegroundColor White
Write-Host " 2. UniversalFileToolkit.exe                  (Silent Launcher)" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan

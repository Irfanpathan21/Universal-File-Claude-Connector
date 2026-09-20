# ==============================================================================
# Universal File Toolkit - One-Click Setup Script (PowerShell)
#
# This script is the recommended installer. It does NOT trigger Windows
# SmartScreen or Defender warnings.
#
# What it does:
#   1. Checks for Node.js (installs via winget if missing)
#   2. Installs project dependencies via pnpm
#   3. Builds the backend and shared packages
#   4. Creates Desktop and Start Menu shortcuts
#   5. Launches the application
# ==============================================================================

[CmdletBinding()]
param (
    [switch]$NoLaunch
)

$ErrorActionPreference = "Stop"
$rootDir = $PSScriptRoot
Set-Location $rootDir

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   UNIVERSAL FILE TOOLKIT - ONE-CLICK SETUP" -ForegroundColor White
Write-Host "   100+ File Tools | Web Interface | MCP Server" -ForegroundColor Gray
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------------------------
# Step 1: Check / Install Node.js
# ------------------------------------------------------------------------------
Write-Host "[1/5] Checking Node.js runtime environment..." -ForegroundColor Yellow
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeCmd) {
    $pfNode = Join-Path $env:ProgramFiles "nodejs"
    if (Test-Path $pfNode) {
        $env:PATH = "$pfNode;$env:PATH"
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    }
}

if (-not $nodeCmd) {
    Write-Host "      Node.js not found. Installing via winget..." -ForegroundColor Yellow
    try {
        winget install OpenJS.NodeJS.LTS -h --accept-source-agreements --accept-package-agreements
        $env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    }
    catch {
        Write-Host ""
        Write-Host "      [!] Could not auto-install Node.js via winget." -ForegroundColor Red
        Write-Host "      Please install Node.js LTS from: https://nodejs.org/" -ForegroundColor Red
        Write-Host "      Then re-run setup." -ForegroundColor Red
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
}

if ($nodeCmd) {
    $nodeVer = & node -v
    Write-Host "      [OK] Node.js $nodeVer" -ForegroundColor Green
} else {
    Write-Host "      [!] Node.js installation failed. Please install from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ------------------------------------------------------------------------------
# Step 2: Check pnpm Package Manager
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/5] Checking pnpm package manager..." -ForegroundColor Yellow
$pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
$pkgRunner = "pnpm"

if (-not $pnpmCmd) {
    Write-Host "      Installing pnpm globally..." -ForegroundColor Gray
    try {
        & npm install -g pnpm@9 2>$null
        $pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
    } catch {}
}

if (-not $pnpmCmd) {
    $pkgRunner = "npx -y pnpm@9"
    Write-Host "      [OK] Using npx pnpm (no global install needed)" -ForegroundColor Green
} else {
    Write-Host "      [OK] pnpm found" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# Step 3: Install Dependencies
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/5] Installing project dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "$rootDir\node_modules")) {
    Write-Host "      Running dependency install (may take 1-2 minutes)..." -ForegroundColor Gray
    if ($pkgRunner -eq "pnpm") {
        & pnpm install --no-frozen-lockfile
    } else {
        & cmd.exe /c "npx -y pnpm@9 install --no-frozen-lockfile"
    }
    Write-Host "      [OK] Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "      [OK] Dependencies already installed" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# Step 4: Build Backend & Shared Packages
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[4/5] Building application engines..." -ForegroundColor Yellow
$backendDist = "$rootDir\packages\backend\dist\index.js"

if (-not (Test-Path $backendDist)) {
    Write-Host "      Compiling TypeScript packages..." -ForegroundColor Gray
    if ($pkgRunner -eq "pnpm") {
        & pnpm build
    } else {
        & cmd.exe /c "npx -y pnpm@9 build"
    }
    Write-Host "      [OK] Build complete" -ForegroundColor Green
} else {
    Write-Host "      [OK] Build already up to date" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# Step 5: Create Desktop & Start Menu Shortcuts
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[5/5] Creating Windows shortcuts..." -ForegroundColor Yellow

try {
    $desktopPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::DesktopDirectory)
    $startMenuPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs)
    $desktopShortcut = Join-Path $desktopPath "Universal File Toolkit.lnk"
    $startMenuShortcut = Join-Path $startMenuPath "Universal File Toolkit.lnk"
    
    $targetPath = Join-Path $rootDir "launch.bat"
    $iconPath = Join-Path $rootDir "assets\app-icon.ico"

    $wsh = New-Object -ComObject WScript.Shell
    
    # Desktop Shortcut
    $sc1 = $wsh.CreateShortcut($desktopShortcut)
    $sc1.TargetPath = $targetPath
    $sc1.WorkingDirectory = $rootDir
    $sc1.Description = "Universal File Toolkit - 100+ File Processing Tools"
    if (Test-Path $iconPath) { $sc1.IconLocation = "$iconPath,0" }
    $sc1.Save()

    # Start Menu Shortcut (searchable in Windows Search)
    $sc2 = $wsh.CreateShortcut($startMenuShortcut)
    $sc2.TargetPath = $targetPath
    $sc2.WorkingDirectory = $rootDir
    $sc2.Description = "Universal File Toolkit - 100+ File Processing Tools"
    if (Test-Path $iconPath) { $sc2.IconLocation = "$iconPath,0" }
    $sc2.Save()

    Write-Host "      [OK] Desktop shortcut created" -ForegroundColor Green
    Write-Host "      [OK] Start Menu shortcut created (indexed in Windows Search)" -ForegroundColor Green
} catch {
    Write-Warning "Shortcut creation skipped: $($_.Exception.Message)"
}

# ------------------------------------------------------------------------------
# Setup Complete & Launch
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "   SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "   You can now launch anytime by:" -ForegroundColor White
Write-Host "   - Double-clicking 'Universal File Toolkit' on your Desktop" -ForegroundColor Gray
Write-Host "   - Searching 'Universal File Toolkit' in Windows Start Menu" -ForegroundColor Gray
Write-Host "   - Running 'launch.bat' from this folder" -ForegroundColor Gray
Write-Host ""

if (-not $NoLaunch) {
    Write-Host "Launching Universal File Toolkit now..." -ForegroundColor Cyan
    $launcher = Join-Path $rootDir "launch.bat"
    if (Test-Path $launcher) {
        Start-Process -FilePath $launcher -WorkingDirectory $rootDir
    } else {
        Write-Host "      [!] launch.bat not found. Please run it manually." -ForegroundColor Yellow
    }
}

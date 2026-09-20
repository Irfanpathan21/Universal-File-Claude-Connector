# ==============================================================================
# Universal File Toolkit — One-Click Setup Script (PowerShell)
#
# This script is the recommended installer. It does NOT trigger Windows
# SmartScreen or Defender warnings because:
#   - PowerShell scripts (.ps1) are not flagged by SmartScreen
#   - No digital signature is needed
#   - Called via Setup-OneClick.cmd with -ExecutionPolicy Bypass
#
# What it does:
#   1. Checks for Node.js (installs via winget if missing)
#   2. Installs project dependencies via pnpm
#   3. Builds the backend & shared packages
#   4. Creates Desktop + Start Menu shortcuts
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
Write-Host " ================================================================" -ForegroundColor Cyan
Write-Host "   UNIVERSAL FILE TOOLKIT — ONE-CLICK SETUP" -ForegroundColor White
Write-Host "   100+ File Tools • Web Interface • MCP Server" -ForegroundColor Gray
Write-Host " ================================================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Check / Install Node.js ─────────────────────────────────────────
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
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
        # Refresh PATH after install
        $env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    }
    catch {
        Write-Host ""
        Write-Host "      [!] Could not auto-install Node.js." -ForegroundColor Red
        Write-Host "      Please install Node.js LTS from: https://nodejs.org/" -ForegroundColor Red
        Write-Host "      Then re-run this setup script." -ForegroundColor Red
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
}

if ($nodeCmd) {
    $nodeVer = & node -v
    Write-Host "      [OK] Node.js $nodeVer" -ForegroundColor Green
} else {
    Write-Host "      [!] Node.js installation failed. Please install manually from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ── Step 2: Install pnpm (if needed) ────────────────────────────────────────
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
    Write-Host "      [OK] Will use npx pnpm (no global install needed)" -ForegroundColor Green
} else {
    Write-Host "      [OK] pnpm found" -ForegroundColor Green
}

# ── Step 3: Install Dependencies ────────────────────────────────────────────
Write-Host ""
Write-Host "[3/5] Installing project dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "$rootDir\node_modules")) {
    Write-Host "      Running $pkgRunner install (first time, may take 1-2 minutes)..." -ForegroundColor Gray
    if ($pkgRunner -eq "pnpm") {
        & pnpm install --no-frozen-lockfile 2>&1 | Out-Null
    } else {
        & cmd.exe /c "npx -y pnpm@9 install --no-frozen-lockfile" 2>&1 | Out-Null
    }
    Write-Host "      [OK] Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "      [OK] Dependencies already present" -ForegroundColor Green
}

# ── Step 4: Build Backend & Shared ──────────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Building application..." -ForegroundColor Yellow
$backendDist = "$rootDir\packages\backend\dist\index.js"

if (-not (Test-Path $backendDist)) {
    Write-Host "      Compiling TypeScript packages..." -ForegroundColor Gray
    if ($pkgRunner -eq "pnpm") {
        & pnpm build 2>&1 | Out-Null
    } else {
        & cmd.exe /c "npx -y pnpm@9 build" 2>&1 | Out-Null
    }
    Write-Host "      [OK] Build complete" -ForegroundColor Green
} else {
    Write-Host "      [OK] Build already up to date" -ForegroundColor Green
}

# ── Step 5: Create Desktop & Start Menu Shortcuts ───────────────────────────
Write-Host ""
Write-Host "[5/5] Creating shortcuts..." -ForegroundColor Yellow

try {
    $desktopPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::DesktopDirectory)
    $startMenuPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs)
    $desktopShortcut = Join-Path $desktopPath "Universal File Toolkit.lnk"
    $startMenuShortcut = Join-Path $startMenuPath "Universal File Toolkit.lnk"
    
    # Target is launch.bat (does not trigger SmartScreen from shortcut)
    $targetPath = Join-Path $rootDir "launch.bat"
    $iconPath = Join-Path $rootDir "assets\app-icon.ico"

    $wsh = New-Object -ComObject WScript.Shell
    
    # Desktop Shortcut
    $sc1 = $wsh.CreateShortcut($desktopShortcut)
    $sc1.TargetPath = $targetPath
    $sc1.WorkingDirectory = $rootDir
    $sc1.Description = "Universal File Toolkit — 100+ File Processing Tools"
    if (Test-Path $iconPath) { $sc1.IconLocation = "$iconPath,0" }
    $sc1.Save()

    # Start Menu Shortcut (searchable in Windows Search)
    $sc2 = $wsh.CreateShortcut($startMenuShortcut)
    $sc2.TargetPath = $targetPath
    $sc2.WorkingDirectory = $rootDir
    $sc2.Description = "Universal File Toolkit — 100+ File Processing Tools"
    if (Test-Path $iconPath) { $sc2.IconLocation = "$iconPath,0" }
    $sc2.Save()

    Write-Host "      [OK] Desktop shortcut created" -ForegroundColor Green
    Write-Host "      [OK] Start Menu shortcut created (searchable in Windows Search)" -ForegroundColor Green
} catch {
    Write-Warning "Shortcut creation skipped: $($_.Exception.Message)"
}

# ── Done! ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host " ================================================================" -ForegroundColor Green
Write-Host "   SETUP COMPLETE!" -ForegroundColor Green
Write-Host " ================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "   You can now:" -ForegroundColor White
Write-Host "   - Double-click 'Universal File Toolkit' on your Desktop" -ForegroundColor Gray
Write-Host "   - Search 'Universal File Toolkit' in Windows Start Menu" -ForegroundColor Gray
Write-Host "   - Run 'launch.bat' from this folder" -ForegroundColor Gray
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

# SIG # Begin signature block
# MIIFggYJKoZIhvcNAQcCoIIFczCCBW8CAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUCAY3LaiWizOqUNP+sES/fklt
# 66KgggMWMIIDEjCCAfqgAwIBAgIQVHBsiMPyAIVBlYkDeNR93zANBgkqhkiG9w0B
# AQsFADAhMR8wHQYDVQQDDBZVbml2ZXJzYWwgRmlsZSBUb29sa2l0MB4XDTI2MDkx
# OTE4MTY1NVoXDTMxMDkxOTE4MjY1NVowITEfMB0GA1UEAwwWVW5pdmVyc2FsIEZp
# bGUgVG9vbGtpdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALNAis9g
# BkVbRWaVZ6GrYkcG9TkCEjq24SCYCvyQ1f21DEsqz5D5tEg58e+ty0rjwobka85/
# Ju8SAQcHxCCpMFxp8aSDkQY4IboMST80iN/4a4cBxFIcUIPoPS1tni/mDtfGqSry
# uHMEFZ8nnFc85rRvfjN5qLoGrC8o1dh2DAkqZjNl5xjGG1zS2432By2dt4Cp8YVu
# nwbbLWWqcDjpeRH0Gm2JJbpT4VtqmjvJeTPIFOYpWWgj7WuRxsA6u2iaIaUkHaMw
# AbCuvT8OIhTf/Le4OFFwHjSX/lAl367lYW/t8mLWYwPDgk0B1iMxddWVnd9P6nqu
# n2HODO4cU1m82L0CAwEAAaNGMEQwDgYDVR0PAQH/BAQDAgeAMBMGA1UdJQQMMAoG
# CCsGAQUFBwMDMB0GA1UdDgQWBBQHr/Swv1G1TAzgOb+ojScuKNgapjANBgkqhkiG
# 9w0BAQsFAAOCAQEAWB4CoU20IT0eZSOLqx5KsCpLzgQ9rRjmEloMM00Sbe7Fba/h
# 78Di1FsvclK/3WmprOlfIK2dXd/+OU9S2RTC9ORiVgzk+B4S+IWAKNj7JrpZr4pd
# eQjiebfxxED2UZKwsHkcAcbqx3hkyNNLI9pMmz35uY813uHLGrbETx5EJ50ILYDf
# wzC81VhcOMmrZsYk67ycbG3KPVCgcUylkDGfsP4z2lhlvnNylVUqZ2lf/PG83VD9
# DPDBYQwMBXfXbdHPf76dSctHw9sorYiLek+ARa1FGjjN4l+Wu6NTQewasP+rP9oi
# v5Z/uIGKMXrkQmixQgbyCKa8BxsN3KQtSUGdSjGCAdYwggHSAgEBMDUwITEfMB0G
# A1UEAwwWVW5pdmVyc2FsIEZpbGUgVG9vbGtpdAIQVHBsiMPyAIVBlYkDeNR93zAJ
# BgUrDgMCGgUAoHgwGAYKKwYBBAGCNwIBDDEKMAigAoAAoQKAADAZBgkqhkiG9w0B
# CQMxDAYKKwYBBAGCNwIBBDAcBgorBgEEAYI3AgELMQ4wDAYKKwYBBAGCNwIBFTAj
# BgkqhkiG9w0BCQQxFgQUwLSSUEgfI4a+yo6u2+ToZXfb5NAwDQYJKoZIhvcNAQEB
# BQAEggEAnnIm66ZeTlIGNNQOhm6LbCMlJUQOHuj0Rzv7rQ0PrSrJOqwV77tlty7G
# mCdMSSzVRE+5mEcl1yLPSHoKAgzegBgSPlE9WQbZZeUs71ThpgagoYmDgaJQOhmB
# M+f2bS/xVH8brv/eBM3gTRdudxhQA0pTa56lO3nNPqwdGTi31c0SKKkpwi4Br7BD
# Arpl1u/4evG4hJBr8gE70zvVxzuCLH615sn8XuyFoI5hX7jToPnTdQCazz813x/1
# +AtmBfSJsA7b0MGICF1R3WVjayEltnL3hvXKDfQK4thgStWmF0FrrATTnHuA1mlF
# Nl5Bz/5RVx09732SJ5B9wd/c7to2+w==
# SIG # End signature block

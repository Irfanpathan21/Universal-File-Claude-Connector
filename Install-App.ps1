# ==============================================================================
# Universal File Toolkit — Windows Automated Application Installer
# Fully Windows 10/11 Security & Architecture Compliant
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
Write-Host "   UNIVERSAL FILE TOOLKIT (UFT) — WINDOWS SETUP & INSTALLER" -ForegroundColor White
Write-Host "   Enterprise File Operations • MCP Server • Web Interface" -ForegroundColor Gray
Write-Host " ================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verify / Install Node.js
Write-Host "[1/4] Checking Node.js runtime environment..." -ForegroundColor Yellow
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeCmd) {
    $pfNode = Join-Path $env:ProgramFiles "nodejs"
    if (Test-Path $pfNode) {
        $env:PATH = "$pfNode;$env:PATH"
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    }
}

if (-not $nodeCmd) {
    Write-Host "      Node.js was not detected. Installing Node.js LTS via winget..." -ForegroundColor Yellow
    try {
        winget install OpenJS.NodeJS.LTS -h --accept-source-agreements --accept-package-agreements
        $env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    }
    catch {
        Write-Warning "Could not automatically install Node.js via winget."
    }
}

if ($nodeCmd) {
    $nodeVer = & node -v
    Write-Host "      [OK] Node.js Runtime: $nodeVer" -ForegroundColor Green
} else {
    Write-Host "      [!] Please install Node.js LTS from https://nodejs.org/ and rerun setup." -ForegroundColor Red
    Pause
    exit 1
}

# 2. Install Project Dependencies
Write-Host ""
Write-Host "[2/4] Verifying workspace packages..." -ForegroundColor Yellow

$pkgMgr = "pnpm"
$pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmCmd) {
    $pkgMgr = "npx -y pnpm@9"
}

if (-not (Test-Path "$rootDir\node_modules")) {
    Write-Host "      Installing dependencies with $pkgMgr..." -ForegroundColor Gray
    & cmd.exe /c "$pkgMgr install"
    Write-Host "      [OK] Dependencies installed." -ForegroundColor Green
} else {
    Write-Host "      [OK] Dependencies already installed." -ForegroundColor Green
}

# 3. Build Backend & Shared Packages
Write-Host ""
Write-Host "[3/4] Building core engines & services..." -ForegroundColor Yellow
$backendDist = "$rootDir\packages\backend\dist\index.js"

if (-not (Test-Path $backendDist)) {
    Write-Host "      Compiling backend and shared packages..." -ForegroundColor Gray
    & cmd.exe /c "$pkgMgr build"
    Write-Host "      [OK] Package builds compiled." -ForegroundColor Green
} else {
    Write-Host "      [OK] Package builds verified." -ForegroundColor Green
}

# 4. Register Windows Start Menu & Desktop Shortcuts
Write-Host ""
Write-Host "[4/4] Registering Windows application shortcuts..." -ForegroundColor Yellow

try {
    $desktopPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::DesktopDirectory)
    $startMenuPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs)
    $desktopShortcut = Join-Path $desktopPath "Universal File Toolkit.lnk"
    $startMenuShortcut = Join-Path $startMenuPath "Universal File Toolkit.lnk"
    
    $launcherExe = Join-Path $rootDir "UniversalFileToolkit.exe"
    $targetPath = if (Test-Path $launcherExe) { $launcherExe } else { Join-Path $rootDir "launch.bat" }
    $iconPath = Join-Path $rootDir "assets\app-icon.ico"

    $wsh = New-Object -ComObject WScript.Shell
    
    # Desktop
    $sc1 = $wsh.CreateShortcut($desktopShortcut)
    $sc1.TargetPath = $targetPath
    $sc1.WorkingDirectory = $rootDir
    $sc1.Description = "Universal File Toolkit"
    if (Test-Path $iconPath) { $sc1.IconLocation = "$iconPath,0" }
    $sc1.Save()

    # Start Menu (Makes it searchable in Windows Search)
    $sc2 = $wsh.CreateShortcut($startMenuShortcut)
    $sc2.TargetPath = $targetPath
    $sc2.WorkingDirectory = $rootDir
    $sc2.Description = "Universal File Toolkit"
    if (Test-Path $iconPath) { $sc2.IconLocation = "$iconPath,0" }
    $sc2.Save()

    Write-Host "      [OK] Desktop Shortcut: $desktopShortcut" -ForegroundColor Green
    Write-Host "      [OK] Start Menu Shortcut: $startMenuShortcut (Indexed in Windows Search)" -ForegroundColor Green
} catch {
    Write-Warning "Shortcut registration notice: $($_.Exception.Message)"
}

Write-Host ""
Write-Host " ================================================================" -ForegroundColor Green
Write-Host "   [SUCCESS] Universal File Toolkit is configured and ready!" -ForegroundColor Green
Write-Host " ================================================================" -ForegroundColor Green
Write-Host ""

if (-not $NoLaunch) {
    Write-Host "Launching Universal File Toolkit..." -ForegroundColor Cyan
    $launcher = Join-Path $rootDir "launch.bat"
    Start-Process -FilePath $launcher -WorkingDirectory $rootDir
}

# SIG # Begin signature block
# MIIFggYJKoZIhvcNAQcCoIIFczCCBW8CAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUGTe3xcQgCjZBF+MeeKx35OFo
# +ougggMWMIIDEjCCAfqgAwIBAgIQVHBsiMPyAIVBlYkDeNR93zANBgkqhkiG9w0B
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
# BgkqhkiG9w0BCQQxFgQUKEtGjQwLO21vxsmI40cSfdymZXwwDQYJKoZIhvcNAQEB
# BQAEggEAY37wEwza+77R7AehXeJsPhBnM6wDJPhPomtZDjulXPmI8+dYfZUIDLTV
# SYI/DfXbXc/SiGra3YkLiD8NaI0Rr9A9UoCo9Sr2QD82PVQVcM6ByK67gU+hxrJD
# uy65aaH9FcInjh6Ptt0dIiz9YCOSZj81Nlwgcyq+QaATEjCsUKl+XRNhL2/Sq04P
# 7Tps8wWoxiShrdWSbMxJUA59XXF7xdgcSCt4bxRhq3XrSuY1qxpipn4ZkJqHYtj4
# z4faIgAUAizjzdNACpvKBft234dB6QU0m2PSFkQE7hQ2jIJFXlfRCIJzeGhMkh6y
# 8dVhlPXZWBXhpicdKM92eJV611WawA==
# SIG # End signature block

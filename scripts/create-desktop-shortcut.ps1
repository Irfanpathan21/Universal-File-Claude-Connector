param (
  [string]$RootDir = ""
)

if (-not $RootDir) {
  $RootDir = (Resolve-Path "$PSScriptRoot\..").Path
}

$DesktopPath = [Environment]::GetFolderPath("Desktop")
$DesktopShortcut = Join-Path $DesktopPath "Universal File Toolkit.lnk"

$StartMenuPath = Join-Path ([Environment]::GetFolderPath("ApplicationData")) "Microsoft\Windows\Start Menu\Programs"
$StartMenuShortcut = Join-Path $StartMenuPath "Universal File Toolkit.lnk"

$ExePath = Join-Path $RootDir "UniversalFileToolkit.exe"
$BatPath = Join-Path $RootDir "launch.bat"
$IconPath = Join-Path $RootDir "assets\app-icon.ico"

$Target = if (Test-Path $ExePath) { $ExePath } else { $BatPath }

$WshShell = New-Object -ComObject WScript.Shell

# 1. Desktop Shortcut
$sc1 = $WshShell.CreateShortcut($DesktopShortcut)
$sc1.TargetPath = $Target
$sc1.WorkingDirectory = $RootDir
$sc1.Description = "Universal File Toolkit"
if (Test-Path $IconPath) {
  $sc1.IconLocation = "$IconPath, 0"
}
$sc1.Save()

# 2. Start Menu Shortcut (Searchable in Windows Search)
$sc2 = $WshShell.CreateShortcut($StartMenuShortcut)
$sc2.TargetPath = $Target
$sc2.WorkingDirectory = $RootDir
$sc2.Description = "Universal File Toolkit"
if (Test-Path $IconPath) {
  $sc2.IconLocation = "$IconPath, 0"
}
$sc2.Save()

Write-Output "SUCCESS: Created Desktop Shortcut and Windows Start Menu Shortcut!"

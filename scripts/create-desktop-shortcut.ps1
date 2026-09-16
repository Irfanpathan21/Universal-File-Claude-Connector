param (
  [string]$RootDir = ""
)

if (-not $RootDir) {
  $RootDir = (Resolve-Path "$PSScriptRoot\..").Path
}

$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Universal File Toolkit.lnk"
$VbsPath = Join-Path $RootDir "launch-silent.vbs"
$BatPath = Join-Path $RootDir "launch.bat"
$IconPath = Join-Path $RootDir "assets\app-icon.ico"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)

if (Test-Path $VbsPath) {
  $Shortcut.TargetPath = "wscript.exe"
  $Shortcut.Arguments = "`"$VbsPath`""
} else {
  $Shortcut.TargetPath = $BatPath
}

$Shortcut.WorkingDirectory = $RootDir
$Shortcut.Description = "Universal File Toolkit - 100 Local File Tools"
if (Test-Path $IconPath) {
  $Shortcut.IconLocation = "$IconPath, 0"
}
$Shortcut.Save()

Write-Output "SUCCESS: Created Desktop Shortcut at $ShortcutPath"

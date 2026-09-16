@echo off
title Universal File Toolkit — Setup Wizard
cd /d "%~dp0"

:: Launch modern Windows WPF Installer GUI
powershell -ExecutionPolicy Bypass -NoProfile -File "scripts\InstallerWizard.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [*] Falling back to CLI installer...
    node install.js
    pause
)

@echo off
title Universal File Toolkit — Setup Wizard
cd /d "%~dp0"

:: 1. Verify Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ================================================================
    echo  [!] Node.js was not detected on this computer.
    echo ================================================================
    echo  Node.js (LTS version) is required to run Universal File Toolkit.
    echo.
    echo  Attempting to install Node.js automatically via Windows winget...
    where winget >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        winget install OpenJS.NodeJS.LTS -h --accept-source-agreements --accept-package-agreements
        if %ERRORLEVEL% EQU 0 (
            echo  [+] Node.js installed successfully!
            set "PATH=%PATH%;C:\Program Files\nodejs;%LOCALAPPDATA%\Programs\node"
        )
    )
    where node >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo  [X] Could not install Node.js automatically.
        echo  Please download and install Node.js LTS from: https://nodejs.org
        echo.
        start https://nodejs.org/en/download
        pause
        exit /b 1
    )
)

:: 2. Launch modern Windows WPF Installer GUI
powershell -ExecutionPolicy Bypass -NoProfile -File "scripts\InstallerWizard.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [*] Falling back to CLI installer...
    node install.js
    pause
)

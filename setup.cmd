@echo off
setlocal enabledelayedexpansion
title Universal File Toolkit - One-Click Setup
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Setup encountered an issue. Press any key to exit.
    pause >nul
)

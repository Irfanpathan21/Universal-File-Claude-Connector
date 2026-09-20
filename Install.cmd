@echo off
setlocal enabledelayedexpansion
title Universal File Toolkit — Windows Setup & Installation
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Installation encountered an issue. Press any key to exit.
    pause >nul
)
exit /b %ERRORLEVEL%

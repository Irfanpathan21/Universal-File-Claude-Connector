@echo off
setlocal enabledelayedexpansion
title Universal File Toolkit — App Launcher
cd /d "%~dp0"

echo ================================================================
echo   Universal File Toolkit - Starting Web App & Backend Services
echo ================================================================

:: Check if port 3000 or 3001 is already active
netstat -ano | findstr ":3000 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [*] Frontend web server is already running on port 3000.
) else (
    echo [*] Starting Local Backend & Web Services...
    start "Universal File Toolkit Services" /min cmd /c "npx -y pnpm run dev:web"
    ping 127.0.0.1 -n 4 >nul
)

:: Locate Chrome executable
set "CHROME_BIN="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME_BIN=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not defined CHROME_BIN (
    if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME_BIN=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
if not defined CHROME_BIN (
    if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME_BIN=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

:: Open in Chrome or Default Browser
if defined CHROME_BIN (
    echo [*] Opening in Google Chrome Application Window...
    start "" "!CHROME_BIN!" --app=http://localhost:3000
) else (
    echo [*] Opening in default web browser...
    start "" http://localhost:3000
)

exit /b 0

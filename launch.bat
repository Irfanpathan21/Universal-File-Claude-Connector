@echo off
setlocal enabledelayedexpansion
title Universal File Toolkit — App Launcher
cd /d "%~dp0"

echo ================================================================
echo   Universal File Toolkit - Starting Web App & Backend Services
echo ================================================================

:: Check if port 3000 (Frontend) and port 3001 (Backend API) are active
set "NEED_START="
netstat -ano | findstr ":3000 " >nul 2>&1
if %ERRORLEVEL% NEQ 0 set "NEED_START=1"

netstat -ano | findstr ":3001 " >nul 2>&1
if %ERRORLEVEL% NEQ 0 set "NEED_START=1"

if defined NEED_START (
    echo [*] Starting Local Backend (Port 3001) ^& Web App (Port 3000)...
    start "Universal File Toolkit Services" /min cmd /c "npx -y pnpm run dev:web"
    ping 127.0.0.1 -n 4 >nul
) else (
    echo [*] Backend (Port 3001) and Frontend (Port 3000) are already active.
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

@echo off
setlocal enabledelayedexpansion
title Universal File Toolkit — App Launcher
cd /d "%~dp0"

echo ================================================================
echo   Universal File Toolkit - Starting Web App ^& Backend Services
echo ================================================================

:: 1. Ensure logs directory exists
if not exist "logs" mkdir "logs"

:: 2. Verify Node.js is installed
where node >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo [!] Node.js is not found in PATH. Please install Node.js LTS from https://nodejs.org
    pause
    exit /b 1
)

:: 3. Ensure dependencies are installed if missing
if not exist "node_modules" (
    echo [*] First-time run: Installing dependencies, please wait...
    where pnpm >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        call pnpm install
    ) else (
        call npx -y pnpm@9 install
    )
)

:: 4. Check if port 3000 (Frontend) and port 3001 (Backend API) are active
set "NEED_START="
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if !ERRORLEVEL! NEQ 0 set "NEED_START=1"

netstat -ano | findstr ":3001 " | findstr "LISTENING" >nul 2>&1
if !ERRORLEVEL! NEQ 0 set "NEED_START=1"

if not defined NEED_START (
    echo [*] Backend and Frontend services are already active.
    goto LAUNCH_BROWSER
)

echo [*] Starting Local Backend (Port 3001) and Web App (Port 3000)...
start "Universal File Toolkit Services" /min cmd /c "node scripts\start-services.js"

echo [*] Waiting for Universal File Toolkit to initialize...
set /a ATTEMPTS=0

:WAIT_LOOP
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if !ERRORLEVEL! EQU 0 goto SERVER_READY

set /a ATTEMPTS+=1
if !ATTEMPTS! GEQ 35 (
    echo [!] Service initialization is taking longer than usual. Opening browser now...
    goto SERVER_READY
)
ping 127.0.0.1 -n 2 >nul
goto WAIT_LOOP

:SERVER_READY
echo [✓] Universal File Toolkit is live!

:LAUNCH_BROWSER

:: 5. Locate dedicated app browser (Chrome preferred, Edge second, system default fallback)
set "APP_BROWSER="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "APP_BROWSER=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not defined APP_BROWSER (
    if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "APP_BROWSER=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
if not defined APP_BROWSER (
    if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "APP_BROWSER=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)
if not defined APP_BROWSER (
    if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" set "APP_BROWSER=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)
if not defined APP_BROWSER (
    if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" set "APP_BROWSER=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

:: 6. Open in Dedicated Application Window or Default Browser
if defined APP_BROWSER (
    echo [*] Opening in Dedicated Application Window...
    start "" "!APP_BROWSER!" --app=http://localhost:3000
) else (
    echo [*] Opening in default web browser...
    start "" http://localhost:3000
)

exit /b 0

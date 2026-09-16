@echo off
setlocal enabledelayedexpansion
title Universal File Toolkit — App Launcher
cd /d "%~dp0"

echo ================================================================
echo   Universal File Toolkit - Starting Web App ^& Backend Services
echo ================================================================

:: 1. Ensure logs directory exists
if not exist "logs" mkdir "logs"

:: 2. Ensure dependencies are installed if missing
if not exist "node_modules" (
    echo [*] First-time run: Installing dependencies (this may take a minute)...
    where pnpm >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        call pnpm install
    ) else (
        call npx -y pnpm@9 install
    )
)

:: 3. Determine package manager
set "PKGMGR=npx -y pnpm@9"
where pnpm >nul 2>&1
if %ERRORLEVEL% EQU 0 set "PKGMGR=pnpm"

:: 4. Check if port 3000 (Frontend) and port 3001 (Backend API) are active
set "NEED_START="
netstat -ano | findstr ":3000 " >nul 2>&1
if %ERRORLEVEL% NEQ 0 set "NEED_START=1"

netstat -ano | findstr ":3001 " >nul 2>&1
if %ERRORLEVEL% NEQ 0 set "NEED_START=1"

if defined NEED_START (
    echo [*] Starting Local Backend (Port 3001) ^& Web App (Port 3000)...
    start "Universal File Toolkit Services" /min cmd /c "%PKGMGR% run dev:web > logs\service.log 2>&1"
    
    echo [*] Waiting for Universal File Toolkit to initialize...
    set /a ATTEMPTS=0
    :WAIT_LOOP
    powershell -NoProfile -Command "try { $client = New-Object System.Net.Sockets.TcpClient; $client.Connect('127.0.0.1', 3000); $client.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
    if %ERRORLEVEL% EQU 0 goto SERVER_READY
    
    set /a ATTEMPTS+=1
    if !ATTEMPTS! GEQ 35 (
        echo [!] Service initialization is taking longer than usual. Opening browser now...
        goto SERVER_READY
    )
    ping 127.0.0.1 -n 2 >nul
    goto WAIT_LOOP
    
    :SERVER_READY
    echo [✓] Universal File Toolkit is live!
) else (
    echo [*] Backend (Port 3001) and Frontend (Port 3000) are already active.
)

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

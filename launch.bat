@echo off
setlocal enabledelayedexpansion
title Universal File Toolkit — App Launcher
cd /d "%~dp0"

:: 1. If compiled native launcher exists, launch it directly
if exist "UniversalFileToolkit.exe" (
    start "" "UniversalFileToolkit.exe"
    exit /b 0
)

:: 2. Ensure logs directory exists
if not exist "logs" mkdir "logs"

:: 3. Verify Node.js is installed
where node >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;!PATH!"
    ) else (
        echo [!] Node.js is not found in PATH. Please install Node.js LTS from https://nodejs.org
        pause
        exit /b 1
    )
)

:: 4. Ensure dependencies are installed if missing
if not exist "node_modules" (
    echo [*] First-time run: Installing dependencies, please wait...
    where pnpm >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        call pnpm install
    ) else (
        call npx -y pnpm@9 install
    )
)

:: 5. Start background service orchestrator
start "Universal File Toolkit Services" /min cmd /c "node scripts\start-services.js"

:: 6. Wait for runtime state or server to initialize
set /a ATTEMPTS=0
:WAIT_LOOP
if exist "logs\runtime.json" goto SERVER_READY
set /a ATTEMPTS+=1
if !ATTEMPTS! GEQ 30 goto SERVER_READY
ping 127.0.0.1 -n 2 >nul
goto WAIT_LOOP

:SERVER_READY
:: 7. Locate dedicated app browser (Chrome preferred, Edge second)
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

:: 8. Open App in Standalone Chrome/Edge App Mode
set "CHROME_PROFILE=%LOCALAPPDATA%\UniversalFileToolkit\ChromeProfile"
if not exist "%CHROME_PROFILE%" mkdir "%CHROME_PROFILE%"

if defined APP_BROWSER (
    start "" "!APP_BROWSER!" --app=http://localhost:3000 --user-data-dir="%CHROME_PROFILE%"
) else (
    start "" http://localhost:3000
)

exit /b 0

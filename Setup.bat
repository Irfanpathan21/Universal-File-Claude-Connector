@echo off
setlocal enabledelayedexpansion
title Universal File Toolkit — Setup Wizard
cd /d "%~dp0"

:: 1. If Setup.exe or UniversalFileToolkitSetup.exe exists, launch it directly
if exist "UniversalFileToolkitSetup.exe" (
    start "" "UniversalFileToolkitSetup.exe"
    exit /b 0
)

if exist "Setup.exe" (
    start "" "Setup.exe"
    exit /b 0
)

:: 2. Try building executables first if C# compiler is present
powershell -ExecutionPolicy Bypass -File "scripts\build-executables.ps1" >nul 2>&1
if exist "UniversalFileToolkitSetup.exe" (
    start "" "UniversalFileToolkitSetup.exe"
    exit /b 0
)

:: 3. Fallback to CLI installer if GUI cannot launch
node install.js
pause
exit /b 0

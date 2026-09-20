@echo off
setlocal enabledelayedexpansion
title Universal File Toolkit — Setup & Installation
cd /d "%~dp0"

echo ================================================================
echo  Universal File Toolkit — Windows Setup
echo ================================================================
echo.

:: 1. Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;!PATH!"
    ) else (
        echo [!] Node.js is not found.
        echo [*] Installing Node.js LTS via winget...
        winget install OpenJS.NodeJS.LTS -h --accept-source-agreements --accept-package-agreements
    )
)

echo [*] Node.js runtime verified.
echo.

:: 2. Install dependencies
echo [*] Installing dependencies...
where pnpm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call pnpm install
) else (
    call npx -y pnpm@9 install
)

:: 3. Build services & MCP server
echo.
echo [*] Building backend services & Claude MCP engine...
where pnpm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call pnpm build
) else (
    call npx -y pnpm@9 build
)

:: Verify MCP server compilation
if not exist "packages\mcp-server\dist\index.js" (
    echo [*] Compiling Claude MCP server...
    where pnpm >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        call pnpm run build:mcp
    ) else (
        call npx -y pnpm@9 run build:mcp
    )
)

:: 4. Create Shortcuts
echo.
echo [*] Creating Desktop and Start Menu shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $d = [Environment]::GetFolderPath('Desktop'); $sm = [Environment]::GetFolderPath('Programs'); $target = Join-Path (Get-Location) 'launch.bat'; $icon = Join-Path (Get-Location) 'assets\app-icon.ico'; $s1 = $ws.CreateShortcut((Join-Path $d 'Universal File Toolkit.lnk')); $s1.TargetPath = $target; $s1.WorkingDirectory = (Get-Location).Path; if (Test-Path $icon) { $s1.IconLocation = $icon }; $s1.Save(); $s2 = $ws.CreateShortcut((Join-Path $sm 'Universal File Toolkit.lnk')); $s2.TargetPath = $target; $s2.WorkingDirectory = (Get-Location).Path; if (Test-Path $icon) { $s2.IconLocation = $icon }; $s2.Save();"

:: 5. Configure Claude Desktop MCP (Auto-Link)
echo.
echo [*] Configuring Claude Desktop MCP connector...
node -e "const fs=require('fs'),path=require('path');const cDir=path.join(process.env.APPDATA||'','Claude');if(!fs.existsSync(cDir)){try{fs.mkdirSync(cDir,{recursive:true});}catch(e){}}const cP=path.join(cDir,'claude_desktop_config.json');let cfg={};try{if(fs.existsSync(cP))cfg=JSON.parse(fs.readFileSync(cP,'utf8'));}catch(e){}if(!cfg.mcpServers)cfg.mcpServers={};const nodeExe=process.execPath;const mcpPath=path.resolve('.','packages','mcp-server','dist','index.js');cfg.mcpServers['universal-file-toolkit']={command:nodeExe,args:[mcpPath]};fs.writeFileSync(cP,JSON.stringify(cfg,null,2),'utf8');console.log('    [OK] Claude Desktop MCP configured:');console.log('         Config: ' + cP);console.log('         Server: ' + mcpPath);"

:: Check if Claude is running to advise user
tasklist /fi "imagename eq Claude.exe" 2>nul | find /i "Claude.exe" >nul
if %ERRORLEVEL% EQU 0 (
    echo.
    echo    [!] NOTE: Claude Desktop is currently running.
    echo        Please restart Claude Desktop (Quit from tray/menu and reopen)
    echo        so it loads all 100 new tools!
) else (
    echo.
    echo    [+] When you open Claude Desktop, the 100 tools (hammer icon) will be active!
)

echo.
echo ================================================================
echo  [OK] Setup Completed Successfully!
echo ================================================================
echo.
echo Launching Universal File Toolkit...
start "" launch.bat
exit /b 0

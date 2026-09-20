@echo off
:: ============================================================
:: Universal File Toolkit - One-Click Setup
:: Double-click this file to install and configure everything.
:: ============================================================
:: This CMD wrapper launches the PowerShell setup script with
:: execution policy bypass. CMD files from local folders do NOT
:: trigger Windows SmartScreen or Defender blocks.
:: ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
pause

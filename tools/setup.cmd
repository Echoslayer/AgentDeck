@echo off
rem Double-click: download third-party packages listed in vendor.json into vendor\ (docs/adr/0010).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0vendor.ps1" %*
set code=%errorlevel%
if "%~1"=="" pause
exit /b %code%

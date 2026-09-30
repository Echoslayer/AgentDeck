@echo off
rem Pack a deck into an offline zip under dist\ (docs/adr/0010). Usage: tools\pack.cmd resources\my-topic
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0pack.ps1" %*
set code=%errorlevel%
if "%~1"=="" pause
exit /b %code%

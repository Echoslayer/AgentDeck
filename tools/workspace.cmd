@echo off
rem Create or update an AgentDeck workspace inside another project (docs/adr/0014). Usage: tools\workspace.cmd D:\other-repo\slides [-Update]
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0workspace.ps1" %*
set code=%errorlevel%
if "%~1"=="" pause
exit /b %code%

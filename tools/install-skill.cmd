@echo off
rem Install the AgentDeck skill for Copilot CLI / Claude Code (docs/adr/0014).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-skill.ps1" %*
set code=%errorlevel%
if "%~1"=="" pause
exit /b %code%

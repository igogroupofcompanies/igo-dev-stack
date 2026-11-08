@echo off
title IGO Dev Stack - ADMIN setup
REM Double-click on the ADMIN PC. Installs everything + team dashboard (admin key, Google Drive, schedule).
cd /d "%~dp0"
set /p IGO_NAME=Your name for the dashboard (e.g. Vignesh A):
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0skills\igo-setup\scripts\setup-claude-code.ps1" -TeamAdmin -TeamLogDir "G:\My Drive\IGO-Team-Logs" -TeamName "%IGO_NAME%" -BrainName "%IGO_NAME%"
echo.
echo Adding igo-dev-stack to Claude Code...
set "PATH=%PATH%;%USERPROFILE%\.local\bin"
call claude plugin marketplace add "%~dp0."
call claude plugin install igo-dev-stack@igo-group --scope user
echo.
echo DONE. Dashboard: %USERPROFILE%\Documents\IGO-Team-Dashboard\IGO Team Activity.html
echo BACK UP this folder offline: %USERPROFILE%\Documents\IGO-Team-Dashboard\.admin-key
pause

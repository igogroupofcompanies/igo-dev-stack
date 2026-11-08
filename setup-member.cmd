@echo off
title IGO Dev Stack - TEAM MEMBER setup
REM Double-click on each TEAM MEMBER PC. Installs Claude Code + IGO stack + Google Drive team logging.
cd /d "%~dp0"
set "IGO_TEAM_LINK=https://drive.google.com/drive/folders/1zE69QTd2KuvIpjWR5xd2xrvdoMRKbdYz"
set /p IGO_NAME=Your full name (as the admin should see it):
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0skills\igo-setup\scripts\setup-claude-code.ps1" -TeamLink "%IGO_TEAM_LINK%" -TeamLogDir "G:\My Drive\IGO-Team-Logs" -TeamName "%IGO_NAME%" -BrainName "%IGO_NAME%"
echo.
echo Adding igo-dev-stack to Claude Code...
set "PATH=%PATH%;%USERPROFILE%\.local\bin"
call claude plugin marketplace add "%~dp0."
call claude plugin install igo-dev-stack@igo-group --scope user
echo.
echo DONE. Restart Claude Code. Check the key fingerprint shown above with your admin.
pause

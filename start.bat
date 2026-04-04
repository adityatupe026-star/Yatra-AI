@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch-backend.ps1"
if errorlevel 1 (
  echo YatraAI failed to start. Check backend.err.log and frontend.err.log.
  pause
  exit /b 1
)

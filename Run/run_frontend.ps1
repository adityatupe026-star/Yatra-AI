$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$python = Join-Path $root ".venv\Scripts\python.exe"
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  "& `"$python`" -m uvicorn YatraAI.api.app:app --reload --port 8000"
)
Start-Sleep -Seconds 4
Start-Process "http://localhost:8000/translate.html"

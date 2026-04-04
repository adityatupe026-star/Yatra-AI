$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $PSScriptRoot "run_backend.ps1"
$dashboard = Join-Path $PSScriptRoot "run_dashboard.ps1"
Start-Process powershell -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", $backend)
Start-Process powershell -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", $dashboard)
Start-Sleep -Seconds 4
Start-Process "http://localhost:8000/index.html"
Start-Process "http://localhost:8501/"

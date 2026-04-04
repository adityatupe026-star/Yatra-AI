$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $PSScriptRoot "run_backend.ps1"
$dashboard = Join-Path $PSScriptRoot "run_dashboard.ps1"
if (Get-Command docker -ErrorAction SilentlyContinue) {
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "docker run --rm -p 5001:5000 libretranslate/libretranslate"
  )
} else {
  Write-Host "Docker not found. Start LibreTranslate manually on port 5001 for the translate page."
}
Start-Process powershell -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", $backend)
Start-Process powershell -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", $dashboard)
Start-Sleep -Seconds 4
Start-Process "http://localhost:8000/index.html"
Start-Process "http://localhost:8501/"

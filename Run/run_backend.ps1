$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
      $parts = $line.Split("=", 2)
      $name = $parts[0].Trim()
      $value = $parts[1].Trim().Trim('"')
      if ($name) {
        Set-Item -Path "Env:$name" -Value $value
      }
    }
  }
}
$python = Join-Path $root ".venv\Scripts\python.exe"
& $python -m uvicorn YatraAI.api.app:app --reload --port 8000

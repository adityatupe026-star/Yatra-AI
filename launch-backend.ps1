$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
Set-Location $root

$stdoutPath = Join-Path $root "backend.out.log"
$stderrPath = Join-Path $root "backend.err.log"
foreach ($path in @($stdoutPath, $stderrPath)) {
  if (Test-Path $path) {
    Remove-Item -LiteralPath $path -Force
  }
}

function Stop-PortListener {
  param(
    [int[]]$Ports
  )
  foreach ($port in $Ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($connection in $connections) {
      try {
        Stop-Process -Id $connection.OwningProcess -Force -ErrorAction Stop
        Write-Host "Stopped existing process on port $port (PID $($connection.OwningProcess))."
      } catch {
        Write-Host "Could not stop existing process on port $port (PID $($connection.OwningProcess))."
      }
    }
  }
}

Stop-PortListener -Ports @(8000, 8001)

$candidates = @(
  Join-Path $root ".venv\Scripts\pythonw.exe"
  Join-Path $root ".venv\Scripts\python.exe"
  Join-Path $env:LocalAppData "Programs\Python\Python313\pythonw.exe"
  Join-Path $env:LocalAppData "Programs\Python\Python313\python.exe"
  "python"
)

$venvScripts = Join-Path $root ".venv\Scripts"
if (Test-Path $venvScripts) {
  Get-ChildItem -Path $venvScripts -Filter "*.exe" -File -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      Unblock-File -LiteralPath $_.FullName -ErrorAction Stop
    } catch {
      # Ignore files that are not marked as blocked.
    }
  }
}

$python = $null
foreach ($candidate in $candidates) {
  if ($candidate -eq "python") {
    $python = $candidate
    break
  }
  if (Test-Path $candidate) {
    try {
      Unblock-File -LiteralPath $candidate -ErrorAction Stop
    } catch {
      # Ignore files that are not marked as blocked.
    }
    $python = $candidate
    break
  }
}

if ($python) {
  Write-Host "Starting YatraAI backend on port 8001 with $python"
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $python
  $psi.Arguments = "`"$root\backend_launcher.py`""
  $psi.WorkingDirectory = $root
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $process = [System.Diagnostics.Process]::Start($psi)
} else {
  Write-Host "Python backend not available. Starting frontend only."
  $process = $null
}

$frontendServer = Join-Path $root "frontend_server.js"
if (-not (Test-Path $frontendServer)) {
  throw "frontend_server.js not found."
}

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$node = $nodeCmd.Source
if (-not $node) {
  throw "Node.js is required to run the frontend server."
}

$frontendProc = Start-Process -FilePath $node -ArgumentList @($frontendServer) -WorkingDirectory $root -PassThru -WindowStyle Hidden

for ($i = 0; $i -lt 20; $i++) {
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      Start-Process "http://127.0.0.1:8000/index.html?nocache=1"
      Write-Host "Frontend ready at http://127.0.0.1:8000/"
      exit 0
    }
  } catch {
    if ($frontendProc.HasExited) {
      break
    }
    Start-Sleep -Seconds 1
  }
}

if ($process -and $process.HasExited) {
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  if ($stdout) {
    Set-Content -LiteralPath $stdoutPath -Value $stdout
  }
  if ($stderr) {
    Set-Content -LiteralPath $stderrPath -Value $stderr
  }
  Write-Host "Backend exited early. See backend.err.log and backend.out.log."
}

if ($frontendProc.HasExited) {
  Write-Host "Frontend server exited early."
  exit 1
}

exit 0

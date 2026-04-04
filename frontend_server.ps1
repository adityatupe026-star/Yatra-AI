param(
  [string]$Root = (Join-Path $PSScriptRoot "Frontend"),
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

function Get-ContentType([string]$path) {
  switch ([IO.Path]::GetExtension($path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "text/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".svg" { "image/svg+xml" }
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".webp" { "image/webp" }
    ".ico" { "image/x-icon" }
    default { "application/octet-stream" }
  }
}

function Write-Response([System.Net.HttpListenerResponse]$response, [int]$statusCode, [string]$contentType, [string]$body) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($body)
  $response.StatusCode = $statusCode
  $response.ContentType = $contentType
  $response.ContentLength64 = $bytes.Length
  $response.OutputStream.Write($bytes, 0, $bytes.Length)
  $response.OutputStream.Close()
}

if (-not (Test-Path $Root)) {
  throw "Frontend directory not found: $Root"
}

$listener = [System.Net.HttpListener]::new()
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "YatraAI frontend server listening at $prefix"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    try {
      $path = [Uri]::UnescapeDataString($request.Url.AbsolutePath.TrimStart("/"))
      if ([string]::IsNullOrWhiteSpace($path) -or $path -eq "/") {
        $path = "index.html"
      }

      if ($path -eq "health" -or $path -eq "api/health") {
        Write-Response $response 200 "application/json; charset=utf-8" '{"status":"frontend-only"}'
        continue
      }

      if ($path -eq "api/translate" -and $request.HttpMethod -eq "POST") {
        $reader = New-Object IO.StreamReader($request.InputStream, $request.ContentEncoding)
        $rawBody = $reader.ReadToEnd()
        $reader.Close()
        $payload = $null
        try { $payload = $rawBody | ConvertFrom-Json -ErrorAction Stop } catch { }
        $translated = if ($payload -and $payload.text) { [string]$payload.text } else { "" }
        Write-Response $response 200 "application/json; charset=utf-8" (@{ translated = $translated } | ConvertTo-Json -Compress)
        continue
      }

      $filePath = Join-Path $Root $path
      if (-not (Test-Path $filePath -PathType Leaf)) {
        $fallback = Join-Path $Root "index.html"
        $bytes = [IO.File]::ReadAllBytes($fallback)
        $response.StatusCode = 200
        $response.ContentType = "text/html; charset=utf-8"
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.OutputStream.Close()
        continue
      }

      $bytes = [IO.File]::ReadAllBytes($filePath)
      $response.StatusCode = 200
      $response.ContentType = Get-ContentType $filePath
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
      $response.OutputStream.Close()
    } catch {
      try {
        Write-Response $response 500 "text/plain; charset=utf-8" ($_.Exception.Message)
      } catch {
        try { $response.OutputStream.Close() } catch { }
      }
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}

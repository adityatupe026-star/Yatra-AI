$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$csvPath = Join-Path $root "data\analytics\events.csv"
$dir = Split-Path -Parent $csvPath
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$eventTypes = @("chat", "translate", "plan")
$pages = @{ chat = "chat"; translate = "translate"; plan = "planner" }
$contextModes = @("trip", "expert")
$destinations = @("Goa", "Jaipur", "Udaipur", "Mumbai", "Delhi", "Leh", "Kochi", "Bengaluru", "Chennai", "Varanasi", "Kolkata", "Pune")
$travelModes = @("Air", "Road", "Train")
$sourceLanguages = @("auto", "en", "hi", "mr", "bn", "ta", "te", "kn", "ml", "gu")
$targetLanguages = @("hi", "mr", "bn", "ta", "te", "kn", "ml", "gu", "pa", "ur", "or", "as", "kok")
$notes = @{
  chat = @("Trip context enabled.", "Travel expert mode.")
  translate = @("Google Cloud Translation request.", "Translate page usage.")
  plan = @("Planner route generated.", "Trip planning action.")
}

$rows = New-Object System.Collections.Generic.List[object]
$start = [datetime]::UtcNow.AddDays(-30)
for ($i = 0; $i -lt 780; $i++) {
  $eventType = $eventTypes[$i % $eventTypes.Count]
  $page = $pages[$eventType]
  $timestamp = $start.AddMinutes($i * 42).ToString("o")
  $destination = $destinations[($i * 3) % $destinations.Count]
  $travelMode = $travelModes[$i % $travelModes.Count]
  $contextMode = $contextModes[$i % $contextModes.Count]
  $sourceLanguage = $sourceLanguages[$i % $sourceLanguages.Count]
  $targetLanguage = $targetLanguages[$i % $targetLanguages.Count]
  $prompt = switch ($eventType) {
    "chat" { "Tell me about $destination and nearby food in $contextMode mode." }
    "translate" { "Please translate a travel phrase for $destination into $targetLanguage." }
    default { "Plan a $((($i % 7) + 2)) day trip to $destination by $travelMode." }
  }
  $response = switch ($eventType) {
    "chat" { if ($contextMode -eq "trip") { "Trip-aware answer for $destination with itinerary details." } else { "Expert advice for $destination without saved trip context." } }
    "translate" { "Translated output for $destination in $targetLanguage." }
    default { "Planner output for $destination with budget and route guidance." }
  }
  $startCity = @("Mumbai", "Delhi", "Bengaluru", "Pune", "Kolkata", "Chennai")[$i % 6]
  $sessionId = "seed-$([int]($i / 3) + 1)"
  $rows.Add([pscustomobject]@{
    timestamp = $timestamp
    event_type = $eventType
    page = $page
    session_id = $sessionId
    context_mode = $(if ($eventType -eq "chat") { $contextMode } else { "" })
    prompt = $prompt
    response = $response
    start = $(if ($eventType -eq "plan") { $startCity } else { "" })
    destination = $destination
    travel_mode = $(if ($eventType -eq "plan") { $travelMode } else { "" })
    source_language = $(if ($eventType -eq "translate") { $sourceLanguage } else { "" })
    target_language = $(if ($eventType -eq "translate") { $targetLanguage } else { "" })
    text_length = $prompt.Length
    response_length = $response.Length
    notes = $notes[$eventType][($i % $notes[$eventType].Count)]
  })
}

$rows | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $csvPath
Write-Host "Wrote $($rows.Count) rows to $csvPath"

param([string]$OutFile = (Join-Path $PSScriptRoot "YatraAI_India_Tourism_High_Graphics.pptx"))
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $root "data"
$tourismSvgPath = Join-Path $root "YatraAI\assets\tourism_bg.svg"
$workDir = Join-Path $PSScriptRoot "_pptx_build"
$svgDir = Join-Path $PSScriptRoot "slide_svgs"
$zipPath = [System.IO.Path]::ChangeExtension($OutFile, ".zip")

function w([string]$p,[string]$c){$d=Split-Path -Parent $p;if($d -and !(Test-Path $d)){New-Item -ItemType Directory -Path $d|Out-Null};[System.IO.File]::WriteAllText($p,$c,(New-Object System.Text.UTF8Encoding($false)))}
function e([string]$t){[System.Security.SecurityElement]::Escape($t)}
function t($x,$y,$s,$c,$txt,$w=400,$a='start'){ "<text x='$x' y='$y' fill='$c' font-family='Aptos,Segoe UI,Arial' font-size='$s' font-weight='$w' text-anchor='$a'>$(e $txt)</text>" }
function m($x,$y,$lines,$s,$c,$w=400,$a='start',$gap=1.25){$r=@();for($i=0;$i -lt $lines.Count;$i++){ $dy=if($i -eq 0){0}else{[math]::Round($s*$gap,0)};$r+="<tspan x='$x' dy='$dy'>$(e $lines[$i])</tspan>"};"<text x='$x' y='$y' fill='$c' font-family='Aptos,Segoe UI,Arial' font-size='$s' font-weight='$w' text-anchor='$a'>$($r -join '')</text>"}
function rect($x,$y,$w,$h,$f,$rx=24,$o=1,$s='none',$sw=0){ "<rect x='$x' y='$y' width='$w' height='$h' rx='$rx' fill='$f' fill-opacity='$o' stroke='$s' stroke-width='$sw'/>" }
function circle($cx,$cy,$r,$f,$o=1){ "<circle cx='$cx' cy='$cy' r='$r' fill='$f' fill-opacity='$o'/>" }
function line($x1,$y1,$x2,$y2,$s,$w=4,$o=1){ "<line x1='$x1' y1='$y1' x2='$x2' y2='$y2' stroke='$s' stroke-width='$w' stroke-opacity='$o' stroke-linecap='round'/>" }
function card($x,$y,$w,$h,$title,$body,$accent){ @(rect $x $y $w $h 'rgba(79,129,189,0.07)' 28 1 'rgba(79,129,189,0.13)' 2; rect ($x+20) ($y+20) 72 8 $accent 999; t ($x+22) ($y+72) 28 '#FFF7E2' $title 800; m ($x+22) ($y+116) ($body -split "`n") 18 'rgba(31,41,55,0.78)' 400 'start' 1.35) -join "`n" }
function chart($x,$y,$w,$h,$title,$items,$accent){$out=@(rect $x $y $w $h 'rgba(79,129,189,0.05)' 28 1 'rgba(79,129,189,0.12)' 2; t ($x+26) ($y+48) 24 '#FFF7E2' $title 800);$max=1;foreach($i in $items){if([double]$i.Value -gt $max){$max=[double]$i.Value}};$rowY=$y+84;$rh=56;for($i=0;$i -lt $items.Count;$i++){ $it=$items[$i];$yy=$rowY+($i*$rh);$out+=t ($x+26) ($yy+20) 17 '#F3ECDA' $it.Label 400;$tx=$x+195;$tw=$w-245;$out+=rect $tx ($yy+2) $tw 18 'rgba(79,129,189,0.09)' 999; $fw=[math]::Max(20,[math]::Round(($tw*([double]$it.Value/$max)),0));$out+=rect $tx ($yy+2) $fw 18 $accent 999;$out+=t ($x+$w-20) ($yy+20) 17 '#FFF7E2' ([int]$it.Value).ToString() 700 'end'}; $out -join "`n"}
function wrap($body,$slide){@"
<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900' viewBox='0 0 1600 900'>
<defs><linearGradient id='bg' x1='0' y1='0' x2='1600' y2='900'><stop offset='0' stop-color='#F7F9FC'/><stop offset='0.65' stop-color='#FFFFFF'/><stop offset='1' stop-color='#EEF3F8'/></linearGradient><linearGradient id='g1' x1='180' y1='140' x2='640' y2='360'><stop offset='0' stop-color='#1F3640'/><stop offset='1' stop-color='#1F3640' stop-opacity='0'/></linearGradient><linearGradient id='g2' x1='1000' y1='120' x2='1400' y2='460'><stop offset='0' stop-color='#9BBB59'/><stop offset='1' stop-color='#9BBB59' stop-opacity='0'/></linearGradient></defs>
<rect width='1600' height='900' fill='url(#bg)'/>
<circle cx='270' cy='170' r='160' fill='url(#g1)' fill-opacity='0.45'/><circle cx='1290' cy='160' r='150' fill='url(#g2)' fill-opacity='0.18'/><circle cx='1400' cy='740' r='170' fill='#4BACC6' fill-opacity='0.05'/>
<path d='M0 700C180 650 320 658 452 690C580 722 682 744 804 724C918 704 1020 660 1148 662C1280 664 1440 736 1600 720' stroke='#4BACC6' stroke-opacity='0.12' stroke-width='4' fill='none'/>
<path d='M0 742C180 712 304 720 420 748C546 780 666 786 792 764C930 740 1048 698 1168 700C1298 702 1450 760 1600 748' stroke='#4F81BD' stroke-opacity='0.1' stroke-width='4' fill='none'/>
$body
<rect x='0' y='852' width='1600' height='48' fill='#EEF4FB' fill-opacity='0.95'/><text x='40' y='883' fill='rgba(31,41,55,0.78)' font-family='Aptos,Segoe UI,Arial' font-size='18'>YatraAI | India Travel Intelligence</text><text x='1540' y='883' fill='rgba(31,41,55,0.56)' font-family='Aptos,Segoe UI,Arial' font-size='18' text-anchor='end'>Slide $slide</text>
</svg>
"@}

$dest = Get-Content (Join-Path $dataDir "hackathon\destinations.json") -Raw | ConvertFrom-Json
$itin = Get-Content (Join-Path $dataDir "hackathon\itineraries.json") -Raw | ConvertFrom-Json
$local = Get-Content (Join-Path $dataDir "hackathon\local_intelligence.json") -Raw | ConvertFrom-Json
$stats = Get-Content (Join-Path $dataDir "dataset_stats.json") -Raw | ConvertFrom-Json
$tourismImage = if(Test-Path $tourismSvgPath){ "data:image/svg+xml;base64," + [Convert]::ToBase64String([IO.File]::ReadAllBytes($tourismSvgPath)) } else { "" }

$destCount=@($dest).Count; $itinCount=@($itin).Count; $stateCount=($dest | % state | sort -Unique).Count; $avgDays=[math]::Round((($itin | Measure-Object days -Average).Average),1)
$regionItems=($dest|Group-Object region|Sort-Object Count -Descending|Select-Object -First 4|%{[pscustomobject]@{Label=$_.Name;Value=$_.Count}})
$themeMap=@{};foreach($d in $dest){foreach($tag in @($d.tags)){if(-not $themeMap.ContainsKey($tag)){$themeMap[$tag]=0};$themeMap[$tag]++}}
$themeItems=$themeMap.GetEnumerator()|Sort-Object Value -Descending|Select-Object -First 5|%{[pscustomobject]@{Label=$_.Key;Value=$_.Value}}
$budgetItems=($dest|Group-Object { $_.budget_range.label }|Sort-Object Count -Descending|Select-Object -First 3|%{[pscustomobject]@{Label=$_.Name;Value=$_.Count}})
$topCats=@(
  [pscustomobject]@{Label='Tourist attraction';Value=764},
  [pscustomobject]@{Label='Restaurant';Value=1194},
  [pscustomobject]@{Label='Shopping';Value=544},
  [pscustomobject]@{Label='Hotel';Value=166},
  [pscustomobject]@{Label='Transport';Value=168}
)

function slide1{
  $b=@()
  $b+=rect 0 0 1600 852 '#1F3640' 0 1 'none' 0
  $b+=rect 880 112 600 676 'rgba(255,255,255,0.08)' 36 1 'rgba(255,255,255,0.12)' 2
  if($tourismImage){$b+="<clipPath id='c1'><rect x='920' y='160' width='520' height='480' rx='32'/></clipPath><image href='$tourismImage' x='920' y='160' width='520' height='480' preserveAspectRatio='xMidYMid slice' clip-path='url(#c1)'/>"}
  $b+=rect 920 650 520 114 'rgba(255,255,255,0.12)' 24 1 'rgba(255,255,255,0.1)' 1
  $b+=t 66 168 38 '#DCFFAD' 'YatraAI' 900
  $b+=m 66 300 @('India Travel, Tourism,','and Trip Intelligence') 64 '#FFFDFC' 900 'start' 1
  $b+=m 66 404 @('An AI-powered planner, chat assistant, translator, and tourism dashboard built for India.') 25 'rgba(255,255,255,0.82)' 400 'start' 1.2
  $b+=rect 66 462 168 10 '#DCFFAD' 999
  $b+=t 66 540 24 '#DCFFAD' 'One product for discovery, planning, translation, and insight.' 700
  $b+=rect 66 612 150 56 '#DCFFAD' 999; $b+=t 141 648 24 '#1F3640' 'Planner' 800 'middle'
  $b+=rect 234 612 150 56 '#4BACC6' 999; $b+=t 309 648 24 '#1F3640' 'Chat' 800 'middle'
  $b+=rect 402 612 150 56 '#9BBB59' 999; $b+=t 477 648 24 '#1F3640' 'Translate' 800 'middle'
  $b+=rect 570 612 188 56 '#F5B942' 999; $b+=t 664 648 22 '#1F3640' 'Tourism Dashboard' 800 'middle'
  $b+=card 905 164 470 110 'Travel hero' 'Elegant India travel visual with destination cards and route cues.' '#DCFFAD'
  $b+=card 905 292 470 110 'Smart controls' 'Trip mode, expert mode, mic, and speech playback are presented as clear controls.' '#4BACC6'
  $b+=card 905 420 470 110 'Tourism insights' 'The dashboard story focuses on India-wide trends, budgets, and trip behavior.' '#9BBB59'
  $b+=card 905 548 470 110 'Business view' 'CSV logging and analytics help uncover demand, patterns, and destination interest.' '#F5B942'
  wrap ($b -join "`n") 1
}

function slide2{
  $b=@(); $b+=t 70 108 28 '#4F81BD' 'Agenda' 900; $b+=m 70 182 @('What the deck covers','and how YatraAI works as a tourism product') 56 '#172B4D' 900 'start' 1.05
  $b+=card 70 330 430 180 '01  Problem' 'Why travel planning and tourism insight need a single product.' '#4F81BD'
  $b+=card 585 330 430 180 '02  Solution' 'How YatraAI brings planner, chat, and translation together.' '#4BACC6'
  $b+=card 1100 330 430 180 '03  Product flow' 'The end-to-end user journey across the platform.' '#9BBB59'
  $b+=card 70 560 430 180 '04  Main features' 'Planner, chat, Translate, and dashboard explained in detail.' '#C0504D'
  $b+=card 585 560 430 180 '05  Data + architecture' 'How the backend, logging, and dashboard connect.' '#8064A2'
  $b+=card 1100 560 430 180 '06  Run + demo' 'How to launch the app and present it live.' '#D6A15A'
  wrap ($b -join "`n") 2
}

function slide3{
  $b=@(); $b+=t 70 110 28 '#4F81BD' 'The solution' 900; $b+=m 70 184 @('One platform for','discover -> plan -> chat -> translate -> analyze') 56 '#172B4D' 900 'start' 1
  $nodes=@(@{X=120;T='Discover';C='#4F81BD'},@{X=420;T='Plan';C='#4BACC6'},@{X=720;T='Chat';C='#9BBB59'},@{X=1020;T='Translate';C='#C0504D'},@{X=1320;T='Analyze';C='#8064A2'})
  for($i=0;$i -lt $nodes.Count;$i++){ $n=$nodes[$i]; $b+=rect $n.X 420 220 112 'rgba(79,129,189,0.07)' 30 1 $n.C 3; $b+=circle ($n.X+42) 476 22 $n.C; $b+=t ($n.X+42) 484 20 '#08111D' ([string]($i+1)) 900 'middle'; $b+=t ($n.X+84) 482 30 '#172B4D' $n.T 900; if($i -lt 4){$b+=line ($n.X+220) 476 ($n.X+300) 476 $n.C 8 0.75}}
  $b+=card 130 610 420 176 'Planner' 'Budget, transport, season, and route answers grounded in the India data pack.' '#4F81BD'
  $b+=card 590 610 420 176 'Chat' 'Trip-aware or expert-style responses depending on the toggle.' '#4BACC6'
  $b+=card 1050 610 420 176 'Translate' 'Indian language translation with speech playback for the output.' '#9BBB59'
  wrap ($b -join "`n") 3
}

function slide4{
  $b=@(); $b+=t 70 112 28 '#4F81BD' 'Main features' 900; $b+=m 70 186 @('Detailed explanation of the core product features','that make YatraAI useful for travelers and tourism teams') 54 '#172B4D' 900 'start' 1.05
  $b+=card 70 320 690 210 'Planner' 'Build trips with budget, duration, transport, nearby places, weather, and exportable route summaries.' '#4BACC6'
  $b+=card 840 320 690 210 'Chat' 'Switch between trip context and expert mode so the assistant can answer about the current plan or any other destination.' '#4F81BD'
  $b+=card 70 560 430 190 'Translate' 'Translate Indian languages, copy results, and play speech output for easy travel communication.' '#9BBB59'
  $b+=card 585 560 430 190 'Wishlist + History' 'Save destinations, revisit past trips, and restore plans from browser storage.' '#C0504D'
  $b+=card 1100 560 430 190 'Tourism dashboard' 'Track destination trends, budgets, ratings, crowd levels, and local support signals.' '#8064A2'
  wrap ($b -join "`n") 4
}

function slide5{
  $b=@(); $b+=t 70 108 28 '#4F81BD' 'Tourism dashboard' 900; $b+=m 70 182 @('India-wide tourism analysis,','not app performance metrics') 54 '#172B4D' 900 'start' 1.05
  $k=@(@{X=70;W=220;T='Destinations';V=$destCount;C='#4F81BD'},@{X=310;W=220;T='Itineraries';V=$itinCount;C='#4BACC6'},@{X=550;W=220;T='States';V=$stateCount;C='#9BBB59'},@{X=790;W=220;T='Average days';V=$avgDays;C='#C0504D'},@{X=1030;W=220;T='Top regions';V=4;C='#8064A2'},@{X=1270;W=260;T='Local packs';V=8;C='#4F81BD'})
  foreach($i in $k){$b+=rect $i.X 260 $i.W 118 'rgba(79,129,189,0.07)' 24 1 $i.C 2; $b+=t ($i.X+20) 300 18 'rgba(31,41,55,0.70)' $i.T 700; $b+=t ($i.X+20) 342 38 '#FFF7E2' $i.V 900}
  $b+=chart 70 430 720 360 'Top tourism categories' $topCats '#4F81BD'
  $b+=chart 830 430 700 360 'Region strength' $regionItems '#4BACC6'
  wrap ($b -join "`n") 5
}

function slide6{
  $b=@(); $b+=t 70 110 28 '#4F81BD' 'Data and architecture' 900; $b+=m 70 184 @('Tourism data becomes product intelligence','through a simple, traceable pipeline') 54 '#172B4D' 900 'start' 1.05
  $pipe=@(@{X=70;T='Data sources';B='places.csv, destinations.json, itineraries.json';C='#4F81BD'},@{X=370;T='FastAPI backend';B='planner, chat, translate, logging';C='#4BACC6'},@{X=670;T='CSV analytics';B='sessions, queries, interactions, translations';C='#9BBB59'},@{X=970;T='Streamlit dashboard';B='charts, trends, insights';C='#C0504D'},@{X=1270;T='Business view';B='destination demand, budgets, seasons';C='#8064A2'})
  foreach($p in $pipe){$b+=card $p.X 360 240 220 $p.T $p.B $p.C}
  for($i=0;$i -lt 4;$i++){$b+=line ($pipe[$i].X+240) 470 $pipe[$i+1].X 470 '#4F81BD' 8 0.7}
  $b+=card 130 640 1340 150 'Why this matters' 'The product separates user experience, language support, and business intelligence so each layer can grow independently.' '#4F81BD'
  wrap ($b -join "`n") 6
}

function slide7{
  $b=@(); $b+=t 70 110 28 '#4F81BD' 'Run and demo' 900; $b+=m 70 184 @('Three launch scripts to','run the backend, dashboard, and combined flow') 54 '#172B4D' 900 'start' 1.05
  $b+=card 70 340 430 420 '1  Run backend' 'Run `run_backend.ps1` for FastAPI and the website.' '#4F81BD'
  $b+=card 585 340 430 420 '2  Run dashboard' 'Run `run_dashboard.ps1` for the India tourism dashboard.' '#4BACC6'
  $b+=card 1100 340 430 420 '3  Run all' 'Run `run_all.ps1` to start backend and dashboard together.' '#9BBB59'
  $b+=rect 110 504 140 56 '#4F81BD' 999; $b+=t 180 540 20 '#08111D' 'PowerShell' 900 'middle'
  $b+=rect 625 504 140 56 '#4BACC6' 999; $b+=t 695 540 20 '#08111D' 'Streamlit' 900 'middle'
  $b+=rect 1140 504 140 56 '#9BBB59' 999; $b+=t 1210 540 20 '#08111D' 'Together' 900 'middle'
  $b+=card 220 620 1160 120 'Deployment note' 'CSV data persists for business insights, while the dashboard stays dev-only for analysis and product review.' '#C0504D'
  wrap ($b -join "`n") 7
}

function slide8{
  $b=@(); $b+=t 70 120 28 '#4F81BD' 'Closing' 900; $b+=m 70 214 @('Travel smarter.','Speak easier.','Plan better.') 72 '#172B4D' 900 'start' 0.98
  $b+=m 70 392 @('YatraAI turns travel into a guided, multilingual, data-backed experience for India.') 28 'rgba(31,41,55,0.84)' 400 'start' 1.1
  $b+=card 70 500 430 210 'For travelers' 'Faster discovery, clearer planning, and language support.' '#4F81BD'
  $b+=card 585 500 430 210 'For tourism teams' 'Destination trends, budget signals, and demand insight.' '#4BACC6'
  $b+=card 1100 500 430 210 'For the product' 'Structured CSV analytics, scalable APIs, and a modern travel UI.' '#9BBB59'
  wrap ($b -join "`n") 8
}

function slideload($xml,$n){$p=Join-Path $workDir "ppt\slides\slide$n.xml";w $p $xml;w (Join-Path $workDir "ppt\slides\_rels\slide$n.xml.rels") "<?xml version='1.0' encoding='UTF-8' standalone='yes'?><Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/image' Target='../media/slide$n.svg'/></Relationships>"}

function contentTypes($count){$ov=@();for($i=1;$i -le $count;$i++){$ov+="<Override PartName='/ppt/slides/slide$i.xml' ContentType='application/vnd.openxmlformats-officedocument.presentationml.slide+xml'/>"};"<?xml version='1.0' encoding='UTF-8' standalone='yes'?><Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'><Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/><Default Extension='xml' ContentType='application/xml'/><Default Extension='svg' ContentType='image/svg+xml'/><Override PartName='/docProps/core.xml' ContentType='application/vnd.openxmlformats-package.core-properties+xml'/><Override PartName='/docProps/app.xml' ContentType='application/vnd.openxmlformats-officedocument.extended-properties+xml'/><Override PartName='/ppt/presentation.xml' ContentType='application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'/><Override PartName='/ppt/slideMasters/slideMaster1.xml' ContentType='application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml'/><Override PartName='/ppt/slideLayouts/slideLayout1.xml' ContentType='application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml'/><Override PartName='/ppt/theme/theme1.xml' ContentType='application/vnd.openxmlformats-officedocument.theme+xml'/>$([string]::Join('', $ov))</Types>"}
function rootrels(){ "<?xml version='1.0' encoding='UTF-8' standalone='yes'?><Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument' Target='ppt/presentation.xml'/><Relationship Id='rId2' Type='http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties' Target='docProps/core.xml'/><Relationship Id='rId3' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties' Target='docProps/app.xml'/></Relationships>" }
function presrels($count){$r=@("<Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster' Target='slideMasters/slideMaster1.xml'/>");for($i=1;$i -le $count;$i++){$r+="<Relationship Id='rId$($i+1)' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide' Target='slides/slide$i.xml'/>"};"<?xml version='1.0' encoding='UTF-8' standalone='yes'?><Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>$([string]::Join('', $r))</Relationships>"}
function presentation($count){$ids=@();for($i=1;$i -le $count;$i++){$ids+="<p:sldId id='$((256+$i))' r:id='rId$($i+1)'/>"};"<?xml version='1.0' encoding='UTF-8' standalone='yes'?><p:presentation xmlns:p='http://schemas.openxmlformats.org/presentationml/2006/main' xmlns:a='http://schemas.openxmlformats.org/drawingml/2006/main' xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships'><p:sldMasterIdLst><p:sldMasterId id='2147483648' r:id='rId1'/></p:sldMasterIdLst><p:sldIdLst>$([string]::Join('', $ids))</p:sldIdLst><p:sldSz cx='12192000' cy='6858000'/><p:notesSz cx='6858000' cy='9144000'/><p:defaultTextStyle><a:defPPr/></p:defaultTextStyle></p:presentation>"}
function master(){ "<?xml version='1.0' encoding='UTF-8' standalone='yes'?><p:sldMaster xmlns:p='http://schemas.openxmlformats.org/presentationml/2006/main' xmlns:a='http://schemas.openxmlformats.org/drawingml/2006/main' xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships'><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id='1' name=''/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x='0' y='0'/><a:ext cx='0' cy='0'/><a:chOff x='0' y='0'/><a:chExt cx='0' y='0'/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1='lt1' tx1='dk1' bg2='lt2' tx2='dk2' accent1='accent1' accent2='accent2' accent3='accent3' accent4='accent4' accent5='accent5' accent6='accent6' hlink='hlink' folHlink='folHlink'/><p:sldLayoutIdLst><p:sldLayoutId id='2147483649' r:id='rId2'/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>"}
function masterrels(){ "<?xml version='1.0' encoding='UTF-8' standalone='yes'?><Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme' Target='../theme/theme1.xml'/><Relationship Id='rId2' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout' Target='../slideLayouts/slideLayout1.xml'/></Relationships>" }
function layout(){ "<?xml version='1.0' encoding='UTF-8' standalone='yes'?><p:sldLayout xmlns:p='http://schemas.openxmlformats.org/presentationml/2006/main' xmlns:a='http://schemas.openxmlformats.org/drawingml/2006/main' xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships' type='blank' preserve='1'><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id='1' name=''/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x='0' y='0'/><a:ext cx='0' cy='0'/><a:chOff x='0' y='0'/><a:chExt cx='0' y='0'/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>"}
function theme(){ "<?xml version='1.0' encoding='UTF-8' standalone='yes'?><a:theme xmlns:a='http://schemas.openxmlformats.org/drawingml/2006/main' name='YatraAI'><a:themeElements><a:clrScheme name='YatraAI'><a:dk1><a:srgbClr val='06101D'/></a:dk1><a:lt1><a:srgbClr val='FFF8E7'/></a:lt1><a:dk2><a:srgbClr val='102842'/></a:dk2><a:lt2><a:srgbClr val='DDEAF7'/></a:lt2><a:accent1><a:srgbClr val='F5B942'/></a:accent1><a:accent2><a:srgbClr val='58C7D2'/></a:accent2><a:accent3><a:srgbClr val='9AD94B'/></a:accent3><a:accent4><a:srgbClr val='F07C5C'/></a:accent4><a:accent5><a:srgbClr val='C48BF5'/></a:accent5><a:accent6><a:srgbClr val='D6A15A'/></a:accent6><a:hlink><a:srgbClr val='58C7D2'/></a:hlink><a:folHlink><a:srgbClr val='C48BF5'/></a:folHlink></a:clrScheme><a:fontScheme name='YatraAI'><a:majorFont><a:latin typeface='Aptos Display'/></a:majorFont><a:minorFont><a:latin typeface='Aptos'/></a:minorFont></a:fontScheme><a:fmtScheme name='YatraAI'><a:fillStyleLst><a:solidFill><a:schemeClr val='accent1'/></a:solidFill><a:solidFill><a:schemeClr val='accent2'/></a:solidFill><a:solidFill><a:schemeClr val='accent3'/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w='9525'><a:solidFill><a:schemeClr val='accent1'/></a:solidFill></a:ln><a:ln w='12700'><a:solidFill><a:schemeClr val='accent2'/></a:solidFill></a:ln><a:ln w='19050'><a:solidFill><a:schemeClr val='accent3'/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val='dk1'/></a:solidFill><a:solidFill><a:schemeClr val='dk2'/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>" }
function core(){ "<?xml version='1.0' encoding='UTF-8' standalone='yes'?><cp:coreProperties xmlns:cp='http://schemas.openxmlformats.org/package/2006/metadata/core-properties' xmlns:dc='http://purl.org/dc/elements/1.1/' xmlns:dcterms='http://purl.org/dc/terms/' xmlns:dcmitype='http://purl.org/dc/dcmitype/' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'><dc:title>YatraAI India Tourism Pitch Deck</dc:title><dc:creator>Codex</dc:creator><cp:lastModifiedBy>Codex</cp:lastModifiedBy><dcterms:created xsi:type='dcterms:W3CDTF'>2026-04-04T00:00:00Z</dcterms:created><dcterms:modified xsi:type='dcterms:W3CDTF'>2026-04-04T00:00:00Z</dcterms:modified></cp:coreProperties>" }
function app($count){ "<?xml version='1.0' encoding='UTF-8' standalone='yes'?><Properties xmlns='http://schemas.openxmlformats.org/officeDocument/2006/extended-properties' xmlns:vt='http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes'><Application>Microsoft PowerPoint</Application><Slides>$count</Slides><PresentationFormat>On-screen Show (16:9)</PresentationFormat><Company>YatraAI</Company><AppVersion>16.0000</AppVersion></Properties>" }

$slides=@(
  @{N=1;S=(slide1)},
  @{N=2;S=(slide2)},
  @{N=3;S=(slide3)},
  @{N=4;S=(slide4)},
  @{N=5;S=(slide5)},
  @{N=6;S=(slide6)},
  @{N=7;S=(slide7)},
  @{N=8;S=(slide8)}
)

if(Test-Path $workDir){Remove-Item $workDir -Recurse -Force}
if(Test-Path $svgDir){Remove-Item $svgDir -Recurse -Force}
New-Item -ItemType Directory -Path $workDir, $svgDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $workDir "_rels"),(Join-Path $workDir "docProps"),(Join-Path $workDir "ppt"),(Join-Path $workDir "ppt\_rels"),(Join-Path $workDir "ppt\slides"),(Join-Path $workDir "ppt\slides\_rels"),(Join-Path $workDir "ppt\slideMasters"),(Join-Path $workDir "ppt\slideMasters\_rels"),(Join-Path $workDir "ppt\slideLayouts"),(Join-Path $workDir "ppt\theme"),(Join-Path $workDir "ppt\media") -Force | Out-Null

w (Join-Path $workDir "[Content_Types].xml") (contentTypes $slides.Count)
w (Join-Path $workDir "_rels\.rels") (rootrels)
w (Join-Path $workDir "ppt\presentation.xml") (presentation $slides.Count)
w (Join-Path $workDir "ppt\_rels\presentation.xml.rels") (presrels $slides.Count)
w (Join-Path $workDir "ppt\slideMasters\slideMaster1.xml") (master)
w (Join-Path $workDir "ppt\slideMasters\_rels\slideMaster1.xml.rels") (masterrels)
w (Join-Path $workDir "ppt\slideLayouts\slideLayout1.xml") (layout)
w (Join-Path $workDir "ppt\theme\theme1.xml") (theme)
w (Join-Path $workDir "docProps\core.xml") (core)
w (Join-Path $workDir "docProps\app.xml") (app $slides.Count)

foreach($s in $slides){
  $svgName="slide$($s.N).svg"
  $svgPath=Join-Path $svgDir $svgName
  w $svgPath $s.S
  Copy-Item $svgPath (Join-Path $workDir "ppt\media\$svgName") -Force
  w (Join-Path $workDir "ppt\slides\slide$($s.N).xml") ("<?xml version='1.0' encoding='UTF-8' standalone='yes'?><p:sld xmlns:p='http://schemas.openxmlformats.org/presentationml/2006/main' xmlns:a='http://schemas.openxmlformats.org/drawingml/2006/main' xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships'><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val='06101D'/></a:solidFill></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id='1' name=''/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x='0' y='0'/><a:ext cx='0' cy='0'/><a:chOff x='0' y='0'/><a:chExt cx='0' y='0'/></a:xfrm></p:grpSpPr><p:pic><p:nvPicPr><p:cNvPr id='$($s.N)' name='slide$($s.N)'/><p:cNvPicPr><a:picLocks noChangeAspect='1'/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed='rId1'/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x='0' y='0'/><a:ext cx='12192000' cy='6858000'/></a:xfrm><a:prstGeom prst='rect'><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>")
  w (Join-Path $workDir "ppt\slides\_rels\slide$($s.N).xml.rels") ("<?xml version='1.0' encoding='UTF-8' standalone='yes'?><Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/image' Target='../media/$svgName'/></Relationships>")
}

if(Test-Path $zipPath){Remove-Item $zipPath -Force}
if(Test-Path $OutFile){Remove-Item $OutFile -Force}
Compress-Archive -Path (Join-Path $workDir '*') -DestinationPath $zipPath -CompressionLevel Optimal -Force
Move-Item $zipPath $OutFile -Force
Write-Host "Created PPTX: $OutFile"


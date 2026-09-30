<#
.SYNOPSIS
  把一份簡報打包成可離線播放的 zip，交給別人雙擊 index.html 即可觀看（docs/adr/0010）。
.DESCRIPTION
  依簡報 index.html 的 src／href 找出引用：簡報資料夾整份、assets\ 整份、用到的 vendor\<name>\ 套件整份。
  缺少的套件會依 vendor.json 自動下載並驗證。其他專案檔（例如 playground\）不會被帶入。
.EXAMPLE
  tools\pack.ps1 resources\my-topic
  tools\pack.ps1 playground -Out D:\share
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)][string]$Deck,
  [string]$Out
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $Out) { $Out = Join-Path $root 'dist' }

if (-not $Deck) {
  $decks = @(Get-ChildItem (Join-Path $root 'resources') -Directory -ErrorAction SilentlyContinue | Where-Object { Test-Path (Join-Path $_.FullName 'index.html') })
  if (-not $decks) { throw 'resources\ 下沒有簡報；請以參數指定簡報資料夾，例如 tools\pack.cmd playground' }
  for ($i = 0; $i -lt $decks.Count; $i++) { Write-Host "  $($i + 1). $($decks[$i].Name)" }
  $pick = Read-Host '要打包哪一份（輸入編號）'
  $Deck = $decks[[int]$pick - 1].FullName
}

$deckDir = (Resolve-Path (Join-Path $root $Deck) -ErrorAction SilentlyContinue)
if (-not $deckDir) { $deckDir = Resolve-Path $Deck }
$deckDir = $deckDir.Path.TrimEnd('\')
$rootFull = $root.TrimEnd('\') + '\'
if (-not $deckDir.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) { throw "簡報必須在專案內：$deckDir" }
$index = Join-Path $deckDir 'index.html'
if (-not (Test-Path $index)) { throw "找不到 $index" }
$deckRel = $deckDir.Substring($rootFull.Length)
$name = Split-Path -Leaf $deckDir

# 收集 index.html 引用到的專案內檔案
$html = Get-Content -Raw -Encoding UTF8 $index
$refs = [regex]::Matches($html, '(?:src|href)\s*=\s*"([^"#?]+)') | ForEach-Object { $_.Groups[1].Value } |
  Where-Object { $_ -notmatch '^(?:[a-z][a-z0-9+.-]*:|//)' } | Sort-Object -Unique
$needAssets = $false
$packages = New-Object System.Collections.Generic.List[string]
$extra = New-Object System.Collections.Generic.List[string]
foreach ($ref in $refs) {
  $full = [IO.Path]::GetFullPath((Join-Path $deckDir $ref))
  if ($full.StartsWith($deckDir + '\', [StringComparison]::OrdinalIgnoreCase)) { continue }
  if (-not $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) { throw "引用跳出專案：$ref" }
  $rel = $full.Substring($rootFull.Length)
  if ($rel -match '^assets\\') { $needAssets = $true }
  elseif ($rel -match '^vendor\\([^\\]+)\\') { if (-not $packages.Contains($Matches[1])) { $packages.Add($Matches[1]) } }
  elseif ($rel -match '^playground\\') { throw "正式簡報不得引用 playground：$ref" }
  else { Write-Host "注意：帶入非標準位置的檔案 $rel" -ForegroundColor Yellow; $extra.Add($rel) }
}

# 缺少的套件先下載並驗證
if ($packages.Count) {
  & (Join-Path $PSScriptRoot 'vendor.ps1') -Name $packages.ToArray()
  if ($LASTEXITCODE) { throw '套件未就緒，無法打包' }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$stage = Join-Path ([IO.Path]::GetTempPath()) "agentdeck-pack-$([guid]::NewGuid().ToString('N'))"
$top = Join-Path $stage "$name-$stamp"
try {
  $copy = {
    param($rel)
    $src = Join-Path $root $rel
    if (-not (Test-Path $src)) { throw "找不到引用的檔案：$rel" }
    $dst = Join-Path $top $rel
    New-Item -ItemType Directory -Force (Split-Path -Parent $dst) | Out-Null
    Copy-Item -Recurse -Force $src $dst
  }
  & $copy $deckRel
  if ($needAssets) { & $copy 'assets' }
  foreach ($p in $packages) { & $copy "vendor\$p" }
  foreach ($e in $extra) { & $copy $e }
  Get-ChildItem -Recurse -File $top -Filter '*.download' | Remove-Item -Force

  $target = ($deckRel -replace '\\', '/') + '/index.html'
  $launcher = @"
<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><title>$name</title>
<meta http-equiv="refresh" content="0; url=$target"></head>
<body><p>正在開啟簡報……若沒有自動跳轉，請點 <a href="$target">$target</a>。</p></body></html>
"@
  [IO.File]::WriteAllText((Join-Path $top 'index.html'), $launcher, (New-Object Text.UTF8Encoding $false))

  New-Item -ItemType Directory -Force $Out | Out-Null
  $zip = Join-Path $Out "$name-$stamp.zip"
  if (Test-Path $zip) { Remove-Item -Force $zip }
  Compress-Archive -Path $top -DestinationPath $zip
  $size = '{0:N1} MB' -f ((Get-Item $zip).Length / 1MB)
  Write-Host "已輸出 $zip（$size）" -ForegroundColor Green
  Write-Host "  內容：$deckRel$(if ($needAssets) { '、assets' })$(foreach ($p in $packages) { "、vendor\$p" })"
  Write-Host '  對方解壓縮後雙擊最上層的 index.html 即可播放。'
} finally {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $stage
}

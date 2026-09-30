<#
.SYNOPSIS
  依 vendor.json 下載第三方套件到 vendor/<name>/ 並驗證 SHA-256（docs/adr/0010）。
.EXAMPLE
  tools\vendor.ps1                 # 下載全部缺少或雜湊不符的檔案
  tools\vendor.ps1 -Name three     # 只處理指定套件
  tools\vendor.ps1 -Check          # 只檢查不下載；有缺漏時結束代碼為 1
#>
[CmdletBinding()]
param(
  [string[]]$Name,
  [switch]$Check,
  [switch]$Force
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$root = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'vendor.json') | ConvertFrom-Json
$all = @($manifest.packages.PSObject.Properties.Name)
if (-not $Name) { $Name = $all }
$failed = 0

foreach ($pkg in $Name) {
  if ($all -notcontains $pkg) { Write-Host "[$pkg] vendor.json 沒有這個套件" -ForegroundColor Red; $failed++; continue }
  $p = $manifest.packages.$pkg
  $dir = Join-Path $root "vendor\$pkg"
  foreach ($f in $p.files) {
    if ($f.path -match '(^|[\\/])\.\.([\\/]|$)' -or [IO.Path]::IsPathRooted($f.path)) { throw "[$pkg] path 不可跳出套件資料夾：$($f.path)" }
    $dest = Join-Path $dir $f.path
    $label = "[$pkg@$($p.version)] $($f.path)"
    $want = "$($f.sha256)".ToUpperInvariant()
    if (-not $Force -and (Test-Path $dest) -and $want -and (Get-FileHash $dest -Algorithm SHA256).Hash -eq $want) {
      Write-Host "$label 已就緒"
      continue
    }
    if ($Check) { Write-Host "$label 缺少或雜湊不符" -ForegroundColor Red; $failed++; continue }
    New-Item -ItemType Directory -Force (Split-Path -Parent $dest) | Out-Null
    $tmp = "$dest.download"
    try {
      Write-Host "$label 下載 $($f.url)"
      Invoke-WebRequest -UseBasicParsing -Uri $f.url -OutFile $tmp
      $got = (Get-FileHash $tmp -Algorithm SHA256).Hash
      if (-not $want) {
        Write-Host "$label 未設定 sha256，實際為 $got；確認來源後請填回 vendor.json" -ForegroundColor Yellow
      } elseif ($got -ne $want) {
        throw "雜湊不符：預期 $want，實際 $got"
      }
      Move-Item -Force $tmp $dest
    } catch {
      Remove-Item -Force -ErrorAction SilentlyContinue $tmp
      Write-Host "$label 失敗：$($_.Exception.Message)" -ForegroundColor Red
      $failed++
    }
  }
}
if ($failed) { Write-Host "有 $failed 個檔案未就緒" -ForegroundColor Red; exit 1 }
Write-Host '套件全部就緒' -ForegroundColor Green
exit 0

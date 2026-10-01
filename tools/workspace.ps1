<#
.SYNOPSIS
  在其他專案中建立（或更新）一份 AgentDeck 工作區，讓簡報跟著該專案一起版本控制（docs/adr/0014）。
.DESCRIPTION
  複製框架與範例：assets\、templates\、examples\、tools\、docs\、vendor.json、AGENTS.md、README.md、.gitignore，並建立空的 resources\。
  不帶入 .git、vendor\、dist\、playground\ 與本專案的 resources\ 內容；套件在工作區內以 tools\setup.cmd 下載。
  -Update 只更新框架：保留工作區的 assets\theme\（品牌）、resources\（簡報）與 docs\ 中自行新增的檔案。
.EXAMPLE
  tools\workspace.ps1 D:\other-repo\slides
  tools\workspace.ps1 D:\other-repo\slides -Update
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)][string]$Target,
  [switch]$Update
)
$ErrorActionPreference = 'Stop'
$root = (Split-Path -Parent $PSScriptRoot).TrimEnd('\')
if (-not $Target) { $Target = Read-Host '工作區要建立在哪裡（例如 D:\other-repo\slides）' }
if (-not $Target) { throw '未指定位置' }
$Target = [IO.Path]::GetFullPath($Target).TrimEnd('\')
if ($Target -eq $root -or $Target.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "工作區不能放在 AgentDeck 內：$Target" }

$marker = Join-Path $Target 'agentdeck.json'
if ($Update) {
  if (-not (Test-Path $marker)) { throw "不是 AgentDeck 工作區（找不到 agentdeck.json）：$Target" }
} elseif (Test-Path $marker) {
  throw "已是 AgentDeck 工作區；要更新框架請加 -Update"
} elseif ((Test-Path $Target) -and (Get-ChildItem -Force $Target | Select-Object -First 1)) {
  throw "資料夾不是空的：$Target"
}
New-Item -ItemType Directory -Force $Target | Out-Null

# 整份取代的框架資料夾（工作區不該修改這些）
$mirror = @('assets\deck', 'assets\story-reader', 'templates', 'examples', 'tools')
foreach ($rel in $mirror) {
  $dst = [IO.Path]::GetFullPath((Join-Path $Target $rel))
  if (-not $dst.StartsWith($Target + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "更新路徑超出工作區：$dst" }
  if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
  New-Item -ItemType Directory -Force (Split-Path -Parent $dst) | Out-Null
  Copy-Item -Recurse (Join-Path $root $rel) $dst
}
# 品牌層只在第一次帶入
$theme = Join-Path $Target 'assets\theme'
if (-not (Test-Path $theme)) { Copy-Item -Recurse (Join-Path $root 'assets\theme') $theme }
# 文件覆蓋同名檔，保留工作區自行新增的指引
Get-ChildItem -Recurse -File (Join-Path $root 'docs') | ForEach-Object {
  $dst = Join-Path $Target $_.FullName.Substring($root.Length + 1)
  New-Item -ItemType Directory -Force (Split-Path -Parent $dst) | Out-Null
  Copy-Item -Force $_.FullName $dst
}
foreach ($f in @('vendor.json', 'AGENTS.md', 'README.md', '.gitignore')) { Copy-Item -Force (Join-Path $root $f) (Join-Path $Target $f) }
$res = Join-Path $Target 'resources'
if (-not (Test-Path $res)) { New-Item -ItemType Directory $res | Out-Null; New-Item -ItemType File (Join-Path $res '.gitkeep') | Out-Null }

$commit = ''
try { $commit = (& git -C $root rev-parse --short HEAD 2>$null) } catch {}
$info = [ordered]@{ source = $root; commit = "$commit"; updated = (Get-Date -Format 'yyyy-MM-dd HH:mm') }
[IO.File]::WriteAllText($marker, ($info | ConvertTo-Json) + "`n", (New-Object Text.UTF8Encoding $false))

Write-Host "$(if ($Update) { '已更新' } else { '已建立' }) AgentDeck 工作區：$Target" -ForegroundColor Green
Write-Host '  下一步：'
Write-Host "    1. 複製 templates\blank\ 為 resources\<topic>\，先填 plan.md"
Write-Host '    2. 用到特殊元件（three.js）時執行 tools\setup.cmd 下載套件'
Write-Host '    3. 完成後 tools\pack.cmd resources\<topic> 打包交付'
Write-Host '  vendor\、dist\ 已列入工作區的 .gitignore，不會進該專案的 git。'

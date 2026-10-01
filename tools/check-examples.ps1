# Integration check: create/update a disposable workspace, then exercise pack boundaries.
$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
$tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
$testRoot = Join-Path $tempBase ('agentdeck-examples-check-' + [guid]::NewGuid().ToString('N'))
try {
  & (Join-Path $PSScriptRoot 'workspace.ps1') $testRoot
  & node (Join-Path $sourceRoot 'examples\check.cjs') (Join-Path $testRoot 'examples')
  if ($LASTEXITCODE -ne 0) { throw 'Exported example checks failed' }
  $themeFile = Join-Path $testRoot 'assets\theme\theme.css'
  Add-Content -LiteralPath $themeFile -Value '/* workspace preservation check */'
  $themeBefore = [IO.File]::ReadAllText($themeFile)
  $topic = Join-Path $testRoot 'resources\probe'
  New-Item -ItemType Directory -Path $topic | Out-Null
  $topicIndex = Join-Path $topic 'index.html'
  [IO.File]::WriteAllText($topicIndex, '<script src="../../examples/threshold-consensus/compute.js"></script>')
  [IO.File]::WriteAllText((Join-Path $testRoot 'docs\local-note.md'), 'preserve me')
  [IO.File]::WriteAllText((Join-Path $testRoot 'examples\stale.txt'), 'replace me')
  & (Join-Path $PSScriptRoot 'workspace.ps1') $testRoot -Update
  if ([IO.File]::ReadAllText($themeFile) -ne $themeBefore -or -not (Test-Path $topicIndex) -or -not (Test-Path (Join-Path $testRoot 'docs\local-note.md'))) { throw 'Workspace update lost user-owned content' }
  if (Test-Path (Join-Path $testRoot 'examples\stale.txt')) { throw 'Examples were not replaced on update' }
  $rejected = $false
  try { & (Join-Path $testRoot 'tools\pack.ps1') 'resources\probe' } catch { if ($_.Exception.Message -match '不得引用 examples') { $rejected = $true } else { throw } }
  if (-not $rejected) { throw 'Pack accepted a resource dependency on examples' }
  [IO.File]::WriteAllText($topicIndex, '<link rel="stylesheet" href="../../assets/deck/deck.css"><p>Self-contained topic</p>')
  & (Join-Path $testRoot 'tools\pack.ps1') 'resources\probe'
  & (Join-Path $testRoot 'tools\pack.ps1') 'examples'
  $zip = Get-ChildItem (Join-Path $testRoot 'dist') -Filter 'examples-*.zip' | Select-Object -First 1
  $unpack = Join-Path $testRoot 'unpacked'
  Expand-Archive -LiteralPath $zip.FullName -DestinationPath $unpack
  $packageRoot = (Get-ChildItem -LiteralPath $unpack -Directory | Select-Object -First 1).FullName
  & node (Join-Path $sourceRoot 'examples\check.cjs') (Join-Path $packageRoot 'examples')
  if ($LASTEXITCODE -ne 0) { throw 'Packed example checks failed' }
  Write-Host 'PASS: workspace create/update, preservation, dependency rejection, topic pack, example pack and extracted references'
} finally {
  $resolvedTestRoot = [IO.Path]::GetFullPath($testRoot)
  if (-not $resolvedTestRoot.StartsWith($tempBase + '\agentdeck-examples-check-', [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe cleanup target: $resolvedTestRoot" }
  if (Test-Path -LiteralPath $resolvedTestRoot) { Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force }
}

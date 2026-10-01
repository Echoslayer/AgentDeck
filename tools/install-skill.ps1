<#
.SYNOPSIS
  安裝 AgentDeck skill，讓其他專案中的 LLM agent（Copilot CLI、Claude Code）也照 AgentDeck 規則做簡報（docs/adr/0014）。
.DESCRIPTION
  把 skills\agentdeck\ 複製到 ~\.copilot\skills\ 與 ~\.claude\skills\，並寫入本機 AgentDeck 的路徑。
  AgentDeck 搬家或更新 skill 後重新執行即可。
.EXAMPLE
  tools\install-skill.ps1
  tools\install-skill.ps1 -Dest D:\other-repo\.github\skills
#>
[CmdletBinding()]
param([string[]]$Dest)
$ErrorActionPreference = 'Stop'
$root = (Split-Path -Parent $PSScriptRoot).TrimEnd('\')
if (-not $Dest) { $Dest = @((Join-Path $HOME '.copilot\skills'), (Join-Path $HOME '.claude\skills')) }
$utf8 = New-Object Text.UTF8Encoding $false
foreach ($skill in Get-ChildItem -Directory (Join-Path $root 'skills')) {
  foreach ($d in $Dest) {
    $dst = Join-Path $d $skill.Name
    if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
    New-Item -ItemType Directory -Force $d | Out-Null
    Copy-Item -Recurse $skill.FullName $dst
    Get-ChildItem -Recurse -File $dst -Include '*.md' | ForEach-Object {
      $text = [IO.File]::ReadAllText($_.FullName, $utf8).Replace('{{AGENTDECK_HOME}}', $root)
      [IO.File]::WriteAllText($_.FullName, $text, $utf8)
    }
    Write-Host "已安裝 $($skill.Name) → $dst" -ForegroundColor Green
  }
}
Write-Host "  AgentDeck 位置：$root（搬家後請重新執行）"
$ErrorActionPreference = 'Stop'

# Resolve the repository from this script, not from the caller's current folder.
# This prevents the nested StudioFlow checkout / wrong-PowerShell-directory issue.
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$bashCandidates = [System.Collections.Generic.List[string]]::new()

foreach ($value in @($env:STUDIOFLOW_BASH, $env:GIT_BASH)) {
    if (-not [string]::IsNullOrWhiteSpace($value)) {
        [void]$bashCandidates.Add($value.Trim().Trim('"'))
    }
}

$gitCommand = Get-Command git.exe -CommandType Application -ErrorAction SilentlyContinue |
    Select-Object -First 1
if ($gitCommand) {
    $gitCommandDirectory = Split-Path -Parent $gitCommand.Source
    $gitRoot = Split-Path -Parent $gitCommandDirectory
    [void]$bashCandidates.Add((Join-Path $gitRoot 'bin\bash.exe'))
    [void]$bashCandidates.Add((Join-Path $gitRoot 'usr\bin\bash.exe'))
}

if ($env:ProgramFiles) {
    [void]$bashCandidates.Add((Join-Path $env:ProgramFiles 'Git\bin\bash.exe'))
}
$programFilesX86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
if ($programFilesX86) {
    [void]$bashCandidates.Add((Join-Path $programFilesX86 'Git\bin\bash.exe'))
}
if ($env:LOCALAPPDATA) {
    [void]$bashCandidates.Add((Join-Path $env:LOCALAPPDATA 'Programs\Git\bin\bash.exe'))
}
if ($env:USERPROFILE) {
    [void]$bashCandidates.Add((Join-Path $env:USERPROFILE 'scoop\apps\git\current\bin\bash.exe'))
}
$bashCommand = Get-Command bash.exe -CommandType Application -ErrorAction SilentlyContinue |
    Select-Object -First 1
if ($bashCommand) {
    [void]$bashCandidates.Add($bashCommand.Source)
}

$bashPath = $bashCandidates |
    Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } |
    Select-Object -Unique |
    Select-Object -First 1

if (-not $bashPath) {
    throw 'A working GNU Bash is required for this release-mode verification. Install Git for Windows (Git Bash), then rerun .\scripts\verify-production-release-modes.ps1. Or set STUDIOFLOW_BASH to the full path of bash.exe.'
}

$nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction Stop |
    Select-Object -First 1

$env:STUDIOFLOW_BASH = $bashPath
$env:STUDIOFLOW_REQUIRE_BASH = '1'

Write-Host "Repository: $repoRoot"
Write-Host "Node: $($nodeCommand.Source)"
Write-Host "Bash: $bashPath"
Write-Host 'Running the production release-mode verification...'

$exitCode = 1
Push-Location -LiteralPath $repoRoot
try {
    & $nodeCommand.Source (Join-Path $repoRoot 'scripts\verify-production-release-modes.mjs')
    $exitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

if ($null -eq $exitCode) {
    $exitCode = 1
}
exit $exitCode

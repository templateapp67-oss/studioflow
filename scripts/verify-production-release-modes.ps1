#requires -Version 5.1
$ErrorActionPreference = 'Stop'

# Resolve the repository from this script, never from the caller's current
# directory. The Node verifier self-detects optional Git Bash checks; a local
# Windows PowerShell run no longer fails just because Git Bash is absent.
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction Stop |
    Select-Object -First 1

Write-Host "Repository: $repoRoot"
Write-Host "Node: $($nodeCommand.Source)"

$previousLocation = Get-Location
try {
    Push-Location -LiteralPath $repoRoot

    Write-Host 'Running production release-mode workflow and migration safety checks...'
    & $nodeCommand.Source (Join-Path $repoRoot 'scripts/verify-production-release-modes.mjs')
    $nodeExitCode = $LASTEXITCODE
    if ($null -ne $nodeExitCode -and $nodeExitCode -ne 0) {
        throw "Production release-mode verification failed with exit code $nodeExitCode."
    }

    Write-Host 'Running the native Windows PowerShell production deployment contract...'
    & (Join-Path $repoRoot 'scripts/verify-production-deploy-powershell.ps1')
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        throw "PowerShell production deploy verification failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
Write-Host 'PASS: production release-mode and native Windows PowerShell deployment contracts.'

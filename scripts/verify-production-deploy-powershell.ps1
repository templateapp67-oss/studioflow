#requires -Version 5.1
# Isolated end-to-end contract test for deploy-production.ps1.
# All Vercel operations are mocked; the real Node env normalizer is exercised.

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$deployScript = Join-Path $PSScriptRoot 'deploy-production.ps1'
$normalizerSource = Join-Path $PSScriptRoot 'prepare-vercel-production-env.mjs'
$nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1

. $deployScript

$expectedUrl = 'https://zilwgiuiygqqardzutxi.supabase.co'
$tokenSentinel = 'mock_vercel_token_never_log_918273'
$serviceKeySentinel = 'mock_service_role_never_log_445566'
$orgId = 'team_mock_studioflow'
$projectId = 'prj_mock_studioflow'

function New-MockVercelInvoker {
    param(
        [string]$FixtureRoot,
        [System.Collections.Generic.List[object]]$Calls,
        [switch]$FailBuild
    )

    $nodePath = $nodeCommand.Source
    $expectedOrg = $orgId
    $expectedProject = $projectId
    $secret = $serviceKeySentinel

    return {
        param([string]$Name, [string[]]$Arguments)

        $Calls.Add([pscustomobject]@{
            Name = $Name
            Arguments = @($Arguments)
        }) | Out-Null

        if ($Name -eq 'vercel') {
            switch ($Arguments[0]) {
                'pull' {
                    $vercelDir = Join-Path $FixtureRoot '.vercel'
                    New-Item -ItemType Directory -Path $vercelDir -Force | Out-Null
                    $projectJson = @{ orgId = $expectedOrg; projectId = $expectedProject } | ConvertTo-Json
                    [System.IO.File]::WriteAllText(
                        (Join-Path $vercelDir 'project.json'),
                        $projectJson,
                        (New-Object System.Text.UTF8Encoding($false))
                    )
                    $envText = @(
                        ('SUPABASE_SERVICE_ROLE_KEY="' + $secret + '"'),
                        'VITE_SUPABASE_URL="https://wrong-project.supabase.co"',
                        ''
                    ) -join [Environment]::NewLine
                    [System.IO.File]::WriteAllText(
                        (Join-Path $vercelDir '.env.production.local'),
                        $envText,
                        (New-Object System.Text.UTF8Encoding($false))
                    )
                    return [pscustomobject]@{ ExitCode = 0; Output = 'Mock Vercel Production pull complete.' }
                }
                'build' {
                    if ($env:VITE_SUPABASE_URL -ne $expectedUrl) {
                        return [pscustomobject]@{ ExitCode = 31; Output = 'PowerShell did not pin the reviewed VITE_SUPABASE_URL.' }
                    }
                    if ($FailBuild) {
                        return [pscustomobject]@{ ExitCode = 27; Output = 'Intentional mock build failure.' }
                    }
                    return [pscustomobject]@{ ExitCode = 0; Output = 'Mock Vercel Production build complete.' }
                }
                'deploy' {
                    return [pscustomobject]@{
                        ExitCode = 0
                        Output = 'Production deployment ready: https://studioflow-powershell-mock.vercel.app'
                    }
                }
                default {
                    return [pscustomobject]@{ ExitCode = 90; Output = 'Unexpected Vercel command.' }
                }
            }
        }

        if ($Name -eq 'node') {
            $nativeOutput = @(& $nodePath @Arguments 2>&1)
            $nativeExitCode = $LASTEXITCODE
            if ($null -eq $nativeExitCode) { $nativeExitCode = 0 }
            return [pscustomobject]@{
                ExitCode = [int]$nativeExitCode
                Output = ($nativeOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
            }
        }

        if ($Name -eq 'icacls.exe') {
            return [pscustomobject]@{ ExitCode = 0; Output = 'Mock Windows ACL restricted to current user.' }
        }

        return [pscustomobject]@{ ExitCode = 91; Output = 'Unexpected executable requested by the deployment script.' }
    }.GetNewClosure()
}

function Assert-Condition {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw "ASSERTION FAILED: $Message" }
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('studioflow-powershell-deploy-' + [guid]::NewGuid().ToString('N'))
$fixtureScripts = Join-Path $tempRoot 'scripts'
New-Item -ItemType Directory -Path $fixtureScripts -Force | Out-Null
Copy-Item -LiteralPath $normalizerSource -Destination (Join-Path $fixtureScripts 'prepare-vercel-production-env.mjs')

$originalViteUrl = $env:VITE_SUPABASE_URL
$originalToken = $env:VERCEL_TOKEN

try {
    # Success path: pull -> project identity -> normalize -> build -> archived deploy.
    $successCalls = [System.Collections.Generic.List[object]]::new()
    $successInvoker = New-MockVercelInvoker -FixtureRoot $tempRoot -Calls $successCalls
    $success = Invoke-StudioFlowProductionDeployment -RepositoryRoot $tempRoot -Token $tokenSentinel -OrgId $orgId -ProjectId $projectId -CommandInvoker $successInvoker -SkipLiveSeoVerification

    Assert-Condition ($success.DeploymentUrl -eq 'https://nexorasalon.online') 'Production domain output is incorrect.'
    Assert-Condition ($success.SupabaseUrl -eq $expectedUrl) 'The runner did not pin the reviewed Supabase project.'
    Assert-Condition ($success.VercelDeploymentUrl -eq 'https://studioflow-powershell-mock.vercel.app') 'The Vercel deployment URL was not captured.'

    $vercelCalls = @($successCalls | Where-Object { $_.Name -eq 'vercel' })
    Assert-Condition ($vercelCalls.Count -eq 3) 'Expected exactly pull, build and deploy Vercel commands.'
    Assert-Condition ($vercelCalls[0].Arguments[0] -eq 'pull') 'Vercel pull must run first.'
    Assert-Condition ($vercelCalls[1].Arguments[0] -eq 'build') 'Vercel build must run second.'
    Assert-Condition ($vercelCalls[2].Arguments[0] -eq 'deploy') 'Vercel deploy must run last.'
    Assert-Condition ($vercelCalls[2].Arguments -contains '--prebuilt') 'Production deploy must use --prebuilt.'
    Assert-Condition ($vercelCalls[2].Arguments -contains '--archive=tgz') 'Production deploy must use archive upload.'
    Assert-Condition ($vercelCalls[2].Arguments -contains '--prod') 'Production deploy must target Production.'
    Assert-Condition (@($successCalls | Where-Object { $_.Name -eq 'node' }).Count -eq 1) 'The actual local environment normalizer must run once.'
    if ([System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT) {
        Assert-Condition (@($successCalls | Where-Object { $_.Name -eq 'icacls.exe' }).Count -eq 2) 'Windows env-file ACL must be restricted before and after normalization.'
    }

    $envFile = Join-Path (Join-Path $tempRoot '.vercel') '.env.production.local'
    $normalized = Get-Content -LiteralPath $envFile -Raw
    Assert-Condition ($normalized.Contains('VITE_SUPABASE_URL="' + $expectedUrl + '"')) 'The pulled Production Supabase URL was not normalized.'
    Assert-Condition ($normalized.Contains($serviceKeySentinel)) 'Unrelated service-role entry was not preserved.'
    Assert-Condition (-not $normalized.Contains('wrong-project.supabase.co')) 'Wrong Supabase URL survived normalization.'
    Assert-Condition ($env:VERCEL_TOKEN -ne $tokenSentinel) 'The test token was not restored after deployment.'

    # Failure path: a failed build must stop before any production deploy command.
    $failureCalls = [System.Collections.Generic.List[object]]::new()
    $failureInvoker = New-MockVercelInvoker -FixtureRoot $tempRoot -Calls $failureCalls -FailBuild
    $buildFailed = $false
    try {
        $null = Invoke-StudioFlowProductionDeployment -RepositoryRoot $tempRoot -Token $tokenSentinel -OrgId $orgId -ProjectId $projectId -CommandInvoker $failureInvoker -SkipLiveSeoVerification
    }
    catch {
        $buildFailed = $_.Exception.Message.Contains('failed with exit code 27')
    }
    Assert-Condition $buildFailed 'A non-zero Vercel build must fail the script.'
    Assert-Condition (@($failureCalls | Where-Object { $_.Name -eq 'vercel' -and $_.Arguments[0] -eq 'deploy' }).Count -eq 0) 'Deploy must never run after a failed build.'

    # Guard path: missing credentials must fail before invoking any command.
    $noCalls = [System.Collections.Generic.List[object]]::new()
    $missingCredentialsFailed = $false
    try {
        $null = Invoke-StudioFlowProductionDeployment -RepositoryRoot $tempRoot -Token '' -OrgId $orgId -ProjectId $projectId -CommandInvoker (New-MockVercelInvoker -FixtureRoot $tempRoot -Calls $noCalls) -SkipLiveSeoVerification
    }
    catch {
        $missingCredentialsFailed = $_.Exception.Message.Contains('VERCEL_TOKEN')
    }
    Assert-Condition $missingCredentialsFailed 'Missing Vercel token must fail with a direct diagnostic.'
    Assert-Condition ($noCalls.Count -eq 0) 'No external command may run when credentials are missing.'

    Write-Host 'PASS: Windows PowerShell Production deploy path — correct project binding, strict Supabase URL normalization, Windows ACL, prebuilt archive deploy, fail-closed build, and credential guards.'
}
finally {
    if ($null -eq $originalViteUrl) {
        Remove-Item Env:\VITE_SUPABASE_URL -ErrorAction SilentlyContinue
    }
    else {
        $env:VITE_SUPABASE_URL = $originalViteUrl
    }
    if ($null -eq $originalToken) {
        Remove-Item Env:\VERCEL_TOKEN -ErrorAction SilentlyContinue
    }
    else {
        $env:VERCEL_TOKEN = $originalToken
    }
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}

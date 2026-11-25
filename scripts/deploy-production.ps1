#requires -Version 5.1
# Production deploy path for Windows PowerShell / PowerShell 7.
# Run from any working directory: .\scripts\deploy-production.ps1
#
# This deploys the website only. Supabase migrations and Edge Function releases
# remain separately gated by production.yml and are not run by this script.

$script:StudioFlowDeployScriptRoot = $PSScriptRoot

function Invoke-StudioFlowProductionDeployment {
    [CmdletBinding()]
    param(
        [string]$RepositoryRoot = (Split-Path -Parent $script:StudioFlowDeployScriptRoot),
        [string]$Token = $env:VERCEL_TOKEN,
        [string]$OrgId = $env:VERCEL_ORG_ID,
        [string]$ProjectId = $env:VERCEL_PROJECT_ID,
        [scriptblock]$CommandInvoker,
        [switch]$SkipLiveSeoVerification
    )

    if ($SkipLiveSeoVerification -and $null -eq $CommandInvoker) {
        throw 'SkipLiveSeoVerification is test-only; a mocked CommandInvoker is required.'
    }

    foreach ($credential in @(
        @{ Name = 'VERCEL_TOKEN'; Value = $Token },
        @{ Name = 'VERCEL_ORG_ID'; Value = $OrgId },
        @{ Name = 'VERCEL_PROJECT_ID'; Value = $ProjectId }
    )) {
        if ([string]::IsNullOrWhiteSpace([string]$credential.Value)) {
            throw "The production environment did not provide $($credential.Name)."
        }
    }

    $root = [System.IO.Path]::GetFullPath($RepositoryRoot)
    if (-not (Test-Path -LiteralPath $root -PathType Container)) {
        throw "StudioFlow repository folder does not exist: $root"
    }

    $previousLocation = Get-Location
    $environmentNames = @(
        'VERCEL_TOKEN',
        'VERCEL_ORG_ID',
        'VERCEL_PROJECT_ID',
        'VERCEL_PRODUCTION_ENV_FILE',
        'VITE_SUPABASE_URL',
        'LIVE_SEO_URL',
        'CHECK_WWW_REDIRECT_URL',
        'CHECK_HTTP_REDIRECT',
        'REQUIRE_PUBLISHED_SITES',
        'SEO_REPORT_PATH',
        'SEO_WAIT_RETRY_ATTEMPTS',
        'SEO_WAIT_RETRY_DELAY_MS'
    )
    $previousEnvironment = @{}
    foreach ($name in $environmentNames) {
        $previousEnvironment[$name] = [System.Environment]::GetEnvironmentVariable($name, 'Process')
    }

    $expectedSupabaseUrl = 'https://zilwgiuiygqqardzutxi.supabase.co'
    $vercelFolder = Join-Path $root '.vercel'
    $projectFile = Join-Path $vercelFolder 'project.json'
    $productionEnvFile = Join-Path $vercelFolder '.env.production.local'
    $normalizer = Join-Path $root 'scripts/prepare-vercel-production-env.mjs'
    $liveSeoVerifier = Join-Path $root 'scripts/verify-live-seo-http.mjs'
    $reportPath = Join-Path $root 'test-results/production-live-seo-report.json'

    $runner = $CommandInvoker
    if ($null -eq $runner) {
        $runner = {
            param(
                [string]$Name,
                [string[]]$Arguments
            )

            $command = Get-Command -Name $Name -ErrorAction Stop |
                Select-Object -First 1
            $captured = @(& $command @Arguments 2>&1)
            $nativeExitCode = $LASTEXITCODE
            if ($null -eq $nativeExitCode) {
                $nativeExitCode = 0
            }

            [pscustomobject]@{
                ExitCode = [int]$nativeExitCode
                Output = ($captured | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
            }
        }.GetNewClosure()
    }

    $invokeChecked = {
        param(
            [string]$Name,
            [string[]]$Arguments
        )

        $result = & $runner $Name $Arguments
        if ($null -eq $result -or $null -eq $result.PSObject.Properties['ExitCode']) {
            throw "The command runner returned no exit status for $Name."
        }

        $output = [string]$result.Output
        $safeOutput = $output
        if (-not [string]::IsNullOrEmpty($Token)) {
            $safeOutput = $safeOutput.Replace($Token, '[REDACTED]')
        }

        if ([int]$result.ExitCode -ne 0) {
            $detail = $safeOutput.Trim()
            if ($detail.Length -gt 1200) {
                $detail = $detail.Substring(0, 1200)
            }
            throw "$Name failed with exit code $([int]$result.ExitCode). $detail"
        }

        if (-not [string]::IsNullOrWhiteSpace($safeOutput)) {
            foreach ($line in ([regex]::Split($safeOutput, '\r?\n'))) {
                if (-not [string]::IsNullOrWhiteSpace($line)) {
                    Write-Host $line
                }
            }
        }

        [pscustomobject]@{
            ExitCode = [int]$result.ExitCode
            Output = $output
        }
    }.GetNewClosure()

    try {
        Set-Location -LiteralPath $root
        $env:VERCEL_TOKEN = $Token
        $env:VERCEL_ORG_ID = $OrgId
        $env:VERCEL_PROJECT_ID = $ProjectId
        $env:VERCEL_PRODUCTION_ENV_FILE = $productionEnvFile

        Write-Host "StudioFlow repository: $root"
        Write-Host 'Checking Vercel Production credentials and pulling the linked Production environment.'

        $null = & $invokeChecked -Name 'vercel' -Arguments @(
            'pull',
            '--yes',
            '--environment=production',
            "--token=$Token"
        )

        if (-not (Test-Path -LiteralPath $projectFile -PathType Leaf)) {
            throw 'Vercel pull did not create .vercel/project.json.'
        }
        $linkedProject = Get-Content -LiteralPath $projectFile -Raw | ConvertFrom-Json
        if ($linkedProject.orgId -ne $OrgId -or $linkedProject.projectId -ne $ProjectId) {
            throw 'The pulled Vercel project identity does not match VERCEL_ORG_ID and VERCEL_PROJECT_ID.'
        }
        Write-Host 'PASS: Vercel project identity matches the configured Production project.'

        if (-not (Test-Path -LiteralPath $productionEnvFile -PathType Leaf)) {
            throw 'Vercel pull did not create .vercel/.env.production.local.'
        }

        # Windows ignores POSIX 0600 file modes. Restrict the pulled env file
        # to the current runner identity, which also runs the build and CLI.
        if ([System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT) {
            $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
            $null = & $invokeChecked -Name 'icacls.exe' -Arguments @(
                $productionEnvFile,
                '/inheritance:r',
                '/grant:r',
                ($identity + ':(F)')
            )
        }

        Write-Host 'Normalizing and strictly verifying the reviewed Production Supabase URL.'
        $null = & $invokeChecked -Name 'node' -Arguments @($normalizer)

        if ([System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT) {
            $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
            $null = & $invokeChecked -Name 'icacls.exe' -Arguments @(
                $productionEnvFile,
                '/inheritance:r',
                '/grant:r',
                ($identity + ':(F)')
            )
        }

        $env:VITE_SUPABASE_URL = $expectedSupabaseUrl
        Write-Host 'Building the production deployment with the reviewed Supabase URL.'
        $null = & $invokeChecked -Name 'vercel' -Arguments @(
            'build',
            '--prod',
            "--token=$Token"
        )

        Write-Host 'Deploying the prebuilt Production artifact using archived upload.'
        $deployment = & $invokeChecked -Name 'vercel' -Arguments @(
            'deploy',
            '--prebuilt',
            '--archive=tgz',
            '--prod',
            '--yes',
            "--token=$Token",
            '--project',
            $ProjectId,
        )

        $vercelUrlMatch = [regex]::Matches(
            [string]$deployment.Output,
            '(?i)https://[a-z0-9.-]+\.vercel\.app'
        )
        $vercelDeploymentUrl = $null
        if ($vercelUrlMatch.Count -gt 0) {
            $vercelDeploymentUrl = $vercelUrlMatch[$vercelUrlMatch.Count - 1].Value
        }

        if (-not $SkipLiveSeoVerification) {
            $reportDirectory = Split-Path -Parent $reportPath
            if (-not (Test-Path -LiteralPath $reportDirectory)) {
                New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null
            }

            $env:LIVE_SEO_URL = 'https://nexorasalon.online'
            $env:CHECK_WWW_REDIRECT_URL = 'https://www.nexorasalon.online'
            $env:CHECK_HTTP_REDIRECT = '1'
            $env:REQUIRE_PUBLISHED_SITES = '1'
            $env:SEO_REPORT_PATH = $reportPath
            $env:SEO_WAIT_RETRY_ATTEMPTS = '6'
            $env:SEO_WAIT_RETRY_DELAY_MS = '5000'

            Write-Host 'Verifying live Production SEO headers, redirects, sitemap and prerendered routes.'
            $null = & $invokeChecked -Name 'node' -Arguments @($liveSeoVerifier)
        }

        [pscustomobject]@{
            DeploymentUrl = 'https://nexorasalon.online'
            VercelDeploymentUrl = $vercelDeploymentUrl
            SupabaseUrl = $expectedSupabaseUrl
            SeoReportPath = if ($SkipLiveSeoVerification) { $null } else { $reportPath }
        }
    }
    finally {
        Set-Location -LiteralPath $previousLocation
        foreach ($name in $environmentNames) {
            $value = $previousEnvironment[$name]
            [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

# Dot-sourcing exposes the function to the isolated PowerShell contract tests.
# Direct execution runs the complete real deployment and live SEO verification.
if ($MyInvocation.InvocationName -ne '.') {
    Invoke-StudioFlowProductionDeployment
}

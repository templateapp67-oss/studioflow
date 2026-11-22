<#
NEXORA SalonOS: real HTTP Supabase Auth + branch inventory E2E.

Safety design:
- Loads project .env/.env.local without displaying any values.
- Uses a fresh, temporary Auth user and unique inventory SKU/name marker.
- Writes through the real Auth password grant and the user's JWT (RLS enforced).
- Uses the service-role key only for test setup/cleanup.
- Always attempts cleanup in finally; a recovery manifest is retained in %TEMP%
  if cleanup cannot be verified, so the next run retries cleanup before creating
  anything else.
- Razorpay requests require -AllowRazorpayTestCapture, server keyMode=test,
  and a second immediate pre-order re-check. QA Edge routes are test-only.
- Only isolated non-production Supabase preview projects are allowed; production
  project zilwgiuiygqqardzutxi is hard-blocked.

Run from the studioflow repo root:
  $env:NEXORA_E2E_OWNER_ID = '<salon owner UUID>'
  $env:NEXORA_E2E_BRANCH_ID = '<active branch UUID belonging to that owner>'
  .\scripts\Invoke-NexoraSalonE2E.ps1

Required environment (read from process env or .env/.env.local):
  NEXORA_E2E_PREVIEW_PROJECT_REF (must not be the production project ref)
  NEXORA_E2E_SUPABASE_URL
  NEXORA_E2E_SUPABASE_PUBLISHABLE_KEY
  NEXORA_E2E_SUPABASE_SERVICE_ROLE_KEY

PowerShell 5.1+; no extra modules required.
#>

[CmdletBinding()]
param(
  [switch]$SkipEnvFiles,
  [switch]$AllowRazorpayTestCapture
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:Results = [ordered]@{}
$script:CleanupErrors = New-Object System.Collections.Generic.List[string]
$script:State = $null
$script:StatePath = $null
$script:SupabaseUrl = $null
$script:PublishableKey = $null
$script:ServiceRoleKey = $null
$script:OwnerId = $null
$script:BranchId = $null
$script:Marker = $null
$script:StaffEmail = $null
$script:StaffUserId = $null
$script:InventoryId = $null
$script:InventorySku = $null
$script:RazorpayKeyModeReported = $null
$script:RazorpayQaRun = $null
$script:RazorpayOrderId = $null
$script:RazorpayPaymentId = $null
$script:RazorpayCheckoutKey = $null
$script:RazorpayCheckoutSignature = $null
$script:RazorpayRefundStatus = $null
$script:StaffPassword = $null
$script:StaffAccessToken = $null
$script:PreviewProjectRef = $null
$script:Stage = 'initial'
$script:ProjectRoot = (Get-Location).Path

function Write-Check {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][ValidateSet('PASS','FAIL','SKIPPED','BLOCKED','BLOCKED_LIVE_MODE','SKIPPED_UNPROVEN_MODE','SKIPPED_NOT_OPTED_IN','SKIPPED_STATUS_UNREACHABLE','ABORTED_MODE_CHANGED','EXECUTED_TEST_MODE')][string]$Status,
    [Parameter(Mandatory=$true)][string]$Detail
  )
  $safeDetail = Protect-E2EText -Text $Detail
  $script:Results[$Name] = [ordered]@{ status = $Status; reason = $safeDetail }
  $colour = switch ($Status) {
    'PASS' { 'Green' }
    'FAIL' { 'Red' }
    'SKIPPED' { 'Yellow' }
    default { 'DarkYellow' }
  }
  Write-Host ("[{0}] {1}: {2}" -f $Status, $Name, $safeDetail) -ForegroundColor $colour
}


function Protect-E2EText {
  param([string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) { return '' }
  $safe = [string]$Text
  foreach ($secret in @($script:PublishableKey,$script:ServiceRoleKey,$script:RazorpayCheckoutKey,$script:RazorpayCheckoutSignature,$script:StaffPassword,$script:StaffAccessToken)) {
    if (-not [string]::IsNullOrEmpty([string]$secret)) { $safe = $safe.Replace([string]$secret,'[REDACTED]') }
  }
  $safe = $safe -replace '(?i)authorization\s*[:=]\s*[^\s,;]+','Authorization=[REDACTED]'
  $safe = $safe -replace '(?i)apikey\s*[:=]\s*[^\s,;]+','apikey=[REDACTED]'
  $safe = $safe -replace '(?i)\bBearer\s+[A-Za-z0-9._~+/-]+=*','Bearer [REDACTED]'
  $safe = $safe -replace '(?i)\brzp_(test|live)_[A-Za-z0-9_-]+','[RAZORPAY_KEY_REDACTED]'
  $safe = $safe -replace '\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b','[TOKEN_REDACTED]'
  $safe = $safe -replace '\b(order|pay|rfnd)_[A-Za-z0-9]+\b','[$1-REFERENCE-REDACTED]'
  return $safe
}

function Write-E2EReport {
  $checks = New-Object System.Collections.Generic.List[object]
  foreach ($name in $script:Results.Keys) {
    $entry = [ordered]@{
      check = [string]$name
      status = [string]$script:Results[$name].status
      reason = Protect-E2EText -Text ([string]$script:Results[$name].reason)
    }
    if ($name -eq 'Razorpay test capture + Edge refund') {
      $entry.keyModeReported = [string]$script:RazorpayKeyModeReported
    }
    $checks.Add([pscustomobject]$entry)
  }
  # Only allowlisted status/reason fields and the non-secret keyMode label are serialized.
  $report = [ordered]@{ checks = @($checks.ToArray()) }
  $reportPath = Join-Path $script:ProjectRoot 'NEXORA-E2E-report.json'
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8
  Write-Host ("Report: {0}" -f $reportPath)
}

function Get-RazorpayEdgeStatus {
  return Invoke-SupabaseRest -Method GET -Path 'functions/v1/studioflow-payments' -KeyKind PUBLIC
}

function Invoke-RazorpayEdgeQA {
  param([Parameter(Mandatory=$true)][string]$Action, [hashtable]$Body = @{})
  $payload = @{ action = $Action }
  foreach ($key in $Body.Keys) { $payload[$key] = $Body[$key] }
  return Invoke-JsonHttp -Method POST -Url ($script:SupabaseUrl + '/functions/v1/studioflow-payments') -ApiKey $script:PublishableKey -BearerToken $script:ServiceRoleKey -Body $payload
}

function Start-RazorpayTestCheckout {
  param(
    [Parameter(Mandatory=$true)][string]$KeyId,
    [Parameter(Mandatory=$true)][string]$OrderId
  )
  $probe = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback,0)
  try { $probe.Start(); $port = ([System.Net.IPEndPoint]$probe.LocalEndpoint).Port }
  finally { $probe.Stop() }

  $keyJson = ConvertTo-Json -InputObject $KeyId -Compress
  $orderJson = ConvertTo-Json -InputObject $OrderId -Compress
  $html = @'
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEXORA Sandbox Checkout</title></head>
<body style="font-family:Arial,sans-serif;padding:28px;max-width:600px;margin:auto">
<h2>NEXORA Razorpay TEST checkout</h2>
<p>Use only Razorpay's documented test card or test UPI details. Do not enter real payment credentials.</p>
<p id="state">Loading Razorpay Checkout…</p>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
const options = {
  key: __KEY__, order_id: __ORDER__, amount: 100, currency: "INR",
  name: "NEXORA SalonOS QA", description: "NEXORA E2E sandbox verification",
  handler: async function (response) {
    document.getElementById("state").textContent = "Test response received; returning to PowerShell.";
    await fetch("/result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(response) });
  },
  modal: { ondismiss: async function () {
    document.getElementById("state").textContent = "Checkout dismissed.";
    try { await fetch("/cancel", { method: "POST" }); } catch (_) {}
  }}
};
if (typeof Razorpay !== "function") {
  document.getElementById("state").textContent = "Razorpay Checkout could not load.";
} else {
  const checkout = new Razorpay(options);
  checkout.on("payment.failed", async function () {
    document.getElementById("state").textContent = "Sandbox payment failed.";
    try { await fetch("/failure", { method: "POST" }); } catch (_) {}
  });
  checkout.open();
}
</script></body></html>
'@
  $html = $html.Replace('__KEY__',$keyJson).Replace('__ORDER__',$orderJson)

  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add(("http://127.0.0.1:{0}/" -f $port))
  $listener.Start()
  $responseData = $null
  $failure = $null
  $cancelled = $false
  $deadline = (Get-Date).AddMinutes(8)
  try {
    Start-Process -FilePath ("http://127.0.0.1:{0}/" -f $port)
    $pending = $listener.BeginGetContext($null,$null)
    while ((Get-Date) -lt $deadline -and $null -eq $responseData -and -not $failure -and -not $cancelled) {
      if (-not $pending.AsyncWaitHandle.WaitOne(1000)) { continue }
      $context = $listener.EndGetContext($pending)
      $path = $context.Request.Url.AbsolutePath
      if ($path -eq '/' -and $context.Request.HttpMethod -eq 'GET') {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($html)
        $context.Response.StatusCode = 200
        $context.Response.ContentType = 'text/html; charset=utf-8'
        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
        $context.Response.Close()
      } elseif ($path -eq '/result' -and $context.Request.HttpMethod -eq 'POST') {
        $reader = New-Object System.IO.StreamReader($context.Request.InputStream)
        $raw = $reader.ReadToEnd()
        $reader.Dispose()
        try { $responseData = $raw | ConvertFrom-Json } catch { $failure = 'Checkout response could not be parsed.' }
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('Response received. You may close this window.')
        $context.Response.StatusCode = 200
        $context.Response.ContentType = 'text/plain; charset=utf-8'
        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
        $context.Response.Close()
      } elseif ($path -eq '/cancel') {
        $cancelled = $true
        $context.Response.StatusCode = 200
        $context.Response.Close()
      } elseif ($path -eq '/failure') {
        $failure = 'Razorpay test checkout reported a payment failure.'
        $context.Response.StatusCode = 200
        $context.Response.Close()
      } else {
        $context.Response.StatusCode = 404
        $context.Response.Close()
      }
      if ($null -eq $responseData -and -not $failure -and -not $cancelled) {
        $pending = $listener.BeginGetContext($null,$null)
      }
    }
  } finally {
    try { $listener.Stop() } catch {}
    try { $listener.Close() } catch {}
  }
  if ($failure) { throw $failure }
  if ($cancelled) { throw 'Razorpay test checkout was dismissed.' }
  if ($null -eq $responseData) { throw 'Razorpay test checkout timed out.' }
  if ([string]$responseData.razorpay_order_id -ne $OrderId -or [string]::IsNullOrWhiteSpace([string]$responseData.razorpay_payment_id) -or [string]::IsNullOrWhiteSpace([string]$responseData.razorpay_signature)) {
    throw 'Razorpay Checkout response did not match the temporary QA order.'
  }
  return $responseData
}

function Invoke-RazorpayTestE2E {
  try { $initial = Get-RazorpayEdgeStatus }
  catch {
    $script:RazorpayKeyModeReported = $null
    Write-Check -Name 'Razorpay test capture + Edge refund' -Status 'SKIPPED_STATUS_UNREACHABLE' -Detail 'The read-only payments Edge status GET was unreachable. No Razorpay provider request was sent.'
    return
  }

  $script:RazorpayKeyModeReported = [string]$initial.keyMode
  if ($script:RazorpayKeyModeReported -eq 'live') {
    Write-Check -Name 'Razorpay test capture + Edge refund' -Status 'BLOCKED_LIVE_MODE' -Detail 'The server reports keyMode=live. Live capture/refund is prohibited; no payment action was sent.'
    return
  }
  if ($script:RazorpayKeyModeReported -ne 'test' -or -not $initial.configured) {
    Write-Check -Name 'Razorpay test capture + Edge refund' -Status 'SKIPPED_UNPROVEN_MODE' -Detail 'The server did not prove configured rzp_test_ credentials through keyMode=test. No payment action was sent.'
    return
  }
  if (-not $AllowRazorpayTestCapture) {
    Write-Check -Name 'Razorpay test capture + Edge refund' -Status 'SKIPPED_NOT_OPTED_IN' -Detail 'Test mode was proven but -AllowRazorpayTestCapture was not supplied. No payment action was sent.'
    return
  }

  $script:RazorpayQaRun = 'NEXORA-E2E-' + [guid]::NewGuid().ToString('N')
  $script:State.razorpayQaRun = $script:RazorpayQaRun
  $script:State.razorpayOrderId = ''
  $script:State.razorpayOrderAttempted = $false
  Save-State

  # Mandatory immediate pre-order recheck; Edge independently re-checks before provider POST.
  try { $second = Get-RazorpayEdgeStatus }
  catch {
    Write-Check -Name 'Razorpay test capture + Edge refund' -Status 'ABORTED_MODE_CHANGED' -Detail 'The second read-only mode check was unreachable immediately before order creation. No order was requested.'
    return
  }
  $script:RazorpayKeyModeReported = [string]$second.keyMode
  if ($script:RazorpayKeyModeReported -ne 'test' -or -not $second.configured) {
    Write-Check -Name 'Razorpay test capture + Edge refund' -Status 'ABORTED_MODE_CHANGED' -Detail 'The second mode check did not prove configured keyMode=test. Aborted before order creation.'
    return
  }

  try {
    # Save this marker before the POST so a dropped response is recovered
    # by querying Razorpay with the unique receipt in the mandatory finally.
    $script:State.razorpayOrderAttempted = $true
    Save-State
    $created = Invoke-RazorpayEdgeQA -Action 'nexoraE2eCreateTestOrder' -Body @{ qaRun = $script:RazorpayQaRun }
    if ([string]$created.keyId -notmatch '^rzp_test_' -or [string]::IsNullOrWhiteSpace([string]$created.orderId) -or [int]$created.amount -ne 100) {
      throw 'The server did not return the expected test-only ₹1 QA order.'
    }
    $script:RazorpayOrderId = [string]$created.orderId
    $script:State.razorpayOrderId = $script:RazorpayOrderId
    $script:RazorpayCheckoutKey = [string]$created.keyId
    Save-State

    $checkout = Start-RazorpayTestCheckout -KeyId $script:RazorpayCheckoutKey -OrderId $script:RazorpayOrderId
    $script:RazorpayPaymentId = [string]$checkout.razorpay_payment_id
    $script:RazorpayCheckoutSignature = [string]$checkout.razorpay_signature
    $verified = Invoke-RazorpayEdgeQA -Action 'nexoraE2eVerifyTestPayment' -Body @{
      qaRun = $script:RazorpayQaRun
      orderId = $script:RazorpayOrderId
      paymentId = $script:RazorpayPaymentId
      signature = $script:RazorpayCheckoutSignature
    }
    if (-not $verified.verified) { throw 'The Edge Function did not verify the Checkout signature.' }

    if ([string]$verified.paymentStatus -eq 'authorized') {
      $captured = Invoke-RazorpayEdgeQA -Action 'nexoraE2eCaptureTestPayment' -Body @{
        qaRun = $script:RazorpayQaRun
        orderId = $script:RazorpayOrderId
        paymentId = $script:RazorpayPaymentId
      }
      if (-not $captured.captured) { throw 'The Edge Function did not confirm test payment capture.' }
    } elseif ([string]$verified.paymentStatus -ne 'captured') {
      throw 'Razorpay test payment was neither authorized nor captured.'
    }

    $refunded = Invoke-RazorpayEdgeQA -Action 'nexoraE2eRefundTestPayment' -Body @{
      qaRun = $script:RazorpayQaRun
      orderId = $script:RazorpayOrderId
      paymentId = $script:RazorpayPaymentId
    }
    if (-not $refunded.refunded -or [string]$refunded.refundStatus -notin @('processed','pending')) {
      throw 'The Edge Function did not confirm a sandbox refund.'
    }
    $script:RazorpayRefundStatus = [string]$refunded.refundStatus
    Write-Check -Name 'Razorpay test capture + Edge refund' -Status 'EXECUTED_TEST_MODE' -Detail ('The server twice confirmed keyMode=test; the ₹1 sandbox payment was verified, captured/confirmed and refunded through studioflow-payments. Refund state: ' + $script:RazorpayRefundStatus + '. Provider order is QA-tagged.')
  } catch {
    Write-Check -Name 'Razorpay test capture + Edge refund' -Status 'FAIL' -Detail 'The Razorpay sandbox sequence failed. The finally block will run Edge cleanup for the QA marker; QA routes independently refuse any non-test key mode.'
  }
}

function Import-DotEnvFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return }
  foreach ($line in (Get-Content -LiteralPath $Path)) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
      $name = $Matches[1]
      $value = $Matches[2]
      if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name, 'Process'))) {
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
          $value = $value.Substring(1, [Math]::Max(0, $value.Length - 2))
        }
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
      }
    }
  }
}

function Get-FirstEnv {
  param([string[]]$Names)
  foreach ($name in $Names) {
    $value = [Environment]::GetEnvironmentVariable($name, 'Process')
    if (-not [string]::IsNullOrWhiteSpace($value)) { return $value.Trim() }
  }
  return $null
}

function ConvertTo-JsonBody {
  param($Value)
  return (ConvertTo-Json -InputObject $Value -Depth 30 -Compress)
}

function Get-HttpErrorInfo {
  param($ErrorRecord)
  $status = $null
  $body = $null
  try {
    $response = $ErrorRecord.Exception.Response
    if ($null -ne $response) {
      try { $status = [int]$response.StatusCode } catch { }
      try {
        $stream = $response.GetResponseStream()
        if ($null -ne $stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $body = $reader.ReadToEnd()
          $reader.Dispose()
        }
      } catch { }
    }
  } catch { }
  return [pscustomobject]@{ status = $status; body = (Protect-E2EText -Text ([string]$body)) }
}

function Invoke-JsonHttp {
  param(
    [Parameter(Mandatory=$true)][ValidateSet('GET','POST','PATCH','PUT','DELETE')][string]$Method,
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter(Mandatory=$true)][string]$ApiKey,
    [string]$BearerToken,
    $Body,
    [string]$Prefer
  )
  $headers = @{ apikey = $ApiKey }
  if (-not [string]::IsNullOrWhiteSpace($BearerToken)) {
    $headers['Authorization'] = 'Bearer ' + $BearerToken
  }
  if (-not [string]::IsNullOrWhiteSpace($Prefer)) { $headers['Prefer'] = $Prefer }
  $params = @{
    Method = $Method
    Uri = $Url
    Headers = $headers
    TimeoutSec = 45
    ErrorAction = 'Stop'
  }
  if ($null -ne $Body) {
    $params['ContentType'] = 'application/json'
    $params['Body'] = ConvertTo-JsonBody $Body
  }
  return Invoke-RestMethod @params
}

function Invoke-SupabaseRest {
  param(
    [Parameter(Mandatory=$true)][ValidateSet('GET','POST','PATCH','PUT','DELETE')][string]$Method,
    [Parameter(Mandatory=$true)][string]$Path,
    [ValidateSet('SERVICE','PUBLIC')][string]$KeyKind = 'SERVICE',
    [string]$BearerToken,
    $Body,
    [string]$Prefer
  )
  $key = if ($KeyKind -eq 'SERVICE') { $script:ServiceRoleKey } else { $script:PublishableKey }
  return Invoke-JsonHttp -Method $Method -Url ($script:SupabaseUrl + '/' + $Path.TrimStart('/')) -ApiKey $key -BearerToken $BearerToken -Body $Body -Prefer $Prefer
}

function Invoke-SupabaseAdmin {
  param(
    [Parameter(Mandatory=$true)][ValidateSet('GET','POST','PUT','DELETE')][string]$Method,
    [Parameter(Mandatory=$true)][string]$Path,
    $Body
  )
  return Invoke-JsonHttp -Method $Method -Url ($script:SupabaseUrl + '/' + $Path.TrimStart('/')) -ApiKey $script:ServiceRoleKey -BearerToken $script:ServiceRoleKey -Body $Body
}

function Get-ExactRestCount {
  param([Parameter(Mandatory=$true)][string]$Path)
  $headers = @{
    apikey = $script:ServiceRoleKey
    Authorization = 'Bearer ' + $script:ServiceRoleKey
    Prefer = 'count=exact'
  }
  $url = $script:SupabaseUrl + '/rest/v1/' + $Path.TrimStart('/')
  $response = Invoke-WebRequest -UseBasicParsing -Method GET -Uri $url -Headers $headers -TimeoutSec 45 -ErrorAction Stop
  $range = $response.Headers['Content-Range']
  if ([string]::IsNullOrWhiteSpace([string]$range) -or $range -notmatch '/(\d+|\*)$') {
    throw "Could not read exact row count for $Path (Content-Range missing)."
  }
  if ($Matches[1] -eq '*') { throw "Server did not return an exact count for $Path." }
  return [int64]$Matches[1]
}

function Get-RestRows {
  param([Parameter(Mandatory=$true)][string]$Path)
  $result = Invoke-SupabaseRest -Method GET -Path $Path -KeyKind SERVICE
  return @($result)
}

function Save-State {
  if ($null -eq $script:State -or [string]::IsNullOrWhiteSpace($script:StatePath)) { return }
  $json = ConvertTo-Json -InputObject $script:State -Depth 10
  Set-Content -LiteralPath $script:StatePath -Value $json -Encoding UTF8
}

function Find-AuthUserIdByEmail {
  param([string]$Email)
  if ([string]::IsNullOrWhiteSpace($Email)) { return $null }
  for ($page = 1; $page -le 10; $page++) {
    $usersResponse = Invoke-SupabaseAdmin -Method GET -Path ("auth/v1/admin/users?page={0}&per_page=1000" -f $page)
    $users = @()
    $usersProperty = $usersResponse.PSObject.Properties['users']
    if ($null -ne $usersProperty) { $users = @($usersProperty.Value) }
    elseif ($usersResponse -is [System.Array]) { $users = @($usersResponse) }
    $match = $users | Where-Object { $_.email -eq $Email } | Select-Object -First 1
    if ($null -ne $match) { return [string]$match.id }
    if ($users.Count -lt 1000) { break }
  }
  return $null
}

function Remove-ByPath {
  param([string]$Path, [string]$Description)
  try {
    Invoke-SupabaseRest -Method DELETE -Path $Path -KeyKind SERVICE -Prefer 'return=minimal' | Out-Null
  } catch {
    $info = Get-HttpErrorInfo $_
    $detail = if ($info.status) { "HTTP $($info.status)" } else { $_.Exception.Message }
    $script:CleanupErrors.Add("$Description delete failed: $detail")
  }
}

function Invoke-CleanupState {
  param([switch]$RecoveryRun)
  if ($null -eq $script:State) { return $true }
  if ([string]::IsNullOrWhiteSpace($script:ServiceRoleKey) -or [string]::IsNullOrWhiteSpace($script:SupabaseUrl)) {
    $script:CleanupErrors.Add('Cleanup needs the configured preview URL and preview service-role key.')
    return $false
  }

  $tag = [string]$script:State.marker
  $owner = [string]$script:State.ownerId
  $branch = [string]$script:State.branchId
  $email = [string]$script:State.email
  $userId = [string]$script:State.userId

  # Delete inventory by its unique SKU and name, covering an insert whose HTTP
  # response was lost before the caller received the generated row ID.
  if ($tag) {
    if ($owner -and $branch) {
      Remove-ByPath -Path ("rest/v1/studioflow_branch_inventory?site_id=eq.{0}&branch_id=eq.{1}&sku=eq.{2}" -f $owner,$branch,$tag) -Description 'test inventory (SKU)'
      Remove-ByPath -Path ("rest/v1/studioflow_branch_inventory?site_id=eq.{0}&branch_id=eq.{1}&name=eq.{2}" -f $owner,$branch,$tag) -Description 'test inventory (name)'
      Remove-ByPath -Path ("rest/v1/studioflow_branch_inventory?site_id=eq.{0}&sku=eq.{1}-xbranch" -f $owner,$tag) -Description 'cross-branch probe inventory (SKU)'
      Remove-ByPath -Path ("rest/v1/studioflow_branch_inventory?site_id=eq.{0}&name=eq.{1}-XBRANCH" -f $owner,$tag) -Description 'cross-branch probe inventory (name)'
    }
    Remove-ByPath -Path ("rest/v1/studioflow_staff_invites?staff_id=eq.{0}" -f $tag) -Description 'test staff invite'
    Remove-ByPath -Path ("rest/v1/studioflow_staff_members?staff_id=eq.{0}" -f $tag) -Description 'test staff member (tag)'
  }

  # Resolve the Auth ID by exact unique email if an Auth create succeeded but
  # the network response failed before the ID could be saved in the manifest.
  if (-not $userId -and $email) {
    try { $userId = Find-AuthUserIdByEmail -Email $email } catch {
      $script:CleanupErrors.Add('Could not resolve the temporary Auth user for cleanup: ' + $_.Exception.Message)
    }
  }

  if ($userId) {
    Remove-ByPath -Path ("rest/v1/studioflow_branch_staff_members?user_id=eq.{0}" -f $userId) -Description 'legacy branch staff membership'
    Remove-ByPath -Path ("rest/v1/studioflow_staff_members?user_id=eq.{0}" -f $userId) -Description 'staff membership'
    try {
      Invoke-SupabaseAdmin -Method DELETE -Path ("auth/v1/admin/users/{0}" -f $userId) | Out-Null
    } catch {
      $info = Get-HttpErrorInfo $_
      if ($info.status -ne 404) {
        $detail = if ($info.status) { "HTTP $($info.status)" } else { $_.Exception.Message }
        $script:CleanupErrors.Add("temporary Auth user delete failed: $detail")
      }
    }
  }

  # Refund/flag every provider order for this QA run. Razorpay does not support
  # deleting orders; the Edge cleanup action searches notes.qa + notes.qa_run,
  # refunds any authorised/captured sandbox payment, and reports the order flag.
  if ($script:State.razorpayQaRun -and $script:State.razorpayOrderAttempted -eq $true) {
    try {
      $cleanupBody = @{ qaRun = [string]$script:State.razorpayQaRun }
      if (-not [string]::IsNullOrWhiteSpace([string]$script:State.razorpayOrderId)) {
        $cleanupBody.orderId = [string]$script:State.razorpayOrderId
      }
      $providerCleanup = Invoke-RazorpayEdgeQA -Action 'nexoraE2eCleanupTestOrder' -Body $cleanupBody
      if (-not $providerCleanup.cleanupComplete) {
        $script:CleanupErrors.Add('Razorpay sandbox order cleanup was not confirmed by the Edge Function.')
      } elseif ([int]$providerCleanup.providerOrderCount -gt 0) {
        Write-Host 'Provider-side Razorpay sandbox order remains flagged as NEXORA-E2E; captured/authorized test payments are refunded.' -ForegroundColor Yellow
      }
    } catch {
      $script:CleanupErrors.Add('Razorpay QA cleanup could not be confirmed; no live-mode provider operation was attempted.')
    }
  }

  # Verify each expected test object is absent. Keep the manifest if any read
  # fails or any record remains; a subsequent invocation will retry cleanup.
  try {
    if ($tag -and $owner -and $branch) {
      $leftInvSku = Get-RestRows -Path ("rest/v1/studioflow_branch_inventory?select=id&site_id=eq.{0}&sku=eq.{1}" -f $owner,$tag)
      $leftInvName = Get-RestRows -Path ("rest/v1/studioflow_branch_inventory?select=id&site_id=eq.{0}&name=eq.{1}" -f $owner,$tag)
      $leftCrossBranch = Get-RestRows -Path ("rest/v1/studioflow_branch_inventory?select=id&site_id=eq.{0}&sku=eq.{1}-xbranch" -f $owner,$tag)
      if (($leftInvSku.Count + $leftInvName.Count + $leftCrossBranch.Count) -gt 0) { $script:CleanupErrors.Add('Test inventory row or cross-branch probe still exists after cleanup.') }
    }
    if ($tag) {
      $leftStaffTag = Get-RestRows -Path ("rest/v1/studioflow_staff_members?select=id&staff_id=eq.{0}" -f $tag)
      $leftInvites = Get-RestRows -Path ("rest/v1/studioflow_staff_invites?select=id&staff_id=eq.{0}" -f $tag)
      if ($leftStaffTag.Count -gt 0) { $script:CleanupErrors.Add('Test staff membership still exists after cleanup.') }
      if ($leftInvites.Count -gt 0) { $script:CleanupErrors.Add('Test staff invite still exists after cleanup.') }
    }
    if ($userId) {
      $leftLegacy = Get-RestRows -Path ("rest/v1/studioflow_branch_staff_members?select=id&user_id=eq.{0}" -f $userId)
      $leftMembers = Get-RestRows -Path ("rest/v1/studioflow_staff_members?select=id&user_id=eq.{0}" -f $userId)
      if ($leftLegacy.Count -gt 0) { $script:CleanupErrors.Add('Legacy branch membership still exists after cleanup.') }
      if ($leftMembers.Count -gt 0) { $script:CleanupErrors.Add('Staff membership still exists after cleanup.') }
      try {
        $null = Invoke-SupabaseAdmin -Method GET -Path ("auth/v1/admin/users/{0}" -f $userId)
        $script:CleanupErrors.Add('Temporary Auth user still exists after cleanup.')
      } catch {
        $info = Get-HttpErrorInfo $_
        if ($info.status -ne 404) {
          $detail = if ($info.status) { "HTTP $($info.status)" } else { $_.Exception.Message }
          $script:CleanupErrors.Add("Could not prove temporary Auth user deletion: $detail")
        }
      }
    } elseif ($email) {
      $found = Find-AuthUserIdByEmail -Email $email
      if ($found) { $script:CleanupErrors.Add('Temporary Auth user still exists after cleanup.') }
    }
  } catch {
    $script:CleanupErrors.Add('Cleanup verification failed: ' + $_.Exception.Message)
  }

  if ($script:CleanupErrors.Count -eq 0) {
    if (Test-Path -LiteralPath $script:StatePath) { Remove-Item -LiteralPath $script:StatePath -Force -ErrorAction SilentlyContinue }
    $script:State = $null
    return $true
  }
  return $false
}

function Get-BaselineSnapshot {
  $snapshot = [ordered]@{}
  $snapshot.bookings = Get-ExactRestCount 'studioflow_bookings?select=id'
  $snapshot.services = Get-ExactRestCount 'studioflow_services?select=service_id'
  $snapshot.branches = Get-ExactRestCount 'branches?select=id'
  $snapshot.paymentOrders = Get-ExactRestCount 'studioflow_payment_orders?select=booking_id'
  $snapshot.createdPaymentOrders = Get-ExactRestCount 'studioflow_payment_orders?select=booking_id&status=eq.created'
  $snapshot.nonCreatedPaymentOrders = Get-ExactRestCount 'studioflow_payment_orders?select=booking_id&status=neq.created'
  $snapshot.capturedPaymentIds = Get-ExactRestCount 'studioflow_payment_orders?select=booking_id&payment_id=not.is.null'
  return $snapshot
}

function Test-BaselineSnapshot {
  param($Snapshot)
  return (
    $Snapshot.bookings -eq 14 -and
    $Snapshot.services -eq 137 -and
    $Snapshot.branches -eq 21 -and
    $Snapshot.paymentOrders -eq 13 -and
    $Snapshot.createdPaymentOrders -eq 13 -and
    $Snapshot.nonCreatedPaymentOrders -eq 0 -and
    $Snapshot.capturedPaymentIds -eq 0
  )
}

function Test-BranchOwnerPair {
  $accountRows = Get-RestRows -Path ("rest/v1/studioflow_accounts?select=user_id&user_id=eq.{0}" -f $script:OwnerId)
  if ($accountRows.Count -ne 1) { throw 'NEXORA_E2E_OWNER_ID does not match one existing studioflow_accounts row.' }
  $branchRows = Get-RestRows -Path ("rest/v1/branches?select=id,site_id,is_active&id=eq.{0}&site_id=eq.{1}&is_active=eq.true" -f $script:BranchId,$script:OwnerId)
  if ($branchRows.Count -ne 1) { throw 'NEXORA_E2E_BRANCH_ID is not one active branch belonging to NEXORA_E2E_OWNER_ID.' }
}

# Locate project root and import local dotenv values silently.
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot '..\package.json')) {
  $script:ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}
if (-not $SkipEnvFiles) {
  Import-DotEnvFile -Path (Join-Path $script:ProjectRoot '.env')
  Import-DotEnvFile -Path (Join-Path $script:ProjectRoot '.env.local')
}

$script:PreviewProjectRef = Get-FirstEnv @('NEXORA_E2E_PREVIEW_PROJECT_REF')
$script:SupabaseUrl = Get-FirstEnv @('NEXORA_E2E_SUPABASE_URL')
if ($script:SupabaseUrl) { $script:SupabaseUrl = $script:SupabaseUrl.TrimEnd('/') }
$script:PublishableKey = Get-FirstEnv @('NEXORA_E2E_SUPABASE_PUBLISHABLE_KEY')
$script:ServiceRoleKey = Get-FirstEnv @('NEXORA_E2E_SUPABASE_SERVICE_ROLE_KEY')
$script:OwnerId = Get-FirstEnv @('NEXORA_E2E_OWNER_ID')
$script:BranchId = Get-FirstEnv @('NEXORA_E2E_BRANCH_ID')

$missing = New-Object System.Collections.Generic.List[string]
if (-not $script:PreviewProjectRef) { $missing.Add('NEXORA_E2E_PREVIEW_PROJECT_REF') }
if (-not $script:SupabaseUrl) { $missing.Add('NEXORA_E2E_SUPABASE_URL') }
if (-not $script:PublishableKey) { $missing.Add('NEXORA_E2E_SUPABASE_PUBLISHABLE_KEY') }
if (-not $script:ServiceRoleKey) { $missing.Add('NEXORA_E2E_SUPABASE_SERVICE_ROLE_KEY') }
if (-not $script:OwnerId) { $missing.Add('NEXORA_E2E_OWNER_ID') }
if (-not $script:BranchId) { $missing.Add('NEXORA_E2E_BRANCH_ID') }

if ($missing.Count -gt 0) {
  $why = 'Missing required environment: ' + ($missing -join ', ')
  Write-Check -Name 'HTTP Supabase Auth staff sign-in' -Status 'BLOCKED' -Detail $why
  Write-Check -Name 'Authenticated branch inventory write/read' -Status 'BLOCKED' -Detail $why
  Write-Check -Name 'Razorpay test capture + Edge refund' -Status 'SKIPPED_STATUS_UNREACHABLE' -Detail 'The isolated preview environment is not configured, so the Edge status endpoint cannot be queried. No payment request was sent.'
  Write-Check -Name 'Cleanup' -Status 'PASS' -Detail 'No test artifacts were created because required configuration was missing.'
  Write-E2EReport
  $global:LASTEXITCODE = 2
  return
}

if ($script:OwnerId -notmatch '^[0-9a-fA-F-]{36}$' -or $script:BranchId -notmatch '^[0-9a-fA-F-]{36}$') {
  throw 'NEXORA_E2E_OWNER_ID and NEXORA_E2E_BRANCH_ID must be UUIDs.'
}
try {
  $supabaseUri = [uri]$script:SupabaseUrl
  $expectedHost = ([string]$script:PreviewProjectRef).Trim().ToLowerInvariant() + '.supabase.co'
  if ($supabaseUri.Scheme -ne 'https' -or $supabaseUri.Host -ne $expectedHost -or $script:PreviewProjectRef -eq 'zilwgiuiygqqardzutxi') {
    throw 'Only an isolated, non-production Supabase preview project is permitted. The production project zilwgiuiygqqardzutxi is explicitly blocked. No tests were run.'
  }
} catch {
  Write-Check -Name 'Supabase project safety guard' -Status 'BLOCKED' -Detail $_.Exception.Message
  $global:LASTEXITCODE = 2
  return
}

$script:StatePath = Join-Path ([System.IO.Path]::GetTempPath()) 'nexora-salon-e2e-state.json'

# Recover an interrupted prior run before taking the new baseline.
if (Test-Path -LiteralPath $script:StatePath) {
  try {
    $script:State = Get-Content -LiteralPath $script:StatePath -Raw | ConvertFrom-Json
    if ([string]$script:State.supabaseProjectRef -ne [string]$script:PreviewProjectRef) {
      Write-Check -Name 'Prior-run cleanup recovery' -Status 'BLOCKED' -Detail 'A recovery manifest belongs to a different Supabase project. Refusing to run cleanup against the currently selected preview. Preserve the manifest and restore its original preview settings.'
      $global:LASTEXITCODE = 3
      return
    }
    $script:CleanupErrors.Clear()
    $recovered = Invoke-CleanupState -RecoveryRun
    if (-not $recovered) {
      Write-Check -Name 'Prior-run cleanup recovery' -Status 'FAIL' -Detail ('Recovery manifest remains at ' + $script:StatePath + '; ' + ($script:CleanupErrors -join '; '))
      $global:LASTEXITCODE = 3
      return
    }
    Write-Check -Name 'Prior-run cleanup recovery' -Status 'PASS' -Detail 'Recovered and removed temporary artifacts from the prior interrupted run.'
  } catch {
    Write-Check -Name 'Prior-run cleanup recovery' -Status 'FAIL' -Detail $_.Exception.Message
    $global:LASTEXITCODE = 3
    return
  }
}

$baselineBefore = $null
$testRunStarted = $false
$staffPassword = $null
$staffAccessToken = $null

try {
  $script:Stage = 'baseline'
  $baselineBefore = Get-BaselineSnapshot
  if (-not (Test-BaselineSnapshot -Snapshot $baselineBefore)) {
    Write-Check -Name 'Pre-test baseline' -Status 'BLOCKED' -Detail ('Expected bookings=14, services=137, branches=21, paymentOrders=13 (all created); actual=' + (ConvertTo-Json $baselineBefore -Compress))
    throw 'Baseline does not match the required live counts. No test records were created.'
  }
  Write-Check -Name 'Pre-test baseline' -Status 'PASS' -Detail 'Bookings 14; services 137; branches 21; payment orders 13 (all created).'

  $script:Stage = 'fixture'
  Test-BranchOwnerPair
  Write-Check -Name 'Owner/branch fixture' -Status 'PASS' -Detail 'The supplied owner exists and the supplied branch is active and belongs to that owner.'

  $script:Marker = 'nexora-e2e-' + ([guid]::NewGuid().ToString('N'))
  $script:StaffEmail = $script:Marker + '@example.invalid'
  $script:InventorySku = $script:Marker
  $script:State = [ordered]@{
    marker = $script:Marker
    email = $script:StaffEmail
    userId = ''
    razorpayQaRun = ''
    razorpayOrderId = ''
    razorpayOrderAttempted = $false
    supabaseProjectRef = $script:PreviewProjectRef
    ownerId = $script:OwnerId
    branchId = $script:BranchId
    createdAt = (Get-Date).ToString('o')
  }
  Save-State
  $testRunStarted = $true

  # Create an ephemeral staff identity via Supabase Auth Admin API.
  $script:Stage = 'authSetup'
  $staffPassword = 'NxE2E!' + [guid]::NewGuid().ToString('N') + 'Aa9#'
  $script:StaffPassword = $staffPassword
  $createdUser = Invoke-SupabaseAdmin -Method POST -Path 'auth/v1/admin/users' -Body @{
    email = $script:StaffEmail
    password = $staffPassword
    email_confirm = $true
    user_metadata = @{ nexora_e2e_marker = $script:Marker; display_name = 'NEXORA E2E Temporary Staff' }
  }
  if (-not $createdUser.id) { throw 'Supabase Auth Admin did not return the temporary staff user ID.' }
  $script:StaffUserId = [string]$createdUser.id
  $script:State.userId = $script:StaffUserId
  Save-State

  # The inventory policies currently require the modern staff membership and
  # the legacy branch inventory membership; create both with service role.
  Invoke-SupabaseRest -Method POST -Path 'rest/v1/studioflow_staff_members' -KeyKind SERVICE -Prefer 'return=representation' -Body @{
    owner_id = $script:OwnerId
    user_id = $script:StaffUserId
    staff_id = $script:Marker
    role = 'Manager (Full Access)'
    branch_ids = @([string]$script:BranchId)
    is_active = $true
    all_branches = $false
  } | Out-Null

  Invoke-SupabaseRest -Method POST -Path 'rest/v1/studioflow_branch_staff_members' -KeyKind SERVICE -Prefer 'return=representation' -Body @{
    site_id = $script:OwnerId
    branch_id = $script:BranchId
    user_id = $script:StaffUserId
    role = 'manager'
    can_manage_inventory = $true
    is_active = $true
  } | Out-Null

  # Real HTTP password grant: this is a real Auth token, not a SQL/JWT simulation.
  $script:Stage = 'httpAuth'
  $authResponse = Invoke-JsonHttp -Method POST -Url ($script:SupabaseUrl + '/auth/v1/token?grant_type=password') -ApiKey $script:PublishableKey -Body @{
    email = $script:StaffEmail
    password = $staffPassword
  }
  if (-not $authResponse.access_token -or [string]$authResponse.user.id -ne $script:StaffUserId) {
    throw 'HTTP password sign-in did not return the expected staff user and access token.'
  }
  $staffAccessToken = [string]$authResponse.access_token
  $script:StaffAccessToken = $staffAccessToken

  $context = Invoke-SupabaseRest -Method POST -Path 'rest/v1/rpc/studioflow_my_staff_context' -KeyKind PUBLIC -BearerToken $staffAccessToken -Body @{}
  $contextOwner = [string]$context.ownerId
  $contextBranches = @($context.branchIds | ForEach-Object { [string]$_ })
  if ($contextOwner -ne $script:OwnerId -or $contextBranches -notcontains $script:BranchId -or $context.role -ne 'Manager (Full Access)') {
    throw 'HTTP Auth succeeded, but the staff context did not return the expected Manager role and assigned branch.'
  }
  Write-Check -Name 'HTTP Supabase Auth staff sign-in' -Status 'PASS' -Detail 'Real password-grant sign-in returned the temporary staff user; studioflow_my_staff_context confirmed Manager role and the assigned branch.'

  # Exercise PostgREST with the staff JWT. The service-role key is not used here.
  $script:Stage = 'inventory'
  $inventoryPayload = @{
    site_id = $script:OwnerId
    branch_id = $script:BranchId
    name = $script:Marker
    sku = $script:InventorySku
    quantity = 7.25
    unit = 'unit'
    reorder_level = 2
    is_active = $true
  }
  $insertedInventory = @(Invoke-SupabaseRest -Method POST -Path 'rest/v1/studioflow_branch_inventory?select=id,name,sku,quantity,site_id,branch_id' -KeyKind PUBLIC -BearerToken $staffAccessToken -Prefer 'return=representation' -Body $inventoryPayload)
  if ($insertedInventory.Count -ne 1 -or -not $insertedInventory[0].id) {
    throw 'Authenticated inventory insert did not return exactly one inserted row.'
  }
  $script:InventoryId = [string]$insertedInventory[0].id
  $readBack = @(Invoke-SupabaseRest -Method GET -Path ("rest/v1/studioflow_branch_inventory?select=id,name,sku,quantity,site_id,branch_id&id=eq.{0}&site_id=eq.{1}&branch_id=eq.{2}" -f $script:InventoryId,$script:OwnerId,$script:BranchId) -KeyKind PUBLIC -BearerToken $staffAccessToken)
  if ($readBack.Count -ne 1 -or $readBack[0].name -ne $script:Marker -or [decimal]$readBack[0].quantity -ne [decimal]7.25) {
    throw 'Authenticated inventory read-back did not match the inserted row.'
  }
  Write-Check -Name 'Authenticated branch inventory write/read-back' -Status 'PASS' -Detail 'The staff JWT inserted one branch inventory row through PostgREST RLS and read back the exact row and quantity.'

  # Probe a second active branch, if this salon has one. The temporary Manager
  # was granted only the selected branch; a cross-branch write must be denied.
  $otherBranches = Get-RestRows -Path ("rest/v1/branches?select=id&site_id=eq.{0}&is_active=eq.true&id=neq.{1}&limit=1" -f $script:OwnerId,$script:BranchId)
  if ($otherBranches.Count -eq 0) {
    Write-Check -Name 'Cross-branch inventory isolation' -Status 'SKIPPED' -Detail 'This salon has no second active branch to use for a negative-access probe.'
  } else {
    $otherBranchId = [string]$otherBranches[0].id
    $crossPayload = @{
      site_id = $script:OwnerId
      branch_id = $otherBranchId
      name = $script:Marker + '-XBRANCH'
      sku = $script:Marker + '-xbranch'
      quantity = 1
      unit = 'unit'
      reorder_level = 0
      is_active = $true
    }
    try {
      $crossResult = @(Invoke-SupabaseRest -Method POST -Path 'rest/v1/studioflow_branch_inventory?select=id,sku' -KeyKind PUBLIC -BearerToken $staffAccessToken -Prefer 'return=representation' -Body $crossPayload)
      $crossPersisted = Get-RestRows -Path ("rest/v1/studioflow_branch_inventory?select=id&site_id=eq.{0}&sku=eq.{1}-xbranch" -f $script:OwnerId,$script:Marker)
      if ($crossPersisted.Count -gt 0 -or $crossResult.Count -gt 0) {
        Write-Check -Name 'Cross-branch inventory isolation' -Status 'FAIL' -Detail 'The staff JWT was able to write to an unassigned active branch. Cleanup will remove the probe row.'
      } else {
        Write-Check -Name 'Cross-branch inventory isolation' -Status 'FAIL' -Detail 'The unassigned-branch write returned without an explicit RLS denial; access control could not be proven.'
      }
    } catch {
      $denyInfo = Get-HttpErrorInfo $_
      if ($denyInfo.status -in @(401,403) -or [string]$denyInfo.body -match '42501|row-level security|permission denied') {
        Write-Check -Name 'Cross-branch inventory isolation' -Status 'PASS' -Detail 'The staff JWT was denied when attempting to write to a different active branch.'
      } else {
        Write-Check -Name 'Cross-branch inventory isolation' -Status 'FAIL' -Detail ('The cross-branch request failed for a reason other than a verified RLS denial: ' + $_.Exception.Message)
      }
    }
  }

  Invoke-RazorpayTestE2E

} catch {
  $failure = $_.Exception.Message
  if (-not $script:Results.Contains('HTTP Supabase Auth staff sign-in')) {
    $authStatus = if ($script:Stage -in @('baseline','fixture','initial','authSetup')) { 'BLOCKED' } else { 'FAIL' }
    Write-Check -Name 'HTTP Supabase Auth staff sign-in' -Status $authStatus -Detail $failure
  }
  if (-not $script:Results.Contains('Authenticated branch inventory write/read-back')) {
    $inventoryStatus = if ($script:Stage -eq 'inventory') { 'FAIL' } else { 'BLOCKED' }
    Write-Check -Name 'Authenticated branch inventory write/read-back' -Status $inventoryStatus -Detail ('Not completed: ' + $failure)
  }
  if (-not $script:Results.Contains('Razorpay test capture + Edge refund')) {
    if ($AllowRazorpayTestCapture) {
      Write-Check -Name 'Razorpay test capture + Edge refund' -Status 'SKIPPED_UNPROVEN_MODE' -Detail 'A preceding Auth or inventory prerequisite failed. Razorpay mode was not probed and no provider request was made.'
    } else {
      Write-Check -Name 'Razorpay test capture + Edge refund' -Status 'SKIPPED_NOT_OPTED_IN' -Detail 'A preceding Auth or inventory prerequisite failed and -AllowRazorpayTestCapture was not supplied. No provider request was made.'
    }
  }
    Write-Host ('E2E execution error: ' + (Protect-E2EText -Text $failure)) -ForegroundColor Red
} finally {
  # The cleanup manifest is persisted before the first test user is created.
  # This finally block runs for ordinary PowerShell exceptions/early exits.
  $script:CleanupErrors.Clear()
  $cleanupOk = $true
  $hadTestState = ($null -ne $script:State)
  if ($hadTestState) {
    try {
      $cleanupOk = Invoke-CleanupState
    } catch {
      $script:CleanupErrors.Add('Unexpected cleanup exception: ' + $_.Exception.Message)
      $cleanupOk = $false
    }
  }
  if ($cleanupOk) {
    $cleanupDetail = if (-not $hadTestState) { 'No temporary resources were created; nothing required deletion.' } else { 'Temporary inventory row, both staff memberships, temporary Auth user, and any attempted Razorpay QA order cleanup were verified.' }
    Write-Check -Name 'Automatic cleanup' -Status 'PASS' -Detail $cleanupDetail
  } else {
    Write-Check -Name 'Automatic cleanup' -Status 'FAIL' -Detail (($script:CleanupErrors -join '; ') + '. Recovery manifest retained at ' + $script:StatePath)
  }

  # Verify the isolated preview baseline is exactly unchanged after cleanup.
  try {
    $baselineAfter = Get-BaselineSnapshot
    $baselineOk = Test-BaselineSnapshot -Snapshot $baselineAfter
    if ($baselineOk) {
      Write-Check -Name 'Post-cleanup baseline counts' -Status 'PASS' -Detail 'Bookings 14; services 137; branches 21; payment orders 13 (all created); zero non-created orders.'
    } else {
      Write-Check -Name 'Post-cleanup baseline counts' -Status 'FAIL' -Detail ('Expected bookings=14, services=137, branches=21, paymentOrders=13 (all created); actual=' + (ConvertTo-Json $baselineAfter -Compress))
    }
  } catch {
    $baselineAfter = $null
    $baselineOk = $false
    Write-Check -Name 'Post-cleanup baseline counts' -Status 'FAIL' -Detail ('Could not verify counts: ' + $_.Exception.Message)
  }

  # Marker-specific zero-leftover check across every table this script can touch.
  try {
    if ($script:Marker) {
      $qaStaff = Get-RestRows -Path ("rest/v1/studioflow_staff_members?select=id&staff_id=eq.{0}" -f $script:Marker)
      $qaInvites = Get-RestRows -Path ("rest/v1/studioflow_staff_invites?select=id&staff_id=eq.{0}" -f $script:Marker)
      $qaInventory = Get-RestRows -Path ("rest/v1/studioflow_branch_inventory?select=id&sku=eq.{0}" -f $script:Marker)
      $qaCrossInventory = Get-RestRows -Path ("rest/v1/studioflow_branch_inventory?select=id&sku=eq.{0}-xbranch" -f $script:Marker)
      $qaLegacy = @()
      if ($script:StaffUserId) { $qaLegacy = Get-RestRows -Path ("rest/v1/studioflow_branch_staff_members?select=id&user_id=eq.{0}" -f $script:StaffUserId) }
      $qaAuth = $null
      if ($script:StaffEmail) { $qaAuth = Find-AuthUserIdByEmail -Email $script:StaffEmail }
      $allZero = ($qaStaff.Count -eq 0 -and $qaInvites.Count -eq 0 -and $qaInventory.Count -eq 0 -and $qaCrossInventory.Count -eq 0 -and $qaLegacy.Count -eq 0 -and -not $qaAuth)
      if ($allZero) {
        Write-Check -Name 'Zero leftover QA records' -Status 'PASS' -Detail 'Zero rows remain for this run marker in staff memberships, invites, inventory, legacy branch membership, and Auth users. No booking or payment order was created by this script.'
      } else {
        Write-Check -Name 'Zero leftover QA records' -Status 'FAIL' -Detail ('Leftovers detected: staff=' + $qaStaff.Count + ', invites=' + $qaInvites.Count + ', inventory=' + ($qaInventory.Count + $qaCrossInventory.Count) + ', legacyMembership=' + $qaLegacy.Count + ', authUser=' + [bool]$qaAuth)
      }
    } else {
      Write-Check -Name 'Zero leftover QA records' -Status 'PASS' -Detail 'No test marker was created.'
    }
  } catch {
    Write-Check -Name 'Zero leftover QA records' -Status 'FAIL' -Detail ('Could not verify marker cleanup: ' + $_.Exception.Message)
  }

  Write-E2EReport
}

if ($script:Results['HTTP Supabase Auth staff sign-in'].status -ne 'PASS' -or
    $script:Results['Authenticated branch inventory write/read-back'].status -ne 'PASS' -or
    ($script:Results.Contains('Cross-branch inventory isolation') -and $script:Results['Cross-branch inventory isolation'].status -eq 'FAIL') -or
    $script:Results['Automatic cleanup'].status -ne 'PASS' -or
    $script:Results['Post-cleanup baseline counts'].status -ne 'PASS' -or
    $script:Results['Zero leftover QA records'].status -ne 'PASS') {
  $global:LASTEXITCODE = 1
  return
}
if ($script:Results['Razorpay test capture + Edge refund'].status -eq 'FAIL') {
  $global:LASTEXITCODE = 1
  return
}
if ($script:Results['Razorpay test capture + Edge refund'].status -ne 'EXECUTED_TEST_MODE') {
  Write-Host 'Core Auth/inventory checks and cleanup completed. Razorpay outcome is explicitly recorded above; no non-test provider request was made.' -ForegroundColor Yellow
}
$global:LASTEXITCODE = 0
return
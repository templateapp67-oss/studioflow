// Real Playwright/Chromium browser E2E runner for the Vercel Preview deployment
// connected to NEXORA QA Supabase (ckgrgnokgxgjxzfeoigg).
// Verifies runtime Supabase project identity before creating any test user or data,
// executes owner signup -> Build My Salon Website -> template/service/team -> save ->
// publish -> public storefront verification -> Customer 1 booking flow ->
// Customer 2 duplicate slot check -> cancellation & slot reopening.
// Saves Playwright traces, screenshots, report.json and summary.md as artifacts.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const previewUrl = (process.env.PREVIEW_URL || '').trim().replace(/\/+$/, '');
const expectedSupabaseRef = (process.env.EXPECTED_SUPABASE_REF || 'ckgrgnokgxgjxzfeoigg').trim();
const forbiddenSupabaseRef = (process.env.FORBIDDEN_SUPABASE_REF || 'zilwgiuiygqqardzutxi').trim();
const artifactsDir = resolve(process.env.E2E_ARTIFACTS_DIR || 'test-results/preview-browser-e2e');
const screenshotsDir = join(artifactsDir, 'screenshots');
const tracesDir = join(artifactsDir, 'traces');

mkdirSync(screenshotsDir, { recursive: true });
mkdirSync(tracesDir, { recursive: true });

const steps = [];
const consoleErrors = [];
const pageErrors = [];
const observedSupabaseRefs = new Set();
let paymentStatusPayload = null;
let playwrightVersion = 'unknown';
let chromiumVersion = 'unknown';

const recordStep = (id, name, status, detail = '') => {
  const entry = { id, name, status, detail, timestamp: new Date().toISOString() };
  steps.push(entry);
  console.log(`[step ${id}] ${status}: ${name}${detail ? ` — ${detail}` : ''}`);
};

const writeReportAndSummary = (overallStatus, blocker = '') => {
  const report = {
    overallStatus,
    blocker,
    previewUrl: previewUrl || null,
    expectedSupabaseRef,
    observedSupabaseRefs: [...observedSupabaseRefs],
    playwrightVersion,
    chromiumVersion,
    paymentStatus: paymentStatusPayload,
    steps,
    consoleErrors,
    pageErrors,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(artifactsDir, 'report.json'), JSON.stringify(report, null, 2));

  const lines = [
    `## Preview Browser E2E (${overallStatus})`,
    '',
    `- **Preview URL:** ${previewUrl || 'MISSING'}`,
    `- **Playwright version:** ${playwrightVersion}`,
    `- **Chromium version:** ${chromiumVersion}`,
    `- **Expected QA Supabase ref:** \`${expectedSupabaseRef}\``,
    `- **Observed runtime Supabase refs:** ${observedSupabaseRefs.size ? [...observedSupabaseRefs].map((r) => `\`${r}\``).join(', ') : 'none'}`,
    `- **Payment gateway status (\`studioflow-payments\`):** ${paymentStatusPayload ? JSON.stringify(paymentStatusPayload) : 'not checked'}`,
  ];
  if (blocker) {
    lines.push(`- **Blocker:** ${blocker}`);
  }
  lines.push('', '| Step | Description | Status | Detail |', '| --- | --- | --- | --- |');
  for (const s of steps) {
    lines.push(`| ${s.id} | ${s.name} | **${s.status}** | ${String(s.detail || '').replace(/\|/g, '\\|')} |`);
  }
  if (pageErrors.length || consoleErrors.length) {
    lines.push('', '### Browser Diagnostics', `- Page errors: ${pageErrors.length}`, `- Console errors: ${consoleErrors.length}`);
    for (const err of pageErrors.slice(0, 10)) lines.push(`  - pageerror: \`${err.replace(/`/g, "'")}\``);
    for (const err of consoleErrors.slice(0, 10)) lines.push(`  - console.error: \`${err.replace(/`/g, "'")}\``);
  }
  const summary = lines.join('\n') + '\n';
  writeFileSync(join(artifactsDir, 'summary.md'), summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
  }
  return report;
};

if (!previewUrl) {
  recordStep('0', 'Verify Vercel Preview URL', 'BLOCKED', 'PREVIEW_URL is empty (Vercel Preview deployment was skipped or failed).');
  writeReportAndSummary('BLOCKED', 'Missing Vercel Preview URL; browser E2E cannot execute without a deployed Preview URL.');
  process.exit(1);
}

async function loadPlaywright() {
  const pwRoot = process.env.PLAYWRIGHT_PACKAGE_ROOT || process.env.BROWSER_TOOLS_ROOT || '';
  if (pwRoot) {
    const pkgPath = join(pwRoot, 'package.json');
    const anchorPath = existsSync(pkgPath) ? pkgPath : join(pwRoot, 'node_modules', '_anchor.js');
    const req = createRequire(anchorPath);
    const pkgJson = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : {};
    if (pkgJson.dependencies?.playwright || pkgJson.devDependencies?.playwright || existsSync(join(pwRoot, 'node_modules/playwright/package.json'))) {
      const pw = req('playwright');
      const pwPkg = JSON.parse(readFileSync(join(pwRoot, 'node_modules/playwright/package.json'), 'utf8'));
      return { chromium: pw.chromium, version: pwPkg.version, mode: 'playwright' };
    }
    const chromiumPkg = req('@sparticuz/chromium');
    const chromium = chromiumPkg.default ?? chromiumPkg;
    const libraryArchive = join(pwRoot, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br');
    const libraryDirectory = join(tmpdir(), 'al2023', 'lib');
    if (existsSync(libraryArchive) && !existsSync(join(libraryDirectory, 'libnspr4.so'))) {
      await chromiumPkg.inflate(libraryArchive);
    }
    if (existsSync(join(libraryDirectory, 'libnspr4.so'))) {
      process.env.LD_LIBRARY_PATH = [libraryDirectory, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
    }
    const pwCore = req('playwright-core');
    const corePkg = JSON.parse(readFileSync(join(pwRoot, 'node_modules/playwright-core/package.json'), 'utf8'));
    return {
      chromium: pwCore.chromium,
      version: corePkg.version,
      mode: 'sparticuz',
      launchOptions: {
        args: chromium.args,
        executablePath: process.env.CHROMIUM_EXECUTABLE ?? await chromium.executablePath(),
      },
    };
  }
  const pw = await import('playwright');
  const req = createRequire(import.meta.url);
  const pwPkg = req('playwright/package.json');
  return { chromium: pw.chromium, version: pwPkg.version, mode: 'playwright' };
}

const runId = randomUUID().slice(0, 8);
const ownerEmail = `qa-owner-${runId}@example.com`;
const customerEmail = `qa-customer1-${runId}@example.com`;
const customer2Email = `qa-customer2-${runId}@example.com`;
const password = `QaPass!${runId}9`;
const businessName = `QA Royal Salon ${runId}`;
const expectedSlug = `qa-royal-salon-${runId}`;
const customServiceName = `QA Classic Haircut ${runId}`;
const customStylistName = `QA Stylist ${runId}`;

const scrubSecrets = (text) =>
  String(text || '').replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, '[REDACTED_KEY]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]');

const attachInstrumentation = (page, contextLabel) => {
  page.on('pageerror', (err) => {
    pageErrors.push(`${contextLabel}: ${scrubSecrets(err.message)}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`${contextLabel}: ${scrubSecrets(msg.text())}`);
    }
  });
  page.on('request', (req) => {
    try {
      const url = new URL(req.url());
      if (url.hostname.endsWith('.supabase.co')) {
        const ref = url.hostname.split('.')[0];
        if (ref) observedSupabaseRefs.add(ref);
      }
    } catch { /* ignore non-http URLs */ }
  });
  page.on('response', async (res) => {
    try {
      const url = new URL(res.url());
      if (url.hostname.endsWith('.supabase.co')) {
        const ref = url.hostname.split('.')[0];
        if (ref) observedSupabaseRefs.add(ref);
        if (url.pathname.endsWith('/functions/v1/studioflow-payments') && res.request().method() === 'POST') {
          const postData = res.request().postData() || '';
          if (postData.includes('"status"')) {
            paymentStatusPayload = await res.json().catch(() => null);
          }
        }
      }
      if (url.origin === new URL(previewUrl).origin && url.pathname.endsWith('.js')) {
        const body = await res.text().catch(() => '');
        for (const m of body.matchAll(/https:\/\/([a-z0-9]{20})\.supabase\.co/g)) {
          observedSupabaseRefs.add(m[1]);
        }
      }
    } catch { /* ignore */ }
  });
};

const safeShot = async (page, name) => {
  try {
    await page.screenshot({ path: join(screenshotsDir, `${name}.png`), fullPage: true });
  } catch { /* ignore screenshot failures during abort */ }
};

let overallStatus = 'FAIL';
let blockerReason = '';
let browser = null;

const contexts = [];
const makeContext = async (label, viewport = { width: 1440, height: 960 }) => {
  const ctx = await browser.newContext({ viewport });
  await ctx.tracing.start({ screenshots: true, snapshots: true, sources: true });
  contexts.push({ label, ctx });
  return ctx;
};

try {
  const runtime = await loadPlaywright();
  playwrightVersion = runtime.version;

  browser = await runtime.chromium.launch({
    headless: true,
    ...(runtime.launchOptions || {}),
  });
  chromiumVersion = browser.version();
  console.log(`Launched Chromium ${chromiumVersion} via Playwright ${playwrightVersion} (${runtime.mode})`);

  // =========================================================================
  // STEP 0: PRE-MUTATION QA SUPABASE SAFETY CHECK
  // =========================================================================
  const probeCtx = await makeContext('probe');
  const probePage = await probeCtx.newPage();
  attachInstrumentation(probePage, 'probe');

  await probePage.goto(`${previewUrl}/?site=__qa_supabase_probe__`, { waitUntil: 'networkidle', timeout: 45000 });
  await probePage.waitForTimeout(1000);
  await safeShot(probePage, '00-supabase-probe');

  if (observedSupabaseRefs.has(forbiddenSupabaseRef)) {
    recordStep('0', 'Verify preview connects only to QA Supabase', 'FAIL', `ABORTED: Preview attempted to connect to Production Supabase ref ${forbiddenSupabaseRef}.`);
    throw new Error(`Safety abort: Preview points to Production Supabase (${forbiddenSupabaseRef}).`);
  }
  if (!observedSupabaseRefs.has(expectedSupabaseRef)) {
    recordStep('0', 'Verify preview connects only to QA Supabase', 'FAIL', `Expected ${expectedSupabaseRef}, observed: ${[...observedSupabaseRefs].join(', ') || 'none'}`);
    throw new Error(`Safety abort: Could not confirm QA Supabase ref ${expectedSupabaseRef} (observed: ${[...observedSupabaseRefs].join(', ') || 'none'}).`);
  }
  recordStep('0', 'Verify preview connects only to QA Supabase', 'PASS', `Confirmed runtime Supabase ref ${expectedSupabaseRef}; Production ref ${forbiddenSupabaseRef} absent.`);

  // =========================================================================
  // A. SALON OWNER FLOW (STEPS 1-10)
  // =========================================================================
  const ownerCtx = await makeContext('owner');
  const ownerPage = await ownerCtx.newPage();
  attachInstrumentation(ownerPage, 'owner');

  // 1. Open Vercel Preview
  await ownerPage.goto(`${previewUrl}/sign-up`, { waitUntil: 'networkidle', timeout: 45000 });
  await safeShot(ownerPage, '01-owner-signup-page');
  recordStep('1', 'Open Vercel Preview signup page', 'PASS', `${previewUrl}/sign-up loaded cleanly`);

  // 2. Register a new QA owner
  await ownerPage.getByTestId('auth-full-name').fill(`QA Owner ${runId}`);
  await ownerPage.getByTestId('auth-salon-name').fill(businessName);
  await ownerPage.getByTestId('auth-email').fill(ownerEmail);
  await ownerPage.getByTestId('auth-password').fill(password);
  await ownerPage.getByTestId('auth-submit').click();

  // 3. Verify login and session
  await ownerPage.getByTestId('owner-workspace-shell').waitFor({ state: 'visible', timeout: 30000 });
  await safeShot(ownerPage, '02-owner-workspace-session');
  recordStep('2-3', 'Register QA owner and verify active workspace session', 'PASS', ownerEmail);

  // 4. Open Build My Salon Website
  await ownerPage.getByTestId('header-nav-preview').click();
  await ownerPage.getByTestId('wizard-template-barber').waitFor({ state: 'visible', timeout: 15000 });
  recordStep('4', 'Open Build My Salon Website wizard', 'PASS', 'OnboardingWizard Step 2 displayed');

  // 5. Select a salon template
  await ownerPage.getByTestId('wizard-template-barber').click();
  await assert.doesNotReject(async () => {
    await ownerPage.waitForFunction(
      () => document.querySelector('[data-testid="wizard-template-barber"]')?.getAttribute('aria-pressed') === 'true',
      null,
      { timeout: 5000 },
    );
  });
  await safeShot(ownerPage, '03-wizard-template-selected');
  recordStep('5', 'Select salon template (barber)', 'PASS', 'Template selected');

  // Step 2 -> Step 3 (Salon Information)
  await ownerPage.getByTestId('wizard-continue').click();
  await ownerPage.getByTestId('wizard-salon-name').waitFor({ state: 'visible', timeout: 10000 });
  await ownerPage.getByTestId('wizard-salon-name').fill(businessName);
  await ownerPage.locator('label:has-text("City") + input').fill('Jaipur');
  await ownerPage.locator('label:has-text("Studio Address") + input').fill('12 MI Road, C Scheme');
  await ownerPage.locator('label:has-text("Phone Number") + input').fill('9876543210');
  await ownerPage.locator('label:has-text("Your Salon WhatsApp Number") + input').fill('9876543210');

  // Step 3 -> Step 4 (Visual Style) -> Step 5 (Service Management)
  await ownerPage.getByTestId('wizard-continue').click();
  await ownerPage.getByTestId('wizard-continue').click();
  await ownerPage.getByTestId('services-add-btn').waitFor({ state: 'visible', timeout: 15000 });

  // Add a custom service in Step 5
  await ownerPage.getByTestId('services-add-btn').click();
  const serviceDialog = ownerPage.getByRole('dialog', { name: /add service/i });
  await serviceDialog.waitFor({ state: 'visible', timeout: 10000 });
  await serviceDialog.getByRole('button', { name: 'Type a custom title' }).click();
  await serviceDialog.locator('label:has-text("Service name") input').fill(customServiceName);
  await serviceDialog.locator('label:has-text("Category") input').fill('Signature Cuts');
  await serviceDialog.locator('label:has-text("Service description") textarea').fill('Precision QA haircut and styling.');
  await serviceDialog.locator('label:has-text("Price") input').fill('800');
  await serviceDialog.locator('label:has-text("Duration") input').fill('30');
  await ownerPage.getByTestId('service-dialog-submit').click();
  await serviceDialog.waitFor({ state: 'hidden', timeout: 10000 });
  await ownerPage.locator(`text=${customServiceName}`).first().waitFor({ state: 'visible', timeout: 10000 });
  await safeShot(ownerPage, '04-wizard-service-added');
  recordStep('6', 'Set business name and add service', 'PASS', `${businessName} / ${customServiceName}`);

  // Step 5 -> Step 6 (Social Connectivity) -> Step 7 (Team Management)
  await ownerPage.getByTestId('wizard-continue').click();
  await ownerPage.getByRole('button', { name: /continue/i }).click();
  await ownerPage.getByTestId('team-add-staff-btn').waitFor({ state: 'visible', timeout: 15000 });
  await ownerPage.getByTestId('team-add-staff-btn').click();
  await ownerPage.getByTestId('staff-full-name').waitFor({ state: 'visible', timeout: 10000 });
  await ownerPage.getByTestId('staff-full-name').fill(customStylistName);
  await ownerPage.getByTestId('staff-save-btn').click();
  await ownerPage.locator(`text=${customStylistName}`).first().waitFor({ state: 'visible', timeout: 10000 });

  // Step 7 -> Step 8 -> Step 9 -> Step 10 (Subdomain) -> Step 11 (Final Review) -> Generate Website
  await ownerPage.getByTestId('wizard-continue').click();
  await ownerPage.getByTestId('wizard-continue').click();
  await ownerPage.getByTestId('wizard-continue').click();
  await ownerPage.getByTestId('wizard-subdomain').waitFor({ state: 'visible', timeout: 10000 });
  await ownerPage.getByTestId('wizard-subdomain').fill(expectedSlug);
  await ownerPage.getByTestId('wizard-continue').click();
  await ownerPage.getByTestId('wizard-continue').click();

  // Now in Preview view with WebsitePublishPanel; force save and wait for saved indicator
  await ownerPage.getByTestId('publish-panel-btn').waitFor({ state: 'visible', timeout: 20000 });
  await ownerPage.getByTestId('workspace-save-now').click();
  await ownerPage.waitForSelector('[data-testid="owner-workspace-shell"][data-workspace-sync="saved"]', { timeout: 25000 });
  recordStep('7', 'Save workspace to QA Supabase', 'PASS', 'data-workspace-sync="saved"');

  // 8. Reload and verify saved data persists
  await ownerPage.reload({ waitUntil: 'networkidle', timeout: 45000 });
  await ownerPage.getByTestId('owner-workspace-shell').waitFor({ state: 'visible', timeout: 25000 });
  await ownerPage.getByTestId('header-nav-preview').click();
  await ownerPage.getByTestId('publish-panel-btn').waitFor({ state: 'visible', timeout: 20000 });
  await ownerPage.locator(`text=${businessName}`).first().waitFor({ state: 'visible', timeout: 15000 });
  await ownerPage.locator(`text=${customServiceName}`).first().waitFor({ state: 'visible', timeout: 15000 });
  recordStep('8', 'Verify saved data persists after reload', 'PASS', 'Business name & service retained');

  // 9. Publish website
  await ownerPage.getByTestId('publish-panel-btn').click();
  const liveUrlLink = ownerPage.getByTestId('published-live-url');
  await liveUrlLink.waitFor({ state: 'visible', timeout: 30000 });
  const publicHref = await liveUrlLink.getAttribute('href');
  assert.ok(publicHref && publicHref.includes(`site=${expectedSlug}`), `Expected live URL containing site=${expectedSlug}, got ${publicHref}`);
  const publicUrl = publicHref.startsWith('http') ? publicHref : `${previewUrl}${publicHref}`;
  await safeShot(ownerPage, '05-published-website-url');
  recordStep('9', 'Publish website and obtain public URL', 'PASS', publicUrl);

  // 10. Open public URL without owner authentication + refresh + unauthorized edit check
  const visitorCtx = await makeContext('visitor');
  const visitorPage = await visitorCtx.newPage();
  attachInstrumentation(visitorPage, 'visitor');

  await visitorPage.goto(publicUrl, { waitUntil: 'networkidle', timeout: 45000 });
  await visitorPage.locator(`text=${businessName}`).first().waitFor({ state: 'visible', timeout: 20000 });
  await visitorPage.locator(`text=${customServiceName}`).first().waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await visitorPage.getByTestId('publish-panel-btn').count(), 0, 'Unauthenticated visitor must not see owner publish controls');
  assert.equal(await visitorPage.getByTestId('owner-workspace-shell').count(), 0, 'Unauthenticated visitor must not see owner workspace shell');

  await visitorPage.reload({ waitUntil: 'networkidle', timeout: 45000 });
  await visitorPage.locator(`text=${businessName}`).first().waitFor({ state: 'visible', timeout: 20000 });
  await safeShot(visitorPage, '06-public-site-unauthenticated');
  recordStep('10', 'Open public URL unauthenticated & verify refresh persistence', 'PASS', 'Storefront renders without owner controls and survives refresh');

  // =========================================================================
  // B. CUSTOMER 1 REGISTRATION, BOOKING & PAYMENT CHECK (STEPS 11-15)
  // =========================================================================
  const cust1Ctx = await makeContext('customer1');
  const cust1Page = await cust1Ctx.newPage();
  attachInstrumentation(cust1Page, 'customer1');

  await cust1Page.goto(publicUrl, { waitUntil: 'networkidle', timeout: 45000 });
  await cust1Page.locator(`text=${businessName}`).first().waitFor({ state: 'visible', timeout: 20000 });
  recordStep('11', 'Customer 1 opens published salon website', 'PASS', publicUrl);

  // 12. Register separate QA customer
  await cust1Page.getByTestId('site-customer-signup').click();
  await cust1Page.getByTestId('auth-full-name').fill(`QA Customer One ${runId}`);
  await cust1Page.getByTestId('auth-dob').fill('1995-04-12');
  await cust1Page.getByTestId('auth-whatsapp').fill('9876543211');
  await cust1Page.getByTestId('auth-email').fill(customerEmail);
  await cust1Page.getByTestId('auth-password').fill(password);
  await cust1Page.getByTestId('auth-submit').click();
  await cust1Page.getByTestId('site-customer-account').waitFor({ state: 'visible', timeout: 30000 });
  await safeShot(cust1Page, '07-customer1-signed-in');
  recordStep('12', 'Register Customer 1 in separate browser context', 'PASS', customerEmail);

  // Verify Customer 1 cannot access owner workspace or mutate owner website
  const unauthorizedEditCheck = await cust1Page.evaluate(async (slug) => {
    const res = await fetch(`${location.origin}/?owner=${encodeURIComponent(slug)}`);
    return { status: res.status };
  }, expectedSlug);
  assert.equal(unauthorizedEditCheck.status, 200);
  // Also attempt navigating directly to ?owner=<slug> as Customer 1 -> must deny management
  await cust1Page.goto(`${previewUrl}/?owner=${encodeURIComponent(expectedSlug)}`, { waitUntil: 'networkidle', timeout: 45000 });
  await cust1Page.locator('text=Sign in with the owner account for this salon to manage its website.').waitFor({ state: 'visible', timeout: 15000 });
  recordStep('12b', 'Verify unauthorized customer cannot manage owner website', 'PASS', 'Owner guard rejected Customer 1');

  // Return to public salon site as Customer 1
  await cust1Page.goto(publicUrl, { waitUntil: 'networkidle', timeout: 45000 });
  await cust1Page.getByTestId('site-customer-account').waitFor({ state: 'visible', timeout: 20000 });

  // 13. Select service, specialist, future date and available slot
  const serviceCard = cust1Page.locator('article.sf-service-card', { hasText: customServiceName }).first();
  await serviceCard.waitFor({ state: 'visible', timeout: 15000 });
  await serviceCard.getByRole('button', { name: /book/i }).click();

  const bookingModal = cust1Page.getByTestId('booking-modal');
  await bookingModal.waitFor({ state: 'visible', timeout: 15000 });
  await bookingModal.getByRole('button', { name: new RegExp(`Select specialist ${customStylistName}`, 'i') }).click();
  await bookingModal.getByTestId('booking-next-datetime').click();

  // Pick deterministic future date (+2 days IST)
  const futureDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(Date.now() + 2 * 86400000));
  await bookingModal.getByTestId('booking-date-input').fill(futureDate);

  const firstAvailableSlot = bookingModal.locator('[data-testid="booking-slot-btn"][data-slot-available="true"]').first();
  await firstAvailableSlot.waitFor({ state: 'visible', timeout: 20000 });
  const chosenSlotTime = await firstAvailableSlot.getAttribute('data-slot-time');
  assert.ok(chosenSlotTime, 'Expected a real available slot time from QA Supabase');
  await firstAvailableSlot.click();
  await safeShot(cust1Page, '08-customer1-slot-selected');

  await bookingModal.getByTestId('booking-next-guest').click();
  await bookingModal.getByTestId('booking-guest-name').fill(`QA Customer One ${runId}`);
  await bookingModal.getByTestId('booking-guest-phone').fill('9876543211');
  await bookingModal.getByTestId('booking-guest-email').fill(customerEmail);
  await bookingModal.getByTestId('booking-next-payment').click();
  recordStep('13', 'Select service, specialist, future date, and real available slot', 'PASS', `${futureDate} @ ${chosenSlotTime}`);

  // 14. Check QA Razorpay configuration via studioflow-payments status response
  await cust1Page.waitForTimeout(1500);
  if (paymentStatusPayload?.mode === 'live') {
    recordStep('14', 'Inspect QA payment gateway configuration', 'FAIL', 'ABORTED: studioflow-payments reported live mode!');
    throw new Error('Safety abort: studioflow-payments is in live mode; refusing automated test checkout.');
  }

  if (!paymentStatusPayload || paymentStatusPayload.configured !== true) {
    const gatewayErrorText = await bookingModal.getByTestId('booking-gateway-error').innerText().catch(() => 'Payment gateway not configured');
    const payDisabled = await bookingModal.getByTestId('booking-pay-submit').isDisabled();
    assert.equal(payDisabled, true, 'Pay button must remain disabled when Razorpay QA credentials are not configured');
    await safeShot(cust1Page, '09-payment-gateway-blocker');

    blockerReason = `QA Supabase project (${expectedSupabaseRef}) Edge Function studioflow-payments returned ${JSON.stringify(paymentStatusPayload)} (${gatewayErrorText}). Razorpay test secrets (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured on QA, and 25% advance validation is intentionally never bypassed.`;
    recordStep('14', 'Complete booking using QA payment configuration', 'BLOCKED', blockerReason);
    recordStep('15', 'Verify booking saved in QA Supabase', 'BLOCKED', 'Requires completed Step 14 payment checkout');

    // Still verify Customer 2 registration works independently in a separate browser context
    const cust2Ctx = await makeContext('customer2');
    const cust2Page = await cust2Ctx.newPage();
    attachInstrumentation(cust2Page, 'customer2');
    await cust2Page.goto(publicUrl, { waitUntil: 'networkidle', timeout: 45000 });
    await cust2Page.getByTestId('site-customer-signup').click();
    await cust2Page.getByTestId('auth-full-name').fill(`QA Customer Two ${runId}`);
    await cust2Page.getByTestId('auth-dob').fill('1997-08-21');
    await cust2Page.getByTestId('auth-whatsapp').fill('9876543212');
    await cust2Page.getByTestId('auth-email').fill(customer2Email);
    await cust2Page.getByTestId('auth-password').fill(password);
    await cust2Page.getByTestId('auth-submit').click();
    await cust2Page.getByTestId('site-customer-account').waitFor({ state: 'visible', timeout: 30000 });
    await safeShot(cust2Page, '10-customer2-signed-in');
    recordStep('16', 'Register Customer 2 in separate browser context', 'PASS', customer2Email);

    recordStep('17', 'Customer 2 attempts to book same slot', 'BLOCKED', 'Depends on Customer 1 completing Step 14 payment hold/confirmation');
    recordStep('18', 'Verify system rejects duplicate booking', 'BLOCKED', 'Depends on Step 17');
    recordStep('19', 'Cancel Customer 1 appointment', 'BLOCKED', 'Depends on Step 14 saved booking');
    recordStep('20', 'Verify booking status changes to cancelled', 'BLOCKED', 'Depends on Step 19');
    recordStep('21', 'Verify cancelled slot reopens', 'BLOCKED', 'Depends on Step 20');

    assert.deepEqual(pageErrors, [], `Unexpected page errors: ${pageErrors.join(' | ')}`);
    assert.deepEqual(consoleErrors, [], `Unexpected console errors: ${consoleErrors.join(' | ')}`);
    overallStatus = 'BLOCKED';
  } else {
    // QA Razorpay test mode is configured -> execute test checkout and full Steps 14-21!
    await bookingModal.getByTestId('booking-pay-submit').click();
    // Wait for Razorpay checkout iframe/modal if configured in test mode
    await bookingModal.getByTestId('booking-confirmed-ref').waitFor({ state: 'visible', timeout: 45000 });
    const bookingRef = await bookingModal.getByTestId('booking-confirmed-ref').innerText();
    await safeShot(cust1Page, '09-customer1-booking-confirmed');
    recordStep('14-15', 'Complete QA test payment and verify booking saved in QA Supabase', 'PASS', bookingRef);

    // C. Customer 2 duplicate slot rejection
    const cust2Ctx = await makeContext('customer2');
    const cust2Page = await cust2Ctx.newPage();
    attachInstrumentation(cust2Page, 'customer2');
    await cust2Page.goto(publicUrl, { waitUntil: 'networkidle', timeout: 45000 });
    await cust2Page.getByTestId('site-customer-signup').click();
    await cust2Page.getByTestId('auth-full-name').fill(`QA Customer Two ${runId}`);
    await cust2Page.getByTestId('auth-dob').fill('1997-08-21');
    await cust2Page.getByTestId('auth-whatsapp').fill('9876543212');
    await cust2Page.getByTestId('auth-email').fill(customer2Email);
    await cust2Page.getByTestId('auth-password').fill(password);
    await cust2Page.getByTestId('auth-submit').click();
    await cust2Page.getByTestId('site-customer-account').waitFor({ state: 'visible', timeout: 30000 });
    recordStep('16', 'Register Customer 2 in separate browser context', 'PASS', customer2Email);

    await cust2Page.locator('article.sf-service-card', { hasText: customServiceName }).first().getByRole('button', { name: /book/i }).click();
    const modal2 = cust2Page.getByTestId('booking-modal');
    await modal2.waitFor({ state: 'visible', timeout: 15000 });
    await modal2.getByRole('button', { name: new RegExp(`Select specialist ${customStylistName}`, 'i') }).click();
    await modal2.getByTestId('booking-next-datetime').click();
    await modal2.getByTestId('booking-date-input').fill(futureDate);
    const sameSlot = modal2.locator(`[data-testid="booking-slot-btn"][data-slot-time="${chosenSlotTime}"]`);
    await sameSlot.waitFor({ state: 'visible', timeout: 15000 });
    assert.equal(await sameSlot.getAttribute('data-slot-available'), 'false', `Slot ${chosenSlotTime} must be unavailable to Customer 2`);
    assert.equal(await sameSlot.isDisabled(), true, `Slot ${chosenSlotTime} button must be disabled for Customer 2`);
    await safeShot(cust2Page, '10-customer2-slot-unavailable');
    recordStep('17-18', 'Verify duplicate slot is unavailable/rejected for Customer 2', 'PASS', `${futureDate} @ ${chosenSlotTime} marked unavailable`);

    // D. Cancellation & slot reopening
    await cust1Page.goto(`${previewUrl}/?customer=1&return=${encodeURIComponent(expectedSlug)}`, { waitUntil: 'networkidle', timeout: 45000 });
    const bookingCard = cust1Page.getByTestId('customer-booking-card').first();
    await bookingCard.waitFor({ state: 'visible', timeout: 20000 });
    await bookingCard.getByTestId('customer-booking-cancel').click();
    await cust1Page.waitForFunction(
      () => document.querySelector('[data-testid="customer-booking-card"]')?.getAttribute('data-booking-status') === 'cancelled',
      null,
      { timeout: 15000 },
    );
    await safeShot(cust1Page, '11-customer1-booking-cancelled');
    recordStep('19-20', 'Cancel Customer 1 appointment and verify status changes to cancelled', 'PASS', bookingRef);

    // Verify Customer 2 sees slot reopened
    await modal2.getByRole('button', { name: 'Retry availability' }).click();
    await cust2Page.waitForFunction(
      (t) => document.querySelector(`[data-testid="booking-slot-btn"][data-slot-time="${t}"]`)?.getAttribute('data-slot-available') === 'true',
      chosenSlotTime,
      { timeout: 15000 },
    );
    await safeShot(cust2Page, '12-slot-reopened');
    recordStep('21', 'Verify cancelled slot reopens for Customer 2', 'PASS', `${futureDate} @ ${chosenSlotTime} available again`);

    assert.deepEqual(pageErrors, [], `Unexpected page errors: ${pageErrors.join(' | ')}`);
    assert.deepEqual(consoleErrors, [], `Unexpected console errors: ${consoleErrors.join(' | ')}`);
    overallStatus = 'PASS';
  }
} catch (err) {
  overallStatus = 'FAIL';
  blockerReason = scrubSecrets(blockerReason || (err instanceof Error ? err.message : String(err)));
  if (!steps.some((s) => s.status === 'FAIL')) {
    recordStep('err', 'Unexpected E2E failure', 'FAIL', blockerReason);
  }
  for (const { label, ctx } of contexts) {
    for (const [idx, p] of ctx.pages().entries()) {
      await safeShot(p, `99-failure-${label}-${idx}`);
    }
  }
  console.error('Browser E2E failed:', blockerReason);
} finally {
  for (const { label, ctx } of contexts) {
    try {
      await ctx.tracing.stop({ path: join(tracesDir, `${label}.zip`) });
    } catch { /* ignore trace stop failures */ }
    try {
      await ctx.close();
    } catch { /* ignore close failures */ }
  }
  if (browser) {
    await browser.close();
  }
}

const finalReport = writeReportAndSummary(overallStatus, blockerReason);
console.log(JSON.stringify({
  overallStatus: finalReport.overallStatus,
  playwrightVersion: finalReport.playwrightVersion,
  chromiumVersion: finalReport.chromiumVersion,
  observedSupabaseRefs: finalReport.observedSupabaseRefs,
  paymentStatus: finalReport.paymentStatus,
  blocker: finalReport.blocker,
}, null, 2));

if (overallStatus !== 'PASS') {
  process.exitCode = 1;
}

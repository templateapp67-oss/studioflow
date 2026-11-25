import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const toolsRoot = process.env.PLAYWRIGHT_PACKAGE_ROOT;
const previewUrl = (process.env.PREVIEW_URL || '').trim();
if (!toolsRoot) throw new Error('PLAYWRIGHT_PACKAGE_ROOT must point to the pinned Playwright installation.');
if (!previewUrl) throw new Error('PREVIEW_URL is required; this audit must run against a Vercel Preview deployment.');
const origin = new URL(previewUrl);
assert.match(origin.hostname, /vercel\.app$/i, 'interaction audit is restricted to a Vercel Preview host');

const require = createRequire(resolve(toolsRoot, 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
const vercelBypassSecret = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();
const page = await browser.newPage({
  viewport: { width: 1365, height: 950 },
  reducedMotion: 'reduce',
});
// Vercel bypass headers must only be sent to this Preview origin. Sending them
// globally also sends them to Supabase, triggering a failed CORS preflight.
if (vercelBypassSecret) {
  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    const headers = { ...route.request().headers() };
    if (requestUrl.origin === origin.origin) {
      headers['x-vercel-protection-bypass'] = vercelBypassSecret;
      headers['x-vercel-set-bypass-cookie'] = 'true';
    }
    await route.continue({ headers });
  });
}

/**
 * The preview interaction audit exercises booking UI, not live payment or
 * production booking data. Stub exactly the two known read-only lookups so
 * browser CORS/preflight or production availability cannot make this UI test
 * flaky. All other Supabase writes remain visible to the mutation guard.
 */
const previewCorsHeaders = {
  'access-control-allow-origin': origin.origin,
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': '*',
  'access-control-max-age': '600',
};

await page.route('**/functions/v1/studioflow-payments', async (route) => {
  const request = route.request();
  const requestUrl = new URL(request.url());
  if (!requestUrl.hostname.toLowerCase().endsWith('.supabase.co')
    || requestUrl.pathname !== '/functions/v1/studioflow-payments') {
    return route.continue();
  }
  if (request.method() === 'OPTIONS') {
    return route.fulfill({ status: 204, headers: previewCorsHeaders, body: '' });
  }
  let body;
  try { body = request.postDataJSON(); } catch { body = null; }
  const keys = body && typeof body === 'object' && !Array.isArray(body)
    ? Object.keys(body).sort()
    : [];
  if (request.method() === 'POST' && body?.action === 'status'
    && keys.length === 1 && keys[0] === 'action') {
    return route.fulfill({
      status: 401,
      headers: { ...previewCorsHeaders, 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'Sign in before checkout' }),
    });
  }
  return route.continue();
});

await page.route('**/rest/v1/rpc/studioflow_booking_specialists', async (route) => {
  const request = route.request();
  const requestUrl = new URL(request.url());
  if (!requestUrl.hostname.toLowerCase().endsWith('.supabase.co')
    || requestUrl.pathname !== '/rest/v1/rpc/studioflow_booking_specialists') {
    return route.continue();
  }
  if (request.method() === 'OPTIONS') {
    return route.fulfill({ status: 204, headers: previewCorsHeaders, body: '' });
  }
  let body;
  try { body = request.postDataJSON(); } catch { body = null; }
  const keys = body && typeof body === 'object' && !Array.isArray(body)
    ? Object.keys(body).sort()
    : [];
  const isExpectedLookup = request.method() === 'POST'
    && keys.length === 2
    && keys[0] === 'p_service_id'
    && keys[1] === 'p_slug'
    && typeof body.p_service_id === 'string'
    && typeof body.p_slug === 'string';
  if (isExpectedLookup) {
    return route.fulfill({
      status: 200,
      headers: { ...previewCorsHeaders, 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        published: true,
        specialistIds: [],
        specialists: [],
      }),
    });
  }
  return route.continue();
});
const failedRequests = [];
const writeRequests = [];
const readOnlyPostRequests = [];
const pageErrors = [];

/**
 * Supabase/PostgREST uses HTTP POST for RPC calls even when the SQL function is
 * read-only. Only these two explicitly read-only operations are exempted:
 * - studioflow_booking_specialists is declared LANGUAGE SQL STABLE.
 * - studioflow-payments action=status only reads gateway configuration after
 *   validating the caller; it does not create orders, collect payments or write.
 * All other POST/PUT/PATCH/DELETE requests to the app or Supabase stay blocked.
 */
function readOnlyRequestReason(request, requestUrl) {
  if (request.method() !== 'POST') return '';
  let body;
  try {
    body = request.postDataJSON();
  } catch {
    return '';
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '';

  if (requestUrl.pathname === '/functions/v1/studioflow-payments') {
    const keys = Object.keys(body).sort();
    if (body.action === 'status' && keys.length === 1 && keys[0] === 'action') {
      return 'read-only payment gateway status';
    }
    return '';
  }

  if (requestUrl.pathname === '/rest/v1/rpc/studioflow_booking_specialists') {
    const keys = Object.keys(body).sort();
    if (
      keys.length === 2
      && keys[0] === 'p_service_id'
      && keys[1] === 'p_slug'
      && typeof body.p_service_id === 'string'
      && typeof body.p_slug === 'string'
    ) {
      return 'read-only stable booking specialist lookup';
    }
  }

  return '';
}
const webpResponses = new Map();

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => {
  const failure = request.failure()?.errorText || 'request failed';
  try {
    const requestUrl = new URL(request.url());
    // Preserve the failing host/path, but never emit query strings or fragments.
    failedRequests.push(requestUrl.hostname + requestUrl.pathname + ' — ' + failure);
  } catch {
    failedRequests.push('non-http browser resource — ' + failure);
  }
});
page.on('request', (request) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) return;
  try {
    const requestUrl = new URL(request.url());
    // Vercel Web Analytics and Speed Insights send same-origin telemetry POSTs.
    // They are not application mutations, so exclude only those documented paths.
    const isVercelTelemetry = requestUrl.origin === origin.origin
      && /^\/_vercel\/(?:insights|speed-insights)(?:\/|$)/i.test(requestUrl.pathname);
    if (isVercelTelemetry) return;

    // Keep the no-write guard focused on application API handlers and Supabase
    // data/auth/storage/function endpoints. Retain only host + path in logs;
    // never capture query strings, tokens, or request bodies.
    const isPreviewApiMutation = requestUrl.origin === origin.origin
      && (requestUrl.pathname === '/api' || requestUrl.pathname.startsWith('/api/'));
    const isSupabaseMutation = /\.supabase\.co$/i.test(requestUrl.hostname)
      && /^\/(?:rest\/v1|functions\/v1|storage\/v1|auth\/v1)(?:\/|$)/i.test(requestUrl.pathname);
    if (isPreviewApiMutation || isSupabaseMutation) {
      const readOnlyReason = isSupabaseMutation ? readOnlyRequestReason(request, requestUrl) : '';
      const safeLabel = request.method() + ' ' + requestUrl.hostname + requestUrl.pathname;
      if (readOnlyReason) {
        readOnlyPostRequests.push(safeLabel + ' (' + readOnlyReason + ')');
      } else {
        writeRequests.push(safeLabel);
      }
    }
  } catch {
    // Browser-internal URLs cannot target the application's data services.
  }
});
page.on('response', async (response) => {
  try {
    const url = new URL(response.url());
    if (url.pathname.endsWith('.webp')) {
      const headers = await response.allHeaders();
      webpResponses.set(url.pathname, {
        status: response.status(),
        contentType: headers['content-type'] || '',
      });
    }
  } catch {
    // Ignore browser-internal URLs; all first-party image responses are checked below.
  }
});

async function installInteractionObserver(target) {
  await target.evaluate(() => {
    const w = window;
    w.__nexoraInteractionEntries = [];
    w.__nexoraLongTasks = [];
    const supported = PerformanceObserver.supportedEntryTypes || [];
    if (supported.includes('event')) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'click' || entry.name === 'pointerdown' || entry.name === 'pointerup'
              || entry.name === 'keydown' || entry.name === 'input' || entry.name === 'change') {
              w.__nexoraInteractionEntries.push({
                name: entry.name,
                duration: entry.duration,
                processingStart: entry.processingStart,
                processingEnd: entry.processingEnd,
              });
            }
          }
        });
        observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });
      } catch {
        // The long-task observer remains as a fallback in older Chromium versions.
      }
    }
    if (supported.includes('longtask')) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) w.__nexoraLongTasks.push(entry.duration);
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch {
        // Long-task timing is optional; interaction event timing is the primary signal.
      }
    }
  });
}

try {
  const response = await page.goto(origin.toString(), { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200, 'NEXORA homepage loads with HTTP 200');
  await page.locator('[data-nexora-template-library]').waitFor({ state: 'visible' });
  await installInteractionObserver(page);

  const cards = page.locator('article[data-template-id]');
  assert.equal(await cards.count(), 16, 'homepage exposes all 16 template cards');
  const imageStats = [];
  for (let index = 0; index < await cards.count(); index += 1) {
    const card = cards.nth(index);
    const image = card.locator('img').first();
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((element) => element.decode());
    const stats = await image.evaluate((element) => ({
      templateId: element.closest('[data-template-id]')?.getAttribute('data-template-id') || '',
      src: new URL(element.currentSrc || element.src).pathname,
      width: element.naturalWidth,
      height: element.naturalHeight,
      alt: element.getAttribute('alt') || '',
      reservedWidth: Number(element.getAttribute('width')),
      reservedHeight: Number(element.getAttribute('height')),
    }));
    assert.ok(stats.src.endsWith('.webp'), stats.templateId + ' card requests a WebP preview');
    assert.ok(stats.width >= 280 && stats.height >= 176,
      stats.templateId + ' WebP image decodes to usable intrinsic dimensions');
    assert.ok(stats.alt.trim().length > 0, stats.templateId + ' preview image has descriptive alt text');
    assert.equal(stats.reservedWidth, 280, stats.templateId + ' reserves image width to prevent layout shift');
    assert.equal(stats.reservedHeight, 176, stats.templateId + ' reserves image height to prevent layout shift');
    imageStats.push(stats);
  }
  await page.waitForTimeout(100);
  for (const image of imageStats) {
    const result = webpResponses.get(image.src);
    assert.ok(result, image.templateId + ' has a captured first-party WebP response');
    assert.equal(result.status, 200, image.templateId + ' WebP response is HTTP 200');
    assert.match(result.contentType, /^image\/webp(?:;|$)/i, image.templateId + ' is served with image/webp content type');
  }

  const search = page.getByRole('searchbox', { name: /search templates/i });
  await search.fill('barber');
  await assert.doesNotReject(async () => {
    await page.locator('article[data-template-id="barber"]').waitFor({ state: 'visible' });
  });
  assert.equal(await page.locator('article[data-template-id]:visible').count(), 1,
    'template search filters the visible cards without blocking the page');
  assert.equal(await page.locator('article[data-template-id="barber"]').count(), 1,
    'search returns the matching Barber template');

  await page.locator('[data-category-filter="barber-shop"]').click();
  assert.equal(await page.locator('[data-category-filter="barber-shop"]').getAttribute('aria-pressed'), 'true',
    'category filter exposes its selected state to assistive technology');
  assert.equal(await page.locator('article[data-template-id]:visible').count(), 1,
    'category filtering retains the expected template');
  await page.getByRole('button', { name: /reset filters/i }).click();
  assert.equal(await page.locator('article[data-template-id]:visible').count(), 16,
    'reset filters restores all 16 cards');

  const ziyaCard = page.locator('article[data-template-id="hair_salon"]');
  await ziyaCard.getByRole('button', { name: /view full preview/i }).click();
  const previewDialog = page.locator('dialog[data-preview-mode]');
  await previewDialog.waitFor({ state: 'visible' });
  const selector = previewDialog.getByRole('combobox', { name: 'Preview template' });
  assert.equal(await selector.inputValue(), 'hair_salon', 'template preview opens the selected template');
  const frame = page.frameLocator('iframe[title*="live desktop preview"]');
  const bookButton = frame.getByRole('button', { name: /^Book Appointment$/i }).first();
  await bookButton.waitFor({ state: 'visible' });
  const liveFrame = page.frameLocator('iframe[title*="live desktop preview"]');
  await installInteractionObserver(liveFrame.locator('body'));

  // These requests are read-only, but the modal is disposed as soon as it closes.
  // Wait for their HTTP responses before closing to avoid browser ERR_ABORTED noise.
  const paymentStatusResponsePromise = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url());
    return requestUrl.pathname === '/functions/v1/studioflow-payments'
      && response.request().method() === 'POST';
  }, { timeout: 15000 });
  const specialistLookupResponsePromise = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url());
    return requestUrl.pathname === '/rest/v1/rpc/studioflow_booking_specialists'
      && response.request().method() === 'POST';
  }, { timeout: 15000 });

  await bookButton.click();
  const bookingDialog = frame.getByTestId('booking-modal');
  await bookingDialog.waitFor({ state: 'visible' });
  assert.equal(await bookingDialog.getAttribute('aria-modal'), 'true',
    'template booking modal opens as an accessible modal dialog without submitting a booking');

  const [paymentStatusResponse, specialistLookupResponse] = await Promise.all([
    paymentStatusResponsePromise,
    specialistLookupResponsePromise,
  ]);
  const paymentStatusHttpStatus = paymentStatusResponse.status();
  const specialistLookupHttpStatus = specialistLookupResponse.status();
  // An unauthenticated Preview iframe is expected to receive 401 from the
  // payment-status endpoint; an authenticated session may receive 200.
  assert.ok([200, 401].includes(paymentStatusHttpStatus),
    'read-only payment status returns 200 or expected unsigned-preview 401, got ' + paymentStatusHttpStatus);
  assert.equal(specialistLookupHttpStatus, 200,
    'read-only specialist eligibility lookup returns HTTP 200');

  const frameEventEntries = await liveFrame.locator('body').evaluate(() => window.__nexoraInteractionEntries || []);
  await bookingDialog.getByRole('button', { name: 'Close booking dialog' }).click();
  await bookingDialog.waitFor({ state: 'hidden' });
  await previewDialog.getByRole('button', { name: /close template preview/i }).click();
  await previewDialog.waitFor({ state: 'hidden' });
  const homepageEventEntries = await page.evaluate(() => window.__nexoraInteractionEntries || []);

  // Exercise both owner and customer registration forms without submitting.
  // Synthetic values remain in the browser only; no authentication or database
  // mutation is initiated by this audit.
  const ownerSignupUrl = new URL('/login?auth=signup', origin).toString();
  const ownerSignupResponse = await page.goto(ownerSignupUrl, { waitUntil: 'domcontentloaded' });
  assert.equal(ownerSignupResponse?.status(), 200, 'owner signup form route loads with HTTP 200');
  await page.locator('form').first().waitFor({ state: 'visible' });
  await installInteractionObserver(page);
  await page.getByTestId('auth-full-name').fill('Preview QA Owner');
  await page.getByTestId('auth-salon-name').fill('Preview QA Salon');
  await page.getByTestId('auth-email').fill('owner-audit@example.invalid');
  await page.getByTestId('auth-password').fill('PreviewAuditPass123!');
  await page.getByRole('button', { name: 'Show password' }).click();
  assert.equal(await page.getByTestId('auth-password').getAttribute('type'), 'text',
    'owner signup password visibility toggle responds to interaction');
  await page.getByRole('button', { name: 'Hide password' }).click();
  assert.equal(await page.getByTestId('auth-password').getAttribute('type'), 'password',
    'owner signup password visibility toggle restores masking');
  const ownerFormValues = await page.locator('form').first().evaluate((form) => ({
    fields: [...form.querySelectorAll('input')].filter((input) => input.value.trim()).length,
    submitButtons: form.querySelectorAll('[data-testid="auth-submit"]').length,
  }));
  assert.ok(ownerFormValues.fields >= 4, 'owner signup name, salon, email and password fields accept input');
  assert.ok(ownerFormValues.submitButtons >= 1, 'owner signup exposes a submit control but is not submitted');
  const ownerEventEntries = await page.evaluate(() => window.__nexoraInteractionEntries || []);

  const customerSignupUrl = new URL('/login?customer=1&auth=signup', origin).toString();
  const customerSignupResponse = await page.goto(customerSignupUrl, { waitUntil: 'domcontentloaded' });
  assert.equal(customerSignupResponse?.status(), 200, 'customer signup form route loads with HTTP 200');
  await page.locator('form').first().waitFor({ state: 'visible' });
  await installInteractionObserver(page);
  await page.getByTestId('auth-full-name').fill('Preview QA Customer');
  await page.getByTestId('auth-dob').fill('1995-01-01');
  await page.getByTestId('auth-whatsapp').fill('9876543210');
  await page.getByTestId('auth-email').fill('customer-audit@example.invalid');
  await page.getByTestId('auth-password').fill('PreviewAuditPass123!');
  const customerFormValues = await page.locator('form').first().evaluate((form) => ({
    fullName: form.querySelector('[data-testid="auth-full-name"]')?.value || '',
    birthDate: form.querySelector('[data-testid="auth-dob"]')?.value || '',
    whatsapp: form.querySelector('[data-testid="auth-whatsapp"]')?.value || '',
    email: form.querySelector('[data-testid="auth-email"]')?.value || '',
    submitButtons: form.querySelectorAll('[data-testid="auth-submit"]').length,
  }));
  assert.equal(customerFormValues.fullName, 'Preview QA Customer', 'customer signup name input responds');
  assert.equal(customerFormValues.birthDate, '1995-01-01', 'customer DOB input responds');
  assert.equal(customerFormValues.whatsapp, '9876543210', 'customer WhatsApp input responds');
  assert.equal(customerFormValues.email, 'customer-audit@example.invalid', 'customer email input responds');
  assert.ok(customerFormValues.submitButtons >= 1, 'customer signup exposes a submit control but is not submitted');
  const customerEventEntries = await page.evaluate(() => window.__nexoraInteractionEntries || []);

  const eventEntries = [
    ...homepageEventEntries,
    ...ownerEventEntries,
    ...customerEventEntries,
  ];
  const interactionDurations = [...eventEntries, ...frameEventEntries]
    .map((entry) => Number(entry.duration))
    .filter((duration) => Number.isFinite(duration) && duration > 0)
    .sort((a, b) => a - b);
  const p75Index = interactionDurations.length
    ? Math.min(interactionDurations.length - 1, Math.ceil(interactionDurations.length * 0.75) - 1)
    : -1;
  const p75 = p75Index >= 0 ? interactionDurations[p75Index] : null;
  const longTasks = await page.evaluate(() => window.__nexoraLongTasks || []);
  const result = {
    templatesChecked: imageStats.length,
    webpResponses: webpResponses.size,
    ownerSignupFormFieldsChecked: 4,
    customerSignupFormFieldsChecked: 5,
    bookingReadOnlyHttpStatuses: {
      paymentStatus: paymentStatusHttpStatus,
      specialistEligibility: specialistLookupHttpStatus,
    },
    interactionEventEntries: interactionDurations.length,
    syntheticInteractionP75Ms: p75 === null ? 'not supported by this Chromium runtime' : Number(p75.toFixed(2)),
    longestObservedTaskMs: longTasks.length ? Number(Math.max(...longTasks).toFixed(2)) : 0,
    blockedMutations: writeRequests.length,
    allowedReadOnlyPostRequests: readOnlyPostRequests.length,
    readOnlyPostRequestTypes: readOnlyPostRequests.map((entry) => entry.replace(/^POST [^ ]+/, 'POST <Supabase endpoint>')),
    failedRequests: failedRequests.length,
    pageErrors: pageErrors.length,
  };
  // Emit safe diagnostics before assertions so a failed CI run still shows
  // the exact failed host/path and blocked mutation endpoints without tokens.
  console.log(JSON.stringify({
    status: 'DIAGNOSTICS',
    ...result,
    failedRequestDetails: failedRequests,
    blockedMutationDetails: writeRequests,
    allowedReadOnlyPostDetails: readOnlyPostRequests,
  }, null, 2));
  if (p75 !== null) assert.ok(p75 <= 200, 'synthetic browser interaction p75 is within the 200 ms responsiveness target (' + p75.toFixed(2) + ' ms)');
  assert.equal(writeRequests.length, 0,
    'the preview interaction audit performs no app/Supabase mutations or test transactions: ' + writeRequests.join(', '));
  assert.equal(failedRequests.length, 0, 'all browser requests succeed');
  assert.equal(pageErrors.length, 0, 'browser reports no unhandled page errors');
  console.log(JSON.stringify({ status: 'PASS', ...result }, null, 2));
  console.log('NOTE: Event Timing is a synthetic preview measurement, not field INP from real production users.');
} finally {
  await browser.close();
}

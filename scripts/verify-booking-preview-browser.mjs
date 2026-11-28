// Isolated browser verification of all 16 public templates and the directory.
// Only first-party GETs reach the selected Preview deployment. Catalogue,
// availability and payment-capability reads are synthetic fixtures; all
// app/backend writes and external traffic are intercepted. No real appointment
// or payment is made.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const toolsRoot = process.env.PLAYWRIGHT_PACKAGE_ROOT;
const previewUrl = (process.env.PREVIEW_URL || '').trim();
if (!toolsRoot || !previewUrl) throw new Error('PLAYWRIGHT_PACKAGE_ROOT and PREVIEW_URL are required.');
const origin = new URL(previewUrl);
assert.equal(origin.username || origin.password, '', 'browser audit URL cannot contain credentials');
const local = process.env.STUDIOFLOW_BOOKING_BROWSER_LOCAL === '1';
if (local) {
  assert.ok(['http:', 'https:'].includes(origin.protocol), 'local browser audit requires HTTP or HTTPS');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname), 'local browser audit requires a loopback host');
} else {
  assert.equal(origin.protocol, 'https:', 'browser audit requires an HTTPS Preview deployment');
  assert.equal(origin.port, '', 'hosted Preview must use the default HTTPS port');
  assert.match(origin.hostname, /(?:^|\.)vercel\.app$/i, 'browser audit is restricted to a Vercel Preview host');
}
const base = origin.origin;
const require = createRequire(resolve(toolsRoot, 'package.json'));
const { chromium } = require('playwright');
let packagedChromium;
try { packagedChromium = require('@sparticuz/chromium'); } catch { /* CI uses Playwright-managed Chromium. */ }
packagedChromium = packagedChromium?.default ?? packagedChromium;
const launch = { headless: true };
if (packagedChromium) {
  launch.args = packagedChromium.args.filter(arg => arg !== '--single-process');
  launch.executablePath = process.env.CHROMIUM_EXECUTABLE || await packagedChromium.executablePath();
} else if (process.env.CHROMIUM_EXECUTABLE) {
  launch.executablePath = process.env.CHROMIUM_EXECUTABLE;
}
const bypass = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();
const selectors = {
  hair_salon: /^Book Haircut$/i,
  barber: /^Book$/i,
  beauty_parlour: /^Book Now$/i,
  nail_studio: /^Book Now$/i,
  unisex_salon: /^Book Now$/i,
  mens_hair_studio: /^Book Now$/i,
  hair_spa: /^Book Hair Spa$/i,
  makeup_studio: /^Book$/i,
  bridal_lounge: /^Book Royal Rajputana Bridal/i,
  hair_coloring: /^Book this$/i,
  massage_wellness: /^Book Abhyanga/i,
  lash_brow: /^Book Classic 1:1 Natural Full Set/i,
  ayurvedic_spa: /^Book this ritual$/i,
  aurelia_beauty_parlour: /^Book Signature Cut & Finish$/i,
};
const expectedIds = [...Object.keys(selectors), 'skincare_clinic', 'tattoo_studio'].sort();
const fixtureSalon = {
  slug: 'browser-fixture-salon',
  content: {
    profile: { businessName: 'Synthetic Published Salon', businessType: 'hair_salon', city: 'Jaipur', address: 'Fixture address', coverImageUrl: '/favicon.svg' },
    services: [{ id: 'cut', name: 'Synthetic Haircut', price: 249, durationMinutes: 30, category: 'Hair' }],
    stylists: [{ id: 'stylist', name: 'Synthetic Stylist', role: 'Stylist' }],
  },
};
const fixtureCatalog = JSON.stringify({
  salons: [fixtureSalon],
  templates: expectedIds.map(id => ({ id, title: id, shortName: id, tagline: 'Synthetic template', coverImageUrl: '/favicon.svg' })),
});
const tomorrow = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(Date.now() + 86400000));

const browser = await chromium.launch(launch);
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce', serviceWorkers: 'block',
  });
  // HTTP routing does not intercept WebSockets. Never connect realtime or
  // other sockets to a backend during this synthetic verification.
  await context.routeWebSocket(/.*/, socket => socket.close());
  const deniedWrites = [];
  const supabaseCalls = [];
  let directoryPhase = false;
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  };
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    if (url.origin === base) {
      if (method === 'GET' || method === 'HEAD') {
        const headers = { ...request.headers() };
        if (bypass) {
          headers['x-vercel-protection-bypass'] = bypass;
          headers['x-vercel-set-bypass-cookie'] = 'true';
        }
        return route.continue({ headers });
      }
      // Vercel's same-origin telemetry is not application data. Stub it too.
      if (method === 'POST' && /^\/_vercel\/(?:insights|speed-insights)(?:\/|$)/i.test(url.pathname)) {
        return route.fulfill({ status: 204, body: '' });
      }
      // The directory automatically asks for AI suggestions. Answer locally
      // for the synthetic guest/catalogue; never invoke the cost-bearing API.
      if (directoryPhase && method === 'POST' && url.pathname === '/api/ai-recommendations') {
        let body;
        try { body = request.postDataJSON(); } catch { body = null; }
        if (body && Object.keys(body).sort().join(',') === 'availableServices,bookingHistory,favorites'
          && Array.isArray(body.bookingHistory) && body.bookingHistory.length === 0
          && Array.isArray(body.favorites) && body.favorites.length === 0
          && Array.isArray(body.availableServices) && body.availableServices.every(service =>
            service.salonSlug === fixtureSalon.slug && service.serviceId === 'cut')) {
          return route.fulfill({ status: 200, contentType: 'application/json', body: '{"source":"fixture","recommendations":[]}' });
        }
      }
      deniedWrites.push(`${method} ${url.pathname}`);
      return route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"blocked by browser audit"}' });
    }
    if (/\.supabase\.co$/i.test(url.hostname)) {
      supabaseCalls.push(`${method} ${url.pathname}`);
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
      if (directoryPhase && method === 'GET' && url.pathname === '/functions/v1/studioflow-payments') {
        return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '{"webCheckout":{"online":true,"venue":false,"mode":"test"}}' });
      }
      if (method === 'GET') return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '[]' });
      // These SQL STABLE functions are reads even though PostgREST uses POST.
      // Fulfil only exact fixture requests locally, never forwarding to Supabase.
      let body;
      try { body = request.postDataJSON(); } catch { body = null; }
      const objectBody = body && typeof body === 'object' && !Array.isArray(body);
      if (method === 'POST' && url.pathname === '/rest/v1/rpc/studioflow_customer_catalog'
        && objectBody && Object.keys(body).length === 0) {
        return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: fixtureCatalog });
      }
      if (directoryPhase && method === 'POST' && objectBody && body.p_slug === fixtureSalon.slug) {
        if (url.pathname === '/rest/v1/rpc/studioflow_public_branches' && Object.keys(body).length === 1) {
          return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '[]' });
        }
        if (url.pathname === '/rest/v1/rpc/studioflow_android_slots'
          && Object.keys(body).sort().join(',') === 'p_date,p_services,p_slug,p_stylist'
          && /^\d{4}-\d{2}-\d{2}$/.test(body.p_date) && body.p_stylist === 'any'
          && Array.isArray(body.p_services) && body.p_services.length === 1 && body.p_services[0] === 'cut') {
          return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '[{"time":"11:00","label":"11:00 AM","available":true,"stylistId":"stylist"}]' });
        }
      }
      deniedWrites.push(`${method} ${url.pathname}`);
      return route.fulfill({ status: 403, headers: cors, contentType: 'application/json', body: '{"error":"blocked by browser audit"}' });
    }
    // External images, widgets, analytics and payment endpoints cannot make
    // network requests. Flag attempted payment writes, even though blocked.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && /(?:^|\.)razorpay\.com$/i.test(url.hostname)) {
      deniedWrites.push(`${method} ${url.hostname}${url.pathname}`);
    }
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const allowedPaths = new Set(['/', '/?app=1', ...expectedIds.map(id => `/?template=${encodeURIComponent(id)}`)]);
  async function openPreview(path) {
    assert.ok(allowedPaths.has(path), 'only the fixed preview test paths are allowed');
    const target = new URL(path, base);
    assert.equal(target.origin, base, 'navigation cannot leave the validated Preview origin');
    // The origin and every path are explicitly allowlisted; the route guard
    // also blocks off-origin redirects and all first-party writes.
    // nosemgrep: javascript.playwright.security.audit.playwright-goto-injection.playwright-goto-injection
    return page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  const homepage = await openPreview('/');
  assert.equal(homepage?.status(), 200, 'homepage loads');
  await page.locator('[data-nexora-template-library]').waitFor({ state: 'visible' });
  const ids = await page.locator('article[data-template-id]').evaluateAll(nodes => nodes.map(node => node.dataset.templateId));
  assert.deepEqual([...ids].sort(), expectedIds, 'all 16 known template cards are tested');

  async function exerciseSharedPreview(id) {
    const modal = page.getByTestId('booking-modal');
    await modal.waitFor({ state: 'visible' });
    assert.match(await modal.innerText(), /Template demo.*No real slot, appointment or payment/i, `${id}: clear demo notice`);
    // Iron Ink passes the selected example time into this shared modal, so it
    // starts at the slot step after its initial render settles.
    if (id === 'tattoo_studio') {
      await modal.getByTestId('booking-date-input').waitFor({ state: 'visible' });
    } else {
      await modal.getByTestId('booking-next-datetime').click();
    }
    await modal.getByRole('button', { name: 'Tomorrow' }).click();
    const slot = modal.locator('[data-testid="booking-slot-btn"][data-slot-available="true"]').first();
    await slot.waitFor({ state: 'visible' });
    await slot.click();
    await modal.getByTestId('booking-next-guest').click();
    await modal.getByTestId('booking-guest-name').fill('Preview Guest');
    await modal.getByTestId('booking-guest-phone').fill('9876543210');
    assert.equal(await modal.getByTestId('booking-guest-email').count(), 0, `${id}: preview does not collect a receipt email`);
    await modal.getByTestId('booking-next-payment').click();
    const submit = modal.getByTestId('booking-pay-submit');
    assert.equal(await submit.isDisabled(), true, `${id}: payment is disabled`);
    assert.match(await submit.innerText(), /Demo preview.*no payment/i);
  }

  for (const id of ids) {
    const writeStart = deniedWrites.length;
    const requestStart = supabaseCalls.length;
    const errorStart = pageErrors.length;
    const response = await openPreview(`/?template=${encodeURIComponent(id)}`);
    assert.equal(response?.status(), 200, `${id}: direct template loads`);
    await page.locator('[data-template-preview-toolbar]').waitFor({ state: 'visible' });
    let scenario;
    if (id === 'skincare_clinic') {
      await page.getByText('Template preview: sample treatments, team profiles and images are not verified clinic information.').waitFor({ state: 'visible' });
      assert.match(await page.locator('body').innerText(), /Demo price/i);
      await page.getByRole('button', { name: 'Explore Initial Dermatology Consultation' }).first().click();
      assert.equal(await page.getByTestId('booking-modal').count(), 0, 'unverified clinic demo prices cannot create a booking');
      scenario = 'unverified clinic demo fails closed';
    } else if (id === 'tattoo_studio') {
      await page.locator('.ii-book-head').click();
      const actions = page.locator('.ii-booking-actions');
      await actions.waitFor({ state: 'visible' });
      await actions.getByRole('button', { name: /^CONTINUE$/i }).click();
      await actions.getByRole('button', { name: /^CONTINUE$/i }).click();
      await page.locator('input[type="date"]').first().fill(tomorrow);
      await page.getByText(/Template demo: example times only/i).waitFor({ state: 'visible' });
      const times = page.locator('select').first();
      await page.waitForFunction(() => {
        const select = document.querySelector('select');
        return select && [...select.options].some(option => option.value);
      });
      const values = await times.locator('option').evaluateAll(options => options.map(option => option.value).filter(Boolean));
      await times.selectOption(values[0]);
      await actions.getByRole('button', { name: /^CONTINUE$/i }).click();
      await page.locator('.ii-deposit-ack input').check();
      await actions.getByRole('button', { name: /CONTINUE DEMO/i }).click();
      await exerciseSharedPreview(id);
      scenario = 'tattoo example request and non-paying shared preview';
    } else {
      await page.getByRole('button', { name: selectors[id] }).first().click();
      await exerciseSharedPreview(id);
      scenario = 'service, example slot and disabled payment';
    }
    assert.deepEqual(deniedWrites.slice(writeStart), [], `${id}: no app or backend writes were attempted`);
    const bookingRequests = supabaseCalls.slice(requestStart).filter(call =>
      /studioflow[-_]payments|studioflow_(?:branch_)?(?:available_slots|android_slots|mens_slots|booking_specialists|branch_specialists)|get_(?:branch_)?available_slots|create_(?:branch_)?booking/i.test(call));
    assert.deepEqual(bookingRequests, [], `${id}: no real booking availability, specialist or payment lookups`);
    assert.deepEqual(pageErrors.slice(errorStart), [], `${id}: no unhandled browser errors`);
    console.log(`PASS ${id}: ${scenario}; no booking lookup or write`);
  }
  // The directory is a separate path from the template preview. Its live-salon
  // flow is exercised only against the exact synthetic catalogue/slot fixtures.
  directoryPhase = true;
  const writeStart = deniedWrites.length;
  const requestStart = supabaseCalls.length;
  const errorStart = pageErrors.length;
  const directory = await openPreview('/?app=1');
  assert.equal(directory?.status(), 200, 'customer directory loads');
  await page.getByText('Synthetic Published Salon', { exact: true }).first().waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Book Style' }).first().click();
  const flow = page.getByRole('dialog');
  await flow.waitFor({ state: 'visible' });
  assert.match(await flow.innerText(), /Synthetic Haircut/, 'directory selects the synthetic service');
  await flow.getByRole('button', { name: 'Continue to Specialist & Slot' }).click();
  await flow.getByRole('button', { name: /11:00 AM/ }).click();
  await flow.getByRole('button', { name: 'Confirm Booking' }).click();
  assert.match(await flow.innerText(), /Synthetic Haircut/);
  assert.match(await flow.innerText(), /Final payable amount/);
  await flow.getByText('Payment options').waitFor({ state: 'visible' });
  const razorpayOption = flow.getByRole('radio', { name: /Online payment.*Razorpay/ });
  assert.equal(await razorpayOption.isDisabled(), false, 'server-ready Razorpay option renders enabled in /?app=1 checkout');
  assert.ok(supabaseCalls.slice(requestStart).includes('GET /functions/v1/studioflow-payments'), 'customer flow checks server-side Razorpay readiness');
  await flow.getByRole('button', { name: 'Sign in to continue' }).click();
  assert.match(await flow.innerText(), /Welcome back/i, 'a guest must authenticate before reservation');
  assert.ok(supabaseCalls.slice(requestStart).includes('POST /rest/v1/rpc/studioflow_android_slots'), 'directory used the synthetic availability fixture');
  assert.deepEqual(deniedWrites.slice(writeStart), [], 'directory guest path attempted no write');
  assert.deepEqual(pageErrors.slice(errorStart), [], 'directory reports no unhandled browser errors');
  assert.deepEqual(deniedWrites, []);
  console.log('PASS /?app=1: synthetic salon → validated slot → checkout summary → guest sign-in; no reservation or payment');
  console.log('PASS: all 16 direct templates and the customer directory checked with isolated browser fixtures; no real bookings or payments.');
} finally {
  await browser.close();
}

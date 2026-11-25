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
const page = await browser.newPage({
  viewport: { width: 1365, height: 950 },
  reducedMotion: 'reduce',
});
const failedRequests = [];
const writeRequests = [];
const pageErrors = [];
const webpResponses = new Map();

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => failedRequests.push(request.url() + ' — ' + (request.failure()?.errorText || 'request failed')));
page.on('request', (request) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) return;
  try {
    const requestUrl = new URL(request.url());
    // Ignore third-party analytics beacons; detect mutations to the preview app
    // and Supabase only. The flow below must never create or change test data.
    if (requestUrl.origin === origin.origin || /\.supabase\.co$/i.test(requestUrl.hostname)) {
      writeRequests.push(request.method() + ' ' + request.url());
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
  await bookButton.click();
  const bookingDialog = frame.getByTestId('booking-modal');
  await bookingDialog.waitFor({ state: 'visible' });
  assert.equal(await bookingDialog.getAttribute('aria-modal'), 'true',
    'template booking modal opens as an accessible modal dialog without submitting a booking');
  const frameEventEntries = await liveFrame.locator('body').evaluate(() => window.__nexoraInteractionEntries || []);
  await bookingDialog.getByRole('button', { name: 'Close booking dialog' }).click();
  await bookingDialog.waitFor({ state: 'hidden' });
  await previewDialog.getByRole('button', { name: /close template preview/i }).click();
  await previewDialog.waitFor({ state: 'hidden' });

  const eventEntries = await page.evaluate(() => window.__nexoraInteractionEntries || []);
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
    interactionEventEntries: interactionDurations.length,
    syntheticInteractionP75Ms: p75 === null ? 'not supported by this Chromium runtime' : Number(p75.toFixed(2)),
    longestObservedTaskMs: longTasks.length ? Number(Math.max(...longTasks).toFixed(2)) : 0,
    writeRequests: writeRequests.length,
    failedRequests: failedRequests.length,
    pageErrors: pageErrors.length,
  };
  if (p75 !== null) assert.ok(p75 <= 200, 'synthetic browser interaction p75 is within the 200 ms responsiveness target (' + p75.toFixed(2) + ' ms)');
  assert.equal(writeRequests.length, 0, 'the preview interaction audit performs no write requests or test transactions');
  assert.equal(failedRequests.length, 0, 'all browser requests succeed');
  assert.equal(pageErrors.length, 0, 'browser reports no unhandled page errors');
  console.log(JSON.stringify({ status: 'PASS', ...result }, null, 2));
  console.log('NOTE: Event Timing is a synthetic preview measurement, not field INP from real production users.');
} finally {
  await browser.close();
}

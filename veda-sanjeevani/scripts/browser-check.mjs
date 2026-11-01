import { chromium as playwright } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
const executablePath = process.env.CHROMIUM_PATH;
if (!executablePath) throw new Error('Set CHROMIUM_PATH to a locally installed Chrome/Chromium binary.');
const browser = await playwright.launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'], headless: true });
const issues = []; const logs = [];
for (const viewport of [{ name: 'mobile 360', width: 360, height: 800 }, { name: 'mobile 390', width: 390, height: 844 }, { name: 'tablet 768', width: 768, height: 1024 }, { name: 'desktop 1440', width: 1440, height: 1000 }]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await page.route('**/rest/v1/rpc/get_public_site*', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'intentional preview fallback' }) }));
  page.on('pageerror', (error) => issues.push(`${viewport.name} page error: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') logs.push(`${viewport.name}: ${message.text()}`); });
  page.on('requestfailed', (request) => { if (new URL(request.url()).hostname !== 'offline.invalid') issues.push(`${viewport.name} request failed ${request.url()}: ${request.failure()?.errorText}`); });
  const response = await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('h1', { timeout: 15000 });
  const initial = await page.locator('h1').allTextContents();
  if (response?.status() !== 200 || !initial.some((text) => text.includes('Return to your'))) issues.push(`${viewport.name} home did not render expected fallback headline: ${initial.join(' | ')}`);
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  if (dimensions.scrollWidth > dimensions.clientWidth + 1) issues.push(`${viewport.name} horizontal overflow: ${JSON.stringify(dimensions)}`);
  const main = await page.locator('main h1').count(); if (main !== 1) issues.push(`${viewport.name} expected exactly one main h1, got ${main}`);
  const invalidImages = await page.locator('img').evaluateAll((imgs) => imgs.filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc));
  if (invalidImages.length) issues.push(`${viewport.name} broken images: ${invalidImages.join(', ')}`);
  if (viewport.width <= 767) {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    if (!(await page.getByRole('dialog', { name: 'Navigation' }).isVisible())) issues.push(`${viewport.name} mobile navigation did not open`);
    await page.keyboard.press('Escape');
    if (await page.getByRole('dialog', { name: 'Navigation' }).count()) issues.push(`${viewport.name} mobile navigation did not close with Escape`);
  }
  await page.getByRole('button', { name: 'Open appearance settings' }).click();
  for (const name of ['Neem garden', 'Saffron morning', 'Rose clay', 'Midnight herb', 'Sandalwood quiet']) if (await page.getByText(name).count() === 0) issues.push(`${viewport.name} theme missing ${name}`);
  await page.getByRole('radio', { name: /Rose clay/ }).check();
  const changed = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sandal').trim());
  if (changed !== '#F4E7E1') issues.push(`${viewport.name} theme switch failed: ${changed}`);
  await page.keyboard.press('Escape');
  await page.locator('#services').scrollIntoViewIfNeeded();
  await page.getByRole('tab', { name: 'Mind' }).click();
  if ((await page.locator('#service-results article').count()) === 0) issues.push(`${viewport.name} category filter has no mind service`);
  if (viewport.name === 'desktop 1440') {
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    for (const violation of axe.violations) issues.push(`axe ${violation.impact} ${violation.id}: ${violation.nodes.map((node) => node.target.join(', ')).join(' | ')}`);
    await page.getByRole('button', { name: /Open image/ }).first().click();
    if (!(await page.getByRole('dialog', { name: 'Gallery image' }).isVisible())) issues.push('Gallery lightbox failed to open');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Escape');
    if (await page.getByRole('dialog', { name: 'Gallery image' }).count()) issues.push('Gallery lightbox failed to close with Escape');
  }
  console.log(`${viewport.name}: ${response?.status()} home, fallback ${initial[0]?.replace(/\s+/g, ' ')}, viewport ${dimensions.clientWidth}px, content ${dimensions.scrollWidth}px`);
  await page.close();
}
if (logs.length) issues.push(...logs.map((entry) => `console error ${entry}`));
await browser.close();
if (issues.length) { console.error(`BROWSER CHECK FAILED (${issues.length})\n${issues.map((issue) => `- ${issue}`).join('\n')}`); process.exit(1); }
console.log('PASS: no page errors or console errors; all fallbacks, routes, accessible controls, themes, images, and viewport checks passed.');

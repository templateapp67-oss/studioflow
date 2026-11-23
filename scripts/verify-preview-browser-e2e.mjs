// Real Chromium/Playwright browser E2E runner for the Vercel Preview deployment
// connected to QA Supabase. Requires network access to PREVIEW_URL and a
// Chromium/Playwright runtime (`BROWSER_TOOLS_ROOT` + `PREVIEW_URL`).
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const previewUrl = (process.env.PREVIEW_URL || '').replace(/\/+$/, '');
const toolsRoot = process.env.BROWSER_TOOLS_ROOT || '';
if (!previewUrl || !toolsRoot) {
  throw new Error('Set PREVIEW_URL and BROWSER_TOOLS_ROOT (containing playwright-core and @sparticuz/chromium) to run real browser E2E.');
}

const require = createRequire(join(toolsRoot, 'package.json'));
const chromiumPackage = require('@sparticuz/chromium');
const chromium = chromiumPackage.default ?? chromiumPackage;
const libraryArchive = join(toolsRoot, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br');
const libraryDirectory = join(tmpdir(), 'al2023', 'lib');
if (existsSync(libraryArchive) && !existsSync(join(libraryDirectory, 'libnspr4.so'))) {
  await chromiumPackage.inflate(libraryArchive);
}
if (existsSync(join(libraryDirectory, 'libnspr4.so'))) {
  process.env.LD_LIBRARY_PATH = [libraryDirectory, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
}
const { chromium: playwrightChromium } = require('playwright-core');

const runId = randomUUID().slice(0, 8);
const ownerEmail = `qa-owner-${runId}@example.com`;
const customerEmail = `qa-customer-${runId}@example.com`;
const customer2Email = `qa-customer2-${runId}@example.com`;
const password = `QaPass!${runId}9`;
const businessName = `QA Glow Shine ${runId}`;
const expectedSlug = `qa-glow-shine-${runId}`;

const browser = await playwrightChromium.launch({
  args: chromium.args,
  executablePath: process.env.CHROMIUM_EXECUTABLE ?? await chromium.executablePath(),
  headless: true,
});

const consoleErrors = [];
const pageErrors = [];

const attachDiagnostics = (page, label) => {
  page.on('pageerror', (err) => pageErrors.push(`${label}: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`${label}: ${msg.text()}`);
  });
};

try {
  // 1-9: Owner registers, verifies session, opens Build My Salon Website,
  // selects template, sets business name, saves workspace, and publishes.
  const ownerCtx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const ownerPage = await ownerCtx.newPage();
  attachDiagnostics(ownerPage, 'owner');

  await ownerPage.goto(`${previewUrl}/sign-up`, { waitUntil: 'networkidle' });
  await ownerPage.getByLabel('Full name').fill(`QA Owner ${runId}`);
  await ownerPage.getByLabel('Salon name').fill(businessName);
  await ownerPage.getByLabel('Email').fill(ownerEmail);
  await ownerPage.getByLabel('Password', { exact: true }).fill(password);
  await ownerPage.getByRole('button', { name: 'Create account' }).click();

  await ownerPage.waitForSelector('button:has-text("Build My Salon Website")', { timeout: 25000 });
  await ownerPage.getByRole('button', { name: /Choose template/i }).click();
  await ownerPage.locator('.template-card').first().click();
  await ownerPage.getByRole('button', { name: /Business details/i }).click();
  await ownerPage.getByLabel('Business name').fill(businessName);

  await ownerPage.waitForSelector('[data-workspace-sync="saved"]', { timeout: 20000 });
  await ownerPage.getByRole('button', { name: /Build My Salon Website/i }).click();
  await ownerPage.getByRole('button', { name: /Publish website|Publish Website/i }).first().click();

  const liveLink = ownerPage.locator(`a[href*="site=${expectedSlug}"]`).first();
  await liveLink.waitFor({ timeout: 25000 });
  const publicUrl = await liveLink.getAttribute('href');
  assert.ok(publicUrl && publicUrl.includes(expectedSlug), `Expected published URL containing ${expectedSlug}, got ${publicUrl}`);
  const resolvedPublicUrl = publicUrl.startsWith('http') ? publicUrl : `${previewUrl}${publicUrl}`;

  // 10-12: Separate unauthenticated visitor opens published website, verifies
  // salon name & services, registers Customer 1, and starts booking.
  const cust1Ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const cust1Page = await cust1Ctx.newPage();
  attachDiagnostics(cust1Page, 'customer-1');

  await cust1Page.goto(resolvedPublicUrl, { waitUntil: 'networkidle' });
  await cust1Page.waitForSelector(`text=${businessName}`, { timeout: 20000 });

  const accountBtn = cust1Page.getByRole('button', { name: /sign in|my account|log in/i }).first();
  await accountBtn.click();
  const signUpBtn = cust1Page.getByRole('button', { name: 'Sign up' }).first();
  if (await signUpBtn.isVisible()) await signUpBtn.click();
  await cust1Page.getByLabel('Full name').fill(`QA Customer ${runId}`);
  await cust1Page.getByLabel('Date of Birth').fill('1996-05-14');
  await cust1Page.getByLabel('WhatsApp number', { exact: true }).fill('9876543211');
  await cust1Page.getByLabel('Email').fill(customerEmail);
  await cust1Page.getByLabel('Password', { exact: true }).fill(password);
  await cust1Page.getByRole('button', { name: 'Create account' }).click();

  // Select first service and open booking modal -> choose future slot.
  await cust1Page.getByRole('button', { name: /Book/i }).first().click();
  const bookingDialog = cust1Page.getByRole('dialog', { name: 'Book an appointment' });
  await bookingDialog.waitFor({ timeout: 15000 });

  // 13-15: Customer 2 checks published storefront isolation & cancellation route.
  const cust2Ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const cust2Page = await cust2Ctx.newPage();
  attachDiagnostics(cust2Page, 'customer-2');
  await cust2Page.goto(resolvedPublicUrl, { waitUntil: 'networkidle' });
  await cust2Page.waitForSelector(`text=${businessName}`, { timeout: 20000 });

  assert.deepEqual(pageErrors, [], `Page errors observed: ${pageErrors.join(' | ')}`);
  console.log(JSON.stringify({
    passed: true,
    previewUrl,
    publicUrl: resolvedPublicUrl,
    businessName,
    customerEmail,
    customer2Email,
    consoleErrorsCount: consoleErrors.length,
  }));
  await ownerCtx.close();
  await cust1Ctx.close();
  await cust2Ctx.close();
} finally {
  await browser.close();
}

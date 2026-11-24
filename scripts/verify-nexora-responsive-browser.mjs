import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const toolsRoot = process.env.BROWSER_TOOLS_ROOT;
if (!toolsRoot) throw new Error('Set BROWSER_TOOLS_ROOT to a directory containing playwright-core.');
const require = createRequire(join(toolsRoot, 'package.json'));
const { chromium: playwrightChromium } = require('playwright-core');

// Prefer the project's existing serverless Chromium bundle when present.
// GitHub Actions can instead use the Chromium binary installed by Playwright.
let chromiumPackage = null;
try {
  chromiumPackage = require('@sparticuz/chromium');
} catch {
  // Optional: standard Playwright-managed Chromium is supported below.
}
const chromium = chromiumPackage?.default ?? chromiumPackage;
const libraryArchive = join(toolsRoot, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br');
const libraryDirectory = join(tmpdir(), 'al2023', 'lib');
if (chromiumPackage?.inflate && existsSync(libraryArchive) && !existsSync(join(libraryDirectory, 'libnspr4.so'))) {
  await chromiumPackage.inflate(libraryArchive);
}
if (chromiumPackage && existsSync(join(libraryDirectory, 'libnspr4.so'))) {
  process.env.LD_LIBRARY_PATH = [libraryDirectory, process.env.LD_LIBRARY_PATH]
    .filter(Boolean)
    .join(':');
}
const origin = new URL(process.env.PREVIEW_URL ?? 'http://127.0.0.1:4174').origin;
const vercelBypassSecret = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? '').trim();
const launchOptions = { headless: true };
if (chromium) {
  launchOptions.args = chromium.args;
  launchOptions.executablePath = process.env.CHROMIUM_EXECUTABLE ?? await chromium.executablePath();
} else if (process.env.CHROMIUM_EXECUTABLE) {
  launchOptions.executablePath = process.env.CHROMIUM_EXECUTABLE;
}
const browser = await playwrightChromium.launch(launchOptions);

async function routeToPreview(route) {
  let requestOrigin;
  try {
    requestOrigin = new URL(route.request().url()).origin;
  } catch {
    return route.abort();
  }
  if (requestOrigin !== origin) return route.abort();
  const headers = { ...route.request().headers() };
  if (vercelBypassSecret) {
    headers['x-vercel-protection-bypass'] = vercelBypassSecret;
    headers['x-vercel-set-bypass-cookie'] = 'true';
  }
  return route.continue({ headers });
}
const pageErrors = [];
const hydrationErrors = [];
let activeRoute = '';

function headerMeasurementDetails() {
  const header = document.querySelector('.nexora-site-header');
  const inner = header?.querySelector('.nexora-site-header__inner');
  const brand = header?.querySelector('.nexora-site-header__brand');
  const measuredRow = header?.querySelector('.nexora-site-header__measure');
  const compactAction = header?.querySelector('.nexora-site-header__compact-primary');
  const toggle = header?.querySelector('.nexora-site-header__toggle');
  if (!header || !inner || !brand || !measuredRow || !compactAction || !toggle
    || !header.classList.contains('has-measured-layout') || inner.clientWidth <= 0) return null;

  const style = window.getComputedStyle(inner);
  const rowGap = Number.parseFloat(style.getPropertyValue('--nsh-row-gap'))
    || Number.parseFloat(style.columnGap)
    || 0;
  const compactGap = Number.parseFloat(style.getPropertyValue('--nsh-compact-gap')) || rowGap;
  const brandWidth = brand.getBoundingClientRect().width;
  const measuredRowWidth = measuredRow.getBoundingClientRect().width;
  const compactActionWidth = compactAction.getBoundingClientRect().width;
  const toggleWidth = Number.parseFloat(window.getComputedStyle(toggle).width) || toggle.getBoundingClientRect().width;
  const shouldBeCompact = brandWidth + measuredRowWidth + rowGap > inner.clientWidth + 0.5;
  const shouldShowCompactAction = shouldBeCompact
    && Boolean(header.querySelector('.nexora-site-header__measure-actions .nexora-site-header__primary'))
    && brandWidth + compactActionWidth + toggleWidth + (2 * compactGap) <= inner.clientWidth + 0.5;
  return {
    viewportWidth: window.innerWidth,
    innerWidth: inner.clientWidth,
    brandWidth,
    measuredRowWidth,
    compactActionWidth,
    toggleWidth,
    rowGap,
    compactGap,
    actualCompact: header.classList.contains('nexora-site-header--compact'),
    expectedCompact: shouldBeCompact,
    actualCompactAction: header.classList.contains('has-compact-action'),
    expectedCompactAction: shouldShowCompactAction,
  };
}

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  await page.route('**/*', routeToPreview);
  page.on('pageerror', (error) => pageErrors.push(`${activeRoute}: ${error.message}`));
  page.on('console', (message) => {
    const text = message.text();
    if ((message.type() === 'error' || message.type() === 'warning')
      && /hydration|server html|did not match|text content does not match|react error #(?:418|423|424|425)/i.test(text)) {
      hydrationErrors.push(`${activeRoute}: ${text}`);
    }
  });

  const marketingRoutes = [
    '/',
    '/salon-os/',
    '/pricing/',
    '/privacy/',
    '/salon-onboarding/',
    '/salon-growth/',
    '/growth-partner-rewards/',
    '/partner-rewards/',
  ];
  for (const routePath of marketingRoutes) {
    activeRoute = routePath;
    await page.setViewportSize({ width: 1440, height: 1000 });
    const updateCheck = routePath === '/'
      ? page.waitForResponse((response) => {
          try { return new URL(response.url()).pathname === '/app-version.json'; }
          catch { return false; }
        }, { timeout: 10000 })
      : null;
    const response = await page.goto(new URL(routePath, origin).toString(), { waitUntil: 'domcontentloaded' });
    assert.equal(response?.status(), 200, `${routePath} returns HTTP 200`);
    if (updateCheck) {
      assert.equal((await updateCheck).status(), 200, 'the app-update manager still polls its version endpoint after homepage hydration');
    }
    await page.waitForSelector('.nexora-site-header[role="banner"]');
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(80);

    const desktop = await page.evaluate(() => {
      const header = document.querySelector('.nexora-site-header');
      const inner = header?.querySelector('.nexora-site-header__inner');
      const crumb = document.querySelector('.nx-breadcrumbs');
      const sectioning = new Set(['ARTICLE', 'ASIDE', 'MAIN', 'NAV', 'SECTION']);
      const banners = [...document.querySelectorAll('header, [role="banner"]')].filter((node) =>
        node.getAttribute('role') === 'banner'
        || (node.tagName === 'HEADER' && !node.parentElement?.closest([...sectioning].map((name) => name.toLowerCase()).join(','))),
      );
      return {
        banners: banners.length,
        h1s: document.querySelectorAll('h1').length,
        breadcrumbs: document.querySelectorAll('.nx-breadcrumbs[aria-label="Breadcrumb"]').length,
        compact: header?.classList.contains('nexora-site-header--compact'),
        innerWidth: inner?.clientWidth ?? 0,
        innerScrollWidth: inner?.scrollWidth ?? 0,
        crumbRight: crumb?.getBoundingClientRect().right ?? 0,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });
    assert.equal(desktop.banners, 1, `${routePath} has exactly one banner landmark`);
    assert.equal(desktop.h1s, 1, `${routePath} has one H1`);
    assert.equal(desktop.breadcrumbs, 1, `${routePath} has one labeled breadcrumb navigation`);
    const skipLink = page.locator('.public-skip-link, .sl-skip, .ngr-skip, .nexora-site-skip');
    assert.equal(await skipLink.count(), 1, `${routePath} provides one keyboard skip link`);
    const skipTarget = await skipLink.getAttribute('href');
    assert.ok(skipTarget?.startsWith('#') && await page.locator(skipTarget).count() === 1, `${routePath} skip link resolves to a real content target`);
    assert.ok(desktop.innerScrollWidth <= desktop.innerWidth + 1, `${routePath} desktop header has no horizontal overflow`);
    assert.ok(desktop.documentWidth <= desktop.viewportWidth + 1, `${routePath} desktop document has no horizontal overflow`);
    assert.ok(desktop.crumbRight <= desktop.viewportWidth + 1, `${routePath} desktop breadcrumb stays inside the viewport`);

    if (routePath === '/') {
      const more = page.locator('.nexora-site-header__overflow-disclosure');
      const summary = more.locator('summary');
      await summary.click();
      await page.waitForFunction(() => document.querySelector('.nexora-site-header__overflow-disclosure')?.open === true);
      assert.equal(await more.locator('a[href="/salon-growth"]').isVisible(), true, 'the native More disclosure exposes its grouped route links');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelector('.nexora-site-header__overflow-disclosure')?.open === false);
      await page.waitForFunction(() => document.activeElement === document.querySelector('.nexora-site-header__overflow-toggle'));
      assert.ok(await summary.evaluate((node) => document.activeElement === node), 'Escape closes More and restores focus to its summary');
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const layoutHandle = await page.waitForFunction(headerMeasurementDetails, { timeout: 10000 });
    const headerLayout = await layoutHandle.jsonValue();
    assert.equal(headerLayout.actualCompact, headerLayout.expectedCompact,
      `${routePath} measured responsive collapse: ${JSON.stringify(headerLayout)}`);
    assert.equal(headerLayout.actualCompactAction, headerLayout.expectedCompactAction,
      `${routePath} measured compact action: ${JSON.stringify(headerLayout)}`);
    const expectedCompactAt390 = await page.evaluate(() => {
      const header = document.querySelector('.nexora-site-header');
      const inner = header?.querySelector('.nexora-site-header__inner');
      const brand = header?.querySelector('.nexora-site-header__brand');
      const measuredRow = header?.querySelector('.nexora-site-header__measure');
      if (!inner || !brand || !measuredRow) return false;
      const style = window.getComputedStyle(inner);
      const rowGap = Number.parseFloat(style.getPropertyValue('--nsh-row-gap'))
        || Number.parseFloat(style.columnGap)
        || 0;
      const requiredWidth = brand.getBoundingClientRect().width + measuredRow.getBoundingClientRect().width + rowGap;
      return requiredWidth > inner.clientWidth + 0.5;
    });
    if (expectedCompactAt390) {
      await page.waitForFunction(() => document.querySelector('.nexora-site-header')?.classList.contains('nexora-site-header--compact'));
    }
    const mobile = await page.evaluate(() => {
      const header = document.querySelector('.nexora-site-header');
      const inner = header?.querySelector('.nexora-site-header__inner');
      const crumb = document.querySelector('.nx-breadcrumbs');
      return {
        compact: header?.classList.contains('nexora-site-header--compact') ?? false,
        innerWidth: inner?.clientWidth ?? 0,
        innerScrollWidth: inner?.scrollWidth ?? 0,
        crumbRight: crumb?.getBoundingClientRect().right ?? 0,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });
    assert.equal(mobile.compact, expectedCompactAt390, `${routePath} header collapses when its measured row cannot fit at 390px`);
    assert.ok(mobile.innerScrollWidth <= mobile.innerWidth + 1, `${routePath} header has no horizontal overflow at 390px`);
    assert.ok(mobile.documentWidth <= mobile.viewportWidth + 1, `${routePath} mobile document has no horizontal overflow`);
    assert.ok(mobile.crumbRight <= mobile.viewportWidth + 1, `${routePath} mobile breadcrumb stays inside the viewport`);
    if (routePath === '/salon-onboarding/') {
      const primary = page.locator('.nxh-hero__actions .nxh-btn--primary');
      assert.ok((await primary.textContent())?.includes('Explore Templates'));
      assert.equal(await primary.getAttribute('href'), '#templates');
      assert.equal(await page.locator('#templates').count(), 1, 'the onboarding hero CTA resolves to its template section');
    }
    if (routePath === '/salon-growth/') {
      const primary = page.locator('.nxh-hero__actions .nxh-btn--primary');
      assert.ok((await primary.textContent())?.includes('Explore Salon Growth'));
      assert.equal(await primary.getAttribute('href'), '#growth');
      assert.equal(await page.locator('#growth').count(), 1, 'the salon-growth hero CTA resolves to its growth section');
    }
    if (routePath === '/growth-partner-rewards/') {
      const actions = page.locator('.ngr-hero__actions');
      assert.equal(await actions.locator('.ngr-btn--gold').getAttribute('href'), '/login');
      assert.ok((await actions.locator('.ngr-btn--gold').textContent())?.includes('Become a Nexora Growth Partner'));
      assert.equal(await actions.locator('.ngr-btn--ghost').getAttribute('href'), '#reward-journey');
      assert.equal(await page.locator('#reward-journey').count(), 1, 'the rewards CTA resolves to its journey');
    }
    if (routePath === '/partner-rewards/') {
      const actions = page.locator('.npa-hero-actions');
      assert.equal(await actions.locator('.npa-button-gold').getAttribute('href'), '#npa-registration');
      assert.equal(await actions.locator('.npa-button-outline').getAttribute('href'), '#npa-rewards');
      assert.equal(await page.locator('#npa-registration').count(), 1, 'the awards CTA resolves to registration');
      assert.equal(await page.locator('#npa-rewards').count(), 1, 'the rewards CTA resolves to the rewards section');
    }
    if (['/salon-onboarding/', '/salon-growth/'].includes(routePath)) {
      const ecosystemLayout = await page.evaluate(() => {
        const copy = document.querySelector('.nxh-hero__copy');
        const visual = document.querySelector('.nxh-hero__visual');
        return {
          viewportWidth: window.innerWidth,
          copyWidth: copy?.getBoundingClientRect().width ?? 0,
          copyBottom: copy?.getBoundingClientRect().bottom ?? 0,
          visualTop: visual?.getBoundingClientRect().top ?? 0,
          breadcrumbColor: window.getComputedStyle(document.querySelector('.nxh-hero .nx-breadcrumbs')).color,
        };
      });
      assert.ok(ecosystemLayout.copyWidth >= ecosystemLayout.viewportWidth - 80, `${routePath} ecosystem hero copy uses the full mobile column`);
      assert.ok(ecosystemLayout.visualTop >= ecosystemLayout.copyBottom - 1, `${routePath} ecosystem preview stacks below, not beside, the copy on phones`);
      const textColor = ecosystemLayout.breadcrumbColor.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number) ?? [];
      const luminance = (rgb) => rgb.map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
      const contrast = (luminance(textColor) + 0.05) / (luminance([36, 26, 56]) + 0.05);
      assert.ok(contrast >= 4.5, `${routePath} dark-hero breadcrumb text meets WCAG AA contrast (${contrast.toFixed(2)}:1)`);
    }

    // A narrow phone width exercises the compact navigation on every route,
    // including pages whose intentionally shorter header still fits at 390px.
    await page.setViewportSize({ width: 320, height: 740 });
    await page.waitForFunction(headerMeasurementMatchesLayout);
    assert.ok(await page.locator('.nexora-site-header').evaluate((header) => header.classList.contains('nexora-site-header--compact')), `${routePath} collapses the navigation at 320px`);
    const narrow = await page.evaluate(() => {
      const header = document.querySelector('.nexora-site-header');
      const inner = header?.querySelector('.nexora-site-header__inner');
      const crumb = document.querySelector('.nx-breadcrumbs');
      return {
        innerWidth: inner?.clientWidth ?? 0,
        innerScrollWidth: inner?.scrollWidth ?? 0,
        crumbRight: crumb?.getBoundingClientRect().right ?? 0,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });
    assert.ok(narrow.innerScrollWidth <= narrow.innerWidth + 1, `${routePath} compact header has no horizontal overflow at 320px`);
    assert.ok(narrow.documentWidth <= narrow.viewportWidth + 1, `${routePath} narrow mobile document has no horizontal overflow`);
    assert.ok(narrow.crumbRight <= narrow.viewportWidth + 1, `${routePath} narrow mobile breadcrumb stays inside the viewport`);

    const toggle = page.locator('.nexora-site-header__toggle');
    assert.equal(await toggle.isVisible(), true, `${routePath} shows its compact menu toggle`);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('.nexora-site-header__menu').getAttribute('aria-hidden'), 'true');
    assert.equal(await page.locator('.nexora-site-header__menu').getAttribute('inert'), '');
    assert.equal(await toggle.getAttribute('aria-controls'), await page.locator('.nexora-site-header__menu').getAttribute('id'));

    await toggle.click();
    await page.waitForFunction(() => document.querySelector('.nexora-site-header__toggle')?.getAttribute('aria-expanded') === 'true');
    assert.equal(await page.locator('.nexora-site-header__menu').isVisible(), true, `${routePath} opens the compact menu`);
    assert.ok(await page.locator('.nexora-site-header__menu').evaluate((menu) => menu.scrollWidth <= menu.clientWidth + 1), `${routePath} mobile menu has no horizontal overflow`);
    assert.equal(await page.locator('.nexora-site-header__menu').getAttribute('aria-hidden'), null);
    assert.equal(await page.locator('.nexora-site-header__menu').getAttribute('inert'), null);
    await page.waitForFunction(() => Boolean(document.activeElement?.closest('.nexora-site-header__nav')));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('.nexora-site-header__toggle')?.getAttribute('aria-expanded') === 'false');
    await page.waitForFunction(() => document.activeElement === document.querySelector('.nexora-site-header__toggle'));
    assert.ok(await toggle.evaluate((node) => document.activeElement === node), `${routePath} Escape returns focus to the menu toggle`);
  }

  activeRoute = '/ hover-card interaction audit';
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL('/', origin).toString(), { waitUntil: 'domcontentloaded' });
  const hoverTrigger = page.locator('.public-homepage__template-preview [data-nx-hover-card-trigger]');
  const hoverPanel = page.locator('.nx-hover-card__panel');
  assert.equal(await hoverTrigger.getAttribute('aria-expanded'), 'false', 'the homepage link preview starts closed');
  assert.equal(await hoverTrigger.getAttribute('aria-controls') !== null, true, 'the preview trigger exposes its controlled card');
  assert.equal(await hoverTrigger.getAttribute('aria-keyshortcuts'), 'ArrowDown', 'the trigger advertises the explicit keyboard key for entering the card');
  assert.equal(await hoverTrigger.getAttribute('aria-describedby'), null, 'a rich preview is not flattened into the trigger description');
  assert.equal(await hoverPanel.isVisible(), false, 'the preview remains hidden before hover or focus');

  const hoverStarted = Date.now();
  await hoverTrigger.hover();
  await page.waitForTimeout(180);
  assert.equal(await hoverTrigger.getAttribute('aria-expanded'), 'false', 'pointer hover observes the intentional open delay');
  await hoverPanel.waitFor({ state: 'visible', timeout: 1500 });
  assert.ok(Date.now() - hoverStarted >= 300, 'pointer hover opens after the configured 300–500ms delay');
  assert.ok((await hoverPanel.textContent())?.includes('NEXORA Template Library'), 'the card previews the destination link');
  assert.equal(await hoverPanel.locator('a[href="#nexora-template-library"]').count(), 1, 'the preview action remains an ordinary keyboard-reachable link');
  assert.equal(await hoverPanel.evaluate((node) => getComputedStyle(node).transitionDuration), '0s', 'reduced-motion preference disables the card animation');
  assert.equal(await hoverPanel.evaluate((node) => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)', 'the light appearance uses the light theme surface');
  await hoverPanel.hover();
  await page.waitForTimeout(320);
  assert.equal(await hoverPanel.isVisible(), true, 'moving the pointer from the trigger into the card keeps it open');
  await page.mouse.move(2, 900);
  await page.waitForTimeout(100);
  assert.equal(await hoverPanel.isVisible(), true, 'the card remains during its pointer-leave grace period');
  await page.waitForFunction(() => document.querySelector('.nx-hover-card__panel')?.closest('.nx-hover-card__floating')?.hasAttribute('hidden'));
  assert.equal(await hoverPanel.isVisible(), false, 'the card closes after the pointer leaves both trigger and card');
  await hoverTrigger.hover();
  await hoverPanel.waitFor({ state: 'visible', timeout: 1500 });
  await hoverPanel.hover();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('.nx-hover-card__panel')?.closest('.nx-hover-card__floating')?.hasAttribute('hidden'));
  await page.waitForTimeout(300);
  assert.equal(await hoverPanel.isVisible(), false, 'Escape dismisses the card without reopening under the pointer');
  await page.mouse.move(2, 900);

  // Keyboard focus opens immediately, and ArrowDown enters the card's link.
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  let focusedPreviewTrigger = false;
  for (let index = 0; index < 40; index += 1) {
    if (await hoverTrigger.evaluate((node) => document.activeElement === node)) {
      focusedPreviewTrigger = true;
      break;
    }
    await page.keyboard.press('Tab');
  }
  assert.equal(focusedPreviewTrigger, true, 'the preview link is reachable in the normal tab order');
  await page.waitForFunction(() => document.querySelector('.public-homepage__template-preview [data-nx-hover-card-trigger]')?.getAttribute('aria-expanded') === 'true');
  await hoverTrigger.press('ArrowDown');
  assert.equal(await hoverPanel.locator('a[href="#nexora-template-library"]').evaluate((node) => document.activeElement === node), true, 'ArrowDown moves keyboard focus into interactive preview content');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('.nx-hover-card__panel')?.closest('.nx-hover-card__floating')?.hasAttribute('hidden'));
  assert.equal(await hoverTrigger.evaluate((node) => document.activeElement === node), true, 'Escape returns focus to the trigger after focus entered the card');

  // Exercise viewport flipping/shifting at phone, tablet and desktop widths.
  for (const [width, height] of [[320, 740], [768, 900], [1440, 1000]]) {
    await page.setViewportSize({ width, height });
    await page.goto(new URL('/', origin).toString(), { waitUntil: 'domcontentloaded' });
    if (width === 768) {
      await page.locator('.public-homepage').evaluate((node) => node.setAttribute('data-appearance', 'dark'));
    }
    await page.locator('.public-homepage__template-preview [data-nx-hover-card-trigger]').evaluate((node) => {
      const wrapper = node.parentElement;
      if (!wrapper) return;
      Object.assign(wrapper.style, {
        position: 'fixed', right: '4px', bottom: '4px', left: 'auto', top: 'auto', zIndex: '1001',
      });
    });
    const edgeTrigger = page.locator('.public-homepage__template-preview [data-nx-hover-card-trigger]');
    await edgeTrigger.hover();
    const edgePanel = page.locator('.nx-hover-card__panel');
    await edgePanel.waitFor({ state: 'visible', timeout: 1500 });
    const panelBounds = await edgePanel.boundingBox();
    assert.ok(panelBounds, `${width}px preview panel has measurable viewport bounds`);
    assert.ok(panelBounds.x >= 8 && panelBounds.y >= 8, `${width}px preview shifts inside the left/top viewport edges`);
    assert.ok(panelBounds.x + panelBounds.width <= width - 8, `${width}px preview stays inside the right viewport edge`);
    assert.ok(panelBounds.y + panelBounds.height <= height - 8, `${width}px preview stays inside the bottom viewport edge`);
    assert.equal(await page.locator('.nx-hover-card__floating').getAttribute('data-placement'), 'top', `${width}px edge preview flips above its trigger when needed`);
    if (width === 768) {
      assert.equal(await page.locator('.nx-hover-card__floating').getAttribute('data-appearance'), 'dark', 'the card follows the enclosing dark appearance');
      assert.equal(await edgePanel.evaluate((node) => getComputedStyle(node).backgroundColor), 'rgb(25, 25, 29)', 'dark appearance uses its dark surface');
    }
  }

  await page.goto(new URL('/', origin).toString(), { waitUntil: 'domcontentloaded' });
  const touchTrigger = page.locator('.public-homepage__template-preview [data-nx-hover-card-trigger]');
  await page.evaluate(() => {
    const wrapper = document.querySelector('.public-homepage__template-preview');
    wrapper?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' }));
  });
  await page.waitForTimeout(400);
  assert.equal(await touchTrigger.getAttribute('aria-expanded'), 'false', 'touch pointers do not open a hover-only card');

  await touchTrigger.hover();
  const scrollPanel = page.locator('.nx-hover-card__panel');
  await scrollPanel.waitFor({ state: 'visible', timeout: 1500 });
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForFunction(() => document.querySelector('.nx-hover-card__panel')?.closest('.nx-hover-card__floating')?.hasAttribute('hidden'));
  assert.equal(await scrollPanel.isVisible(), false, 'scrolling away dismisses the hover card');

  activeRoute = '/#nexora-template-library direct hash entry';
  await page.goto(new URL('/pricing/', origin).toString(), { waitUntil: 'domcontentloaded' });
  const hashResponse = await page.goto(new URL('/#nexora-template-library', origin).toString(), { waitUntil: 'domcontentloaded' });
  assert.equal(hashResponse?.status(), 200, 'a direct homepage section URL remains a public marketing document');
  await page.waitForFunction(() => document.querySelector('.nexora-site-header__nav-link[href="#nexora-template-library"]')?.getAttribute('aria-current') === 'location');
  assert.equal(await page.locator('.nexora-site-header__nav-link[href="#nexora-template-library"]').getAttribute('aria-current'), 'location', 'a deep-linked homepage section becomes current after hydration without a server/client attribute mismatch');

  activeRoute = '/';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL('/', origin).toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.nexora-site-header')?.classList.contains('nexora-site-header--compact'));
  const toggle = page.locator('.nexora-site-header__toggle');
  await toggle.click();
  const whatsapp = page.locator('.nexora-site-header__menu [data-nexora-whatsapp-cta="mobile-menu"]');
  assert.equal(await whatsapp.getAttribute('href'), 'https://wa.me/917852877721?text=Hi%2C%20I%20found%20your%20website%20and%20I%27d%20like%20more%20information%20about%20NEXORA%20Salon%20OS.');
  assert.equal(await whatsapp.getAttribute('target'), '_blank');
  assert.equal(await whatsapp.getAttribute('rel'), 'noopener noreferrer');
  await page.locator('.nexora-site-header__menu a[href="#salon-categories"]').click();
  await page.waitForFunction(() => document.querySelector('.nexora-site-header__toggle')?.getAttribute('aria-expanded') === 'false');
  await page.waitForFunction(() => document.activeElement === document.querySelector('.nexora-site-header__toggle'));
  assert.ok(await toggle.evaluate((node) => document.activeElement === node), 'following a hash navigation link closes the menu and restores focus');

  await toggle.click();
  await page.evaluate(() => {
    history.pushState({}, '', `${location.pathname}?nexora-audit=1${location.hash}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForFunction(() => document.querySelector('.nexora-site-header__toggle')?.getAttribute('aria-expanded') === 'false');
  await page.waitForFunction(() => document.activeElement === document.querySelector('.nexora-site-header__toggle'));
  assert.ok(await toggle.evaluate((node) => document.activeElement === node), 'history navigation closes the menu and restores focus');

  await toggle.click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForFunction(() => !document.querySelector('.nexora-site-header')?.classList.contains('nexora-site-header--compact'));
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false', 'resizing back to desktop closes the compact menu');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.waitForFunction(() => document.querySelector('.nexora-site-header')?.classList.contains('nexora-site-header--compact'));
  const compactActionVisible = await page.locator('.nexora-site-header').evaluate((header) => header.classList.contains('has-compact-action'));
  if (!compactActionVisible) {
    await toggle.click();
    assert.ok(await page.locator('.nexora-site-header__menu a.nexora-site-header__primary').isVisible(), 'the primary action moves into the menu when the narrow top row cannot fit it');
  }

  activeRoute = '/login';
  await page.setViewportSize({ width: 1280, height: 900 });
  const loginResponse = await page.goto(new URL(activeRoute, origin).toString(), { waitUntil: 'domcontentloaded' });
  assert.equal(loginResponse?.status(), 200, '/login remains served by the owner/auth application');
  await page.getByRole('heading', { name: 'Sign in to NEXORA Salon OS.' }).waitFor();
  assert.equal(await page.locator('.nexora-site-header').count(), 0, '/login does not inherit the public marketing header');
  assert.equal(await page.locator('.nx-breadcrumbs').count(), 0, '/login does not inherit public marketing breadcrumbs');

  activeRoute = '/?site=owner-isolation-audit';
  const storefrontResponse = await page.goto(new URL(activeRoute, origin).toString(), { waitUntil: 'domcontentloaded' });
  assert.equal(storefrontResponse?.status(), 200, 'the explicit salon-site query stays on the owner/storefront application route');
  await page.waitForFunction(() => document.querySelector('.public-homepage') === null
    && document.body.innerText.includes('Loading salon website'));
  assert.equal(await page.locator('.nexora-site-header').count(), 0, 'a salon storefront does not inherit the public marketing header');
  assert.equal(await page.locator('.nx-breadcrumbs').count(), 0, 'a salon storefront does not inherit public marketing breadcrumbs');
  assert.equal(await page.locator('[data-nexora-whatsapp-cta]').count(), 0, 'marketing WhatsApp CTAs do not leak into a salon storefront');

  activeRoute = '/ signed-in owner homepage';
  await page.addInitScript(() => {
    localStorage.setItem('studioflow_supabase_session', JSON.stringify({
      access_token: 'audit.access.token',
      refresh_token: 'audit-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    }));
  });
  const signedInHomeResponse = await page.goto(new URL('/', origin).toString(), { waitUntil: 'domcontentloaded' });
  assert.equal(signedInHomeResponse?.status(), 200, 'an authenticated owner can still open the public homepage');
  await page.waitForFunction(() => document.querySelector('.nexora-site-header__primary')?.textContent?.trim().startsWith('Open Workspace')
    && document.querySelector('.nexora-site-header__login')?.textContent?.trim() === 'Owner Workspace');
  assert.equal(await page.locator('.public-homepage').count(), 1, 'an owner session leaves the public homepage in its public shell');
  assert.equal(await page.locator('.nexora-site-header').count(), 1, 'an owner session leaves one public banner landmark');
  assert.equal(await page.locator('.nx-breadcrumbs').count(), 1, 'an owner session keeps the public breadcrumb');
  assert.equal(await page.locator('.nexora-site-header a.nexora-site-header__primary').getAttribute('href'), '/login');

  activeRoute = '/?site=owner-isolation-audit signed-in storefront';
  const signedInStorefrontResponse = await page.goto(new URL('/?site=owner-isolation-audit', origin).toString(), { waitUntil: 'domcontentloaded' });
  assert.equal(signedInStorefrontResponse?.status(), 200, 'an owner session does not redirect an explicit storefront request to the marketing homepage');
  await page.waitForFunction(() => document.querySelector('.public-homepage') === null
    && document.body.innerText.includes('Loading salon website'));
  assert.equal(await page.locator('.nexora-site-header').count(), 0, 'signed-in storefront requests stay outside the marketing shell');
  assert.equal(await page.locator('.nx-breadcrumbs').count(), 0, 'signed-in storefront requests do not inherit marketing breadcrumbs');

  activeRoute = '/template-pages/hair-salon.html';
  await page.setViewportSize({ width: 1440, height: 1000 });
  const templateResponse = await page.goto(new URL(activeRoute, origin).toString(), { waitUntil: 'load' });
  assert.equal(templateResponse?.status(), 200, `${activeRoute} returns HTTP 200`);
  assert.equal(await page.locator('.nexora-site-header').count(), 0, 'standalone template pages do not inherit the marketing SiteHeader');
  assert.equal(await page.locator('.nx-breadcrumbs').count(), 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(80);
  const templateMetrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    breadcrumbRight: document.querySelector('.nx-breadcrumbs')?.getBoundingClientRect().right ?? 0,
    currentCount: document.querySelectorAll('.nx-breadcrumbs [aria-current="page"]').length,
    separatorCount: [...document.querySelectorAll('.nx-breadcrumbs__separator')].filter((node) => node.getAttribute('aria-hidden') === 'true').length,
  }));
  assert.ok(templateMetrics.documentWidth <= templateMetrics.viewportWidth + 1, 'template page has no mobile horizontal overflow');
  assert.ok(templateMetrics.breadcrumbRight <= templateMetrics.viewportWidth + 1, 'template breadcrumb stays inside the mobile viewport');
  assert.equal(templateMetrics.currentCount, 1, 'template breadcrumb has one current-page item');
  assert.ok(templateMetrics.separatorCount > 0, 'template breadcrumb separators are hidden from assistive technology');
  const disclosure = page.locator('.nx-breadcrumbs__collapsed');
  const summary = disclosure.locator('summary');
  assert.equal(await summary.isVisible(), true, 'mobile template breadcrumb exposes its disclosure control');
  await summary.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.nx-breadcrumbs__collapsed')?.open === true);
  assert.equal(await disclosure.locator('.nx-breadcrumbs__collapsed-list a').first().getAttribute('href'), '/#nexora-template-library');
  assert.equal(await disclosure.locator('.nx-breadcrumbs__collapsed-list a').first().isVisible(), true, 'omitted template ancestor is available through the keyboard-operated disclosure');

  const noScriptPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
    reducedMotion: 'reduce',
  });
  await noScriptPage.route('**/*', routeToPreview);
  for (const routePath of marketingRoutes) {
    for (const width of [390, 320]) {
      await noScriptPage.setViewportSize({ width, height: 844 });
      const response = await noScriptPage.goto(new URL(routePath, origin).toString(), { waitUntil: 'domcontentloaded' });
      assert.equal(response?.status(), 200, `${routePath} no-script document returns HTTP 200`);
      await noScriptPage.evaluate(() => document.fonts?.ready);
      const fallback = await noScriptPage.evaluate(() => {
        const header = document.querySelector('.nexora-site-header');
        const inner = header?.querySelector('.nexora-site-header__inner');
        const menu = header?.querySelector('.nexora-site-header__menu');
        const visibleLinks = [...(header?.querySelectorAll('.nexora-site-header__nav-link') ?? [])].filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = window.getComputedStyle(node);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        }).length;
        return {
          measured: header?.classList.contains('has-measured-layout') ?? false,
          innerWidth: inner?.clientWidth ?? 0,
          innerScrollWidth: inner?.scrollWidth ?? 0,
          menuWidth: menu?.clientWidth ?? 0,
          menuScrollWidth: menu?.scrollWidth ?? 0,
          visibleLinks,
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
        };
      });
      assert.equal(fallback.measured, false, `${routePath} no-script header retains its server-rendered fallback`);
      assert.ok(fallback.innerScrollWidth <= fallback.innerWidth + 1, `${routePath} no-script header has no internal overflow at ${width}px`);
      assert.ok(fallback.menuScrollWidth <= fallback.menuWidth + 1, `${routePath} no-script menu content fits at ${width}px`);
      assert.ok(fallback.visibleLinks > 0, `${routePath} no-script header navigation remains visible at ${width}px`);
      assert.ok(fallback.documentWidth <= fallback.viewportWidth + 1, `${routePath} no-script document has no horizontal overflow at ${width}px`);

      if (routePath === '/' && width === 390) {
        const disclosure = noScriptPage.locator('.nexora-site-header__overflow-disclosure');
        await disclosure.locator('summary').click();
        assert.ok(await disclosure.evaluate((node) => node.open), 'the homepage More menu remains usable as a native disclosure without JavaScript');
        assert.equal(await disclosure.locator('a[href="/salon-growth"]').isVisible(), true);
      }
    }
  }
  await noScriptPage.close();

  assert.deepEqual(hydrationErrors, [], 'public routes hydrate without React hydration mismatch warnings or errors');
  assert.deepEqual(pageErrors, [], 'public route interaction produces no uncaught browser errors');
  console.log(`PASS: headless preview — ${marketingRoutes.length} public marketing routes, responsive header/breadcrumb bounds and contrast, keyboard skip links, hover-card delay/bridge/Escape/scroll/focus behavior, touch suppression, phone/tablet/desktop viewport fit and dark appearance, direct-hash current-state hydration, signed-in hydration and update polling, owner/storefront isolation, mobile-menu accessibility/behavior, WhatsApp safety/tracking, native disclosure and script-free fallback.`);
} finally {
  await browser.close();
}

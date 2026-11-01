import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type PublicSite = { published: boolean; settings: Record<string, unknown>; sections: unknown[]; services: Array<{ id: string; slug: string; name: string }>; packages: unknown[]; staff: unknown[]; gallery: unknown[]; testimonials: unknown[]; faqs: unknown[]; blog_posts: unknown[] };
const publicSite = JSON.parse(await readFile(resolve('src/data/site.config.json'), 'utf8')) as PublicSite;
const futureDate = () => { const date = new Date(); date.setDate(date.getDate() + 2); return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); };
const startFor = (date: string) => `${date}T11:00:00+05:30`;

async function mockPublicBackend(context: BrowserContext, attemptBooking: (requestBody: Record<string, unknown>) => Promise<boolean>) {
  await context.route('**/rest/v1/rpc/get_public_site', (route) => route.fulfill({ json: publicSite }));
  await context.route('**/rest/v1/rpc/first_owner_setup_available', (route) => route.fulfill({ json: false }));
  await context.route('**/rest/v1/working_hours?*', (route) => route.fulfill({ json: Array.from({ length: 7 }, (_, weekday) => ({ weekday, is_closed: false })) }));
  await context.route('**/rest/v1/rpc/get_available_slots', async (route) => {
    const body = route.request().postDataJSON() as { p_date?: string };
    const date = body.p_date ?? futureDate();
    await route.fulfill({ json: [{ slot_start: startFor(date), slot_end: `${date}T12:00:00+05:30`, staff_id: '10000000-0000-4000-8000-000000000001' }] });
  });
  await context.route('**/functions/v1/create-booking-public', async (route) => {
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    const reserved = await attemptBooking(payload);
    if (!reserved) { await route.fulfill({ json: { ok: false, error: { code: 'SLOT_TAKEN', message: 'That slot was just taken, please pick another.' } } }); return; }
    await route.fulfill({ json: { ok: true, data: { booking_id: '10000000-0000-4000-8000-000000000002', start_at: String(payload.start_at), end_at: `${String(payload.start_at).slice(0, 10)}T12:00:00+05:30`, service_name: publicSite.services[0]?.name ?? 'Ritual', staff_name: 'Vaidya Ananya', whatsapp_url: null } } });
  });
}
async function openBooking(page: Page) {
  await page.goto('/#booking');
  await expect(page.locator('#booking')).toBeVisible();
  await page.getByRole('button', { name: 'Find a time' }).click();
  await page.locator('#booking-date').fill(futureDate());
  const time = page.getByRole('button', { name: /11:00/ });
  await expect(time).toBeVisible();
  await time.click();
  await page.getByRole('button', { name: 'Add your details' }).click();
  await page.locator('#booking-name').fill('Aarav Test Guest');
  await page.locator('#booking-phone').fill('9876543210');
  await page.locator('#booking-email').fill('guest@example.test');
}

test('visitor submits a booking request and sees confirmation (simulated API contract)', async ({ page, context }) => {
  await mockPublicBackend(context, async () => true);
  await openBooking(page);
  await page.getByRole('button', { name: 'Request booking' }).click();
  await expect(page.getByRole('heading', { name: /We’ve received/i })).toBeVisible();
  await expect(page.getByText('pending studio confirmation')).toBeVisible();
});

test('two visitors racing for one slot: one succeeds and one sees SLOT_TAKEN (simulated API contract)', async ({ browser }) => {
  let reserved = false;
  const gate = async () => {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 120));
    if (reserved) return false;
    reserved = true;
    return true;
  };
  const first = await browser.newContext(); const second = await browser.newContext();
  const contexts = [first, second];
  try {
    for (const context of contexts) await mockPublicBackend(context, async () => gate());
    const pages = await Promise.all(contexts.map((context) => context.newPage()));
    await Promise.all(pages.map(openBooking));
    await Promise.all(pages.map((page) => page.getByRole('button', { name: 'Request booking' }).click()));
    const successCount = await Promise.all(pages.map((page) => page.getByRole('heading', { name: /We’ve received/i }).count()));
    expect(successCount.reduce((sum, count) => sum + count, 0)).toBe(1);
    const takenCount = await Promise.all(pages.map((page) => page.getByRole('alert').filter({ hasText: 'slot was just taken' }).count()));
    expect(takenCount.reduce((sum, count) => sum + count, 0)).toBe(1);
  } finally { await Promise.all(contexts.map((context) => context.close())); }
});

test('mobile home, service, and admin login fit 375px without horizontal overflow', async ({ page, context }) => {
  await mockPublicBackend(context, async () => true);
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ['/', '/#booking', `/service/${publicSite.services[0]?.slug ?? 'abhyanga'}`, '/admin/login']) {
    await page.goto(path);
    await expect(page.locator('body')).toBeVisible();
    const dimensions = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(dimensions.document, `horizontal overflow at ${path}`).toBeLessThanOrEqual(dimensions.viewport);
  }
});

test('home, service, booking and admin login have no serious or critical axe violations', async ({ page, context }) => {
  await mockPublicBackend(context, async () => true);
  for (const path of ['/', `/service/${publicSite.services[0]?.slug ?? 'abhyanga'}`, '/#booking', '/admin/login']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? '')).map((violation) => `${path} ${violation.id}: ${violation.help}`)).toEqual([]);
  }
});

// Opt-in Chromium acceptance checks. Mocked data are synthetic test fixtures only.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const require = createRequire(
  path.join(
    process.env.BROWSER_TOOLS_ROOT || "/tmp/dermacure-browser",
    "package.json",
  ),
);
const { chromium: pw } = require("playwright-core"),
  c = require("@sparticuz/chromium").default;
const browser = await pw.launch({
  args: c.args,
  executablePath: await c.executablePath(),
  headless: true,
});
const base = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const image = readFileSync("public/templates/dermacure/care-neutral.svg");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function scan(page) {
  for (
    let y = 0;
    y < (await page.evaluate(() => document.body.scrollHeight));
    y += 650
  ) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(500);
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  const page = await context.newPage();
  const errors = [],
    failedRequests = [],
    consoleErrors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) =>
    failedRequests.push({ url: r.url(), error: r.failure()?.errorText }),
  );
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  await page.goto(base + "/?template=skincare_clinic", {
    waitUntil: "networkidle",
  });
  const seed = await page.evaluate(async () => {
    const { CATEGORY_TEMPLATES } = await import("/src/categoryTemplates.ts");
    const { templateDraft } = await import("/src/lib/templateEntry.ts");
    return templateDraft(CATEGORY_TEMPLATES.skincare_clinic);
  });
  for (const width of [320, 375, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await scan(page);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Overflow at ${width}`,
    );
    assert.deepEqual(
      await page
        .locator(".dc img")
        .evaluateAll((ns) =>
          ns.filter((n) => n.complete && !n.naturalWidth).map((n) => n.src),
        ),
      [],
    );
    assert.ok(
      await page.locator(".dc-card-image").evaluateAll((ns) =>
        ns.every((n) => {
          const b = n.getBoundingClientRect();
          return Math.abs(b.width / b.height - 4 / 3) < 0.02;
        }),
      ),
      `Card crops at ${width}`,
    );
    console.log(
      `PASS ${width}px: overflow, loaded images, treatment crop alignment`,
    );
  }
  await page.setViewportSize({ width: 375, height: 950 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("button", { name: "Close menu", exact: true }).click();
  await page.locator("#dc-mobile-nav").waitFor({ state: "detached" });
  assert.equal(await page.locator("#dc-mobile-nav").count(), 0);
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const menu = page.getByRole("navigation", { name: "Mobile navigation" });
  await menu.locator("a,button").first().focus();
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await menu
      .locator("a,button")
      .last()
      .evaluate((n) => n === document.activeElement),
    true,
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await menu
      .locator("a,button")
      .first()
      .evaluate((n) => n === document.activeElement),
    true,
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  assert.equal(
    await page
      .getByRole("button", { name: "Open menu", exact: true })
      .evaluate((n) => n === document.activeElement),
    true,
  );
  for (const id of [
    "home",
    "about",
    "treatments",
    "technology",
    "results",
    "contact",
  ]) {
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await menu.locator(`a[href="#${id}"]`).click();
    await page.waitForTimeout(300);
    assert.equal(new URL(page.url()).hash, "#" + id);
    await page.locator("#dc-mobile-nav").waitFor({ state: "detached" });
    assert.equal(await page.locator("#dc-mobile-nav").count(), 0);
    assert.notEqual(
      await page.evaluate(() => document.body.style.overflow),
      "hidden",
    );
  }
  const dead = await page
    .locator('.dc a[href^="#"]')
    .evaluateAll((ns) =>
      ns
        .map((n) => n.getAttribute("href"))
        .filter((h) => !h || h === "#" || !document.getElementById(h.slice(1))),
    );
  assert.deepEqual(dead, []);
  await page.locator(".dc-directory .dc-filters button").nth(1).click();
  assert.equal(
    await page
      .locator(".dc-directory .dc-filters button")
      .nth(1)
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.locator(".dc-directory .dc-filters button").first().click();
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  assert.equal(
    await page.locator(".dc h1").evaluate((n) => getComputedStyle(n).opacity),
    "1",
  );
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(400);
  assert.notEqual(
    await page
      .locator(".dc-hero-parallax")
      .evaluate((n) => getComputedStyle(n).transform),
    "none",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(300);
  assert.match(
    await page
      .locator(".dc-hero-parallax")
      .evaluate((n) => getComputedStyle(n).transform),
    /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/,
  );
  // Deliberately stall an in-view reveal to prove the fallback opens it.
  await page.locator("#about").scrollIntoViewIfNeeded();
  await page.locator(".dc-philosophy-copy").evaluate((n) => {
    n.style.opacity = "0";
    n.classList.remove("dc-reveal-recovered");
  });
  await page.waitForFunction(
    () =>
      document
        .querySelector(".dc-philosophy-copy")
        ?.classList.contains("dc-reveal-recovered"),
    {},
    { timeout: 5000 },
  );
  console.log(
    "PASS normal preview: menu close/Escape/focus loop, every section target, filter actions, entrance/parallax/reduced motion and stuck-reveal recovery",
  );
  // Real app route, intercepted public APIs only; no database records or payments.
  const fixture = await page.context().newPage();
  await fixture.setViewportSize({ width: 375, height: 950 });
  fixture.on("pageerror", (e) => errors.push(e.message));
  const profile = {
    ...seed.profile,
    businessName: "QA Clinic — synthetic test fixture",
    subdomain: "qa-clinic",
    logoUrl: "https://fixture.invalid/broken-logo.png",
    coverImageUrl: "https://fixture.invalid/broken-hero.png",
    ownerPhotoUrl: "https://fixture.invalid/broken-owner.png",
    websiteSections: {
      ...seed.profile.websiteSections,
      promo: false,
      videos: false,
      loyalty: false,
      share: false,
      social: false,
    },
    photoGalleryInitialized: true,
    photoGalleryType: "skincare_clinic",
    photoGallery: [
      {
        id: "qa-photo",
        url: "https://fixture.invalid/broken-gallery.png",
        title: "Synthetic gallery fixture",
        category: "Skin",
        isDemo: false,
      },
    ],
    comparisonPhotos: [
      {
        id: "pair1",
        title: "Synthetic comparison fixture — not clinical results",
        category: "Skin",
        consented: true,
        beforeUrl: "https://fixture.invalid/test-before.svg",
        afterUrl: "https://fixture.invalid/test-after.svg",
      },
      {
        id: "pair2",
        title: "Failed comparison fixture",
        category: "Skin",
        consented: true,
        beforeUrl: "https://fixture.invalid/broken-before.png",
        afterUrl: "https://fixture.invalid/test-after.svg",
      },
    ],
    websiteTestimonials: [
      {
        id: "qa-review1",
        name: "Test fixture A",
        comment: "Synthetic review used only for interaction testing.",
        verified: true,
        isDemo: false,
        rating: 5,
      },
      {
        id: "qa-review2",
        name: "Test fixture B",
        comment: "Second synthetic review for carousel testing.",
        verified: true,
        isDemo: false,
        rating: 4,
      },
    ],
  };
  const services = seed.services.slice(0, 4);
  const staff = seed.stylists[0];
  let mode = "error",
    writes = 0;
  await fixture.route("https://fixture.invalid/**", (route) =>
    route.request().url().includes("/test-")
      ? route.fulfill({ contentType: "image/svg+xml", body: image })
      : route.abort("failed"),
  );
  await fixture.route("**/rest/v1/**", async (route) => {
    const url = route.request().url();
    const json = (body) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (url.includes("studioflow_websites"))
      return json({
        content: {
          profile,
          services,
          stylists: [staff],
          gallery: [],
          policies: {},
          loyaltyConfig: undefined,
        },
      });
    if (url.includes("studioflow_android_slots")) {
      await sleep(450);
      if (mode === "error")
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Synthetic availability failure" }),
        });
      return json(
        mode === "empty"
          ? []
          : [
              {
                time: "10:00",
                label: "10:00 AM",
                stylistId: staff.id,
                available: true,
              },
            ],
      );
    }
    if (url.includes("studioflow_available_slots"))
      return json([
        {
          time: "10:00",
          label: "10:00 AM",
          stylistId: staff.id,
          available: true,
        },
      ]);
    if (url.includes("studioflow_booking_specialists"))
      return json({ specialistIds: [staff.id], published: true });
    if (url.includes("studioflow_list_reviews"))
      return json({ reviews: [], canReview: false });
    if (/studioflow_book($|\?)|studioflow_coupon_book/.test(url)) writes++;
    return json([]);
  });
  await fixture.route("**/functions/v1/studioflow-payments", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ configured: false }),
    }),
  );
  await fixture.goto(base + "/?site=qa-clinic", { waitUntil: "networkidle" });
  await fixture.locator("#booking").scrollIntoViewIfNeeded();
  const form = fixture.locator(".dc-booking-form");
  await form.locator("#dc-service").selectOption(services[0].id);
  assert.equal(await form.locator("button[type=submit]").isDisabled(), true);
  await form.getByRole("alert").waitFor();
  assert.match(await form.getByRole("alert").innerText(), /could not load/);
  mode = "empty";
  await form.getByRole("button", { name: "Retry availability" }).click();
  await form.getByText("No available appointments", { exact: false }).waitFor();
  mode = "available";
  await form.locator("#dc-service").selectOption(services[1].id);
  await form.getByLabel("Preferred time (IST)").selectOption("10:00");
  await form.getByLabel("Full name", { exact: true }).fill("QA Visitor");
  await form.getByLabel("Mobile number", { exact: true }).fill("123");
  await form.getByRole("button", { name: "Continue to booking" }).click();
  assert.match(await form.getByRole("alert").innerText(), /valid 10-digit/);
  await form.getByLabel("Mobile number", { exact: true }).fill("9876543210");
  await form
    .getByLabel("Optional message", { exact: true })
    .fill("Synthetic test message");
  await form.getByRole("button", { name: "Continue to booking" }).click();
  const dialog = fixture.getByRole("dialog", { name: "Book an appointment" });
  await dialog.waitFor();
  await dialog
    .getByRole("button", { name: "Continue to Guest Details" })
    .click();
  assert.ok(
    await dialog
      .locator("input")
      .evaluateAll((ns) => ns.some((n) => n.value === "QA Visitor")),
  );
  assert.equal(
    await dialog
      .getByRole("textbox", { name: "Optional consultation message" })
      .inputValue(),
    "Synthetic test message",
  );
  await fixture.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert.match(await form.innerText(), /not confirmed until checkout/);
  await fixture.locator(".dc-faq summary").first().click();
  assert.equal(
    await fixture.locator(".dc-faq details").first().getAttribute("open"),
    "",
  );
  await fixture.locator(".dc-faq summary").first().click();
  assert.equal(
    await fixture.locator(".dc-faq details").first().getAttribute("open"),
    null,
  );
  await fixture.locator("#results").scrollIntoViewIfNeeded();
  const range = fixture.locator(".dc-comparisons input[type=range]").first();
  await range.focus();
  await fixture.keyboard.press("ArrowRight");
  assert.equal(await range.inputValue(), "51");
  const box = await range.boundingBox();
  await fixture.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await fixture.mouse.down();
  await fixture.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
  await fixture.mouse.up();
  assert.ok(Number(await range.inputValue()) > 65);
  await fixture
    .getByRole("button", { name: "Next result", exact: true })
    .click();
  await fixture
    .getByText("Comparison unavailable. No result is displayed.", {
      exact: false,
    })
    .waitFor();
  assert.equal(
    await fixture
      .locator(".dc-comparison-slide")
      .nth(1)
      .locator("input[type=range]")
      .count(),
    0,
  );
  await fixture.locator(".dc-reviews").scrollIntoViewIfNeeded();
  await fixture
    .getByRole("button", { name: "Next review", exact: true })
    .click();
  assert.match(
    await fixture.locator(".dc-review-carousel").innerText(),
    /fixture B/,
  );
  await scan(fixture);
  assert.equal(
    await fixture.locator("#clinic-gallery a[href]").count(),
    0,
    "Failed gallery URL is not an active broken link",
  );
  assert.deepEqual(
    await fixture
      .locator(".dc img")
      .evaluateAll((ns) =>
        ns.filter((n) => n.complete && !n.naturalWidth).map((n) => n.src),
      ),
    [],
  );
  assert.equal(writes, 0, "Tests must not create reservations");
  assert.deepEqual(errors, []);
  console.log(
    "PASS mocked public route: slot loading/error/empty/retry, invalid phone, real modal handoff/prefill, non-confirmation notice, FAQ, keyboard/mouse comparison, failed-result suppression, review navigation, failed gallery link removal; zero booking writes",
  );
  // Force both remote images and local fallback files to fail; terminal SVG must remain.
  await fixture.route("**/templates/dermacure/*", (route) =>
    /\.(svg|webp|png|jpg)(\?|$)/.test(route.request().url())
      ? route.abort("failed")
      : route.continue(),
  );
  await fixture.addInitScript(() => {
    delete window.IntersectionObserver;
  });
  fixture.on("dialog", (dialog) => dialog.accept());
  await fixture.reload({ waitUntil: "domcontentloaded" });
  await fixture.locator(".dc h1").waitFor();
  await scan(fixture);
  assert.ok((await fixture.locator(".dc-image-terminal").count()) > 0);
  assert.equal(
    await fixture
      .locator(".dc-philosophy-copy")
      .evaluate((n) => getComputedStyle(n).opacity),
    "1",
  );
  assert.deepEqual(
    await fixture
      .locator(".dc img")
      .evaluateAll((ns) =>
        ns.filter((n) => n.complete && !n.naturalWidth).map((n) => n.src),
      ),
    [],
  );
  console.log(
    "PASS forced local + remote image failures: terminal SVG fallback, no broken images; observer-disabled reveals visible",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Normal-preview failed requests by host:",
    JSON.stringify(
      Object.fromEntries(
        [...new Set(failedRequests.map((r) => new URL(r.url).host))].map(
          (host) => [
            host,
            failedRequests.filter((r) => new URL(r.url).host === host).length,
          ],
        ),
      ),
    ),
  );
  console.log(
    "Normal-preview console error count (external fetch failures):",
    consoleErrors.length,
  );
  const localFailed = failedRequests.filter(
    (r) => r.url.startsWith(base) && !r.error?.includes("ABORTED"),
  );
  assert.deepEqual(
    localFailed,
    [],
    "No failed local resources in normal preview",
  );
} finally {
  await browser.close();
}

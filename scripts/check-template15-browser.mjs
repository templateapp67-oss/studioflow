// Optional real-browser preview/editor test. Tools are installed outside the app.
// BROWSER_TOOLS_ROOT=/path/to/tools node scripts/check-template15-browser.mjs
import { createRequire } from "node:module";
import path from "node:path";
import assert from "node:assert/strict";
const require = createRequire(
  path.join(
    process.env.BROWSER_TOOLS_ROOT || "/home/user/browser-tools",
    "package.json",
  ),
);
const { chromium } = require("playwright-core");
const c = require("@sparticuz/chromium").default;
const browser = await chromium.launch({
  args: c.args,
  executablePath: await c.executablePath(),
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    (process.env.PREVIEW_URL || "http://127.0.0.1:3000") + "/?template=15",
    { waitUntil: "networkidle" },
  );
  await page
    .getByRole("heading", {
      name: "Own Your Look. Own Your Style.",
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.locator(".kk-editor").count(),
    0,
    "preview before editing",
  );
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `no overflow at ${width}`,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "View Hair Colour", exact: true })
    .click();
  assert.ok(
    await page
      .locator(".kk-service h3")
      .first()
      .innerText()
      .then((s) => s.includes("Men's")),
  );
  assert.equal(await page.locator(".kk-service").count(), 4);
  await page
    .getByRole("button", { name: "Explore all 10 colour services" })
    .click();
  assert.equal(await page.locator(".kk-service").count(), 10);
  await page
    .locator(".kk-service")
    .first()
    .getByRole("button", { name: "Book Now" })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "No appointment has been saved." })
    .waitFor();
  assert.equal(
    await page
      .locator('iframe[src*="youtube"],iframe[src*="vimeo"],video')
      .count(),
    0,
    "no unverified videos",
  );
  // Added engagement controls are real interactions, not static mock buttons.
  for (const card of await page.locator(".kk-video-card").all()) {
    await card.getByRole("button", { name: /Play/ }).click();
    await page.locator("video").waitFor();
    await page.waitForFunction(() => {
      const v = document.querySelector("video");
      return v && v.readyState >= 2 && v.videoWidth > 0 && v.currentTime > 0;
    });
    assert.ok(
      await page
        .locator("video")
        .evaluate((v) => v.duration >= 4.9 && v.duration <= 5.1),
    );
    await page.getByRole("button", { name: "Close media viewer" }).click();
  }
  const portfolios = [];
  for (const b of await page
    .getByRole("button", { name: "View Portfolio", exact: true })
    .all()) {
    await b.click();
    const d = page.getByRole("dialog");
    assert.ok((await d.locator(".kk-portfolio-grid img").count()) > 0);
    portfolios.push(
      await d
        .locator("img")
        .evaluateAll((ns) => ns.map((n) => n.getAttribute("src")).join("|")),
    );
    await page.keyboard.press("Escape");
  }
  assert.equal(
    new Set(portfolios).size,
    3,
    "individual barber galleries differ",
  );
  await page
    .getByRole("button", { name: "Chat with Stylist", exact: true })
    .nth(1)
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox")
    .fill("Would a textured crop suit me?");
  await page.getByRole("button", { name: "Send demo inquiry" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "No real message was sent" })
    .waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Live Chat", exact: true }).click();
  await page
    .getByRole("button", { name: "Haircut prices", exact: true })
    .click();
  await page
    .getByRole("log")
    .getByText(/prices are shown in the service menu in INR/)
    .waitFor();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `chat fits ${width}`,
    );
  }
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Preview fully booked example" })
    .click();
  await page
    .getByRole("button", { name: "Join Waitlist", exact: true })
    .click();
  await page
    .getByRole("complementary", { name: "Your device waitlist" })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("studioflow_mens_waitlist_v1")).length,
    ),
    1,
  );
  await page.getByRole("button", { name: "Simulate opening (demo)" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Opening detected" })
    .waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page
    .getByRole("status")
    .filter({ hasText: "Opening detected" })
    .waitFor();
  await page
    .getByRole("button", { name: "Remove request", exact: true })
    .click();
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("studioflow_mens_waitlist_v1")).length,
    ),
    0,
  );
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Hero heading", exact: true })
    .fill("Precision, made personal.");
  await page.getByRole("button", { name: "Services", exact: true }).click();
  await page
    .getByRole("button", { name: "Add Men's Haircuts", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Service name", exact: true })
    .last()
    .fill("Men's Signature Scissor Cut");
  await page
    .getByRole("button", { name: "Save to workspace", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Saved to the workspace" })
    .waitFor();
  await page
    .getByRole("button", { name: "Close / preview", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Precision, made personal.", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Men's Haircuts", exact: true })
    .click();
  await page.getByRole("button", { name: "Explore all 21 haircuts" }).click();
  assert.equal(await page.locator(".kk-service").count(), 21);
  for (
    let y = 0;
    y < (await page.evaluate(() => document.body.scrollHeight));
    y += 900
  ) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(30);
  }
  assert.deepEqual(
    await page
      .locator(".kk-site img")
      .evaluateAll((nodes) =>
        nodes.filter((n) => n.complete && !n.naturalWidth).map((n) => n.src),
      ),
    [],
    "no broken images",
  );
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Close menu" })
      .getAttribute("aria-expanded"),
    "true",
  );
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Our barbers" })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Open menu" })
      .getAttribute("aria-expanded"),
    "false",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  if (process.env.SCREENSHOT_PATH)
    await page.screenshot({
      path: process.env.SCREENSHOT_PATH,
      fullPage: false,
    });
  assert.deepEqual(errors, [], "no browser exceptions");
  console.log(
    "Template 15 browser: desktop/mobile, category filters, 30 services, demo guard, media safety, customize/save/preview, add service, navigation, images, all three video playbacks, individual portfolios, simulated chat/inquiry and persisted waitlist alerts passed.",
  );
} finally {
  await browser.close();
}

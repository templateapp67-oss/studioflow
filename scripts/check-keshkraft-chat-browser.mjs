import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const toolsRoot = process.env.BROWSER_TOOLS_ROOT;
if (!toolsRoot) throw new Error('Set BROWSER_TOOLS_ROOT to a directory containing playwright-core and @sparticuz/chromium.');
const require = createRequire(join(toolsRoot, 'package.json'));
const chromiumPackage = require('@sparticuz/chromium');
const chromium = chromiumPackage.default ?? chromiumPackage;
const libraryArchive = join(toolsRoot, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br');
const libraryDirectory = join(tmpdir(), 'al2023', 'lib');
if (existsSync(libraryArchive) && !existsSync(join(libraryDirectory, 'libnspr4.so'))) {
  await chromiumPackage.inflate(libraryArchive);
}
if (existsSync(join(libraryDirectory, 'libnspr4.so'))) {
  process.env.LD_LIBRARY_PATH = [libraryDirectory, process.env.LD_LIBRARY_PATH]
    .filter(Boolean)
    .join(':');
}
const { chromium: playwrightChromium } = require('playwright-core');
const origin = process.env.PREVIEW_URL ?? 'http://127.0.0.1:3000';
const browser = await playwrightChromium.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: true,
});
const pageErrors = [];

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(new URL('/?template=15', origin).toString(), { waitUntil: 'networkidle' });
  const launcher = page.getByRole('button', { name: 'Live Chat', exact: true });
  await launcher.waitFor();
  await launcher.click();

  const dialog = page.getByRole('dialog', { name: 'KeshKraft Live Chat' });
  const suggestions = dialog.getByRole('list', { name: 'Suggested starter requests' });
  assert.equal(await suggestions.getByRole('listitem').count(), 5);
  const promptButtons = suggestions.getByRole('button');
  assert.equal(await promptButtons.count(), 5);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `the page and chat fit at ${width}px`,
    );
    const layout = await suggestions.evaluate((list) => ({
      columns: getComputedStyle(list).gridTemplateColumns.trim().split(/\s+/).length,
      buttons: [...list.querySelectorAll('button')].map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          text: button.innerText.trim(),
          width: rect.width,
          height: rect.height,
          textFits: button.scrollWidth <= button.clientWidth + 1
            && button.scrollHeight <= button.clientHeight + 1,
          tooltip: button.hasAttribute('title'),
          transition: getComputedStyle(button).transitionProperty,
        };
      }),
    }));
    assert.equal(layout.columns, width <= 760 ? 1 : 2, `prompt grid columns at ${width}px`);
    assert.ok(layout.buttons.every((button) => button.width >= 24 && button.height >= 24));
    assert.ok(layout.buttons.every((button) => button.textFits), `prompt text is not clipped at ${width}px`);
    assert.ok(layout.buttons.every((button) => !button.tooltip));
    assert.ok(layout.buttons.every((button) => button.transition === 'none'), 'reduced-motion preference is respected');
    assert.ok(layout.buttons.every((button) => button.text.length > 0));
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  const firstPrompt = await promptButtons.nth(0).innerText();
  await promptButtons.nth(0).click();
  const composer = dialog.getByRole('textbox', { name: 'Your support question' });
  assert.equal(await composer.inputValue(), firstPrompt.trim(), 'a suggestion fills the composer');
  assert.equal(await composer.evaluate((input) => document.activeElement === input), true, 'the composer receives focus');
  assert.equal(await composer.evaluate((input) => input.selectionStart), firstPrompt.trim().length, 'the caret is at the end of the prompt');
  assert.equal(await dialog.locator('.kk-chat-customer').count(), 0, 'choosing a suggestion does not send it');

  await dialog.getByRole('button', { name: 'Send message' }).click();
  await dialog.locator('.kk-chat-customer').waitFor();
  assert.equal(await dialog.getByRole('list', { name: 'Suggested starter requests' }).count(), 0, 'suggestions hide after sending');
  await dialog.getByRole('button', { name: 'Start a new conversation' }).click();
  assert.equal(await dialog.getByRole('list', { name: 'Suggested starter requests' }).getByRole('listitem').count(), 5, 'new conversation restores suggestions');
  assert.equal(await composer.inputValue(), '', 'new conversation clears the composer');
  assert.equal(await dialog.locator('.kk-chat-customer').count(), 0, 'new conversation clears prior customer messages');
  assert.deepEqual(pageErrors, [], 'no browser exceptions');
  console.log('KeshKraft chat: prompt semantics, fill/focus/caret, no auto-send, reset, responsive grid, target size and unclipped text passed at 320, 390, 768, 1024 and 1440px.');
} finally {
  await browser.close();
}

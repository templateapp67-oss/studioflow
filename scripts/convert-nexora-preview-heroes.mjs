import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const targets = [
  ['public/templates/barber/hero.jpg', 'public/templates/barber/hero.webp'],
  ['public/templates/kesh-prakriti/hero-reference.jpg', 'public/templates/kesh-prakriti/hero-reference.webp'],
  ['public/templates/12/media/studio-practice.jpg', 'public/templates/12/media/studio-practice.webp'],
  ['public/templates/13/preview.jpg', 'public/templates/13/preview.webp'],
];

const [mode = '--write', ...args] = process.argv.slice(2);
if (mode === '--scope') {
  assert.equal(args.length, 1, 'Usage: --scope <git-diff-range>');
  assert.match(args[0], /^(?:[0-9a-f]{40}|refs\/remotes\/origin\/[\w./-]+)\.{2,3}[0-9a-f]{40}$/);
  const result = spawnSync('git', ['diff', '--quiet', args[0], '--', ...targets.flat(),
    'scripts/convert-nexora-preview-heroes.mjs', '.github/workflows/preview.yml'], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (result.error) throw result.error;
  assert.ok(result.status === 0 || result.status === 1, 'Could not determine hero verification scope from Git');
  console.log(result.status === 1 ? 'true' : 'false');
} else {
  assert.ok(args.length === 0 && (mode === '--check' || mode === '--write'),
    'Usage: --check or --write');
  const { default: sharp } = await import('sharp');
  let stale = 0;

  for (const [sourcePath, outputPath] of targets) {
    const input = await readFile(sourcePath);
    const source = await sharp(input, { failOn: 'error' }).metadata();
    assert.ok(source.width >= 280 && source.height >= 176, `${sourcePath} source dimensions are too small`);

    let encoded;
    for (const { width, height, quality } of [
      { width: 1280, height: 960, quality: 80 },
      { width: 1120, height: 840, quality: 72 },
      { width: 960, height: 720, quality: 64 },
    ]) {
      encoded = await sharp(input, { failOn: 'error' })
        .rotate()
        .resize({ width, height, fit: 'inside', withoutEnlargement: true })
        .webp({ quality, effort: 6, smartSubsample: true, nearLossless: false })
        .toBuffer();
      if (encoded.byteLength < input.byteLength - 1) break;
    }

    assert.ok(encoded.byteLength < input.byteLength, `${outputPath} must be smaller than its source JPEG`);
    const image = sharp(encoded, { failOn: 'error' });
    const metadata = await image.metadata();
    await image.stats();
    assert.equal(metadata.format, 'webp', `${outputPath} must be WebP`);
    assert.ok(metadata.width >= 280 && metadata.height >= 176, `${outputPath} dimensions are too small`);
    assert.equal(encoded.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(encoded.subarray(8, 12).toString('ascii'), 'WEBP');

    const current = await readFile(outputPath).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    let status = 'verified';
    if (!current?.equals(encoded)) {
      stale += 1;
      if (mode === '--check') {
        console.error(`FAIL ${outputPath}: ${current ? 'does not match its source and conversion settings' : 'missing'}`);
        continue;
      }
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, encoded);
      status = 'converted';
    }

    const saved = (100 * (input.byteLength - encoded.byteLength) / input.byteLength).toFixed(1);
    console.log(`PASS ${outputPath} ${status}: ${metadata.width}x${metadata.height}, ${input.byteLength}B -> ${encoded.byteLength}B (${saved}% smaller)`);
  }

  if (mode === '--check' && stale > 0) {
    console.error('Hero conversion required. Run node scripts/convert-nexora-preview-heroes.mjs --write and commit the generated WebPs.');
    process.exitCode = 1;
  } else {
    console.log(stale > 0
      ? `PASS: conversion executed for ${stale} WebP(s). All 4 heroes verified.`
      : 'PASS: all 4 WebP heroes already up to date and verified.');
  }
}

import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const targets = [
  ['public/templates/barber/hero.jpg', 'public/templates/barber/hero.webp'],
  ['public/templates/kesh-prakriti/hero-reference.jpg', 'public/templates/kesh-prakriti/hero-reference.webp'],
  ['public/templates/12/media/studio-practice.jpg', 'public/templates/12/media/studio-practice.webp'],
  ['public/templates/13/preview.jpg', 'public/templates/13/preview.webp'],
];

const minimumBytesSaved = 1;
for (const [sourcePath, outputPath] of targets) {
  const source = resolve(sourcePath);
  const output = resolve(outputPath);
  const input = await readFile(source);
  const sourceMetadata = await sharp(input, { failOn: 'error' }).metadata();
  assert.ok(sourceMetadata.width >= 280 && sourceMetadata.height >= 176,
    sourcePath + ' source dimensions are too small (' + sourceMetadata.width + 'x' + sourceMetadata.height + ')');

  await mkdir(dirname(output), { recursive: true });
  let encoded;
  let usedQuality = 80;
  for (const attempt of [
    { width: 1280, height: 960, quality: 80 },
    { width: 1120, height: 840, quality: 72 },
    { width: 960, height: 720, quality: 64 },
  ]) {
    usedQuality = attempt.quality;
    encoded = await sharp(input, { failOn: 'error' })
      .rotate()
      .resize({
        width: attempt.width,
        height: attempt.height,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: attempt.quality,
        effort: 6,
        smartSubsample: true,
        nearLossless: false,
      })
      .toBuffer();
    if (encoded.byteLength < input.byteLength - minimumBytesSaved) break;
  }

  assert.ok(encoded && encoded.byteLength < input.byteLength,
    outputPath + ' could not be made smaller than its original JPEG without enlarging or cropping the image');
  await (await import('node:fs/promises')).writeFile(output, encoded);

  const metadata = await sharp(encoded, { failOn: 'error' }).metadata();
  assert.equal(metadata.format, 'webp', outputPath + ' is encoded as WebP');
  assert.ok(metadata.width >= 280 && metadata.height >= 176,
    outputPath + ' retains useful intrinsic dimensions (' + metadata.width + 'x' + metadata.height + ')');
  const signature = encoded.subarray(0, 12).toString('ascii');
  assert.equal(signature.slice(0, 4), 'RIFF', outputPath + ' has a RIFF signature');
  assert.equal(signature.slice(8, 12), 'WEBP', outputPath + ' has a WEBP signature');

  const saved = input.byteLength - encoded.byteLength;
  const percent = (saved / input.byteLength * 100).toFixed(1);
  console.log('PASS ' + outputPath + ' ' + metadata.width + 'x' + metadata.height
    + ' q=' + usedQuality + ' ' + input.byteLength + 'B -> ' + encoded.byteLength
    + 'B (' + percent + '% smaller)');
}

console.log('PASS: all four remaining NEXORA preview heroes converted, dimension-checked and smaller than their source JPEGs.');

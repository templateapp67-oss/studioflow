import sharp from 'sharp';
import { mkdir, readdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

await mkdir('public/images', { recursive: true });
await mkdir('public/fonts', { recursive: true });
for (const file of await readdir('assets/source')) {
  if (!file.endsWith('.webp')) continue;
  const name = file.slice(0, -5);
  const input = `assets/source/${file}`;
  for (const width of [400, 800, 1600]) {
    const output = `public/images/${name}-${width}.webp`;
    await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: width === 400 ? 76 : 82 }).toFile(output);
  }
}
const fonts = [
  ['cormorant-garamond', 'latin-500-normal'], ['cormorant-garamond', 'latin-600-normal'],
  ['cormorant-garamond', 'latin-500-italic'], ['manrope', 'latin-400-normal'],
  ['manrope', 'latin-500-normal'], ['manrope', 'latin-600-normal'],
  ['tiro-devanagari-hindi', 'devanagari-400-normal'],
];
for (const [family, variant] of fonts) {
  const name = `${family}-${variant}.woff2`;
  await copyFile(resolve(`node_modules/@fontsource/${family}/files/${name}`), `public/fonts/${name}`);
}
console.log('Prepared local WebP variants and self-hosted font subsets.');

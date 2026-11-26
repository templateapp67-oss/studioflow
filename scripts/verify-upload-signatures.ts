/**
 * Negative-path verification for the magic-bytes upload hardening
 * (src/utils/fileSignature.ts).
 *
 * A declared `file.type` or a file extension is never trusted — these tests
 * prove that renamed/ spoofed files and oversized uploads are rejected, and
 * that storage names carry only a random UUID.
 *
 * Run: node scripts/verify-upload-signatures.mjs
 */
import assert from 'node:assert/strict';
import {
  IMAGE_MAX_BYTES,
  buildStorageFileName,
  readFileHeader,
  sanitizeStoragePrefix,
  sniffFileSignature,
  validateUploadFile,
} from '../src/utils/fileSignature';

let passed = 0;
const ok = (label: string) => { passed += 1; console.log(`  ok: ${label}`); };
const section = (name: string) => console.log(`\n== ${name}`);

const pngBytes = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const jpegBytes = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const webpBytes = () => {
  const bytes = new Uint8Array(16);
  const ascii = (text: string, start: number) => { for (let i = 0; i < text.length; i += 1) bytes[start + i] = text.charCodeAt(i); };
  ascii('RIFF', 0);
  bytes[4] = 0x8;
  ascii('WEBP', 8);
  ascii('VP8X', 12);
  return bytes;
};
const avifBytes = () => {
  const bytes = new Uint8Array(16);
  const ascii = (text: string, start: number) => { for (let i = 0; i < text.length; i += 1) bytes[start + i] = text.charCodeAt(i); };
  bytes[3] = 0x1c; // box size
  ascii('ftyp', 4);
  ascii('avif', 8);
  ascii('mif1', 12);
  return bytes;
};
const pdfBytes = () => new TextEncoder().encode('%PDF-1.4\n%fake-but-shaped-right');
const svgBytes = () => new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

const fileOf = (bytes: Uint8Array, name: string, type: string) =>
  new File([bytes], name, { type });

/* ------------------------------------------------------------------ */
section('sniffFileSignature: recognises the real formats');
assert.equal(sniffFileSignature(pngBytes()), 'png');
assert.equal(sniffFileSignature(jpegBytes()), 'jpeg');
assert.equal(sniffFileSignature(webpBytes()), 'webp');
assert.equal(sniffFileSignature(avifBytes()), 'avif');
assert.equal(sniffFileSignature(pdfBytes()), 'pdf');
ok('PNG / JPEG / WebP / AVIF / PDF signatures detected');

section('sniffFileSignature: rejects non-images and truncations');
assert.equal(sniffFileSignature(svgBytes()), null, 'SVG is not a supported signature');
assert.equal(sniffFileSignature(new Uint8Array([0x4d, 0x5a, 0x90, 0x00])), null, 'EXE (MZ) rejected');
assert.equal(sniffFileSignature(new Uint8Array([0x89, 0x50])), null, 'truncated PNG rejected');
assert.equal(sniffFileSignature(new Uint8Array([])), null, 'empty buffer rejected');
assert.equal(sniffFileSignature(new Uint8Array([0xff, 0xd8])), null, 'truncated JPEG rejected');
assert.equal(
  sniffFileSignature(new TextEncoder().encode('RIFFxxxxWAVE').slice(0, 12)),
  null,
  'RIFF container that is not WEBP rejected',
);
ok('SVG / EXE / truncated / wrong-container payloads rejected');

/* ------------------------------------------------------------------ */
section('validateUploadFile: accepts genuine files');
{
  const png = await validateUploadFile(fileOf(pngBytes(), 'photo.png', 'image/png'));
  assert.equal(png.signature, 'png');
  assert.equal(png.extension, 'png');
  ok('genuine PNG accepted');
  const jpeg = await validateUploadFile(fileOf(jpegBytes(), 'photo.jpg', 'image/jpeg'));
  assert.equal(jpeg.signature, 'jpeg');
  assert.equal(jpeg.extension, 'jpg');
  ok('genuine JPEG accepted');
  const octet = await validateUploadFile(fileOf(pngBytes(), 'photo.bin', 'application/octet-stream'));
  assert.equal(octet.signature, 'png', 'octet-stream declared type is tolerated');
  ok('octet-stream declaration tolerated');
  const exact = await validateUploadFile(fileOf(pngBytes(), 'photo.png', 'image/png'), { maxBytes: pngBytes().length });
  assert.equal(exact.signature, 'png', 'a file at exactly the byte cap is accepted');
  ok('file exactly at the cap accepted');
}

section('validateUploadFile: rejects spoofed and hostile files');
{
  await assert.rejects(
    () => validateUploadFile(fileOf(svgBytes(), 'evil.png', 'image/png')),
    /could not be verified/,
    'SVG renamed to .png must be rejected',
  );
  ok('SVG renamed to .png rejected');
  await assert.rejects(
    () => validateUploadFile(fileOf(svgBytes(), 'evil.svg', 'image/svg+xml')),
    /could not be verified/,
    'SVG with an honest declaration is still rejected (not a supported signature)',
  );
  ok('SVG with honest declaration rejected');
  await assert.rejects(
    () => validateUploadFile(fileOf(jpegBytes(), 'photo.png', 'image/png')),
    /declared type/,
    'JPEG bytes declared as image/png must be rejected',
  );
  ok('content/declared-type mismatch rejected');
  await assert.rejects(
    () => validateUploadFile(fileOf(pngBytes(), 'photo.png', 'image/gif')),
    /declared type/,
    'PNG declared as image/gif must be rejected',
  );
  ok('PNG declared as GIF rejected');
  await assert.rejects(
    () => validateUploadFile(fileOf(new Uint8Array([]), 'empty.png', 'image/png')),
    /non-empty/,
    'empty file rejected',
  );
  ok('empty file rejected');
  await assert.rejects(
    () => validateUploadFile(fileOf(pdfBytes(), 'doc.pdf', 'application/pdf'), { allowed: ['png', 'jpeg', 'webp'] }),
    /not supported/,
    'PDF refused by image-only flows',
  );
  ok('PDF refused by image-only allow-list');
  await assert.rejects(
    () => validateUploadFile(fileOf(pngBytes(), 'photo.png', 'image/png'), { maxBytes: 8 }),
    /smaller than/,
    'file over the byte cap rejected',
  );
  ok('file over the byte cap rejected');
  await assert.rejects(
    () => validateUploadFile(fileOf(pngBytes(), 'photo.png', 'image/png'), { maxBytes: IMAGE_MAX_BYTES + 1, allowed: ['pdf'] }),
    /not supported/,
    'PNG refused by a PDF-only allow-list',
  );
  ok('PNG refused by PDF-only allow-list');
}

section('validateUploadFile: declared type matching is case-insensitive');
{
  const shouting = await validateUploadFile(fileOf(pngBytes(), 'photo.png', 'IMAGE/PNG'));
  assert.equal(shouting.signature, 'png');
  ok('uppercase declared type accepted');
  const withCharset = await validateUploadFile(fileOf(pngBytes(), 'photo.png', 'image/png; charset=binary'));
  assert.equal(withCharset.signature, 'png');
  ok('declared type with parameters accepted');
}

/* ------------------------------------------------------------------ */
section('readFileHeader: only the header bytes are read');
{
  const header = await readFileHeader(fileOf(pngBytes(), 'photo.png', 'image/png'), 8);
  assert.equal(header.length, 8);
  assert.equal(header[0], 0x89);
  ok('header read is bounded');
}

section('sanitizeStoragePrefix: path traversal is impossible');
{
  assert.equal(sanitizeStoragePrefix('owner-id/photos'), 'owner-id/photos');
  assert.equal(sanitizeStoragePrefix('owner-id//photos'), 'owner-id/photos', 'duplicate slashes collapsed');
  assert.equal(sanitizeStoragePrefix('/leading/slash/'), 'leading/slash', 'leading and trailing slashes removed');
  assert.equal(sanitizeStoragePrefix('back\\slash\\path'), 'back/slash/path', 'backslashes normalised to forward slashes');
  assert.equal(sanitizeStoragePrefix(''), '');
  assert.equal(sanitizeStoragePrefix(undefined), '');
  assert.equal(sanitizeStoragePrefix(null), '');
  ok('well-formed prefixes pass through');
  for (const hostile of ['../escape', 'a/../b', 'a/./b', 'a b/c', 'a.b/c', 'a;b/c', 'a:b/c', `x${'y'.repeat(81)}/z`]) {
    assert.throws(() => sanitizeStoragePrefix(hostile), /not allowed/, `prefix ${JSON.stringify(hostile)} rejected`);
  }
  ok('dot segments, separators, spaces, colons and overlong segments rejected');
}

section('buildStorageFileName: random UUID names with signature extensions');
{
  const first = buildStorageFileName('png', 'owner-id/photos');
  const second = buildStorageFileName('png', 'owner-id/photos');
  assert.match(first, /^owner-id\/photos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/);
  assert.notEqual(first, second, 'two names are never equal');
  ok('generated name is <prefix>/<uuid>.<ext>');
  const bare = buildStorageFileName('pdf');
  assert.match(bare, /^[0-9a-f-]{36}\.pdf$/);
  ok('prefix omitted yields a bare UUID filename');
  const jpeg = buildStorageFileName('jpeg', 'salon/media');
  assert.match(jpeg, /^salon\/media\/[0-9a-f-]{36}\.jpg$/, 'jpeg extension is derived from the signature');
  ok('extension comes from the signature, never from a caller-supplied name');
  assert.throws(() => buildStorageFileName('png', '../escape'), /not allowed/);
  ok('hostile prefix rejected at naming time');
  const hostileNameIgnored = buildStorageFileName('png', 'owner-id/photos');
  assert.ok(!hostileNameIgnored.includes('..'), 'no dot segments can appear');
  ok('caller file names never appear in storage paths');
}

console.log(`\nverify-upload-signatures: PASS (${passed} assertion groups)`);

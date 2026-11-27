/**
 * Shared binary fixtures for verification suites.
 *
 * The upload paths now verify real magic bytes, so test files must carry the
 * actual signature they claim to be — a few ASCII bytes named "photo.png" are
 * (correctly) rejected. These helpers stamp real signature headers and pad to
 * the requested size.
 */

export const PNG_HEADER = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
export const JPEG_HEADER = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01]);
export const WEBP_HEADER = (() => {
  const bytes = new Uint8Array(16);
  const ascii = (text: string, start: number) => { for (let i = 0; i < text.length; i += 1) bytes[start + i] = text.charCodeAt(i); };
  ascii('RIFF', 0);
  bytes[4] = 8;
  bytes[5] = 0;
  bytes[6] = 0;
  bytes[7] = 0;
  ascii('WEBP', 8);
  ascii('VP8X', 12);
  return bytes;
})();
export const PDF_HEADER = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-

function padded(header: Uint8Array, size: number): Uint8Array {
  const safeSize = Math.max(header.length, size);
  const bytes = new Uint8Array(safeSize);
  bytes.set(header, 0);
  return bytes;
}

export const pngBytes = (size = 32) => padded(PNG_HEADER, size);
export const jpegBytes = (size = 32) => padded(JPEG_HEADER, size);
export const webpBytes = (size = 32) => padded(WEBP_HEADER, size);

export const pngFile = (name = 'photo.png', size = 32) => new File([pngBytes(size)], name, { type: 'image/png' });
export const jpegFile = (name = 'photo.jpg', size = 32) => new File([jpegBytes(size)], name, { type: 'image/jpeg' });
export const webpFile = (name = 'photo.webp', size = 32) => new File([webpBytes(size)], name, { type: 'image/webp' });

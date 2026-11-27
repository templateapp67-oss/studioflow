/**
 * Binary image-signature sniffing for the Edge media pipeline.
 *
 * A Content-Type header, a HEAD response or a file extension is never trusted:
 * the first bytes of the object decide what it actually is. Supports PNG,
 * JPEG, WebP and AVIF (the only formats this project stores), plus PDF so the
 * same rule covers future document flows.
 */

export type ImageSignature = "image/png" | "image/jpeg" | "image/webp" | "image/avif";
export type FileSignature = ImageSignature | "application/pdf";

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(start, start + length));

/** Inspects the leading bytes and returns the true type, or null. */
export function sniffFileSignature(bytes: Uint8Array): FileSignature | null {
  if (!bytes || bytes.length < 5) return null;
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const major = ascii(bytes, 8, 4);
    if (major === "avif" || major === "avis" || major === "mif1") return "image/avif";
    return null;
  }
  if (ascii(bytes, 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  return null;
}

/** Sniffed type narrowed to the image formats this project stores. */
export function sniffImageSignature(bytes: Uint8Array): ImageSignature | null {
  const signature = sniffFileSignature(bytes);
  return signature === "application/pdf" || signature === null ? null : signature;
}

/** Maximum stored image size: 5 MB, matching the media bucket policy. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

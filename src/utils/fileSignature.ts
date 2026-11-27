/**
 * Binary-signature upload validation ("magic bytes"), shared by every client-
 * side upload path in this app. A declared `file.type` or a file extension is
 * never trusted: the first bytes of the file decide what it actually is.
 *
 * Supported signatures: PNG, JPEG, WebP, AVIF and PDF.
 *
 * Storage paths built with `buildStorageFileName` contain only a random UUID
 * and a signature-derived extension — never the caller-supplied file name.
 */

export type FileSignature = 'png' | 'jpeg' | 'webp' | 'avif' | 'pdf';

export const SIGNATURE_EXTENSIONS: Record<FileSignature, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
  avif: 'avif',
  pdf: 'pdf',
};

export const SIGNATURE_MIME_TYPES: Record<FileSignature, readonly string[]> = {
  png: ['image/png'],
  jpeg: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  webp: ['image/webp'],
  avif: ['image/avif'],
  pdf: ['application/pdf'],
};

export const IMAGE_SIGNATURES: readonly FileSignature[] = ['png', 'jpeg', 'webp', 'avif'];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PDF_MAX_BYTES = 5 * 1024 * 1024;
/** Maximum accepted size for a raw camera/phone photo before optimisation. */
export const SOURCE_IMAGE_MAX_BYTES = 20 * 1024 * 1024;

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(start, start + length));

/** Inspects the leading bytes and returns the file's true signature, or null. */
export function sniffFileSignature(bytes: Uint8Array): FileSignature | null {
  if (!bytes || bytes.length < 5) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'png';
  }
  // JPEG: FF D8 FF (any marker segment follows)
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  // WEBP: "RIFF" .... "WEBP"
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return 'webp';
  }
  // AVIF/AVIS: ISO-BMFF with a compatible major brand of avif/avis/mif1
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp') {
    const major = ascii(bytes, 8, 4);
    if (major === 'avif' || major === 'avis' || major === 'mif1') return 'avif';
    return null;
  }
  // PDF: "%PDF-"
  if (ascii(bytes, 0, 5) === '%PDF-') {
    return 'pdf';
  }
  return null;
}

/** Reads up to `length` header bytes from a Blob. */
export async function readFileHeader(file: Blob, length = 16): Promise<Uint8Array> {
  const slice = file.slice(0, length);
  return new Uint8Array(await slice.arrayBuffer());
}

export interface UploadValidationOptions {
  /** Hard ceiling on file.size. Defaults to 5 MB. */
  maxBytes?: number;
  /** Signatures allowed for this flow (e.g. images only). Defaults to images + PDF. */
  allowed?: readonly FileSignature[];
}

export interface UploadValidationResult {
  signature: FileSignature;
  extension: string;
  bytes: number;
}

const MB = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

/**
 * Validates an upload by size, magic bytes and (when present) declared type.
 * Throws an Error with a user-readable message on any mismatch.
 */
export async function validateUploadFile(
  file: Blob & { name?: string; type?: string },
  options: UploadValidationOptions = {},
): Promise<UploadValidationResult> {
  const maxBytes = options.maxBytes ?? IMAGE_MAX_BYTES;
  const allowed = options.allowed ?? [...IMAGE_SIGNATURES, 'pdf'];
  if (!file) throw new Error('No file was selected.');
  const bytes = file.size;
  if (!Number.isFinite(bytes) || bytes <= 0) {
    throw new Error('Choose a non-empty file.');
  }
  if (bytes > maxBytes) {
    throw new Error(`Use a file smaller than ${MB(maxBytes)} MB.`);
  }
  const header = await readFileHeader(file, 16);
  const signature = sniffFileSignature(header);
  if (!signature) {
    throw new Error('This file could not be verified as a supported type (PNG, JPEG, WebP, AVIF or PDF).');
  }
  if (!allowed.includes(signature)) {
    throw new Error('This file type is not supported here.');
  }
  const declared = (file.type || '').split(';')[0].trim().toLowerCase();
  if (declared && declared !== 'application/octet-stream') {
    const accepted = SIGNATURE_MIME_TYPES[signature];
    if (!accepted.includes(declared)) {
      throw new Error('The file content does not match its declared type.');
    }
  }
  return { signature, extension: SIGNATURE_EXTENSIONS[signature], bytes };
}

const randomId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 18)}`;
};

/**
 * Validates a storage-path prefix such as "owner-uuid/photos". No `..`, no
 * backslashes, no control characters, no leading/trailing slashes.
 */
export function sanitizeStoragePrefix(prefix: string | undefined | null): string {
  if (!prefix) return '';
  const cleaned = String(prefix).replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '');
  if (!cleaned) return '';
  const segments = cleaned.split('/');
  for (const segment of segments) {
    if (!segment || segment === '.' || segment === '..' || !/^[A-Za-z0-9_-]{1,80}$/.test(segment)) {
      throw new Error('The storage folder is not allowed.');
    }
  }
  return segments.join('/');
}

/**
 * Builds "<prefix>/<uuid>.<ext>" for a validated signature — never derived
 * from the caller's file name.
 */
export function buildStorageFileName(signature: FileSignature, prefix?: string | null): string {
  const safe = sanitizeStoragePrefix(prefix);
  const name = `${randomId()}.${SIGNATURE_EXTENSIONS[signature]}`;
  return safe ? `${safe}/${name}` : name;
}

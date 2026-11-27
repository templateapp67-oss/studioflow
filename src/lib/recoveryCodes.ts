/**
 * MFA backup recovery codes — browser-side helpers.
 *
 * Plaintext codes are generated and shown once, here, in the browser. The
 * database stores only SHA-256(salt || ':' || normalizedCode) with a
 * per-code random salt, via the `studioflow_mfa_recovery_codes_issue` RPC
 * (AAL2 session required). Nothing is persisted client-side: no
 * localStorage, no sessionStorage, no state outliving the reveal panel.
 */

/** 32 unambiguous characters (no 0/O, no 1/I) → exactly 5 bits each, `byte % 32` is uniform. */
export const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export interface RecoveryCodeEntry {
  /** Display form, groups of four: `XXXX-XXXX-XXXX-XXXX`. Shown once. */
  code: string;
  /** 32-hex random salt the server stores next to the hash. */
  salt: string;
  /** 64-hex lowercase SHA-256 of `${salt}:${normalizedCode}`. */
  hash: string;
}

/** Upper-cases and strips everything non-alphanumeric — mirrors the SQL. */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Formats 16–32 alphanumerics as groups of four for display. */
export function formatRecoveryCode(normalized: string): string {
  return normalized.match(/.{1,4}/g)?.join('-') ?? normalized;
}

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/** SHA-256 of `${salt}:${normalized}` as lowercase hex — mirrors `encode(digest(...,'sha256'),'hex')`. */
export async function recoveryCodeHash(normalized: string, salt: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('Secure crypto is unavailable in this browser. Use a current browser over HTTPS.');
  const bytes = new TextEncoder().encode(`${salt}:${normalized}`);
  return toHex(new Uint8Array(await subtle.digest('SHA-256', bytes)));
}

/** Draws `count` fresh codes. 16 alphabet chars × 5 bits = 80 bits each. */
export async function generateRecoveryCodes(count = 8): Promise<RecoveryCodeEntry[]> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Secure randomness is unavailable in this browser.');
  }
  const entries: RecoveryCodeEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    const random = new Uint8Array(16);
    cryptoApi.getRandomValues(random);
    let normalized = '';
    for (const byte of random) normalized += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length];
    const salt = toHex(cryptoApi.getRandomValues(new Uint8Array(16)));
    // eslint-disable-next-line no-await-in-loop -- sequential hashing keeps entropy derivation simple to audit
    const hash = await recoveryCodeHash(normalized, salt);
    entries.push({ code: formatRecoveryCode(normalized), salt, hash });
  }
  return entries;
}

/** The payload accepted by `studioflow_mfa_recovery_codes_issue`. */
export function issuePayload(entries: RecoveryCodeEntry[]): { salt: string; code_hash: string }[] {
  return entries.map(({ salt, hash }) => ({ salt, code_hash: hash }));
}

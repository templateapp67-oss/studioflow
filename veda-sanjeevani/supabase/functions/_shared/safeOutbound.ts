/**
 * Outbound SSRF guard for the Edge runtime — the Deno twin of
 * `server/httpValidation.ts` (`assertSafeOutboundUrl` / `safeOutboundFetch`).
 * Both implementations enforce the same block list and must stay in sync.
 *
 * Rules: HTTPS only, no credentials in the URL, no empty hosts, no
 * localhost / loopback / link-local / RFC1918 / CGNAT / documentation /
 * multicast / reserved addresses — for IPv4, IPv6, and their encodings
 * (integer/octal/hex IPv4 are normalised by the URL parser before we see
 * them; IPv4-mapped, NAT64, 6to4 and Teredo IPv6 embeddings are unmapped and
 * re-checked). Redirects are never followed: every caller passes
 * `redirect: "manual"` so a public URL cannot 302 into a private address.
 *
 * Production builds require HTTPS for SUPABASE_URL/SITE_URL anyway (env.ts),
 * so the strict scheme rule does not affect deployed functions; local
 * `supabase functions serve` should use an HTTPS SUPABASE_URL or accept the
 * guard failing closed.
 *
 * Scope note (deliberate): a sync guard cannot resolve DNS — a public
 * hostname that resolves to a private address (DNS rebinding) is out of
 * scope. Deploy egress filtering for full protection.
 */

export type Fetcher = typeof fetch;

export class SsrfBlockedError extends Error {
  readonly code = "SSRF_BLOCKED";
  constructor(message: string) {
    super(message);
    this.name = "SsrfBlockedError";
  }
}

type Ipv4Quad = [number, number, number, number];

/** Parses a dotted-quad IPv4 literal; null for anything else (incl. leading zeros). */
function parseDottedQuad(host: string): Ipv4Quad | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const out: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    if (part.length > 1 && part.startsWith("0")) return null;
    const value = Number(part);
    if (value > 255) return null;
    out.push(value);
  }
  return out as Ipv4Quad;
}

const IPV4_BLOCKED_DOC_RANGES: ReadonlyArray<[number, number, number]> = [
  [192, 0, 0], // 192.0.0.0/24 IETF protocol assignments
  [192, 0, 2], // 192.0.2.0/24 TEST-NET-1, RFC5737
  [198, 51, 100], // 198.51.100.0/24 TEST-NET-2, RFC5737
  [203, 0, 113], // 203.0.113.0/24 TEST-NET-3, RFC5737
];

function isBlockedIpv4([a, b, c]: Ipv4Quad): boolean {
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // RFC1918
  if (a === 127) return true; // loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT shared space, RFC6598
  if (a === 169 && b === 254) return true; // link-local (cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking, RFC2544
  if (IPV4_BLOCKED_DOC_RANGES.some(([x, y, z]) => a === x && b === y && c === z)) return true;
  if (a >= 224) return true; // multicast + reserved
  return false;
}

/**
 * Parses an IPv6 literal (no brackets, lowercase) into its eight 16-bit
 * groups, expanding `::` compression and an optional embedded IPv4 tail.
 */
function parseIpv6Groups(input: string): number[] | null {
  if (!/^[0-9a-f:.]+$/i.test(input)) return null;
  let head = input;
  const tail: number[] = [];
  const v4 = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(input);
  const v4Tail = v4?.[1];
  if (v4 && v4Tail) {
    const quad = parseDottedQuad(v4Tail);
    if (!quad) return null;
    tail.push((quad[0] << 8) | quad[1], (quad[2] << 8) | quad[3]);
    head = input.slice(0, input.length - v4Tail.length).replace(/:$/, "");
  }
  const halves = head.split("::");
  if (halves.length > 2) return null;
  const firstHalf = halves[0] ?? "";
  const secondHalf = halves.length === 2 ? halves[1] ?? "" : "";
  const left = firstHalf === "" ? [] : firstHalf.split(":");
  const right = halves.length === 2 ? (secondHalf === "" ? [] : secondHalf.split(":")) : [];
  for (const group of [...left, ...right]) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
  }
  const known = left.length + right.length + tail.length;
  if (halves.length === 1) {
    if (known !== 8) return null;
  } else if (known >= 8) {
    return null;
  }
  const missing = 8 - known;
  const groups = [
    ...left.map((g) => parseInt(g, 16)),
    ...Array<number>(missing).fill(0),
    ...right.map((g) => parseInt(g, 16)),
    ...tail,
  ];
  return groups.length === 8 ? groups : null;
}

function isBlockedIpv6Groups(groups: number[]): boolean {
  const [a, b, c, d, e, f, g, h] = groups as [number, number, number, number, number, number, number, number];
  const allZero = groups.every((group) => group === 0);
  if (allZero) return true; // :: unspecified
  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0 && g === 0 && h === 1) {
    return true; // ::1 loopback
  }
  if (f === 0xffff && a === 0 && b === 0 && c === 0 && d === 0 && e === 0) {
    return isBlockedIpv4([g >> 8, g & 0xff, h >> 8, h & 0xff]); // IPv4-mapped ::ffff:0/96
  }
  if (a === 0x0064 && b === 0xff9b && c === 0 && d === 0 && e === 0 && f === 0) {
    return isBlockedIpv4([g >> 8, g & 0xff, h >> 8, h & 0xff]); // NAT64 64:ff9b::/96
  }
  if (a === 0x0064 && b === 0xff9b && c === 0x0001) return true; // local-use NAT64 64:ff9b:1::/48
  if (a === 0x2002) {
    return isBlockedIpv4([b >> 8, b & 0xff, c >> 8, c & 0xff]); // 6to4 2002::/16
  }
  if (a === 0x2001 && b === 0x0000) return true; // Teredo 2001::/32
  if (a === 0x2001 && b === 0x0db8) return true; // documentation 2001:db8::/32
  if (a === 0x0100) return true; // discard-only 100::/8, RFC6666
  if ((a & 0xfe00) === 0xfc00) return true; // unique local fc00::/7
  if ((a & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((a & 0xff00) === 0xff00) return true; // multicast ff00::/8
  return false;
}

function blockedHostReason(host: string): string | null {
  const clean = host.toLowerCase().replace(/\.$/, "");
  if (!clean) return "empty host";
  if (clean === "localhost" || clean.endsWith(".localhost")) return "localhost";
  if (clean.startsWith("[") && clean.endsWith("]")) {
    const groups = parseIpv6Groups(clean.slice(1, -1));
    if (!groups) return "unparseable IPv6 literal";
    return isBlockedIpv6Groups(groups) ? "non-public IPv6 address" : null;
  }
  const quad = parseDottedQuad(clean);
  if (quad) return isBlockedIpv4(quad) ? "non-public IPv4 address" : null;
  return null;
}

const inputUrl = (input: string | URL | Request): string | URL => {
  if (typeof input === "string" || input instanceof URL) return input;
  return input.url;
};

/**
 * Throws `SsrfBlockedError` unless `input` is an HTTPS URL whose host is a
 * public address. Returns the validated URL on success.
 */
export function assertSafeOutboundUrl(input: string | URL | Request): URL {
  let url: URL;
  try {
    const candidate = inputUrl(input);
    url = typeof candidate === "string" ? new URL(candidate) : candidate;
  } catch {
    throw new SsrfBlockedError("Outbound URL could not be parsed.");
  }
  if (url.protocol !== "https:") {
    throw new SsrfBlockedError(`Outbound URL must use HTTPS, got "${url.protocol || "unknown"}".`);
  }
  if (url.username || url.password) {
    throw new SsrfBlockedError("Outbound URL must not embed credentials.");
  }
  const reason = blockedHostReason(url.hostname);
  if (reason) {
    throw new SsrfBlockedError(`Outbound URL host is not allowed: ${reason}.`);
  }
  return url;
}

/**
 * `fetch` guarded by `assertSafeOutboundUrl`. Redirects are never followed:
 * a 3xx comes back as a response the caller rejects as an error.
 */
export async function safeOutboundFetch(
  input: string | URL | Request,
  init: RequestInit = {},
  fetcher: Fetcher = fetch,
): Promise<Response> {
  const url = assertSafeOutboundUrl(input);
  return await fetcher(url, { ...init, redirect: "manual" });
}

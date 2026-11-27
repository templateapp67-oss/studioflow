/**
 * Shared request-validation and outbound-URL safety for this repository.
 *
 * Two jobs, one module:
 *
 *   1. Strict request-body validation (`validateBody` / `strictBody`).
 *      Every parsed JSON body is checked before a handler sees it:
 *        * a byte cap (default 256 KB, per-route override) rejects oversized
 *          payloads with 413 — before any field is read;
 *        * undeclared ("unknown") fields are stripped, never reflected;
 *        * declared fields are type-, length- and format-checked and wrong
 *          shapes are rejected with 400 — a bot or a buggy client can no
 *          longer smuggle an object where a string is expected;
 *        * `__proto__`, `constructor` and `prototype` keys are dropped at
 *          every level so a JSON body cannot pollute a result object;
 *        * free-form JSON values are depth-, breadth- and size-bounded.
 *      Unknown fields are stripped silently (clients may send extra keys);
 *      known fields with wrong types/formats are always rejected.
 *
 *   2. Outbound SSRF guard (`assertSafeOutboundUrl` / `safeOutboundFetch`).
 *      A server-side fetch may only leave for an HTTPS URL whose host is not
 *      localhost, loopback, link-local (cloud metadata), private, reserved or
 *      otherwise non-public. All outbound calls use `redirect: 'manual'` so a
 *      public URL cannot 302 into a metadata address behind the guard's back;
 *      a 3xx surfaces as a failed response, which every caller treats as an
 *      error (fail-closed, never follow).
 *
 * This module has no runtime imports (express types are type-only), so it can
 * also be pulled into the browser bundle for the client-side URL-import path.
 *
 * Scope notes (deliberate):
 *   * A sync guard cannot resolve DNS: a public hostname that resolves to a
 *     private address (DNS rebinding) is out of scope for this check. Deploy
 *     egress filtering for full protection. Literal IP hosts are always
 *     checked, including integer/octal/hex notations (which the WHATWG URL
 *     parser normalises to dotted-quad before we see them) and IPv4-mapped,
 *     NAT64, 6to4 and Teredo IPv6 forms.
 *   * 6to4/Teredo relays and carrier-grade NAT are blocked; IPv4-mapped
 *     ::ffff/96 is unmapped and re-checked against the IPv4 ranges.
 */

import type { NextFunction, Request, RequestHandler, Response as ExpressResponse } from 'express';

/* ------------------------------------------------------------------------- *
 * SSRF guard
 * ------------------------------------------------------------------------- */

export class SsrfBlockedError extends Error {
  readonly code = 'SSRF_BLOCKED';
  constructor(message: string) {
    super(message);
    this.name = 'SsrfBlockedError';
  }
}

type Ipv4Quad = [number, number, number, number];

/** Parses a dotted-quad IPv4 literal; null for anything else (incl. leading zeros). */
function parseDottedQuad(host: string): Ipv4Quad | null {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const out: number[] = [];
  for (const part of parts) {
    // Reject leading zeros ("010" is octal in some parsers, ambiguous in all).
    if (!/^\d{1,3}$/.test(part)) return null;
    if (part.length > 1 && part.startsWith('0')) return null;
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
  if (a === 0) return true; // 0.0.0.0/8 "this host"
  if (a === 10) return true; // RFC1918
  if (a === 127) return true; // loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT shared space, RFC6598
  if (a === 169 && b === 254) return true; // link-local (169.254.169.254 cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking, RFC2544
  if (IPV4_BLOCKED_DOC_RANGES.some(([x, y, z]) => a === x && b === y && c === z)) return true;
  if (a >= 224) return true; // multicast + reserved, RFC5735
  return false;
}

/**
 * Parses an IPv6 literal (no brackets, lowercase) into its eight 16-bit
 * groups, expanding `::` compression and an optional embedded IPv4 tail.
 * Returns null for anything that is not valid IPv6.
 */
function parseIpv6Groups(input: string): number[] | null {
  if (!/^[0-9a-f:.]+$/i.test(input)) return null;
  let head = input;
  const tail: number[] = [];
  const v4 = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(input);
  if (v4) {
    const quad = parseDottedQuad(v4[1]);
    if (!quad) return null;
    tail.push((quad[0] << 8) | quad[1], (quad[2] << 8) | quad[3]);
    head = input.slice(0, input.length - v4[1].length).replace(/:$/, '');
  }
  const halves = head.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] === '' ? [] : halves[0].split(':');
  const right = halves.length === 2 ? (halves[1] === '' ? [] : halves[1].split(':')) : [];
  for (const group of [...left, ...right]) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
  }
  const known = left.length + right.length + tail.length;
  if (halves.length === 1) {
    // No compression: must fill all eight groups exactly.
    if (known !== 8) return null;
  } else if (known >= 8) {
    // "::" must stand for at least one 16-bit group.
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
  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0 && g === 0 && h === 1) return true; // ::1 loopback
  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0xffff) {
    // IPv4-mapped ::ffff:0/96 — re-check the embedded IPv4 address.
    return isBlockedIpv4([g >> 8, g & 0xff, h >> 8, h & 0xff]);
  }
  if (a === 0x0064 && b === 0xff9b && c === 0 && d === 0 && e === 0 && f === 0) {
    // Well-known NAT64 64:ff9b::/96 — the last 32 bits embed the IPv4 target.
    return isBlockedIpv4([g >> 8, g & 0xff, h >> 8, h & 0xff]);
  }
  if (a === 0x0064 && b === 0xff9b && c === 0x0001) return true; // local-use NAT64 64:ff9b:1::/48
  if (a === 0x2002) {
    // 6to4 2002::/16 — IPv4 address is groups 1..2.
    return isBlockedIpv4([b >> 8, b & 0xff, c >> 8, c & 0xff]);
  }
  if (a === 0x2001 && b === 0x0000) return true; // Teredo 2001::/32 (obfuscated IPv4)
  if (a === 0x2001 && b === 0x0db8) return true; // documentation 2001:db8::/32
  if (a === 0x0100) return true; // discard-only 100::/8, RFC6666
  if ((a & 0xfe00) === 0xfc00) return true; // unique local fc00::/7
  if ((a & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((a & 0xff00) === 0xff00) return true; // multicast ff00::/8
  return false;
}

function blockedHostReason(host: string): string | null {
  // WHATWG parsing already normalised integer/octal/hex IPv4 to dotted-quad
  // and lowercased the host; strip a trailing root dot before comparing.
  const clean = host.toLowerCase().replace(/\.$/, '');
  if (!clean) return 'empty host';
  if (clean === 'localhost' || clean.endsWith('.localhost')) return 'localhost';
  if (clean.startsWith('[') && clean.endsWith(']')) {
    const groups = parseIpv6Groups(clean.slice(1, -1));
    if (!groups) return 'unparseable IPv6 literal';
    return isBlockedIpv6Groups(groups) ? 'non-public IPv6 address' : null;
  }
  const quad = parseDottedQuad(clean);
  if (quad) return isBlockedIpv4(quad) ? 'non-public IPv4 address' : null;
  return null;
}

/**
 * Throws `SsrfBlockedError` unless `input` is an HTTPS URL whose host is a
 * public address. Returns the validated URL on success.
 *
 * Blocked: non-HTTPS schemes, credentials in the URL, empty hosts, localhost,
 * IPv4 0.0.0.0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.168/16,
 * documentation ranges, multicast/reserved (≥224), IPv6 ::, ::1, ::ffff/*
 * (unmapped + re-checked), NAT64 64:ff9b::/96, 6to4 2002::/16, Teredo
 * 2001::/32, ULA fc00::/7, link-local fe80::/10, multicast ff00::/8 and
 * discard-only 100::/8.
 *
 * Callers must also avoid following redirects (this module pairs the guard
 * with `redirect: 'manual'` in `safeOutboundFetch`).
 */
export function assertSafeOutboundUrl(input: string | URL): URL {
  let url: URL;
  try {
    url = typeof input === 'string' ? new URL(input) : input;
  } catch {
    throw new SsrfBlockedError('Outbound URL could not be parsed.');
  }
  if (url.protocol !== 'https:') {
    throw new SsrfBlockedError(`Outbound URL must use HTTPS, got "${url.protocol || 'unknown'}".`);
  }
  if (url.username || url.password) {
    throw new SsrfBlockedError('Outbound URL must not embed credentials.');
  }
  const reason = blockedHostReason(url.hostname);
  if (reason) {
    throw new SsrfBlockedError(`Outbound URL host is not allowed: ${reason}.`);
  }
  return url;
}

/**
 * `fetch` guarded by `assertSafeOutboundUrl`. Redirects are never followed:
 * a 3xx comes back as a response the caller rejects as an error, so a public
 * URL cannot bounce the request into a private address.
 */
export async function safeOutboundFetch(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  const url = assertSafeOutboundUrl(input);
  return fetch(url, { ...init, redirect: 'manual' });
}

/* ------------------------------------------------------------------------- *
 * Strict body validation
 * ------------------------------------------------------------------------- */

export const DEFAULT_MAX_BODY_BYTES = 256 * 1024;
const MAX_DEPTH = 12;
const MAX_FIELD_ERRORS = 8;
const FREEFORM_MAX_DEPTH = 4;
const FREEFORM_MAX_STRING = 2000;
const FREEFORM_MAX_ARRAY = 50;
const FREEFORM_MAX_KEYS = 40;
const FREEFORM_MAX_NODES = 2000;

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
/** Matches every C0/C1 control character and DEL — never legitimate in these payloads. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;

export type FieldType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array'
  | 'object'
  | 'freeform'
  | 'flag'
  | 'loose';

export interface FieldRule {
  type: FieldType;
  /** Missing/undefined fields are skipped unless this is set. */
  required?: boolean;
  /** string: max chars · number/integer: max value · array: max items. */
  max?: number;
  /** string: min chars · number/integer: min value · array: min items. */
  min?: number;
  /** string format presets are expressed as ordinary patterns. */
  pattern?: RegExp;
  /** string must be one of these values. */
  enum?: readonly string[];
  /** object (known shape): recursion budget for nested known keys. */
  fields?: BodySchema;
  /** object: max declared/own keys (default 30). */
  maxKeys?: number;
  /** array: rule applied to every element. */
  item?: FieldRule;
}

export type BodySchema = Record<string, FieldRule>;

export type ValidateBodyResult =
  | { ok: true; data: Record<string, unknown>; dropped: string[] }
  | { ok: false; status: 400 | 413; code: 'invalid_request' | 'body_too_large'; fields: string[] };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const byteLength = (value: unknown): number | null => {
  try {
    const json = JSON.stringify(value);
    if (json === undefined) return 0;
    return new TextEncoder().encode(json).length;
  } catch {
    return null;
  }
};

interface FieldError {
  path: string;
}

class FieldSink {
  readonly errors: FieldError[] = [];
  add(path: string): void {
    if (this.errors.length < MAX_FIELD_ERRORS) this.errors.push({ path });
  }
  get fields(): string[] {
    return this.errors.map((error) => error.path).slice(0, MAX_FIELD_ERRORS);
  }
}

const parseNumberLiteral = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/,/g, '');
  if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const stringLength = (value: string): number => value.length;

function validateString(rule: FieldRule, value: unknown, path: string, sink: FieldSink): string | null {
  if (typeof value !== 'string') {
    sink.add(path);
    return null;
  }
  const length = stringLength(value);
  if (rule.max !== undefined && length > rule.max) {
    sink.add(path);
    return null;
  }
  if (rule.min !== undefined && length < rule.min) {
    sink.add(path);
    return null;
  }
  if (CONTROL_CHARS.test(value)) {
    sink.add(path);
    return null;
  }
  if (rule.pattern && !rule.pattern.test(value)) {
    sink.add(path);
    return null;
  }
  if (rule.enum && !rule.enum.includes(value as string)) {
    sink.add(path);
    return null;
  }
  return value;
}

function validateNumber(rule: FieldRule, value: unknown, path: string, sink: FieldSink): number | null {
  const parsed = parseNumberLiteral(value);
  if (parsed === null) {
    sink.add(path);
    return null;
  }
  if (rule.type === 'integer' && !Number.isInteger(parsed)) {
    sink.add(path);
    return null;
  }
  if (rule.min !== undefined && parsed < rule.min) {
    sink.add(path);
    return null;
  }
  if (rule.max !== undefined && parsed > rule.max) {
    sink.add(path);
    return null;
  }
  return parsed;
}

function validateBoolean(rule: FieldRule, value: unknown, path: string, sink: FieldSink): boolean | null {
  if (typeof value !== 'boolean') {
    sink.add(path);
    return null;
  }
  return value;
}

/** Booleans or the strings handlers already accept ("true"/"false"/"1"/"0"/…). Values pass through untyped. */
function validateFlag(value: unknown, path: string, sink: FieldSink): unknown {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string' && /^(0|1|true|false|yes|no|on|off)$/i.test(value.trim())) return value;
  sink.add(path);
  return undefined;
}

/** Strings/numbers/booleans pass through; anything else is rejected. Domain parsers re-validate semantics. */
function validateLoose(value: unknown, path: string, sink: FieldSink): unknown {
  if (typeof value === 'string') return value.length <= 5000 ? value : (sink.add(path), undefined);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  sink.add(path);
  return undefined;
}

function validateFreeform(rule: FieldRule, value: unknown, path: string, sink: FieldSink, depth: number, budget: { nodes: number }): unknown {
  budget.nodes -= 1;
  if (budget.nodes < 0) {
    sink.add(path);
    return undefined;
  }
  if (depth > FREEFORM_MAX_DEPTH) {
    sink.add(path);
    return undefined;
  }
  if (value === null) return null;
  switch (typeof value) {
    case 'string':
      if (value.length > FREEFORM_MAX_STRING || CONTROL_CHARS.test(value)) {
        sink.add(path);
        return undefined;
      }
      return value;
    case 'number':
      if (!Number.isFinite(value)) {
        sink.add(path);
        return undefined;
      }
      return value;
    case 'boolean':
      return value;
    case 'object': {
      if (Array.isArray(value)) {
        if (value.length > FREEFORM_MAX_ARRAY) {
          sink.add(path);
          return undefined;
        }
        const out: unknown[] = [];
        for (let index = 0; index < value.length; index += 1) {
          out.push(validateFreeform(rule, value[index], `${path}[${index}]`, sink, depth + 1, budget));
        }
        return out;
      }
      if (!isPlainObject(value)) {
        sink.add(path);
        return undefined;
      }
      const keys = Object.keys(value);
      if (keys.length > FREEFORM_MAX_KEYS) {
        sink.add(path);
        return undefined;
      }
      const out: Record<string, unknown> = {};
      for (const key of keys) {
        if (FORBIDDEN_KEYS.has(key)) continue; // stripped, never copied
        out[key] = validateFreeform(rule, value[key], `${path}.${key}`, sink, depth + 1, budget);
      }
      return out;
    }
    default:
      sink.add(path);
      return undefined;
  }
}

function validateObject(rule: FieldRule, value: unknown, path: string, sink: FieldSink, depth: number): Record<string, unknown> | undefined {
  if (!isPlainObject(value)) {
    sink.add(path);
    return undefined;
  }
  if (depth > MAX_DEPTH) {
    sink.add(path);
    return undefined;
  }
  const maxKeys = rule.maxKeys ?? 30;
  const keys = Object.keys(value);
  if (keys.length > maxKeys) {
    sink.add(path);
    return undefined;
  }
  const fields = rule.fields ?? {};
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (FORBIDDEN_KEYS.has(key)) continue; // unknown + dangerous: dropped
    const nested = fields[key];
    if (!nested) continue; // unknown field: stripped
    out[key] = validateField(nested, value[key], `${path}.${key}`, sink, depth + 1);
  }
  for (const key of Object.keys(fields)) {
    if (fields[key].required && out[key] === undefined && value[key] === undefined) {
      sink.add(`${path}.${key}`);
    }
  }
  return out;
}

function validateArray(rule: FieldRule, value: unknown, path: string, sink: FieldSink, depth: number): unknown[] | undefined {
  if (!Array.isArray(value)) {
    sink.add(path);
    return undefined;
  }
  const maxItems = rule.max ?? 50;
  if (rule.min !== undefined && value.length < rule.min) {
    sink.add(path);
    return undefined;
  }
  if (value.length > maxItems) {
    sink.add(path);
    return undefined;
  }
  if (!rule.item) return value.slice();
  const out: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    out.push(validateField(rule.item, value[index], `${path}[${index}]`, sink, depth + 1));
  }
  return out;
}

function validateField(rule: FieldRule, value: unknown, path: string, sink: FieldSink, depth: number): unknown {
  if (value === undefined || value === null) {
    if (rule.required && value === undefined) sink.add(path);
    return value;
  }
  switch (rule.type) {
    case 'string':
      return validateString(rule, value, path, sink);
    case 'number':
    case 'integer':
      return validateNumber(rule, value, path, sink);
    case 'boolean':
      return validateBoolean(rule, value, path, sink);
    case 'array':
      return validateArray(rule, value, path, sink, depth);
    case 'object':
      return validateObject(rule, value, path, sink, depth);
    case 'freeform': {
      const budget = { nodes: FREEFORM_MAX_NODES };
      return validateFreeform(rule, value, path, sink, 0, budget);
    }
    case 'flag':
      return validateFlag(value, path, sink);
    case 'loose':
      return validateLoose(value, path, sink);
    default:
      sink.add(path);
      return undefined;
  }
}

/**
 * Validates a parsed JSON body against `schema`.
 *
 * Returns `{ ok: true, data, dropped }` with a new object containing only the
 * declared keys (unknown keys are reported in `dropped` and never copied), or
 * `{ ok: false, status, code, fields }` where status is 400 (malformed/wrong
 * field) or 413 (payload over `maxBytes`).
 */
export function validateBody(
  rawBody: unknown,
  schema: BodySchema,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): ValidateBodyResult {
  const body: unknown = rawBody === undefined ? {} : rawBody;
  const bytes = byteLength(body);
  if (bytes === null) {
    return { ok: false, status: 400, code: 'invalid_request', fields: ['body'] };
  }
  if (bytes > maxBytes) {
    return { ok: false, status: 413, code: 'body_too_large', fields: [] };
  }
  if (!isPlainObject(body)) {
    return { ok: false, status: 400, code: 'invalid_request', fields: ['body'] };
  }
  const sink = new FieldSink();
  const out: Record<string, unknown> = {};
  const dropped: string[] = [];
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_KEYS.has(key)) {
      dropped.push(key);
      continue;
    }
    const rule = schema[key];
    if (!rule) {
      dropped.push(key);
      continue;
    }
    out[key] = validateField(rule, body[key], key, sink, 1);
  }
  for (const key of Object.keys(schema)) {
    if (schema[key].required && body[key] === undefined) sink.add(key);
  }
  if (sink.errors.length > 0) {
    return { ok: false, status: 400, code: 'invalid_request', fields: sink.fields };
  }
  return { ok: true, data: out, dropped };
}

/**
 * Express middleware enforcing `validateBody` per route. Non-body methods are
 * passed through untouched. Unknown fields are stripped from `req.body`;
 * invalid bodies are answered with 400/413 and never reach the handler.
 */
export function strictBody(
  schema: BodySchema,
  options: { maxBytes?: number } = {},
): RequestHandler {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
  return (req: Request, res: ExpressResponse, next: NextFunction): void => {
    const method = String(req.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      next();
      return;
    }
    const contentLength = Number(req.headers['content-length']);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      res.status(413).json({ error: 'Request body is too large.', code: 'body_too_large' });
      return;
    }
    const result = validateBody(req.body, schema, maxBytes);
    if (result.ok === false) {
      if (result.status === 413) {
        res.status(413).json({ error: 'Request body is too large.', code: 'body_too_large' });
        return;
      }
      res.status(400).json({ error: 'Request body failed validation.', code: 'invalid_request', fields: result.fields });
      return;
    }
    req.body = result.data;
    next();
  };
}

/* ------------------------------------------------------------------------- *
 * Field-format presets
 * ------------------------------------------------------------------------- */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_PATTERN = /^[+()\d\s.-]{7,20}$/;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
export const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
export const STATUS_SLUG_PATTERN = /^[a-z_]{2,40}$/;

const s = (max: number, extra: Partial<FieldRule> = {}): FieldRule => ({ type: 'string', max, ...extra });
const n = (min: number, max: number, extra: Partial<FieldRule> = {}): FieldRule => ({ type: 'number', min, max, ...extra });
const i = (min: number, max: number, extra: Partial<FieldRule> = {}): FieldRule => ({ type: 'integer', min, max, ...extra });
const bool = (): FieldRule => ({ type: 'boolean' });
const flag = (): FieldRule => ({ type: 'flag' });
const loose = (): FieldRule => ({ type: 'loose' });
const arr = (maxItems: number, item: FieldRule): FieldRule => ({ type: 'array', max: maxItems, item });
const obj = (fields: BodySchema, maxKeys = 30): FieldRule => ({ type: 'object', fields, maxKeys });
const freeform = (): FieldRule => ({ type: 'freeform' });

/* ------------------------------------------------------------------------- *
 * Per-route schemas (single source of truth for Express + serverless paths)
 * ------------------------------------------------------------------------- */

export const DEMO_LEAD_SCHEMA: BodySchema = {
  name: s(100, { min: 1 }),
  email: s(254, { pattern: EMAIL_PATTERN }),
  salonName: s(120),
  phone: s(20, { pattern: PHONE_PATTERN }),
  city: s(80),
  website: s(200),
  company_website: s(200),
  fax_number: s(200),
  formElapsedMs: n(0, Number.MAX_SAFE_INTEGER),
  form_elapsed_ms: n(0, Number.MAX_SAFE_INTEGER),
  idempotencyKey: s(64, { pattern: IDEMPOTENCY_PATTERN }),
  idempotency_key: s(64, { pattern: IDEMPOTENCY_PATTERN }),
  turnstileToken: s(2048),
  turnstile_token: s(2048),
  consent: bool(),
  // Paths are short free text; control characters are rejected for every string.
  pagePath: s(200),
  page_path: s(200),
};

export const DEMO_LEADS_ADMIN_SCHEMA: BodySchema = {
  action: s(10, { enum: ['list', 'export', 'erase'] }),
  limit: i(1, 200),
  status: s(40, { pattern: STATUS_SLUG_PATTERN }),
  id: s(36, { pattern: UUID_PATTERN }),
};

export const ONBOARDING_COPY_SCHEMA: BodySchema = {
  kind: s(10, { enum: ['tagline', 'about'] }),
  businessName: s(120),
  ownerName: s(80),
  theme: s(60),
  tagline: s(160),
};

export const GENERATE_BIO_SCHEMA: BodySchema = {
  businessName: s(120),
  businessType: s(60),
  ownerName: s(80),
  vibe: s(80),
  specialties: s(200),
};

export const GENERATE_PROMO_IMAGE_SCHEMA: BodySchema = {
  prompt: s(1200),
  serviceName: s(120),
  category: s(80),
  style: s(80),
  aspectRatio: s(10, { enum: ['1:1', '3:4', '4:3', '9:16', '16:9'] }),
};

export const GENERATE_PROMO_COPY_SCHEMA: BodySchema = {
  businessName: s(120),
  serviceName: s(120),
  price: n(0, 10_000_000),
  offer: s(80),
  city: s(80),
  discountPercent: n(0, 100),
};

const VEDA_SERVICE_SCHEMA: BodySchema = {
  id: s(60),
  name: s(90),
  category: s(60),
  price: n(0, 10_000_000),
  durationMinutes: n(0, 24 * 60),
};

export const VEDA_WEBSITE_CONTENT_SCHEMA: BodySchema = {
  mode: s(20),
  details: obj(
    {
      businessName: s(120),
      city: s(80),
      address: s(200),
      category: s(80),
      tagline: s(160),
      phone: s(30),
      about: s(800),
      tone: s(160),
      services: arr(30, obj(VEDA_SERVICE_SCHEMA, 8)),
    },
    24,
  ),
};

export const AI_RECOMMENDATIONS_SCHEMA: BodySchema = {
  bookingHistory: arr(50, freeform()),
  favorites: arr(50, s(80)),
  availableServices: arr(
    200,
    obj(
      {
        salonSlug: s(80),
        serviceId: s(80),
        serviceName: s(120),
        category: s(60),
        price: n(0, 10_000_000),
      },
      8,
    ),
  ),
};

export const RECOVERY_CONSUME_SCHEMA: BodySchema = {
  // Server-side cap for transport: recovery codes are 16–32 alphanumerics once
  // separators are stripped; dashes/spaces allowed on the wire, whole value ≤ 48 chars.
  code: s(48, { pattern: /^[A-Za-z0-9][A-Za-z0-9\-\s]{2,46}[A-Za-z0-9]$/ }),
};

export const STAFF_INVITE_SCHEMA: BodySchema = {
  inviteId: s(36, { pattern: UUID_PATTERN }),
  token: s(80, { pattern: TOKEN_PATTERN }),
  origin: s(300),
};

export const BOOKING_EMAIL_SCHEMA: BodySchema = {
  type: s(20, { enum: ['confirmation', 'reminder'] }),
  bookingRef: s(36, { pattern: UUID_PATTERN }),
  to: s(254, { pattern: EMAIL_PATTERN }),
  salonName: s(120),
  clientName: s(120),
  serviceName: s(160),
  stylistName: s(120),
  date: s(40),
  time: s(40),
  servicePrice: n(0, 100_000_000),
  amountPaid: n(0, 100_000_000),
  salonAddress: s(240),
  salonCity: s(80),
  salonPhone: s(32),
};

export const BOOKING_DEPOSIT_SCHEMA: BodySchema = {
  totalPaise: loose(),
  amountPaise: loose(),
  servicePricePaise: loose(),
  total: loose(),
  amount: loose(),
  totalRupees: loose(),
  servicePrice: loose(),
  price: loose(),
  paidPaise: loose(),
  amountPaidPaise: loose(),
  capturedPaise: loose(),
  paid: loose(),
  paidRupees: loose(),
  amountPaid: loose(),
  captured: loose(),
  enforce: flag(),
  requireDeposit: flag(),
};

// STUDIOFLOW — central safe logger.
//
// Every line that reaches stdout/stderr (and thus log drains, dashboards and
// support bundles) passes through here. Two tools do the work:
//
//   redact(value): deep-walks values (objects, arrays, Errors) and masks any
//     denylisted key (authorization, cookie, apikey, token, secret, password,
//     otp, phone, email — and close variants) and any secret-shaped pattern
//     found in free text (Bearer tokens, JWTs, query-string credentials,
//     provider key prefixes, e-mail addresses, international phone numbers).
//   safeLogger.{log,info,warn,error,debug}: console drop-ins for server code.
//
// Redaction is fail closed: keys we do not recognise are left alone (logs
// stay useful), but anything that looks like a credential never survives.
//
// KEEP BYTE-IDENTICAL with supabase/functions/_shared/safeLogger.ts.
// scripts/master-security-check.mjs and scripts/verify-safe-logger.mjs fail
// if the two copies drift. Edge Functions cannot import this file (it is
// outside the functions bundle), hence the mirrored copy.

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 25;
const MAX_STRING = 4000;

// Lower-cased, alphanumerics-only tail match against the denylisted tails.
// endsWith keeps params like WEBHOOK_SECRET, x-client-secret, MY_ACCESS_TOKEN
// covered without over-matching innocent keys (e.g. "shipping").
const SENSITIVE_KEY_TAILS = [
  'authorization', 'proxyauthorization', 'cookie', 'setcookie',
  'apikey', 'xapikey', 'apisecret', 'xapisecret',
  'token', 'accesstoken', 'refreshtoken', 'idtoken',
  'secret', 'clientsecret', 'webhooksecret',
  'password', 'passwd', 'pwd',
  'otp', 'verificationcode',
  'phone', 'phonenumber', 'mobile', 'mobilenumber',
  'email', 'emailaddress',
];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (!normalized) return false;
  return SENSITIVE_KEY_TAILS.some((tail) => normalized === tail || normalized.endsWith(tail));
}

// --- Free-text patterns ------------------------------------------------------

const SECRET_PREFIX = /\b(rzp_(live|test)_[A-Za-z0-9]{6,}|sk_(live|test)_[A-Za-z0-9]{6,}|sbp_[A-Za-z0-9]{10,}|whsec_[A-Za-z0-9]{6,}|re_[A-Za-z0-9]{10,}|xox[abprs]-[A-Za-z0-9-]{6,}|ghp_[A-Za-z0-9]{10,})\b/g;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const BEARER_PATTERN = /\b(bearer|token)\s+[A-Za-z0-9._~+/=-]{8,}/gi;
// KEY=VALUE / KEY: VALUE / "KEY": "VALUE" (incl. quoted JSON and URL querys)
const KEY_VALUE_PATTERN = /((?:"|')?(?:[A-Za-z0-9_-]{0,40}?(?:authorization|proxy[-_]?authorization|cookie|set[-_]?cookie|api[-_]?key|apikey|access[-_]?token|refresh[-_]?token|id[-_]?token|client[-_]?secret|webhook[-_]?secret|secret|password|passwd|pwd|otp|phone|mobile|email))(?:"|')?\s*[:=]\s*(?:"|')?)([^"',&\n}]{2,})/gi;
const QUERY_PATTERN = /([?&](?:[A-Za-z0-9_-]{0,40}?(?:token|secret|key|password|passwd|pwd|otp|signature|auth))[A-Za-z0-9_-]{0,10}=)[^&\s]*/gi;
const EMAIL_PATTERN = /([A-Za-z0-9._%+-])([A-Za-z0-9._%+-]*)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const INTL_PHONE_PATTERN = /\+[1-9][\d\s().-]{8,}\d/g;
const INDIAN_MOBILE_PATTERN = /(?<!\d)[6-9]\d{9}(?!\d)/g;

function maskTail(match: string, keepTail = 4): string {
  const digits = match.replace(/\D/g, '');
  if (digits.length <= keepTail) return '*'.repeat(Math.max(1, digits.length));
  const prefix = match.includes('+') ? '+' : '';
  return prefix + '*'.repeat(digits.length - keepTail) + digits.slice(-keepTail);
}

export function redactText(input: string): string {
  let text = input;
  if (text.length > MAX_STRING) text = text.slice(0, MAX_STRING) + '…[truncated]';
  text = text.replace(SECRET_PREFIX, REDACTED);
  text = text.replace(JWT_PATTERN, REDACTED);
  text = text.replace(BEARER_PATTERN, (match) => match.replace(/[A-Za-z0-9._~+/=-]{8,}$/, REDACTED));
  text = text.replace(QUERY_PATTERN, '$1' + REDACTED);
  text = text.replace(KEY_VALUE_PATTERN, '$1' + REDACTED);
  text = text.replace(EMAIL_PATTERN, (_m, first: string, rest: string, domain: string) => first + '***@' + domain);
  text = text.replace(INTL_PHONE_PATTERN, (match: string) => maskTail(match));
  text = text.replace(INDIAN_MOBILE_PATTERN, (match: string) => maskTail(match));
  return text;
}

function looksLikeObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function redact(value: unknown, depth = 0, seen = new Set<unknown>()): unknown {
  if (value == null) return value;
  if (typeof value === 'string') return redactText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return '[Function]';
  if (value instanceof Error) {
    const parts = [`${value.name}: ${redactText(value.message)}`];
    const code = (value as unknown as { code?: unknown }).code;
    if (typeof code === 'string' && code.length <= 40) parts.push(`code=${redactText(code)}`);
    return parts.join(' ');
  }
  if (seen.has(value)) return '[Circular]';
  if (depth >= MAX_DEPTH) return '[MaxDepth]';
  seen.add(value);
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => redact(item, depth + 1, seen));
    if (value.length > MAX_ARRAY_ITEMS) items.push(`…(+${value.length - MAX_ARRAY_ITEMS} more)`);
    return items;
  }
  if (looksLikeObject(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      output[key] = isSensitiveKey(key) ? REDACTED : redact(child, depth + 1, seen);
    }
    return output;
  }
  return redactText(String(value));
}

function emit(method: 'log' | 'info' | 'warn' | 'error' | 'debug', args: unknown[]): void {
  const safeArgs = args.map((arg) => redact(arg));
  // console.* is the intentional sink; eslint/tsc configs in this repo do not
  // ship a no-console rule for this file.
  console[method](...safeArgs);
}

export const safeLogger = {
  log: (...args: unknown[]) => emit('log', args),
  info: (...args: unknown[]) => emit('info', args),
  warn: (...args: unknown[]) => emit('warn', args),
  error: (...args: unknown[]) => emit('error', args),
  debug: (...args: unknown[]) => emit('debug', args),
};

export type SafeLogger = typeof safeLogger;

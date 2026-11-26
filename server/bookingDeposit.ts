/**
 * `GET|POST /api/booking-deposit` — server-authoritative 25% deposit check.
 *
 * Shared by the Express server (`server.ts`) and the Vercel Node function
 * (`api/booking-deposit.ts`) so both deployments answer with the same numbers.
 *
 * The guard never accepts a client "amount to charge" as the deposit: it
 * returns the mandatory 25% ceiling for the booking total and, when a captured
 * amount is supplied, rejects it with `422 deposit_required` unless it covers
 * that ceiling. Database-level enforcement (`register_payment`) and the
 * Razorpay verification path stay authoritative; this endpoint exists so the
 * Node layer can refuse an under-paid booking instead of forwarding it.
 */

import {
  DepositGuardError,
  assertDepositSatisfied,
  quoteDeposit,
  type DepositQuote,
} from './depositGuard.js';

type DepositRequest = {
  method?: string;
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type DepositResponse = {
  status: (code: number) => DepositResponse;
  json: (body: unknown) => unknown;
  setHeader?: (name: string, value: string) => unknown;
};

function setHeader(res: DepositResponse, name: string, value: string): void {
  try {
    res.setHeader?.(name, value);
  } catch {
    // Headers are best-effort on the Vercel Node shim.
  }
}

function queryValue(req: DepositRequest, ...names: string[]): unknown {
  for (const name of names) {
    const value = req.query?.[name];
    if (value !== undefined && value !== null && value !== '') {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

function bodyValue(req: DepositRequest, ...names: string[]): unknown {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? (req.body as Record<string, unknown>)
    : {};
  for (const name of names) {
    const value = body[name];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function read(req: DepositRequest, keys: string[]): unknown {
  for (const key of keys) {
    const value = bodyValue(req, key);
    if (value !== undefined) return value;
  }
  return queryValue(req, ...keys);
}

function readFlag(req: DepositRequest, name: string): boolean | undefined {
  const value = read(req, [name]);
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(text)) return false;
  if (['1', 'true', 'yes', 'on'].includes(text)) return true;
  return undefined;
}

function payload(quote: DepositQuote, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    depositPercent: quote.depositPercent,
    totalPaise: quote.totalPaise,
    totalRupees: quote.totalRupees,
    requiredDepositPaise: quote.requiredDepositPaise,
    requiredDepositRupees: quote.requiredDepositRupees,
    paidPaise: quote.paidPaise,
    paidRupees: quote.paidRupees,
    shortfallPaise: quote.shortfallPaise,
    balancePaise: quote.balancePaise,
    balanceRupees: quote.balanceRupees,
    satisfied: quote.satisfied,
    chargeable: quote.chargeable,
    minimumDepositPaise: quote.minimumDepositPaise,
    ...extra,
  };
}

export function bookingDepositHandler(req: DepositRequest, res: DepositResponse): unknown {
  const method = String(req.method || 'GET').toUpperCase();
  setHeader(res, 'Cache-Control', 'no-store');

  if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') {
    setHeader(res, 'Allow', 'GET, POST');
    return res.status(405).json({ error: 'Use GET or POST for the booking deposit check.', code: 'method_not_allowed' });
  }

  const enforce = readFlag(req, 'enforce') ?? readFlag(req, 'requireDeposit') ?? true;

  let quote: DepositQuote;
  try {
    quote = quoteDeposit({
      totalPaise: read(req, ['totalPaise', 'amountPaise', 'servicePricePaise']),
      totalRupees: read(req, ['total', 'amount', 'totalRupees', 'servicePrice', 'price']),
      paidPaise: read(req, ['paidPaise', 'amountPaidPaise', 'capturedPaise']),
      paidRupees: read(req, ['paid', 'paidRupees', 'amountPaid', 'captured']),
    });
  } catch (error) {
    const known = error instanceof DepositGuardError;
    return res.status(known ? error.status : 400).json({
      error: known ? error.message : 'The booking total is invalid.',
      code: known ? error.code : 'invalid_amount',
    });
  }

  const reportedPayment = quote.paidPaise > 0 || read(req, ['paidPaise', 'amountPaidPaise', 'capturedPaise', 'paid', 'paidRupees', 'amountPaid', 'captured']) !== undefined;

  try {
    if (reportedPayment) assertDepositSatisfied(quote, { enforce });
  } catch (error) {
    const known = error instanceof DepositGuardError;
    return res.status(known ? error.status : 400).json({
      error: known ? error.message : 'The booking deposit could not be verified.',
      code: known ? error.code : 'deposit_required',
      ...payload(quote, { satisfied: false }),
    });
  }

  return res.status(200).json(payload(quote, {
    enforced: Boolean(enforce && reportedPayment),
    // The mandatory 25% amount is the only value a gateway may be asked to charge.
    chargePaise: quote.requiredDepositPaise,
    chargeRupees: quote.requiredDepositRupees,
  }));
}

export default bookingDepositHandler;

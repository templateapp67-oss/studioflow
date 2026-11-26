/**
 * Mandatory 25% booking deposit — server-side safety guard.
 *
 * The authoritative rule already lives in the database
 * (`studioflow_private.register_payment` rejects anything but
 * `ceil(service_price * 100 * 0.25)` and refuses deposits below 100 paise) and
 * in the `studioflow-payments` edge function (`depositPaise`). This module is
 * the Node/server side of the same rule so the Express API and the Vercel Node
 * functions can quote and reject a deposit without trusting a browser amount.
 *
 * Rounding must stay byte-for-byte identical to the edge implementation,
 * otherwise the server can quote a value the database will refuse. The parity
 * test in `scripts/verify-unified-wiring.tsx` fails if the two drift.
 */

/** 25% of the booking total. */
export const DEPOSIT_PERCENT = 25;

/** `register_payment` refuses a charge below ₹1; the guard mirrors that floor. */
export const MIN_DEPOSIT_PAISE = 100;

export type DepositGuardCode =
  | 'invalid_amount'
  | 'deposit_required'
  | 'deposit_below_minimum';

export class DepositGuardError extends Error {
  readonly code: DepositGuardCode;
  readonly status: number;
  readonly detail: Record<string, unknown>;

  constructor(code: DepositGuardCode, message: string, status = 400, detail: Record<string, unknown> = {}) {
    super(message);
    this.name = 'DepositGuardError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim().replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function requireNonNegative(value: unknown, label: string): number {
  const parsed = toFiniteNumber(value);
  if (parsed === null || parsed < 0) {
    throw new DepositGuardError('invalid_amount', `${label} must be a non-negative number.`);
  }
  return parsed;
}

/**
 * 25% ceiling of a rupee price, in paise.
 *
 * Mirrors `depositPaise()` in
 * `supabase/functions/studioflow-payments/payment-security.ts`: the decimal
 * text is scaled with BigInt so ₹999.99 cannot lose a paisa to float error.
 */
export function depositPaiseFromRupees(price: number): number {
  const value = requireNonNegative(price, 'Service price');
  const [whole, fraction = ''] = Number(value)
    .toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 })
    .split('.');
  const scale = 10n ** BigInt(fraction.length);
  const numerator = (BigInt(whole) * scale + BigInt(fraction || '0')) * 100n;
  const denominator = 4n * scale;
  return Number((numerator + denominator - 1n) / denominator);
}

/** 25% ceiling of an amount that is already in paise. */
export function depositPaiseFromTotal(totalPaise: number): number {
  const value = Math.round(requireNonNegative(totalPaise, 'Booking total'));
  return Number((BigInt(value) + 3n) / 4n);
}

/** Rupees with at most two decimals, for API responses and UI copy. */
export function paiseToRupees(paise: number): number {
  return Number((Number(paise || 0) / 100).toFixed(2));
}

export type DepositQuote = {
  /** Booking total in paise, as the server understands it. */
  totalPaise: number;
  totalRupees: number;
  /** Mandatory 25% ceiling, in paise — the only amount a gateway may charge. */
  requiredDepositPaise: number;
  requiredDepositRupees: number;
  /** Amount the caller says was captured (0 when not reported). */
  paidPaise: number;
  paidRupees: number;
  /** Anything captured below the mandatory deposit. */
  shortfallPaise: number;
  /** Amount still due after the reported payment. */
  balancePaise: number;
  balanceRupees: number;
  depositPercent: number;
  /** True only when the reported payment covers the mandatory deposit. */
  satisfied: boolean;
  /** False when the total is too small to produce a chargeable deposit. */
  chargeable: boolean;
  minimumDepositPaise: number;
};

export type DepositQuoteInput = {
  totalPaise?: unknown;
  totalRupees?: unknown;
  paidPaise?: unknown;
  paidRupees?: unknown;
};

/**
 * Server-authoritative quote. Accepts either paise (preferred) or rupees and
 * never trusts a browser-supplied "pay 1 rupee" style override: the returned
 * `requiredDepositPaise` is always the 25% ceiling.
 */
export function quoteDeposit(input: DepositQuoteInput): DepositQuote {
  const totalPaise = (() => {
    if (input.totalPaise !== undefined && input.totalPaise !== null && input.totalPaise !== '') {
      return Math.round(requireNonNegative(input.totalPaise, 'Booking total (paise)'));
    }
    if (input.totalRupees !== undefined && input.totalRupees !== null && input.totalRupees !== '') {
      const rupees = requireNonNegative(input.totalRupees, 'Booking total');
      return Math.round(rupees * 100);
    }
    throw new DepositGuardError('invalid_amount', 'Provide a booking total in paise (totalPaise) or rupees (total).');
  })();

  const paidPaise = (() => {
    if (input.paidPaise !== undefined && input.paidPaise !== null && input.paidPaise !== '') {
      return Math.round(requireNonNegative(input.paidPaise, 'Paid amount (paise)'));
    }
    if (input.paidRupees !== undefined && input.paidRupees !== null && input.paidRupees !== '') {
      return Math.round(requireNonNegative(input.paidRupees, 'Paid amount') * 100);
    }
    return 0;
  })();

  const requiredDepositPaise = depositPaiseFromTotal(totalPaise);
  const chargeable = requiredDepositPaise >= MIN_DEPOSIT_PAISE;
  const satisfied = paidPaise > 0 && paidPaise >= requiredDepositPaise;

  return {
    totalPaise,
    totalRupees: paiseToRupees(totalPaise),
    requiredDepositPaise,
    requiredDepositRupees: paiseToRupees(requiredDepositPaise),
    paidPaise,
    paidRupees: paiseToRupees(paidPaise),
    shortfallPaise: Math.max(0, requiredDepositPaise - paidPaise),
    balancePaise: Math.max(0, totalPaise - paidPaise),
    balanceRupees: paiseToRupees(Math.max(0, totalPaise - paidPaise)),
    depositPercent: DEPOSIT_PERCENT,
    satisfied,
    chargeable,
    minimumDepositPaise: MIN_DEPOSIT_PAISE,
  };
}

/**
 * Throws unless the reported payment settles the mandatory 25% deposit.
 *
 * Used by the deposit endpoint when a captured amount is supplied, so an
 * under-paid or zero-deposit booking can never be treated as confirmed by the
 * Node layer. `enforce: false` is limited to read-only previews.
 */
export function assertDepositSatisfied(quote: DepositQuote, options: { enforce?: boolean } = {}): DepositQuote {
  if (options.enforce === false) return quote;

  if (!quote.chargeable) {
    throw new DepositGuardError(
      'deposit_below_minimum',
      `A 25% deposit on ₹${quote.totalRupees} is below the ₹${paiseToRupees(MIN_DEPOSIT_PAISE)} minimum charge.`,
      422,
      { requiredDepositPaise: quote.requiredDepositPaise, totalPaise: quote.totalPaise },
    );
  }

  if (quote.paidPaise < quote.requiredDepositPaise) {
    throw new DepositGuardError(
      'deposit_required',
      `The mandatory 25% deposit is ₹${quote.requiredDepositRupees}. Received ₹${quote.paidRupees}.`,
      422,
      {
        requiredDepositPaise: quote.requiredDepositPaise,
        requiredDepositRupees: quote.requiredDepositRupees,
        paidPaise: quote.paidPaise,
        shortfallPaise: quote.shortfallPaise,
      },
    );
  }

  return quote;
}

/** Convenience helper for booking flows that already hold paise values. */
export function depositRequired(totalPaise: number, paidPaise: number): boolean {
  return quoteDeposit({ totalPaise, paidPaise }).satisfied === false;
}

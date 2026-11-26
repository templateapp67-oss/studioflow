// Webhook replay protection and idempotency shared by the public webhooks
// (Razorpay payments, Meta WhatsApp).
//
// These helpers deliberately use only Web APIs available in both the edge
// runtime and modern Node, so the verification suite can exercise them
// directly. Database work goes through the two security-definer RPCs created
// in supabase/migrations/20261127090000_processed_webhook_events.sql; this
// module never grants or embeds credentials.

const textEncoder = new TextEncoder();

/** Parses WEBHOOK_REPLAY_TOLERANCE_SECONDS; clamps to 1..86400, default 300s. */
export function webhookReplayToleranceSeconds(raw: string | null | undefined, fallback = 300): number {
  const parsed = Number((raw ?? '').trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(86400, Math.max(1, Math.floor(parsed)));
}

/** An event type is only an audit label — never trust it past a tight charset. */
export function safeWebhookEventType(value: unknown): string | null {
  return typeof value === 'string' && /^[a-z0-9_.:-]{1,80}$/i.test(value) ? value : null;
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const SAFE_EVENT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

/**
 * The provider's event-id header wins when it is present and well-formed;
 * otherwise the exact raw body is hashed. Identical retries hash identically,
 * so a content-addressed id dedupes redeliveries without trusting any header
 * an attacker could forge (the header is only honored after the signature
 * over the raw body has already been verified).
 */
export async function resolveWebhookEventId(headerValue: string | null | undefined, rawBody: string): Promise<string> {
  const header = (headerValue ?? '').trim();
  if (SAFE_EVENT_ID.test(header)) return header;
  return 'body-' + await sha256Hex(rawBody);
}

type RpcResult = { data: any; error: any };
// Supabase's rpc() returns a PostgrestFilterBuilder, which is `then`able but not
// a `Promise`; wrap it so any thenable rpc() client satisfies this contract.
type RpcCapable = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<RpcResult> };

export interface WebhookClaim {
  claimed: boolean;
  reason: 'duplicate' | 'stale' | 'future' | 'reclaimed' | null;
}

/**
 * Claims a delivery for exactly-once processing. The RPC enforces the stale
 * timestamp gate (recording refused deliveries for audit) and the unique
 * (provider, event_id) constraint atomically — call it AFTER the provider
 * signature has been verified and BEFORE any side effect.
 */
export async function claimWebhookEvent(db: RpcCapable, args: {
  provider: 'razorpay' | 'meta_whatsapp';
  eventId: string;
  eventType?: string | null;
  eventCreatedAtSeconds?: number | null;
  toleranceSeconds?: number;
}): Promise<WebhookClaim> {
  const tolerance = Math.min(86400, Math.max(1, Math.floor(args.toleranceSeconds ?? 300)));
  const seconds = args.eventCreatedAtSeconds;
  const createdAt = typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0
    ? new Date(Math.floor(seconds) * 1000).toISOString()
    : null;
  const { data, error } = await db.rpc('studioflow_claim_webhook_event', {
    p_provider: args.provider,
    p_event_id: args.eventId,
    p_event_type: args.eventType ?? null,
    p_created_at: createdAt,
    p_max_age_seconds: tolerance,
  });
  if (error) throw new Error('Webhook idempotency ledger unavailable');
  const body = data ?? {};
  const reason = typeof body.reason === 'string' ? body.reason : null;
  return { claimed: body.claimed === true, reason: reason as WebhookClaim['reason'] };
}

/** Marks a claimed delivery processed/failed. Never throws for the ledger itself — callers decide. */
export async function finishWebhookEvent(db: RpcCapable, provider: 'razorpay' | 'meta_whatsapp', eventId: string, status: 'processed' | 'failed'): Promise<void> {
  const { error } = await db.rpc('studioflow_finish_webhook_event', {
    p_provider: provider,
    p_event_id: eventId,
    p_status: status,
  });
  if (error) throw new Error('Webhook idempotency ledger could not be updated');
}

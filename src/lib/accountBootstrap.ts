import { messageOf, withTimeout } from "./asyncDeadline";

/**
 * Owner-account bootstrap for the StudioFlow workspace.
 *
 * Why this module exists: the workspace used to call
 * `supabase.rpc('studioflow_ensure_account')` and render "Loading your salon
 * from Supabase…" until that promise settled. If the RPC stalled, returned an
 * unexpected shape, or the database was briefly unreachable, the app sat on
 * that screen forever and every header link looked broken.
 *
 * The contract here is simple and testable:
 *
 * 1. Every network step has a deadline (`withTimeout`), so no call can hang
 *    the screen indefinitely.
 * 2. If the "ensure" RPC fails or times out, the already-saved workspace row is
 *    read directly — the salon opens with its last saved data instead of
 *    waiting.
 * 3. Only when both routes fail does the caller show an error screen with a
 *    retry, never an endless spinner.
 *
 * Nothing here writes to Supabase or changes the save path; it only decides
 * which already-available copy of the workspace the owner sees first.
 */

function asRecord(value: any): Record<string, any> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, any>;
}

/** Default deadline for a single bootstrap request. */
export const BOOTSTRAP_TIMEOUT_MS = 12_000;

export { TimeoutError, withTimeout } from "./asyncDeadline";

export type AccountRow = {
  user_id: string;
  draft: Record<string, any>;
  revision: number;
  identity: Record<string, any> | null;
};

export type BootstrapDeps = {
  userId: string;
  /** Pending referral, forwarded to the RPC (empty string when none). */
  pRef?: string | null;
  timeoutMs?: number;
  /** `studioflow_ensure_account` */
  ensureAccount: (pRef: string) => PromiseLike<{ data: any; error: any }>;
  /** Direct read of the saved workspace row. */
  loadAccountRow: () => PromiseLike<{ data: any; error: any }>;
};

export type BootstrapResult = {
  /** Null only when nothing could be loaded at all. */
  account: AccountRow | null;
  /** True when the page came from the saved row instead of the RPC. */
  degraded: boolean;
  /** Human-readable notes for the UI (why it degraded). */
  notes: string[];
  /** Empty string when the account loaded. */
  error: string;
};

/**
 * Normalise whatever the RPC returned (it has returned the row directly and,
 * in older deployments, a `{ account: row }` envelope) into one shape. A null
 * result means "unusable" — the caller then tries the saved row.
 */
export function salonAccountFromRpc(
  userId: string,
  data: any,
): AccountRow | null {
  const envelope = asRecord(data);
  if (!envelope) return null;
  const candidate = asRecord(envelope.account) || envelope;
  if (!candidate) return null;
  if (candidate.user_id && candidate.user_id !== userId) return null;
  if (!asRecord(candidate.draft) || !Number.isFinite(Number(candidate.revision))) return null;
  const draft = asRecord(candidate.draft) || {};
  const revision = Number(candidate.revision ?? 0);
  // A response with no revision and no saved draft tells us nothing; fall back.
  if (!Object.keys(draft).length && !Number.isFinite(revision)) return null;
  return {
    user_id: String(candidate.user_id || userId),
    draft,
    revision: Number.isFinite(revision) ? revision : 0,
    identity: asRecord(candidate.identity),
  };
}

/** Same normalisation for a row read straight from `studioflow_accounts`. */
export function salonAccountFromRow(
  userId: string,
  row: any,
): AccountRow | null {
  const record = asRecord(row);
  if (!record) return null;
  if (record.user_id && record.user_id !== userId) return null;
  if (!asRecord(record.draft) || !Number.isFinite(Number(record.revision))) return null;
  const draft = asRecord(record.draft) || {};
  const revision = Number(record.revision ?? 0);
  if (!Object.keys(draft).length && !Number.isFinite(revision)) return null;
  return {
    user_id: String(record.user_id || userId),
    draft,
    revision: Number.isFinite(revision) ? revision : 0,
    identity: asRecord(record.identity),
  };
}

/**
 * Load the owner's workspace without ever leaving the UI on a spinner:
 * RPC first (it seeds a new account), saved row second.
 */
export async function bootstrapSalonAccount({
  userId,
  pRef = null,
  timeoutMs = BOOTSTRAP_TIMEOUT_MS,
  ensureAccount,
  loadAccountRow,
}: BootstrapDeps): Promise<BootstrapResult> {
  const notes: string[] = [];
  let rpcMessage = "";

  try {
    const { data, error } = await withTimeout(
      Promise.resolve().then(() => ensureAccount(pRef || "")),
      timeoutMs,
      "Loading your salon",
    );
    if (error) {
      rpcMessage = messageOf(error, "Your salon could not be prepared.");
      notes.push(rpcMessage);
    } else {
      const account = salonAccountFromRpc(userId, data);
      if (account) return { account, degraded: false, notes, error: "" };
      rpcMessage = "Your salon account returned no workspace data.";
      notes.push(rpcMessage);
    }
  } catch (error: any) {
    rpcMessage = messageOf(error, "Your salon could not be prepared.");
    notes.push(rpcMessage);
  }

  // The saved copy is enough to open the workspace; the next save repairs it.
  try {
    const { data, error } = await withTimeout(
      Promise.resolve().then(() => loadAccountRow()),
      timeoutMs,
      "Loading your saved workspace",
    );
    if (error) {
      notes.push(messageOf(error, "Your saved workspace could not be loaded."));
    } else {
      const account = salonAccountFromRow(userId, data);
      if (account) {
        return {
          account,
          degraded: true,
          notes,
          error: "",
        };
      }
      notes.push("No saved workspace was found for this account.");
    }
  } catch (error: any) {
    notes.push(messageOf(error, "Your saved workspace could not be loaded."));
  }

  return {
    account: null,
    degraded: true,
    notes,
    error:
      rpcMessage ||
      notes[0] ||
      "Your salon could not be loaded. Check your connection and try again.",
  };
}

/**
 * Template catalogue is decorative for the workspace (a business-type picker
 * backed by local defaults), so a failed or slow read must never block the
 * owner from opening their salon.
 */
export async function loadTemplateCatalogue<T>({
  load,
  fallback,
  timeoutMs = BOOTSTRAP_TIMEOUT_MS,
  upgrade,
}: {
  load: () => PromiseLike<{ data: any[] | null; error: any }>;
  fallback: T[];
  timeoutMs?: number;
  upgrade?: (config: any) => T;
}): Promise<{ templates: T[]; error: string }> {
  try {
    const { data, error } = await withTimeout(
      Promise.resolve().then(load),
      timeoutMs,
      "Loading templates",
    );
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    const templates = rows
      .map((row) => (upgrade ? upgrade(row?.config ?? row) : (row?.config ?? row)))
      .filter(Boolean) as T[];
    return { templates: templates.length ? templates : fallback, error: "" };
  } catch (error: any) {
    return {
      templates: fallback,
      error: messageOf(error, "Templates could not be refreshed."),
    };
  }
}

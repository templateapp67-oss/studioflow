import { createClient } from "npm:@supabase/supabase-js@2.117.3";

function serviceKey(): string {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (direct) return direct;
  try {
    const parsed = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    return typeof parsed?.default === "string" ? parsed.default : "";
  } catch {
    return "";
  }
}

function equalSecret(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const url = Deno.env.get("SUPABASE_URL")?.trim() || "";
const key = serviceKey();
const workerToken = Deno.env.get("EMAIL_RETRY_WORKER_TOKEN")?.trim() || "";
const resendKey = Deno.env.get("RESEND_API_KEY")?.trim() || "";
const from = Deno.env.get("RESEND_FROM_EMAIL")?.trim() || "";
const replyTo = Deno.env.get("RESEND_REPLY_TO")?.trim() || "";
if (!url || !key || !workerToken || !resendKey || !from) {
  throw new Error("Transactional email retry worker configuration is incomplete");
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const supplied = req.headers.get("x-email-worker-token") || "";
  if (!equalSecret(supplied, workerToken)) return new Response("Unauthorized", { status: 401 });

  const { data: jobs, error: claimError } = await db.rpc("studioflow_email_claim_due", {
    p_limit: 20,
  });
  if (claimError) return new Response("Email retry queue unavailable", { status: 500 });

  let sent = 0;
  let deferred = 0;
  for (const job of Array.isArray(jobs) ? jobs : []) {
    const eventKey = String(job.event_key || "");
    const recipient = String(job.recipient_email || "").trim().toLowerCase();
    const payload = job.email_payload || {};

    const { data: suppression, error: suppressionError } = await db
      .from("studioflow_email_suppressions")
      .select("email_address")
      .eq("email_address", recipient)
      .maybeSingle();

    if (suppressionError) {
      await db.rpc("studioflow_email_mark_failed", {
        p_event_key: eventKey, p_error_code: "suppression_check_unavailable", p_retryable: true,
      });
      deferred++;
      continue;
    }
    if (suppression) {
      await db.rpc("studioflow_email_mark_suppressed", { p_event_key: eventKey });
      deferred++;
      continue;
    }
    if (!payload.subject || !payload.html || !payload.text || !recipient || !eventKey) {
      await db.rpc("studioflow_email_mark_failed", {
        p_event_key: eventKey, p_error_code: "invalid_queued_payload", p_retryable: false,
      });
      deferred++;
      continue;
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `nexora/${eventKey}`,
        },
        body: JSON.stringify({
          from,
          to: [recipient],
          reply_to: replyTo ? [replyTo] : undefined,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          tags: [
            { name: "application", value: "nexora-salonos" },
            { name: "email_kind", value: String(job.kind || "transactional") },
          ],
        }),
        signal: AbortSignal.timeout(12000),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result?.id !== "string") {
        const retryable = response.status === 429 || response.status >= 500;
        await db.rpc("studioflow_email_mark_failed", {
          p_event_key: eventKey,
          p_error_code: String(result?.name || `http_${response.status}`).slice(0, 80),
          p_retryable: retryable,
        });
        deferred++;
        continue;
      }
      const { error: markError } = await db.rpc("studioflow_email_mark_sent", {
        p_event_key: eventKey, p_resend_email_id: result.id,
      });
      if (markError) {
        // Outbox remains sending; a recovery claim reuses the same Resend key.
        deferred++;
        continue;
      }
      sent++;
    } catch {
      await db.rpc("studioflow_email_mark_failed", {
        p_event_key: eventKey, p_error_code: "network_or_timeout", p_retryable: true,
      });
      deferred++;
    }
  }

  return Response.json({ processed: sent + deferred, accepted: sent, deferred });
});

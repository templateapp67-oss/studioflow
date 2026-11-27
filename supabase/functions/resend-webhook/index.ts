import { Webhook } from "npm:svix@1";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const allowedEvents = new Set([
  "email.delivered", "email.bounced", "email.failed", "email.complained",
]);

function serviceKey(): string {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (direct) return direct;
  try {
    const secrets = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    return typeof secrets?.default === "string" ? secrets.default : "";
  } catch {
    return "";
  }
}

const url = Deno.env.get("SUPABASE_URL")?.trim() || "";
const key = serviceKey();
const signingSecret = Deno.env.get("RESEND_WEBHOOK_SECRET")?.trim() || "";
if (!url || !key || !signingSecret) {
  throw new Error("Resend webhook server configuration is incomplete");
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const verifier = new Webhook(signingSecret);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const raw = await req.text();
  if (!raw || raw.length > 256 * 1024) {
    return new Response("Invalid request body", { status: 400 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing webhook signature headers", { status: 401 });
  }

  let event: any;
  try {
    event = verifier.verify(raw, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    // Do not log raw request bodies, signatures or signing secrets.
    return new Response("Invalid webhook signature", { status: 401 });
  }

  if (!event || typeof event.type !== "string" || !allowedEvents.has(event.type)) {
    return Response.json({ received: true, ignored: true }, { status: 200 });
  }

  const data = event.data ?? {};
  const emailId = typeof data.email_id === "string" ? data.email_id : "";
  const recipients = Array.isArray(data.to)
    ? data.to
    : (typeof data.email === "string" ? [data.email] : []);
  const recipient = typeof recipients[0] === "string"
    ? recipients[0].trim().toLowerCase()
    : null;

  if (!emailId) {
    return new Response("Webhook payload is missing email_id", { status: 400 });
  }

  const hardBounce = event.type === "email.bounced"
    && String(data.bounce?.type || "").toLowerCase() === "permanent";

  const { data: result, error } = await db.rpc("studioflow_resend_process_event", {
    p_event_id: svixId,
    p_event_type: event.type,
    p_resend_email_id: emailId,
    p_recipient_email: recipient,
    p_hard_bounce: hardBounce,
    p_event_data: {
      created_at: typeof event.created_at === "string" ? event.created_at : null,
      bounce_type: typeof data.bounce?.type === "string" ? data.bounce.type : null,
      bounce_sub_type: typeof data.bounce?.subType === "string" ? data.bounce.subType : null,
    },
  });

  if (error) {
    // Return 5xx so Resend can retry after a temporary database outage.
    return new Response("Webhook processing failed", { status: 500 });
  }

  return Response.json({
    received: true,
    duplicate: result === "duplicate",
    processed: result === "processed",
  }, { status: 200 });
});

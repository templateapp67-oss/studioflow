import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET")?.trim() || "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY")?.trim() || "";
const FROM = Deno.env.get("RESEND_FROM_EMAIL")?.trim() || "";
const REPLY_TO = Deno.env.get("RESEND_REPLY_TO")?.trim() || "";
const SITE_URL = Deno.env.get("APP_BASE_URL")?.trim() || "https://nexorasalon.online";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim() || "";

if (!HOOK_SECRET || !RESEND_KEY || !FROM || !SUPABASE_URL) {
  throw new Error("Supabase Auth email hook configuration is incomplete");
}

// Supabase's Send Email Hook secret is a Standard Webhooks secret and is
// distinct from the RESEND_WEBHOOK_SECRET used by the inbound Resend webhook.
const base64Secret = HOOK_SECRET.replace(/^v1,whsec_/, "");
const verifier = new Webhook(base64Secret);

function esc(value: unknown, max = 500): string {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim().slice(0, max).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]!);
}

function authEmail(action: string, data: any, email: string) {
  const token = String(data?.token || "");
  const tokenHash = String(data?.token_hash || "");
  const redirectTo = typeof data?.redirect_to === "string" ? data.redirect_to : SITE_URL;
  const allowedActions = new Set([
    "signup", "recovery", "magiclink", "invite",
    "email_change", "reauthentication",
  ]);
  if (!allowedActions.has(action)) throw new Error("Unsupported auth email action");

  const usesOtp = action === "signup" || action === "magiclink"
    || action === "reauthentication";
  if (usesOtp && !/^\d{6}$/.test(token)) {
    throw new Error("Supabase did not provide a valid six-digit OTP");
  }

  let title = "Your NEXORA verification";
  let subject = "Your NEXORA verification code";
  let intro = "Use this one-time code to continue.";
  let primary = "";
  let text = "";
  if (usesOtp) {
    primary = `<div style="margin:24px 0;padding:22px;background:#f4f2ff;border-radius:12px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#5042ad;font-family:monospace;">${esc(token, 6)}</div>`;
    text = `Your NEXORA verification code is ${token}. It expires in 10 minutes. Never share this code.`;
  } else {
    const types: Record<string,string> = {
      recovery: "recovery",
      invite: "invite",
      email_change: "email_change",
    };
    const verifyType = types[action];
    if (!tokenHash || !verifyType) throw new Error("Supabase auth action is missing its verification token");
    const base = SUPABASE_URL.replace(/\/+$/, "");
    const verifyUrl = new URL(`${base}/auth/v1/verify`);
    verifyUrl.searchParams.set("token", tokenHash);
    verifyUrl.searchParams.set("type", verifyType);
    verifyUrl.searchParams.set("redirect_to", redirectTo);
    const label = action === "recovery" ? "Reset password" : action === "invite" ? "Accept invitation" : "Confirm email change";
    subject = action === "recovery" ? "Reset your NEXORA password" : action === "invite" ? "Your NEXORA invitation" : "Confirm your NEXORA email change";
    title = subject;
    intro = action === "recovery"
      ? "We received a request to reset your password. Use the secure button below."
      : "Use the secure button below to finish this account action.";
    primary = `<p style="margin:26px 0;"><a href="${esc(verifyUrl.toString(), 1800)}" style="display:inline-block;background:#6154c8;color:#fff;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:700;">${label}</a></p>`;
    text = `${subject}. Open this secure link to continue: ${verifyUrl.toString()}`;
  }

  const html = `<!DOCTYPE html><html lang="en-IN" dir="ltr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title></head><body style="margin:0;background:#f4f5f9;color:#252535;font-family:Arial,Helvetica,sans-serif;"><div lang="en-IN" dir="ltr" style="padding:24px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#fff;border:1px solid #e8e8ef;border-radius:14px;"><tr><td style="padding:26px;"><p style="color:#6154c8;font-weight:700;font-size:19px;">NEXORA SALONOS</p><h1 style="font-size:24px;">${esc(title)}</h1><p>Namaste ${esc(data?.user?.user_metadata?.full_name || "there")},</p><p>${esc(intro)}</p>${primary}<p style="font-size:13px;color:#777;">${usesOtp ? "This code expires in 10 minutes. Never share it with anyone, including salon staff or NEXORA support." : "If you did not request this action, you can safely ignore this email and secure your account."}</p><p style="font-size:12px;color:#888;">Account email: ${esc(email,254)}</p></td></tr><tr><td style="padding:16px 26px;background:#fafaff;color:#777;font-size:12px;">NEXORA SalonOS · Account security notification</td></tr></table></td></tr></table></div></body></html>`;
  return { subject, html, text };
}

function safeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const raw = await req.text();
  if (!raw || raw.length > 128 * 1024) return new Response("Invalid hook payload", { status: 400 });

  let hook: any;
  try {
    hook = verifier.verify(raw, Object.fromEntries(req.headers));
  } catch {
    return new Response("Invalid Auth Hook signature", { status: 401 });
  }

  try {
    const email = String(hook?.user?.email || "").trim().toLowerCase();
    const emailData = hook?.email_data || {};
    const action = String(emailData.email_action_type || "");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response("Auth hook user email is invalid", { status: 400 });
    }

    const content = authEmail(action, { ...emailData, user: hook.user }, email);
    const hookId = req.headers.get("webhook-id") || "";
    const headers: Record<string,string> = {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    };
    if (hookId && /^[A-Za-z0-9._:-]{1,200}$/.test(hookId)) {
      headers["Idempotency-Key"] = `nexora-auth/${hookId}`;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: FROM,
        to: [email],
        reply_to: REPLY_TO ? [REPLY_TO] : undefined,
        subject: content.subject,
        html: content.html,
        text: content.text,
        tags: [{ name: "application", value: "nexora-salonos" }, { name: "email_kind", value: "auth" }],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      // Do not echo provider details, token, email or signature to callers/logs.
      return new Response("Transactional auth email delivery failed", { status: 500 });
    }
    return Response.json({ success: true });
  } catch {
    return new Response("Auth email hook processing failed", { status: 500 });
  }
});

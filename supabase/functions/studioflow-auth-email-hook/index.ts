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

// This is the Supabase Auth Send Email Hook secret, not RESEND_WEBHOOK_SECRET.
const verifier = new Webhook(HOOK_SECRET.replace(/^v1,whsec_/, ""));

function esc(value: unknown, max = 500): string {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim().slice(0, max).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]!);
}

type AuthMail = { to: string; subject: string; html: string; text: string; suffix: string };

function buildMail(
  action: string,
  emailData: any,
  user: any,
  options: { to?: string; token?: string; tokenHash?: string; suffix?: string } = {},
): AuthMail {
  const to = String(options.to || user?.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error("Supabase Auth email recipient is invalid");
  }

  const token = String(options.token ?? emailData?.token ?? "");
  const tokenHash = String(options.tokenHash ?? emailData?.token_hash ?? "");
  const redirectTo = typeof emailData?.redirect_to === "string" ? emailData.redirect_to : SITE_URL;
  let subject = "NEXORA account security notification";
  let title = "Account security notification";
  let intro = "A security-related action was requested for your NEXORA account.";
  let primary = "";
  let text = `${subject}. If you did not request this action, contact NEXORA support.`;

  if (["signup", "magiclink", "reauthentication", "email"].includes(action)) {
    if (!/^\d{6}$/.test(token)) throw new Error("Supabase did not provide a valid six-digit OTP");
    title = action === "signup" ? "Verify your email address"
      : action === "magiclink" ? "Your NEXORA sign-in code"
      : action === "reauthentication" ? "Confirm this sensitive action"
      : "Your NEXORA email verification code";
    subject = action === "signup" ? "Verify your NEXORA email"
      : action === "magiclink" ? "Your NEXORA sign-in code"
      : action === "reauthentication" ? "Your NEXORA security code"
      : "Your NEXORA verification code";
    intro = "Enter this one-time verification code in NEXORA SalonOS.";
    primary = `<div style="margin:24px 0;padding:22px;background:#f4f2ff;border-radius:12px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#5042ad;font-family:monospace;">${esc(token, 6)}</div>`;
    text = `Your NEXORA verification code is ${token}. It expires in 10 minutes. Never share this code.`;
  } else if (action === "recovery" || action === "invite") {
    if (!tokenHash) throw new Error("Supabase Auth action is missing its verification token");
    const verifyUrl = new URL(`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/verify`);
    verifyUrl.searchParams.set("token", tokenHash);
    verifyUrl.searchParams.set("type", action);
    verifyUrl.searchParams.set("redirect_to", redirectTo);
    title = action === "recovery" ? "Reset your NEXORA password" : "Accept your NEXORA invitation";
    subject = action === "recovery" ? "Reset your NEXORA password" : "Your NEXORA invitation";
    intro = action === "recovery"
      ? "We received a request to reset your account password."
      : "You have been invited to join NEXORA SalonOS.";
    const label = action === "recovery" ? "Reset password" : "Accept invitation";
    primary = `<p style="margin:26px 0;"><a href="${esc(verifyUrl.toString(), 1800)}" style="display:inline-block;background:#6154c8;color:#fff;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:700;">${label}</a></p>`;
    text = `${subject}. Open this secure link to continue: ${verifyUrl.toString()}`;
  } else if (action === "email_change") {
    if (!tokenHash) throw new Error("Email-change verification hash is missing");
    const verifyUrl = new URL(`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/verify`);
    verifyUrl.searchParams.set("token", tokenHash);
    verifyUrl.searchParams.set("type", "email_change");
    verifyUrl.searchParams.set("redirect_to", redirectTo);
    title = "Confirm your email change";
    subject = "Confirm your NEXORA email change";
    intro = "A request was made to change the email address associated with your account.";
    primary = `<p style="margin:26px 0;"><a href="${esc(verifyUrl.toString(), 1800)}" style="display:inline-block;background:#6154c8;color:#fff;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:700;">Confirm email change</a></p>`;
    text = `Confirm your NEXORA email change: ${verifyUrl.toString()}`;
  } else {
    const notices: Record<string, { subject: string; title: string; body: string }> = {
      password_changed_notification: {
        subject: "Your NEXORA password was changed",
        title: "Password changed",
        body: "The password for your NEXORA account was changed. If you did not make this change, reset your password and contact support immediately.",
      },
      email_changed_notification: {
        subject: "Your NEXORA email address was changed",
        title: "Email address changed",
        body: `The email associated with your account was changed. Previous address: ${esc(emailData?.old_email || "not provided", 254)}. If you did not make this change, contact support immediately.`,
      },
      phone_changed_notification: {
        subject: "Your NEXORA phone number was changed",
        title: "Phone number changed",
        body: "The phone number associated with your NEXORA account was changed. If you did not make this change, contact support immediately.",
      },
      identity_linked_notification: {
        subject: "A sign-in method was linked to your NEXORA account",
        title: "Sign-in method linked",
        body: `A ${esc(emailData?.provider || "new")} sign-in method was linked to your account. If you did not make this change, contact support.`,
      },
      identity_unlinked_notification: {
        subject: "A sign-in method was removed from your NEXORA account",
        title: "Sign-in method removed",
        body: `A ${esc(emailData?.provider || "sign-in")} method was removed from your account. If you did not make this change, contact support.`,
      },
      mfa_factor_enrolled_notification: {
        subject: "A new security factor was added to NEXORA",
        title: "Security factor added",
        body: `A ${esc(emailData?.factor_type || "multi-factor")} verification method was added to your account. If you did not make this change, contact support immediately.`,
      },
      mfa_factor_unenrolled_notification: {
        subject: "A security factor was removed from NEXORA",
        title: "Security factor removed",
        body: `A ${esc(emailData?.factor_type || "multi-factor")} verification method was removed from your account. If you did not make this change, contact support immediately.`,
      },
    };
    const notice = notices[action];
    if (!notice) throw new Error("Unsupported Supabase Auth email action");
    subject = notice.subject;
    title = notice.title;
    intro = notice.body;
    text = notice.body.replace(/<[^>]+>/g, "");
  }

  const html = `<!DOCTYPE html><html lang="en-IN" dir="ltr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title></head><body style="margin:0;background:#f4f5f9;color:#252535;font-family:Arial,Helvetica,sans-serif;"><div lang="en-IN" dir="ltr" style="padding:24px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#fff;border:1px solid #e8e8ef;border-radius:14px;"><tr><td style="padding:26px;"><p style="color:#6154c8;font-weight:700;font-size:19px;">NEXORA SALONOS</p><h1 style="font-size:24px;">${esc(title)}</h1><p>Namaste ${esc(user?.user_metadata?.full_name || "there")},</p><p>${intro}</p>${primary}<p style="font-size:13px;color:#777;">${["signup","magiclink","reauthentication","email"].includes(action) ? "This code expires in 10 minutes. Never share it with anyone, including salon staff or NEXORA support." : "If you did not request this action, you can safely ignore this email and secure your account."}</p><p style="font-size:12px;color:#888;">Account email: ${esc(to,254)}</p></td></tr><tr><td style="padding:16px 26px;background:#fafaff;color:#777;font-size:12px;">NEXORA SalonOS · Account security notification</td></tr></table></td></tr></table></div></body></html>`;
  return { to, subject, html, text, suffix: options.suffix || "primary" };
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
    const emailData = hook?.email_data || {};
    const action = String(emailData.email_action_type || "");
    const user = hook?.user || {};
    const emails: AuthMail[] = [];

    if (action === "email_change") {
      // Supabase intentionally reverses the *_new token-hash suffixes for
      // backward compatibility. Keep each token paired with its documented
      // recipient when Secure Email Change is enabled.
      if (emailData.token && emailData.token_hash_new && user.email) {
        emails.push(buildMail(action, emailData, user, {
          to: user.email, token: emailData.token,
          tokenHash: emailData.token_hash_new, suffix: "current",
        }));
      }
      if (emailData.token_new && emailData.token_hash && user.new_email) {
        emails.push(buildMail(action, emailData, user, {
          to: user.new_email, token: emailData.token_new,
          tokenHash: emailData.token_hash, suffix: "new",
        }));
      }
      if (!emails.length && user.new_email) {
        emails.push(buildMail(action, emailData, user, {
          to: user.new_email,
          token: emailData.token || emailData.token_new,
          tokenHash: emailData.token_hash || emailData.token_hash_new,
          suffix: "new",
        }));
      }
    } else {
      emails.push(buildMail(action, emailData, user));
    }

    if (!emails.length) throw new Error("Supabase email hook has no eligible recipient");
    const hookId = req.headers.get("webhook-id") || "";

    for (const mail of emails) {
      const headers: Record<string,string> = {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      };
      if (hookId && /^[A-Za-z0-9._:-]{1,180}$/.test(hookId)) {
        headers["Idempotency-Key"] = `nexora-auth/${hookId}/${mail.suffix}`;
      }
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers,
        body: JSON.stringify({
          from: FROM,
          to: [mail.to],
          reply_to: REPLY_TO ? [REPLY_TO] : undefined,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          tags: [{ name: "application", value: "nexora-salonos" }, { name: "email_kind", value: "auth" }],
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        // Do not echo provider details, auth tokens, email signatures or secrets.
        return new Response("Transactional auth email delivery failed", { status: 500 });
      }
    }
    return Response.json({});
  } catch {
    return new Response("Auth email hook processing failed", { status: 500 });
  }
});

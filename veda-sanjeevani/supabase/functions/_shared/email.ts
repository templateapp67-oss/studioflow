import { z } from "zod";
import type { AppEnv } from "./env.ts";
import { logWarning } from "./response.ts";
import type { Fetcher } from "./supabase.ts";
import { email as emailSchema, parseOutput } from "./validate.ts";
import { escapeHtml } from "./sanitize.ts";

const receipt = z.object({ id: z.string().min(1).max(200) });
export type EmailResult = { sent: boolean; skipped: boolean; code?: string };
export type EmailMessage = {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  link?: string;
  linkLabel?: string;
};

export function emailHtml(message: EmailMessage): string {
  const lines = message.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const link = message.link
    ? `<p><a href="${escapeHtml(message.link)}">${
      escapeHtml(message.linkLabel ?? "Open link")
    }</a></p>`
    : "";
  return `<!doctype html><html><body style="font-family:system-ui;color:#203b2c;max-width:600px;margin:auto;padding:24px"><h1>${
    escapeHtml(message.heading)
  }</h1>${lines}${link}<p>Warmly,<br>Veda Sanjeevani</p></body></html>`;
}

export async function sendEmail(
  env: AppEnv,
  message: EmailMessage,
  idempotencyKey: string,
  fetcher: Fetcher = fetch,
  timeoutMs = 10000,
): Promise<EmailResult> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    logWarning("email_not_configured", "CONFIGURATION");
    return { sent: false, skipped: true, code: "EMAIL_NOT_CONFIGURED" };
  }
  if (
    !emailSchema.safeParse(message.to).success || /[\r\n]/.test(message.subject) ||
    message.subject.length > 200
  ) {
    return { sent: false, skipped: true, code: "INVALID_RECIPIENT" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        html: emailHtml(message),
        text: [message.heading, ...message.lines, message.link ?? ""].join("\n\n"),
      }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return { sent: false, skipped: false, code: "EMAIL_UPSTREAM" };
    }
    const raw: unknown = await response.json();
    if (!parseOutput(receipt, raw)) {
      return { sent: false, skipped: false, code: "EMAIL_INVALID_RESPONSE" };
    }
    return { sent: true, skipped: false };
  } catch {
    return { sent: false, skipped: false, code: "EMAIL_UPSTREAM" };
  } finally {
    clearTimeout(timer);
  }
}

export function formatBookingTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value)) + " IST";
}
export function whatsappUrl(number: string, summary: string): string | null {
  let digits = number.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) digits = "91" + digits;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(summary)}`;
}

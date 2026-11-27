// Server-only Resend transport and light-mode transactional email templates.
// Do not import this module from browser code. Never pass OTPs through the outbox.

type EmailPayload = { subject: string; html: string; text: string };
type SendResult = {
  success: boolean;
  delivered: false;
  accepted?: boolean;
  duplicate?: boolean;
  suppressed?: boolean;
  emailId?: string;
  status?: string;
  notice?: string;
  error?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value: unknown, max = 300): string =>
  String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

export function escapeEmailHtml(value: unknown, max = 500): string {
  return clean(value, max).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]!);
}

export function formatINR(value: unknown): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Invalid INR amount");
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}

function displayDate(date: unknown, time: unknown, timeZone = "Asia/Kolkata"): string {
  const d = clean(date, 80);
  const t = clean(time, 40);
  if (d || t) return [d, t].filter(Boolean).join(" · ") + (timeZone === "Asia/Kolkata" ? " IST" : "");
  return "To be confirmed by the salon";
}

function shell(title: string, preview: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en-IN" dir="ltr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeEmailHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f5f9;color:#252535;font-family:Arial,Helvetica,sans-serif;">
<div lang="en-IN" dir="ltr" style="padding:24px 12px;">
<span style="display:none!important;max-height:0;overflow:hidden;opacity:0;">${escapeEmailHtml(preview)}</span>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
<tr><td align="center">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e8e8ef;border-radius:14px;">
<tr><td style="padding:26px 26px 12px;"><p style="margin:0;color:#6154c8;font-size:19px;font-weight:700;letter-spacing:.3px;">NEXORA SALONOS</p></td></tr>
<tr><td style="padding:12px 26px 28px;line-height:1.6;">${content}</td></tr>
<tr><td style="padding:18px 26px;background:#fafaff;color:#777788;font-size:12px;line-height:1.6;">
This is a service notification about your salon appointment or payment. For assistance, reply to this email or contact the salon directly.<br>© NEXORA SalonOS
</td></tr></table></td></tr></table>
</div></body></html>`;
}

function row(label: string, value: unknown): string {
  return `<tr><td style="padding:9px 0;color:#737383;font-size:14px;border-bottom:1px solid #f0f0f4;">${escapeEmailHtml(label)}</td>
<td align="right" style="padding:9px 0;color:#242433;font-size:14px;font-weight:600;border-bottom:1px solid #f0f0f4;">${escapeEmailHtml(value)}</td></tr>`;
}

export type BookingEmailData = {
  bookingId: string;
  bookingReference: string;
  recipientEmail: string;
  customerName: string;
  salonName: string;
  serviceName: string;
  stylistName?: string;
  date?: string;
  time?: string;
  timeZone?: string;
  totalAmount: number;
  amountPaid: number;
  salonAddress?: string;
  salonPhone?: string;
  serviceType?: string;
  homeServiceAddress?: string;
  homeServiceInstructions?: string;
};

export function bookingEmailTemplate(b: BookingEmailData, reminder = false): EmailPayload {
  const isHome = /home|at_home|home_service/i.test(b.serviceType || "");
  const homeAddress = clean(b.homeServiceAddress, 350);
  const homeDetails = isHome
    ? `<h2 style="font-size:16px;margin:20px 0 8px;">Home service details</h2>
       <p style="margin:4px 0;">${escapeEmailHtml(homeAddress || "The salon will confirm the service address.")}</p>
       ${b.homeServiceInstructions ? `<p style="margin:4px 0;color:#666;">Instructions: ${escapeEmailHtml(b.homeServiceInstructions, 500)}</p>` : ""}`
    : "";
  const address = isHome ? "" : clean(b.salonAddress, 350);
  const balance = Math.max(0, Number(b.totalAmount) - Number(b.amountPaid));
  const subject = reminder
    ? `Appointment reminder — ${clean(b.bookingReference, 60)}`
    : `Booking confirmed — ${clean(b.bookingReference, 60)}`;
  const html = shell(subject, reminder ? "A reminder about your upcoming salon appointment." : "Your salon appointment is confirmed.",
    `<h1 style="font-size:24px;line-height:1.25;margin:0 0 12px;">${reminder ? "Your appointment is coming up" : "Your appointment is confirmed"}</h1>
     <p>Namaste <strong>${escapeEmailHtml(b.customerName || "there")}</strong>,</p>
     <p>${reminder ? "This is a reminder for your appointment at" : "Your appointment at"} <strong>${escapeEmailHtml(b.salonName)}</strong>.</p>
     <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
       ${row("Booking reference", b.bookingReference)}
       ${row("Service", b.serviceName)}
       ${b.stylistName ? row("Professional", b.stylistName) : ""}
       ${row("Date and time", displayDate(b.date, b.time, b.timeZone))}
       ${row("Service type", isHome ? "Home service" : "At salon")}
       ${!isHome && address ? row("Salon address", address) : ""}
       ${row("Service total", formatINR(b.totalAmount))}
       ${row("Paid so far", formatINR(b.amountPaid))}
       ${row("Balance due", formatINR(balance))}
     </table>
     ${homeDetails}
     ${b.salonPhone ? `<p style="margin-top:18px;">Need to make a change? Contact the salon at ${escapeEmailHtml(b.salonPhone, 40)}.</p>` : ""}
     <p style="margin-top:20px;color:#777;font-size:13px;">Please keep your booking reference for your visit.</p>`);
  const text = [
    `NEXORA SALONOS — ${reminder ? "Appointment reminder" : "Booking confirmed"}`,
    `Hello ${clean(b.customerName || "there")}`,
    `Salon: ${clean(b.salonName)}`,
    `Booking: ${clean(b.bookingReference)}`,
    `Service: ${clean(b.serviceName)}`,
    b.stylistName ? `Professional: ${clean(b.stylistName)}` : "",
    `Date/time: ${displayDate(b.date, b.time, b.timeZone)}`,
    isHome ? `Home service address: ${homeAddress || "To be confirmed"}` : `Salon address: ${address || "See booking details"}`,
    b.homeServiceInstructions ? `Instructions: ${clean(b.homeServiceInstructions, 500)}` : "",
    `Total: ${formatINR(b.totalAmount)}`,
    `Paid: ${formatINR(b.amountPaid)}`,
    `Balance due: ${formatINR(balance)}`,
  ].filter(Boolean).join("\n");
  return { subject, html, text };
}

export type PaymentReceiptData = {
  bookingId: string;
  paymentId: string;
  recipientEmail: string;
  customerName: string;
  salonName: string;
  bookingReference: string;
  invoiceNumber?: string;
  paymentDate: string;
  paymentMethod?: string;
  transactionAmount: number;
  totalAmount: number;
  amountPaidToDate: number;
  balanceDue: number;
  depositPercent?: number;
};

export function paymentReceiptTemplate(p: PaymentReceiptData): EmailPayload {
  const subject = `Payment receipt — ${clean(p.paymentId, 80)}`;
  const html = shell(subject, "Your Nexora salon payment has been recorded.",
    `<h1 style="font-size:24px;margin:0 0 12px;">Payment received</h1>
     <p>Namaste <strong>${escapeEmailHtml(p.customerName || "there")}</strong>,</p>
     <p>Your payment to <strong>${escapeEmailHtml(p.salonName)}</strong> has been successfully recorded.</p>
     <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
       ${row("Booking reference", p.bookingReference)}
       ${p.invoiceNumber ? row("Invoice reference", p.invoiceNumber) : ""}
       ${row("Payment reference", p.paymentId)}
       ${row("Payment date", p.paymentDate)}
       ${p.paymentMethod ? row("Payment method", p.paymentMethod) : ""}
       ${row("This payment", formatINR(p.transactionAmount))}
       ${p.depositPercent ? row("Advance deposit", `${p.depositPercent}%`) : ""}
       ${row("Booking total", formatINR(p.totalAmount))}
       ${row("Total paid to date", formatINR(p.amountPaidToDate))}
       ${row("Balance due", formatINR(p.balanceDue))}
     </table>
     <p style="margin-top:20px;color:#16845b;font-weight:700;">${p.balanceDue > 0 ? "Advance payment recorded" : "Payment complete"}</p>
     <p style="font-size:13px;color:#777;">Keep this email as your payment receipt. This receipt confirms only the payment shown above.</p>`);
  const text = [
    "NEXORA SALONOS — Payment receipt",
    `Salon: ${clean(p.salonName)}`,
    `Booking: ${clean(p.bookingReference)}`,
    p.invoiceNumber ? `Invoice: ${clean(p.invoiceNumber)}` : "",
    `Payment reference: ${clean(p.paymentId)}`,
    `Payment date: ${clean(p.paymentDate)}`,
    p.paymentMethod ? `Method: ${clean(p.paymentMethod)}` : "",
    `This payment: ${formatINR(p.transactionAmount)}`,
    `Booking total: ${formatINR(p.totalAmount)}`,
    `Total paid: ${formatINR(p.amountPaidToDate)}`,
    `Balance due: ${formatINR(p.balanceDue)}`,
  ].filter(Boolean).join("\n");
  return { subject, html, text };
}

function safeCode(value: unknown): string {
  return clean(value, 80).toLowerCase().replace(/[^a-z0-9_.-]/g, "_") || "send_failed";
}

async function saveFailure(db: any, eventKey: string, code: string, retryable: boolean): Promise<void> {
  await db.rpc("studioflow_email_mark_failed", {
    p_event_key: eventKey,
    p_error_code: safeCode(code),
    p_retryable: retryable,
  });
}

export async function sendTransactionalEmail(
  db: any,
  input: {
    eventKey: string;
    kind: "booking_confirmation" | "booking_reminder" | "payment_receipt";
    recipientEmail: string;
    bookingId?: string;
    paymentId?: string;
    content: EmailPayload;
  },
): Promise<SendResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const from = Deno.env.get("RESEND_FROM_EMAIL")?.trim();
  const replyTo = Deno.env.get("RESEND_REPLY_TO")?.trim();
  if (!apiKey || !from) return { success: false, delivered: false, error: "Resend sender is not configured." };

  const recipient = clean(input.recipientEmail, 254).toLowerCase();
  if (!EMAIL_RE.test(recipient)) return { success: false, delivered: false, error: "No valid customer email is available." };
  if (!input.eventKey || input.eventKey.length > 200) return { success: false, delivered: false, error: "Invalid email event key." };

  const { data: suppression, error: suppressionError } = await db
    .from("studioflow_email_suppressions")
    .select("email_address")
    .eq("email_address", recipient)
    .maybeSingle();
  if (suppressionError) return { success: false, delivered: false, error: "Email suppression check is unavailable." };
  if (suppression) return { success: false, delivered: false, suppressed: true, error: "This address is suppressed by a previous bounce or complaint." };

  const payload = {
    subject: input.content.subject,
    html: input.content.html,
    text: input.content.text,
  };
  const { data: claim, error: claimError } = await db.rpc("studioflow_email_claim", {
    p_event_key: input.eventKey,
    p_kind: input.kind,
    p_recipient_email: recipient,
    p_email_payload: payload,
    p_booking_id: input.bookingId ?? null,
    p_payment_id: input.paymentId ?? null,
  });
  if (claimError) return { success: false, delivered: false, error: "Email outbox is unavailable." };
  if (claim?.claimed !== true) {
    return {
      success: true, delivered: false, accepted: true, duplicate: true,
      status: String(claim?.status || "already_processed"),
      notice: "This notification has already been queued or sent.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `nexora/${input.eventKey}`,
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: replyTo ? [replyTo] : undefined,
        subject: input.content.subject,
        html: input.content.html,
        text: input.content.text,
        tags: [
          { name: "application", value: "nexora-salonos" },
          { name: "email_kind", value: input.kind },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result?.id !== "string") {
      const code = safeCode(result?.name || result?.code || `http_${response.status}`);
      const retryable = response.status === 429 || response.status >= 500 || response.status === 0;
      await saveFailure(db, input.eventKey, code, retryable);
      return { success: false, delivered: false, error: retryable ? "Email provider is temporarily unavailable." : "Email provider rejected the message." };
    }

    const { error: updateError } = await db.rpc("studioflow_email_mark_sent", {
      p_event_key: input.eventKey,
      p_resend_email_id: result.id,
    });
    if (updateError) {
      // The provider may have accepted the email. A retry will reuse the same
      // idempotency key and retrieve the original provider result.
      return { success: false, delivered: false, accepted: true, emailId: result.id, error: "Email was accepted, but delivery tracking could not be saved." };
    }
    return { success: true, delivered: false, accepted: true, emailId: result.id };
  } catch {
    await saveFailure(db, input.eventKey, "network_or_timeout", true);
    return { success: false, delivered: false, error: "Email provider is temporarily unavailable." };
  }
}

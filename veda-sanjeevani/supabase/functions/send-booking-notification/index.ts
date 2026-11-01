import { requireInternal } from "../_shared/auth.ts";
import { loadBooking } from "../_shared/booking.ts";
import { notificationInput } from "../_shared/validate.ts";
import { type EmailMessage, formatBookingTime, sendEmail, whatsappUrl } from "../_shared/email.ts";
import { type Dependencies, endpoint } from "../_shared/http.ts";
import { claimJob, completeJob } from "../_shared/jobs.ts";
import { AppError, logWarning, ok } from "../_shared/response.ts";
import { parseInput, readJson } from "../_shared/validate.ts";

export function createHandler(dependencies: Dependencies = {}) {
  return endpoint("send_booking_notification", async (request, ctx) => {
    await requireInternal(request, ctx.env);
    const { booking_id } = parseInput(notificationInput, await readJson(request, 4096));
    const claim = await claimJob(ctx.admin, booking_id, "notification");
    if (claim.status !== "claimed") {
      return ok({
        booking_id,
        sent: false,
        duplicate: claim.status === "already_processed",
        status: claim.status,
      });
    }
    try {
      const { booking, site } = await loadBooking(ctx.admin, booking_id);
      const when = formatBookingTime(booking.start_at);
      const link =
        whatsappUrl(site.whatsapp, `Hello, I have a booking question about ${booking.id}.`) ??
          undefined;
      const common = [
        `Service: ${booking.services.name}`,
        `Therapist: ${booking.staff.name}`,
        `When: ${when}`,
        `Address: ${site.address}`,
        `Booking reference: ${booking.id}`,
      ];
      const owner = ctx.env.OWNER_EMAIL ?? site.email;
      const messages: { kind: string; message: EmailMessage }[] = [];
      if (owner) {
        messages.push({
          kind: "owner",
          message: {
            to: owner,
            subject: `New booking: ${booking.services.name}`,
            heading: "A new booking is waiting",
            lines: [
              ...common,
              `Customer: ${booking.customers.name}`,
              `Phone: ${booking.customers.phone}`,
              `Email: ${booking.customers.email ?? "Not provided"}`,
              `Notes: ${booking.notes || "None"}`,
            ],
            ...(link ? { link, linkLabel: "Open WhatsApp" } : {}),
          },
        });
      }
      if (booking.customers.email) {
        messages.push({
          kind: "customer",
          message: {
            to: booking.customers.email,
            subject: `Booking received: ${booking.services.name}`,
            heading: "Your booking request has been received",
            lines: [
              `Hello ${booking.customers.name},`,
              ...common,
              "Status: pending confirmation by the spa.",
              "This appointment is not confirmed until the spa confirms it.",
            ],
            ...(link ? { link, linkLabel: "Contact the spa on WhatsApp" } : {}),
          },
        });
      }
      const results = await Promise.all(messages.map(async ({ kind, message }) => ({
        kind,
        ...await sendEmail(ctx.env, message, `veda-booking-${booking.id}-${kind}`, ctx.fetcher),
      })));
      for (const result of results) if (!result.sent) logWarning("booking_email", "UPSTREAM_ERROR");
      const failed = results.some((result) =>
        !result.sent && (!result.skipped || result.code === "EMAIL_NOT_CONFIGURED")
      );
      const sent = results.some((result) => result.sent) && !failed;
      const status = sent ? "sent" : failed ? "failed" : "skipped";
      await completeJob(
        ctx.admin,
        booking_id,
        "notification",
        claim.token,
        status,
        sent ? undefined : failed ? "EMAIL_UPSTREAM" : "NO_DELIVERABLE_EMAIL",
      );
      // Delivery is best-effort: a provider failure never turns a saved booking into an error.
      return ok({
        booking_id,
        sent,
        status,
        owner_sent: results.some((r) => r.kind === "owner" && r.sent),
        customer_sent: results.some((r) => r.kind === "customer" && r.sent),
        whatsapp_url: link ?? null,
      });
    } catch (error) {
      try {
        await completeJob(
          ctx.admin,
          booking_id,
          "notification",
          claim.token,
          "failed",
          "NOTIFICATION_FAILED",
        );
      } catch {
        logWarning("notification_claim_release", "INTERNAL");
      }
      if (error instanceof AppError && error.code === "NOT_FOUND") throw error;
      logWarning("booking_notification", "INTERNAL");
      return ok({ booking_id, sent: false, status: "failed" });
    }
  }, dependencies);
}
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);

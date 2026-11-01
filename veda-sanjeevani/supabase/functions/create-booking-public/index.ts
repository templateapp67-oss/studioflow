import { z } from "zod";
import { formatBookingTime, whatsappUrl } from "../_shared/email.ts";
import { type Dependencies, endpoint } from "../_shared/http.ts";
import { clientIp, consumeRateLimit } from "../_shared/rateLimit.ts";
import { AppError, logWarning, ok } from "../_shared/response.ts";
import { bookingInput, parseInput, parseOutput, readJson, uuid } from "../_shared/validate.ts";

const bookingRpc = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    booking_id: uuid,
    start_at: z.string().datetime({ offset: true }),
    end_at: z.string().datetime({ offset: true }),
    service_name: z.string(),
    staff_name: z.string(),
  }).strict(),
  z.object({
    ok: z.literal(false),
    error_code: z.enum(["SLOT_TAKEN", "INVALID_INPUT", "CLOSED", "PAST_TIME", "SERVICE_NOT_FOUND"]),
  }).strict(),
]);
const settingsSchema = z.object({ business_name: z.string(), whatsapp: z.string() });
const messages = {
  SLOT_TAKEN: "That slot has just been taken. Please choose another time.",
  INVALID_INPUT: "Please check the booking details and selected therapist.",
  CLOSED: "The spa is closed at that time. Please choose an available slot.",
  PAST_TIME: "Please book at least two hours in advance.",
  SERVICE_NOT_FOUND: "This service is no longer available.",
};

export function createHandler(dependencies: Dependencies = {}) {
  return endpoint("create_booking_public", async (request, ctx) => {
    const input = parseInput(bookingInput, await readJson(request, 8192));
    if (input.website.trim()) {
      // Indistinguishable envelope; deliberately no RPC, rate-limit row or notification.
      return ok({
        booking_id: crypto.randomUUID(),
        start_at: input.start_at,
        end_at: input.start_at,
        service_name: "Booking request",
        staff_name: "To be assigned",
        whatsapp_url: null,
      });
    }
    await consumeRateLimit(ctx.admin, ctx.env, "booking-ip", clientIp(request), 5, 3600, ctx.now);
    await consumeRateLimit(ctx.admin, ctx.env, "booking-phone", input.phone, 3, 3600, ctx.now);
    const { data, error } = await ctx.admin.rpc("create_booking", {
      p_service_id: input.service_id,
      p_staff_id: input.staff_id ?? null,
      p_start_at: input.start_at,
      p_name: input.name,
      p_phone: input.phone,
      p_email: input.email ?? null,
      p_notes: input.notes,
    });
    const result = parseOutput(bookingRpc, data);
    if (error || !result) {
      throw new AppError("INTERNAL", "Could not create the booking. Please try again.");
    }
    if (!result.ok) throw new AppError(result.error_code, messages[result.error_code]);
    const { data: settings } = await ctx.admin.from("site_settings").select(
      "business_name,whatsapp",
    ).maybeSingle();
    const site = parseOutput(settingsSchema, settings);
    const summary = `${
      site?.business_name ?? "Veda Sanjeevani"
    } booking ${result.booking_id}\n${result.service_name} with ${result.staff_name}\n${
      formatBookingTime(result.start_at)
    }`;
    const whatsapp = site ? whatsappUrl(site.whatsapp, summary) : null;
    const notification = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await ctx.fetcher(
          `${ctx.env.SUPABASE_URL}/functions/v1/send-booking-notification`,
          {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${ctx.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ booking_id: result.booking_id }),
          },
        );
        if (!response.ok) logWarning("booking_notification_dispatch", "UPSTREAM_ERROR");
        await response.body?.cancel();
      } finally {
        clearTimeout(timer);
      }
    })();
    ctx.background(notification);
    return ok({
      booking_id: result.booking_id,
      start_at: result.start_at,
      end_at: result.end_at,
      service_name: result.service_name,
      staff_name: result.staff_name,
      whatsapp_url: whatsapp,
    });
  }, dependencies);
}
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);

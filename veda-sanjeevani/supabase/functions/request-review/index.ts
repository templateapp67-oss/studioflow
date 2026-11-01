import { z } from "zod";
import { requireCron } from "../_shared/auth.ts";
import { loadBooking } from "../_shared/booking.ts";
import { sendEmail } from "../_shared/email.ts";
import { type Context, type Dependencies, endpoint } from "../_shared/http.ts";
import { claimJob, completeJob } from "../_shared/jobs.ts";
import { AppError, logWarning, ok } from "../_shared/response.ts";
import { parseInput, parseOutput, readJson, reviewRequestInput } from "../_shared/validate.ts";

const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const tokenState = z.object({
  used_at: z.string().nullable(),
  expires_at: z.string().datetime({ offset: true }),
}).strict();
type Result = { booking_id: string; sent: boolean; status: string };

async function processOne(ctx: Context, bookingId: string): Promise<Result> {
  const claim = await claimJob(ctx.admin, bookingId, "review");
  if (claim.status !== "claimed") {
    return { booking_id: bookingId, sent: false, status: claim.status };
  }
  try {
    const { booking, site } = await loadBooking(ctx.admin, bookingId);
    if (booking.status !== "completed") {
      throw new AppError("CONFLICT", "The booking must be completed first.");
    }
    if (!booking.customers.email) {
      await completeJob(ctx.admin, bookingId, "review", claim.token, "skipped");
      return { booking_id: bookingId, sent: false, status: "skipped" };
    }
    const { data: existing, error: lookupError } = await ctx.admin.from("review_tokens")
      .select("used_at,expires_at").eq("booking_id", bookingId).maybeSingle();
    const state = parseOutput(tokenState, existing);
    if (lookupError || (existing && !state)) {
      throw new AppError("INTERNAL", "Could not check the review invitation.");
    }
    if (state?.used_at || (state && Date.parse(state.expires_at) <= ctx.now())) {
      await completeJob(ctx.admin, bookingId, "review", claim.token, "skipped");
      return { booking_id: bookingId, sent: false, status: "already_used_or_expired" };
    }
    const { data: tokenData, error: tokenError } = await ctx.admin.rpc("create_review_token", {
      p_booking_id: bookingId,
    });
    const token = parseOutput(tokenSchema, tokenData);
    if (tokenError || !token) {
      throw new AppError("INTERNAL", "Could not prepare the review invitation.");
    }
    // Never return or log this token; it is delivered only to the customer's email.
    const result = await sendEmail(
      ctx.env,
      {
        to: booking.customers.email,
        subject: `How was your visit to ${site.business_name}?`,
        heading: "We would value your feedback",
        lines: [
          `Hello ${booking.customers.name},`,
          `Thank you for visiting ${site.business_name}.`,
          `Please share feedback on your ${booking.services.name} experience. This one-time link expires 14 days after it was issued.`,
          "If you have already submitted a review, no further action is needed.",
        ],
        link: `${ctx.env.SITE_URL}/review/${token}`,
        linkLabel: "Share your experience",
      },
      `veda-review-${bookingId}`,
      ctx.fetcher,
    );
    const status = result.sent ? "sent" : "failed";
    await completeJob(
      ctx.admin,
      bookingId,
      "review",
      claim.token,
      result.sent ? "sent" : "failed",
      result.sent ? undefined : result.code ?? "EMAIL_UPSTREAM",
    );
    return { booking_id: bookingId, sent: result.sent, status };
  } catch (error) {
    try {
      await completeJob(ctx.admin, bookingId, "review", claim.token, "failed", "REVIEW_FAILED");
    } catch {
      logWarning("review_claim_release", "INTERNAL");
    }
    if (
      error instanceof AppError && ["NOT_FOUND", "CONFLICT", "INVALID_INPUT"].includes(error.code)
    ) throw error;
    logWarning("review_invitation", "UPSTREAM_ERROR");
    return { booking_id: bookingId, sent: false, status: "failed" };
  }
}

export function createHandler(dependencies: Dependencies = {}) {
  return endpoint("request_review", async (request, ctx) => {
    await requireCron(request, ctx.env);
    const input = parseInput(reviewRequestInput, await readJson(request, 16384));
    const ids = "booking_id" in input ? [input.booking_id] : input.booking_ids;
    const results: Result[] = [];
    // Step 1 dispatches up to 100 IDs. Bound concurrency and stop before the runtime limit.
    const deadline = ctx.now() + 100000;
    for (let offset = 0; offset < ids.length; offset += 4) {
      const batch = ids.slice(offset, offset + 4);
      results.push(
        ...await Promise.all(batch.map(async (id): Promise<Result> => {
          if (ctx.now() >= deadline) return { booking_id: id, sent: false, status: "retry_later" };
          try {
            return await processOne(ctx, id);
          } catch (error) {
            if (ids.length === 1) throw error;
            return {
              booking_id: id,
              sent: false,
              status: error instanceof AppError ? error.code.toLowerCase() : "failed",
            };
          }
        })),
      );
    }
    // A non-2xx response makes Step 1 retry the batch. Durable claims deduplicate
    // successful items; failed items remain eligible, with a 15-minute cooldown.
    if (
      results.some((result) =>
        !["sent", "skipped", "already_processed", "already_used_or_expired"].includes(result.status)
      )
    ) {
      throw new AppError(
        "UPSTREAM_ERROR",
        "Some review invitations need a retry. Completed invitations will not be sent again.",
      );
    }
    return ok(
      "booking_id" in input
        ? results[0]
        : { items: results, sent: results.some((result) => result.sent) },
    );
  }, dependencies);
}
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);

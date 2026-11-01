import { z } from "zod";
import { AppError } from "./response.ts";
import type { AdminClient } from "./supabase.ts";
import { parseOutput, uuid } from "./validate.ts";

export const claimSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.enum([
      "invalid_input",
      "not_found",
      "not_completed",
      "already_processed",
      "in_progress",
      "retry_later",
    ]),
  }).strict(),
  z.object({
    status: z.literal("claimed"),
    token: uuid,
    lease_until: z.string().datetime({ offset: true }),
  }).strict(),
]);
export async function claimJob(
  admin: AdminClient,
  bookingId: string,
  kind: "notification" | "review",
) {
  const { data, error } = await admin.rpc("claim_backend_job", {
    p_booking_id: bookingId,
    p_kind: kind,
  });
  const claim = parseOutput(claimSchema, data);
  if (error || !claim) {
    throw new AppError("INTERNAL", "Could not prepare the message. Please retry.");
  }
  if (claim.status === "not_found") throw new AppError("NOT_FOUND", "Booking not found.");
  if (claim.status === "not_completed") {
    throw new AppError("CONFLICT", "The booking must be completed first.");
  }
  if (claim.status === "invalid_input") throw new AppError("INVALID_INPUT", "Invalid booking job.");
  return claim;
}
export async function completeJob(
  admin: AdminClient,
  bookingId: string,
  kind: "notification" | "review",
  token: string,
  status: "sent" | "skipped" | "failed",
  code?: string,
): Promise<void> {
  const { data, error } = await admin.rpc("complete_backend_job", {
    p_booking_id: bookingId,
    p_kind: kind,
    p_token: token,
    p_status: status,
    p_error_code: code ?? null,
  });
  if (error || data !== true) {
    throw new AppError("INTERNAL", "Could not record message delivery. Retry is safe.");
  }
}

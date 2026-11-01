import { z } from "zod";
import { AppError } from "./response.ts";
import type { AdminClient } from "./supabase.ts";
import { email, parseOutput, phone, uuid } from "./validate.ts";

const bookingSchema = z.object({
  id: uuid,
  start_at: z.string().datetime({ offset: true }),
  end_at: z.string().datetime({ offset: true }),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]),
  notes: z.string().max(500),
  notification_sent_at: z.string().nullable(),
  review_requested_at: z.string().nullable(),
  customers: z.object({ name: z.string(), phone, email: email.nullable() }).strict(),
  services: z.object({ name: z.string() }).strict(),
  staff: z.object({ name: z.string() }).strict(),
});
const settingsSchema = z.object({
  business_name: z.string(),
  whatsapp: z.string(),
  email: z.string(),
  address: z.string(),
});
export async function loadBooking(admin: AdminClient, id: string) {
  const { data, error } = await admin.from("bookings").select(
    "id,start_at,end_at,status,notes,notification_sent_at,review_requested_at,customers(name,phone,email),services(name),staff(name)",
  ).eq("id", id).maybeSingle();
  if (error) throw new AppError("INTERNAL", "Could not read the booking.");
  const booking = parseOutput(bookingSchema, data);
  if (!booking) throw new AppError("NOT_FOUND", "Booking not found.");
  const { data: settings, error: settingsError } = await admin.from("site_settings")
    .select("business_name,whatsapp,email,address").maybeSingle();
  const site = parseOutput(settingsSchema, settings);
  if (settingsError || !site) {
    throw new AppError("INTERNAL", "Business settings are not available.");
  }
  return { booking, site };
}
export type LoadedBooking = Awaited<ReturnType<typeof loadBooking>>;

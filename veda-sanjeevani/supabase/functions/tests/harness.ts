import { createHandler as aiContent } from "../ai-generate-content/index.ts";
import { createHandler as aiAll } from "../ai-generate-all/index.ts";
import { createHandler as booking } from "../create-booking-public/index.ts";
import { createHandler as notification } from "../send-booking-notification/index.ts";
import { createHandler as review } from "../request-review/index.ts";
import { createHandler as summary } from "../summarize-reviews/index.ts";
import { createHandler as media } from "../register-media/index.ts";
import { createHandler as health } from "../health/index.ts";
import { parseEnv } from "../_shared/env.ts";
import type { Dependencies, Handler } from "../_shared/http.ts";
import type { Fetcher } from "../_shared/supabase.ts";

export const values: Record<string, string> = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key-not-a-real-credential",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key-not-a-real-credential",
  SITE_URL: "https://veda.example.com",
  ENVIRONMENT: "test",
  CRON_SECRET: "test-only-cron-secret-at-least-32-characters",
  GEMINI_API_KEY: "test-gemini-key-not-real",
  GEMINI_MODEL: "gemini-flash-latest",
  RESEND_API_KEY: "test-resend-key-not-real",
  EMAIL_FROM: "Spa <spa@example.com>",
  OWNER_EMAIL: "owner@example.com",
};
export const env = parseEnv({ get: (key) => values[key] });
export const ownerId = "a1000000-0000-4000-8000-000000000001";
export const serviceId = "b1000000-0000-4000-8000-000000000001";
export const bookingId = "d1000000-0000-4000-8000-000000000001";
export const reviewId = "e1000000-0000-4000-8000-000000000001";
export const now = () => Date.parse("2027-01-04T04:30:00Z");
export const noSleep = () => Promise.resolve();
export const jsonResponse = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
export const service = {
  id: serviceId,
  name: "Abhyanga",
  slug: "abhyanga",
  category: "relax",
  short_desc: "Warm oil massage",
  duration_min: 60,
  price: 2400,
  benefits: ["Relaxation"],
  dosha_tags: ["vata"],
  sort_order: 1,
};
export const bookingRow = {
  id: bookingId,
  start_at: "2027-01-05T04:30:00+00:00",
  end_at: "2027-01-05T05:30:00+00:00",
  status: "completed",
  notes: "Please use unscented oil.",
  notification_sent_at: null,
  review_requested_at: null,
  customers: { name: "Asha <guest>", phone: "9876543210", email: "guest@example.com" },
  services: { name: "Abhyanga" },
  staff: { name: "Meera" },
};
export const settings = {
  id: "c1000000-0000-4000-8000-000000000001",
  business_name: "Veda <Spa>",
  whatsapp: "+91 98765 43210",
  email: "owner@example.com",
  address: "Jaipur, Rajasthan",
  city: "Jaipur",
  published: true,
};
export const claim = {
  status: "claimed",
  token: "f1000000-0000-4000-8000-000000000001",
  lease_until: "2027-01-04T04:40:00+00:00",
};
export const geminiOutput = (value: unknown) =>
  jsonResponse({
    candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] }, finishReason: "STOP" }],
  });
export const aboutOutput = {
  text: "A calm space in Jaipur offering warm oil massage and a thoughtful pause in a busy day.",
};
export const summaryOutput = {
  summary:
    "Guests appreciate the calm setting. Warm oil massage is a highlight. Clearer arrival guidance would help.",
  strengths: ["Calm setting", "Attentive therapists", "Comfortable rooms"],
  improvements: ["Clearer directions", "More arrival guidance", "Explain session preparation"],
  replies: [{
    review_id: reviewId,
    reply: "Thank you for sharing your experience. We appreciate your thoughtful feedback.",
  }, {
    review_id: "e1000000-0000-4000-8000-000000000002",
    reply: "Thank you for your feedback. We will review your arrival guidance suggestion.",
  }, {
    review_id: "e1000000-0000-4000-8000-000000000003",
    reply: "We appreciate your kind words and hope to welcome you again for a relaxing visit.",
  }],
};
export const reviewRows = summaryOutput.replies.map((reply, index) => ({
  id: reply.review_id,
  rating: 5 - index % 2,
  comment: [
    "A peaceful visit.",
    "Arrival instructions could be clearer.",
    "The room was comfortable.",
  ][index],
  approved: index !== 1,
  created_at: "2027-01-03T10:00:00+00:00",
}));

export type Route = (url: URL, init: RequestInit, body: unknown) => Response | Promise<Response>;
export function fetchMock(
  route: Route,
): { fetcher: Fetcher; calls: { url: URL; body: unknown; init: RequestInit }[] } {
  const calls: { url: URL; body: unknown; init: RequestInit }[] = [];
  const fetcher: Fetcher = async (input, init = {}) => {
    await Promise.resolve();
    const url = new URL(String(input));
    let body: unknown;
    const rawBody = typeof init.body === "string"
      ? init.body
      : init.body instanceof Uint8Array
      ? new TextDecoder().decode(init.body)
      : undefined;
    if (rawBody !== undefined) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = rawBody;
      }
    }
    calls.push({ url, body, init });
    if (url.origin === "https://generativelanguage.googleapis.com") {
      const prompt = JSON.stringify(body);
      if (prompt.includes("Task: service_description")) return geminiOutput(aboutOutput);
      if (prompt.includes("Task: faq")) {
        return geminiOutput({
          faqs: Array.from({ length: 6 }, (_, index) => ({
            question: `What should I know before visit ${index + 1}?`,
            answer:
              "Please arrive a little early and share your comfort preferences with the therapist before your session.",
          })),
        });
      }
      if (prompt.includes("Task: seo")) {
        return geminiOutput({
          title: "Veda Sanjeevani Wellness and Spa in Jaipur",
          description:
            "Discover a calm spa experience in Jaipur with warm oil massage, thoughtful therapists and time to unwind. Explore the available wellness sessions.",
        });
      }
      return geminiOutput(aboutOutput);
    }
    if (url.origin === "https://api.resend.com") return jsonResponse({ id: "email-test-1" });
    if (url.pathname === "/rest/v1/services") return jsonResponse([service]);
    if (url.pathname === "/rest/v1/site_settings") {
      return jsonResponse(
        url.searchParams.get("select") === "id" ? [{ id: settings.id }] : settings,
      );
    }
    if (url.pathname === "/rest/v1/bookings") return jsonResponse(bookingRow);
    if (url.pathname === "/rest/v1/reviews") return jsonResponse(reviewRows);
    if (url.pathname === "/rest/v1/review_tokens") return jsonResponse(null);
    if (url.pathname === "/rest/v1/ai_generations") {
      return jsonResponse({ id: "aa100000-0000-4000-8000-000000000001" }, 201);
    }
    if (url.pathname === "/rest/v1/media") {
      return jsonResponse({
        id: "bb100000-0000-4000-8000-000000000001",
        original_url: `${env.SUPABASE_URL}/storage/v1/object/public/site-images/original.webp`,
        url_400: `${env.SUPABASE_URL}/storage/v1/object/public/site-images/400.webp`,
        url_800: `${env.SUPABASE_URL}/storage/v1/object/public/site-images/800.webp`,
        url_1600: `${env.SUPABASE_URL}/storage/v1/object/public/site-images/1600.webp`,
        alt_text: "Massage room",
        bytes: 1000,
        uploaded_by: ownerId,
        created_at: "2027-01-04T04:30:00+00:00",
      }, 201);
    }
    if (url.pathname === "/rest/v1/rpc/check_rate_limit") return jsonResponse(true);
    if (url.pathname === "/rest/v1/rpc/claim_backend_job") return jsonResponse(claim);
    if (url.pathname === "/rest/v1/rpc/complete_backend_job") return jsonResponse(true);
    if (url.pathname === "/rest/v1/rpc/create_review_token") return jsonResponse("a".repeat(64));
    if (url.pathname === "/rest/v1/rpc/create_booking") {
      return jsonResponse({
        ok: true,
        booking_id: bookingId,
        start_at: bookingRow.start_at,
        end_at: bookingRow.end_at,
        service_name: "Abhyanga",
        staff_name: "Meera",
      });
    }
    if (url.pathname.startsWith("/storage/v1/object/public/site-images/")) {
      return new Response(null, {
        headers: { "Content-Length": "1000", "Content-Type": "image/webp" },
      });
    }
    if (url.pathname === "/functions/v1/send-booking-notification") {
      return jsonResponse({ ok: true, data: { sent: true } });
    }
    return route(url, init, body);
  };
  return { fetcher, calls };
}
export function dependencies(
  route: Route = () => jsonResponse({ error: "unexpected test request" }, 500),
): Dependencies {
  return {
    env,
    fetcher: fetchMock(route).fetcher,
    actor: { id: ownerId, role: "owner" },
    now,
    sleep: noSleep,
    background: (task) => {
      void task.catch(() => undefined);
    },
  };
}
export function request(
  body: unknown,
  headers: Record<string, string> = {},
  method = "POST",
): Request {
  return new Request(`${env.SUPABASE_URL}/functions/v1/test`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
}
export const internalHeaders = { "x-cron-secret": values.CRON_SECRET! };
export const validBooking = {
  service_id: serviceId,
  start_at: "2027-01-05T04:30:00Z",
  name: "Asha",
  phone: "9876543210",
  website: "",
};
export const mediaInput = {
  original_url: `${env.SUPABASE_URL}/storage/v1/object/public/site-images/original.webp`,
  url_400: `${env.SUPABASE_URL}/storage/v1/object/public/site-images/400.webp`,
  url_800: `${env.SUPABASE_URL}/storage/v1/object/public/site-images/800.webp`,
  url_1600: `${env.SUPABASE_URL}/storage/v1/object/public/site-images/1600.webp`,
  alt_text: "Massage room",
  bytes: 1000,
};
export const handlers: Record<string, (deps?: Dependencies) => Handler> = {
  "ai-generate-content": aiContent,
  "ai-generate-all": aiAll,
  "create-booking-public": booking,
  "send-booking-notification": notification,
  "request-review": review,
  "summarize-reviews": summary,
  "register-media": media,
  health,
};

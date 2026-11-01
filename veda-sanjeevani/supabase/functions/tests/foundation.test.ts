import assert from "node:assert/strict";
import { assertEquals, assertRejects, assertThrows } from "./assertions.ts";
import { z } from "zod";
import { ConfigurationError, parseEnv } from "../_shared/env.ts";
import { allowedOrigins, corsHeaders } from "../_shared/cors.ts";
import { AppError, fail, ok } from "../_shared/response.ts";
import { bookingInput, contentInput, parseInput, readJson } from "../_shared/validate.ts";
import { escapeHtml, forbiddenClaims, sanitizeTree, stripHtml } from "../_shared/sanitize.ts";

export const envValues: Record<string, string> = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key-not-a-real-credential",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key-not-a-real-credential",
  SITE_URL: "https://veda.example.com",
  ENVIRONMENT: "test",
  CRON_SECRET: "test-only-cron-secret-at-least-32-characters",
};
export const testEnv = parseEnv({ get: (key) => envValues[key] });
const request = (origin?: string) =>
  new Request("https://project.supabase.co/functions/v1/health", {
    headers: origin ? { Origin: origin } : {},
  });

Deno.test("env fails clearly without disclosing secret values", () => {
  const error = assertThrows(
    () => parseEnv({ get: (key) => key === "SUPABASE_URL" ? undefined : envValues[key] }),
    ConfigurationError,
  );
  assert(error.message.includes("SUPABASE_URL"));
  assert(!error.message.includes(envValues.SUPABASE_SERVICE_ROLE_KEY!));
});
Deno.test("env defaults model and validates production origins", () => {
  assertEquals(testEnv.GEMINI_MODEL, "gemini-flash-latest");
  assertThrows(
    () =>
      parseEnv({
        get: (key) =>
          key === "ENVIRONMENT"
            ? "production"
            : key === "SITE_URL"
            ? "http://veda.example.com"
            : envValues[key],
      }),
    ConfigurationError,
  );
});
Deno.test("CORS only allows configured origin and development Vite origin", () => {
  assertEquals(
    corsHeaders(request(testEnv.SITE_URL), testEnv).get("Access-Control-Allow-Origin"),
    testEnv.SITE_URL,
  );
  assertEquals(
    corsHeaders(request("http://localhost:5173"), testEnv).get("Access-Control-Allow-Origin"),
    "http://localhost:5173",
  );
  assertThrows(() => corsHeaders(request("https://evil.example"), testEnv), AppError);
  assertEquals(corsHeaders(request(), testEnv).has("Access-Control-Allow-Origin"), false);
  assertEquals(allowedOrigins({ ...testEnv, ENVIRONMENT: "production" }), [testEnv.SITE_URL]);
});
Deno.test("uniform response envelopes and status codes", async () => {
  assertEquals(await ok({ ready: true }).json(), { ok: true, data: { ready: true } });
  const response = fail("SLOT_TAKEN", "Choose another slot.");
  assertEquals(response.status, 409);
  assertEquals(await response.json(), {
    ok: false,
    error: { code: "SLOT_TAKEN", message: "Choose another slot." },
  });
});
Deno.test("strict validation rejects malformed input and oversized bodies", async () => {
  assertThrows(
    () => parseInput(z.object({ id: z.string().uuid() }).strict(), { id: "bad" }),
    AppError,
  );
  assertThrows(
    () =>
      parseInput(contentInput, {
        type: "blog",
        context: {},
        tone: "calm",
        language: "en",
        extra: true,
      }),
    AppError,
  );
  const oversized = new Request("https://example.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes: "x".repeat(40000) }),
  });
  const result = await assertRejects(() => readJson(oversized));
  assert(result instanceof AppError);
});
Deno.test("normalizes Indian phones without accepting arbitrary input", () => {
  assertEquals(
    parseInput(bookingInput, {
      service_id: crypto.randomUUID(),
      start_at: "2027-01-04T10:00:00+05:30",
      name: "Asha",
      phone: "+91 98765 43210",
    }).phone,
    "9876543210",
  );
});
Deno.test("claim filter catches required claims, HTML entities and Hindi wording", () => {
  for (
    const text of [
      "This cure helps",
      "Guaranteed results",
      "A permanent solution",
      "Treats disease",
      "100% result",
      "इससे इलाज होता है",
    ]
  ) {
    assert(forbiddenClaims(text).length > 0, text);
  }
  assertEquals(forbiddenClaims("A secure, relaxing manicure supports relaxation."), []);
  assertEquals(forbiddenClaims("c&#117;re"), ["CURE"]);
});
Deno.test("HTML stripping and email escaping are safe", () => {
  assertEquals(stripHtml("<script>alert(1)</script><p>Hello &amp; welcome</p>"), "Hello & welcome");
  assertEquals(
    escapeHtml('<img src=x onerror="alert(1)">'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
  );
  assertEquals(sanitizeTree({ text: "<b>Quiet</b>", count: 3 }), { text: "Quiet", count: 3 });
});

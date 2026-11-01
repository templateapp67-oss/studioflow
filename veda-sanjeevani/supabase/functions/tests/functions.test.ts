import assert from "node:assert/strict";
import { z } from "zod";
import { assertEquals, assertRejects } from "./assertions.ts";
import {
  aboutOutput,
  bookingId,
  dependencies,
  env,
  fetchMock,
  geminiOutput,
  handlers,
  internalHeaders,
  mediaInput,
  noSleep,
  now,
  ownerId,
  request,
  reviewRows,
  summaryOutput,
  validBooking,
} from "./harness.ts";
import { callGemini, generateSafe } from "../_shared/gemini.ts";
import { consumeRateLimit } from "../_shared/rateLimit.ts";
import { adminClient, type Fetcher } from "../_shared/supabase.ts";
import { AppError } from "../_shared/response.ts";
import { verifyJwt } from "../_shared/auth.ts";
import { projectImagePath } from "../register-media/index.ts";
import { emailHtml, whatsappUrl } from "../_shared/email.ts";

const invalid: Record<string, unknown> = {
  "ai-generate-content": { type: "unknown" },
  "ai-generate-all": { business_name: "Spa", city: "Jaipur", keywords: ["only-one"] },
  "create-booking-public": { service_id: "not-a-uuid" },
  "send-booking-notification": { booking_id: "not-a-uuid" },
  "request-review": { booking_id: "not-a-uuid" },
  "summarize-reviews": { save: "yes" },
  "register-media": { bytes: 5242881 },
};
for (const [name, body] of Object.entries(invalid)) {
  Deno.test(`${name}: invalid input has the uniform 400 envelope`, async () => {
    const response = await handlers[name]!(dependencies())(request(body, internalHeaders));
    assertEquals(response.status, 400);
    const value = await response.json();
    assertEquals(value.ok, false);
    assertEquals(value.error.code, "INVALID_INPUT");
    assert.equal(typeof value.error.message, "string");
  });
}
Deno.test("every function handles OPTIONS; unknown origins are forbidden", async () => {
  for (const create of Object.values(handlers)) {
    const response = await create(dependencies())(request({}, { Origin: env.SITE_URL }, "OPTIONS"));
    assertEquals(response.status, 204);
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), env.SITE_URL);
    const rejected = await create(dependencies())(
      request({}, { Origin: "https://evil.example" }, "OPTIONS"),
    );
    assertEquals(rejected.status, 403);
    assertEquals(rejected.headers.has("Access-Control-Allow-Origin"), false);
  }
});
Deno.test("owner endpoints reject missing JWT and staff roles", async () => {
  for (
    const name of ["ai-generate-content", "ai-generate-all", "summarize-reviews", "register-media"]
  ) {
    const deps = dependencies();
    delete deps.actor;
    const missing = await handlers[name]!(deps)(request({}));
    assertEquals(missing.status, 401);
    assertEquals((await missing.json()).error.code, "UNAUTHENTICATED");
  }
  for (const name of ["ai-generate-content", "ai-generate-all", "summarize-reviews"]) {
    const response = await handlers[name]!({
      ...dependencies(),
      actor: { id: ownerId, role: "staff" },
    })(request({}));
    assertEquals(response.status, 403);
  }
});
Deno.test("JWT verification loads the profile role, not a supplied role claim", async () => {
  const fetcher: Fetcher = (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") {
      return Promise.resolve(
        new Response(JSON.stringify({ id: ownerId, aud: "authenticated", role: "authenticated" }), {
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    if (url.pathname === "/rest/v1/profiles") {
      return Promise.resolve(
        new Response(JSON.stringify({ id: ownerId, role: "staff" }), {
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    throw new Error("Unexpected Auth request");
  };
  const { actor } = await verifyJwt(
    request({}, { Authorization: "Bearer user-token" }),
    env,
    fetcher,
  );
  assertEquals(actor.role, "staff");
});
Deno.test("internal endpoints reject arbitrary JWTs and wrong cron secrets", async () => {
  for (const name of ["request-review", "send-booking-notification"]) {
    const response = await handlers[name]!(dependencies())(
      request({ booking_id: bookingId }, {
        "x-cron-secret": "wrong",
        Authorization: "Bearer user-token",
      }),
    );
    assertEquals(response.status, 401);
  }
  const service = await handlers["send-booking-notification"]!(dependencies())(
    request({ booking_id: bookingId }, {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    }),
  );
  assertEquals(service.status, 200);
  const cronOnly = await handlers["request-review"]!(dependencies())(
    request({ booking_id: bookingId }, {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    }),
  );
  assertEquals(cronOnly.status, 401);
});
Deno.test("health returns only DB liveness and time; DB failure is 500", async () => {
  const response = await handlers.health!(dependencies())(request(null, {}, "GET"));
  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    ok: true,
    data: { db: true, time: "2027-01-04T04:30:00.000Z" },
  });
  const broken = await handlers.health!({
    ...dependencies(),
    fetcher: () => Promise.resolve(new Response("{}", { status: 503 })),
  })(request(null, {}, "GET"));
  assertEquals(broken.status, 500);
  assertEquals((await broken.json()).ok, false);
});
Deno.test("table-backed limiter allows five and blocks the sixth with Retry-After", async () => {
  const limits = new Map<string, number>();
  const fetcher: Fetcher = (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { p_key: string; p_max: number };
    const count = (limits.get(body.p_key) ?? 0) + 1;
    limits.set(body.p_key, count);
    return Promise.resolve(new Response(JSON.stringify(count <= body.p_max)));
  };
  const admin = adminClient(env, fetcher);
  for (let i = 0; i < 5; i++) {
    await consumeRateLimit(admin, env, "booking-ip", "192.0.2.10", 5, 3600, now);
  }
  const error = await assertRejects(
    () => consumeRateLimit(admin, env, "booking-ip", "192.0.2.10", 5, 3600, now),
    AppError,
  ) as AppError;
  assertEquals(error.code, "RATE_LIMITED");
  assertEquals(error.status, 429);
  assertEquals(error.retryAfter, 1800);
  assert([...limits.keys()].every((key) => !key.includes("192.0.2.10")));
});
Deno.test("honeypot has a fake success and makes zero DB/provider calls", async () => {
  let calls = 0;
  const response = await handlers["create-booking-public"]!({
    ...dependencies(),
    fetcher: () => {
      calls++;
      throw new Error("must not call");
    },
  })(request({ ...validBooking, website: "https://spam.example" }));
  assertEquals(response.status, 200);
  const value = await response.json();
  assertEquals(value.ok, true);
  assert.equal(typeof value.data.booking_id, "string");
  assertEquals(calls, 0);
});
Deno.test("booking dispatches notification in background and survives its failure", async () => {
  const tasks: Promise<void>[] = [];
  const mock = fetchMock(() => new Response("{}", { status: 500 }));
  const response = await handlers["create-booking-public"]!({
    ...dependencies(),
    fetcher: mock.fetcher,
    background: (task) => tasks.push(task),
  })(request(validBooking, { "x-real-ip": "192.0.2.10" }));
  assertEquals(response.status, 200);
  const value = await response.json();
  assertEquals(value.data.booking_id, bookingId);
  assert(value.data.whatsapp_url.startsWith("https://wa.me/919876543210?text="));
  assertEquals(tasks.length, 1);
  await Promise.all(tasks);
  const call = mock.calls.find(({ url }) => url.pathname.endsWith("send-booking-notification"));
  assert(call);
  assertEquals(JSON.stringify(value).includes(env.SUPABASE_SERVICE_ROLE_KEY), false);
});
Deno.test("booking RPC errors map to the specified status codes", async () => {
  for (
    const [code, status] of [["SLOT_TAKEN", 409], ["INVALID_INPUT", 400], ["CLOSED", 400], [
      "PAST_TIME",
      400,
    ], ["SERVICE_NOT_FOUND", 404]] as const
  ) {
    const base = dependencies();
    const fetcher: Fetcher = (input, init) =>
      String(input).endsWith("/rpc/create_booking")
        ? Promise.resolve(new Response(JSON.stringify({ ok: false, error_code: code })))
        : base.fetcher!(input, init);
    const response = await handlers["create-booking-public"]!({ ...base, fetcher })(
      request(validBooking),
    );
    assertEquals(response.status, status);
    assertEquals((await response.json()).error.code, code);
  }
});
Deno.test("Gemini retries 429 then validates output; uses the configured model and header", async () => {
  let calls = 0;
  const delays: number[] = [];
  const fetcher: Fetcher = (input, init) => {
    calls++;
    assert(String(input).includes("/gemini-flash-latest:"));
    assert(new Headers(init?.headers).has("x-goog-api-key"));
    assert(!String(input).includes(env.GEMINI_API_KEY!));
    return Promise.resolve(
      calls === 1 ? new Response("busy", { status: 429 }) : geminiOutput(aboutOutput),
    );
  };
  const result = await callGemini({
    env,
    prompt: "About the spa",
    schema: z.object({ text: z.string() }),
    fetcher,
    sleep: (ms) => {
      delays.push(ms);
      return Promise.resolve();
    },
  });
  assertEquals(result, aboutOutput);
  assertEquals(calls, 2);
  assertEquals(delays, [500]);
});
Deno.test("Gemini stops after the initial attempt and two retries", async () => {
  let calls = 0;
  const fetcher: Fetcher = () => {
    calls++;
    return Promise.resolve(new Response("{}", { status: 503 }));
  };
  const error = await assertRejects(
    () => callGemini({ env, prompt: "test", schema: z.object({}), fetcher, sleep: noSleep }),
    AppError,
  ) as AppError;
  assertEquals(error.code, "AI_UNAVAILABLE");
  assertEquals(error.status, 502);
  assertEquals(calls, 3);
});
Deno.test("Gemini timeout covers a fetch that never resolves", async () => {
  const fetcher: Fetcher = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(new DOMException("Aborted", "AbortError")));
    });
  const error = await assertRejects(
    () =>
      callGemini({
        env,
        prompt: "test",
        schema: z.object({}),
        fetcher,
        sleep: noSleep,
        deadline: Date.now() + 15,
      }),
    AppError,
  ) as AppError;
  assertEquals(error.code, "AI_UNAVAILABLE");
});
Deno.test("unsafe AI copy regenerates once, then fails without returning the claim", async () => {
  let calls = 0;
  const fetcher: Fetcher = () => {
    calls++;
    return Promise.resolve(
      geminiOutput({
        text: "This treatment offers a guaranteed permanent solution for every guest.",
      }),
    );
  };
  await assertRejects(
    () =>
      generateSafe({
        env,
        prompt: "test",
        schema: z.object({ text: z.string() }),
        fetcher,
        sleep: noSleep,
      }),
    AppError,
  );
  assertEquals(calls, 2);
});
Deno.test("AI content returns text and saveable fields and writes an audit row", async () => {
  const mock = fetchMock(() => new Response("{}", { status: 500 }));
  const response = await handlers["ai-generate-content"]!({
    ...dependencies(),
    fetcher: mock.fetcher,
  })(request({ type: "about", context: { city: "Jaipur" }, tone: "calm", language: "en" }));
  assertEquals(response.status, 200);
  assertEquals((await response.json()).data.fields.body, aboutOutput.text);
  assert(mock.calls.some(({ url }) => url.pathname === "/rest/v1/ai_generations"));
});
Deno.test("bulk generation uses batches of four and retries only requested keys without content writes", async () => {
  let active = 0, maximum = 0;
  const base = dependencies();
  const fetcher: Fetcher = async (input, init) => {
    if (String(input).startsWith("https://generativelanguage.googleapis.com")) {
      maximum = Math.max(maximum, ++active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
    }
    return await base.fetcher!(input, init);
  };
  const input = {
    business_name: "Veda",
    city: "Jaipur",
    keywords: ["calm", "wellness", "spa"],
    tone: "calm",
    language: "en",
  };
  const response = await handlers["ai-generate-all"]!({ ...dependencies(), fetcher })(
    request(input),
  );
  const value = await response.json();
  assertEquals(value.data.items.length, 4);
  assert(value.data.items.every((item: { status: string }) => item.status === "ok"));
  assert(maximum <= 4);
  const mock = fetchMock(() => new Response("{}", { status: 500 }));
  const retry = await handlers["ai-generate-all"]!({ ...dependencies(), fetcher: mock.fetcher })(
    request({ ...input, only: ["about"] }),
  );
  assertEquals((await retry.json()).data.items.map((item: { key: string }) => item.key), ["about"]);
  assert(
    !mock.calls.some(({ url, init }) =>
      url.pathname.startsWith("/rest/v1/") && !url.pathname.endsWith("check_rate_limit") &&
      init.method !== "GET"
    ),
  );
  const unknown = await handlers["ai-generate-all"]!(dependencies())(
    request({ ...input, only: ["unknown"] }),
  );
  assertEquals(unknown.status, 400);
});
Deno.test("notification escapes customer HTML and records a successful claim", async () => {
  const mock = fetchMock(() => new Response("{}", { status: 500 }));
  const response = await handlers["send-booking-notification"]!({
    ...dependencies(),
    fetcher: mock.fetcher,
  })(request({ booking_id: bookingId }, internalHeaders));
  assertEquals(response.status, 200);
  assertEquals((await response.json()).data.sent, true);
  const emails = mock.calls.filter(({ url }) => url.origin === "https://api.resend.com");
  assertEquals(emails.length, 2);
  const htmlBodies = emails.map(({ body }) => (body as { html: string }).html);
  assert(htmlBodies.some((body) => body.includes("Asha &lt;guest&gt;")));
  assert(htmlBodies.every((body) => !body.includes("Asha <guest>")));
  // The separate text/plain MIME alternative intentionally contains plain text.
  assert(emails.every(({ body }) => (body as { text: string }).text.includes("Asha <guest>")));
  assert(mock.calls.some(({ url }) => url.pathname.endsWith("complete_backend_job")));
});
Deno.test("notification duplicate does not resend; email failure is still a successful booking-notification response", async () => {
  const duplicate = fetchMock(() => new Response("{}", { status: 500 }));
  const fetcher: Fetcher = (input, init) =>
    String(input).endsWith("claim_backend_job")
      ? Promise.resolve(new Response(JSON.stringify({ status: "already_processed" })))
      : duplicate.fetcher(input, init);
  const response = await handlers["send-booking-notification"]!({ ...dependencies(), fetcher })(
    request({ booking_id: bookingId }, internalHeaders),
  );
  assertEquals((await response.json()).data.duplicate, true);
  assert(!duplicate.calls.some(({ url }) => url.origin === "https://api.resend.com"));
  const failed = await handlers["send-booking-notification"]!({
    ...dependencies(),
    fetcher: (input, init) =>
      String(input).startsWith("https://api.resend.com")
        ? Promise.resolve(new Response("secret provider error", { status: 500 }))
        : duplicate.fetcher(input, init),
  })(request({ booking_id: bookingId }, internalHeaders));
  assertEquals(failed.status, 200);
  assertEquals((await failed.json()).data.sent, false);
});
Deno.test("review accepts single and cron batch inputs and never returns the token", async () => {
  for (const body of [{ booking_id: bookingId }, { booking_ids: [bookingId] }]) {
    const mock = fetchMock(() => new Response("{}", { status: 500 }));
    const response = await handlers["request-review"]!({
      ...dependencies(),
      fetcher: mock.fetcher,
    })(request(body, internalHeaders));
    assertEquals(response.status, 200);
    assertEquals((await response.text()).includes("a".repeat(64)), false);
    const email = mock.calls.find(({ url }) => url.origin === "https://api.resend.com");
    assert(JSON.stringify(email?.body).includes(`${env.SITE_URL}/review/${"a".repeat(64)}`));
  }
});
Deno.test("review without email returns sent=false and does not call Resend", async () => {
  const base = dependencies();
  const mock = fetchMock(() => new Response("{}", { status: 500 }));
  const fetcher: Fetcher = (input, init) =>
    String(input).includes("/rest/v1/bookings")
      ? Promise.resolve(
        new Response(
          JSON.stringify({
            ...reviewRows,
            id: bookingId,
            start_at: "2027-01-03T04:30:00Z",
            end_at: "2027-01-03T05:30:00Z",
            status: "completed",
            notes: "",
            notification_sent_at: null,
            review_requested_at: null,
            customers: { name: "Asha", phone: "9876543210", email: null },
            services: { name: "Abhyanga" },
            staff: { name: "Meera" },
          }),
        ),
      )
      : mock.fetcher(input, init);
  const response = await handlers["request-review"]!({ ...base, fetcher })(
    request({ booking_id: bookingId }, internalHeaders),
  );
  assertEquals(response.status, 200);
  assertEquals((await response.json()).data.sent, false);
  assert(!mock.calls.some(({ url }) => url.origin === "https://api.resend.com"));
});
Deno.test("review provider failure is non-2xx so pg_net can retry", async () => {
  const base = dependencies();
  const response = await handlers["request-review"]!({
    ...base,
    fetcher: (input, init) =>
      String(input).startsWith("https://api.resend.com")
        ? Promise.resolve(new Response("{}", { status: 503 }))
        : base.fetcher!(input, init),
  })(request({ booking_id: bookingId }, internalHeaders));
  assertEquals(response.status, 502);
});
Deno.test("summary requires three reviews and only saves when save=true", async () => {
  const base = dependencies();
  const few = await handlers["summarize-reviews"]!({
    ...base,
    fetcher: (input, init) =>
      String(input).includes("/rest/v1/reviews")
        ? Promise.resolve(new Response(JSON.stringify(reviewRows.slice(0, 2))))
        : base.fetcher!(input, init),
  })(request({ save: true }));
  assertEquals(few.status, 400);
  assertEquals((await few.json()).error.code, "NOT_ENOUGH_DATA");
  for (const save of [false, true]) {
    const mock = fetchMock(() => new Response("{}", { status: 500 }));
    const fetcher: Fetcher = (input, init) =>
      String(input).startsWith("https://generativelanguage.googleapis.com")
        ? Promise.resolve(geminiOutput(summaryOutput))
        : mock.fetcher(input, init);
    const response = await handlers["summarize-reviews"]!({ ...base, fetcher })(request({ save }));
    assertEquals(response.status, 200);
    assertEquals((await response.json()).data.saved, save);
    assertEquals(
      mock.calls.some(({ url, init }) =>
        url.pathname === "/rest/v1/reviews" && init.method === "PATCH"
      ),
      save,
    );
  }
});
Deno.test("media validates project paths, actual metadata, size and staff registration", async () => {
  assert(projectImagePath(mediaInput.original_url, env.SUPABASE_URL));
  for (
    const url of [
      "https://evil.example/storage/v1/object/public/site-images/a.webp",
      `${env.SUPABASE_URL}/storage/v1/object/public/documents/a.webp`,
      `${env.SUPABASE_URL}/storage/v1/object/public/site-images/%252e%252e/a.webp`,
    ]
  ) {
    assertEquals(projectImagePath(url, env.SUPABASE_URL), false);
  }
  const response = await handlers["register-media"]!({
    ...dependencies(),
    actor: { id: ownerId, role: "staff" },
  })(request(mediaInput));
  assertEquals(response.status, 201);
  assertEquals((await response.json()).data.media.bytes, 1000);
  const base = dependencies();
  const wrongSize = await handlers["register-media"]!(base)(request({ ...mediaInput, bytes: 999 }));
  assertEquals(wrongSize.status, 400);
  const wrongType = await handlers["register-media"]!({
    ...base,
    fetcher: (input, init) =>
      String(input).startsWith(`${env.SUPABASE_URL}/storage/`)
        ? Promise.resolve(
          new Response(null, {
            headers: { "Content-Length": "1000", "Content-Type": "image/svg+xml" },
          }),
        )
        : base.fetcher!(input, init),
  })(request(mediaInput));
  assertEquals(wrongType.status, 400);
});
Deno.test("email HTML and WhatsApp encoding are safe", () => {
  const html = emailHtml({
    to: "guest@example.com",
    subject: "Test",
    heading: "<script>x</script>",
    lines: ['<img src=x onerror="x">'],
  });
  assert(!html.includes("<script>"));
  assert(!html.includes("<img"));
  assertEquals(whatsappUrl("bad", "hello"), null);
  assert(whatsappUrl("9876543210", "A & B")?.includes("text=A%20%26%20B"));
});

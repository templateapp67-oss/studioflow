import { z } from "zod";
import type { AppEnv } from "./env.ts";
import { AppError } from "./response.ts";
import type { AdminClient } from "./supabase.ts";
import { parseOutput } from "./validate.ts";

/** Only use proxy headers rewritten by the deployment gateway, never arbitrary forwarded chains. */
export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = real || forwarded || "unknown";
  if (candidate.length > 64 || !z.string().ip().safeParse(candidate).success) return "unknown";
  return candidate.toLowerCase();
}

async function pseudonym(env: AppEnv, scope: string, identifier: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.SUPABASE_SERVICE_ROLE_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${scope}:${identifier}`),
  );
  const hash = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${scope}:${hash}`;
}

export async function consumeRateLimit(
  admin: AdminClient,
  env: AppEnv,
  scope: string,
  identifier: string,
  max: number,
  windowSeconds = 3600,
  now: () => number = Date.now,
): Promise<void> {
  const key = await pseudonym(env, scope, identifier);
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  const allowed = parseOutput(z.boolean(), data);
  if (error || allowed === undefined) {
    throw new AppError("INTERNAL", "Could not check the request limit. Please try again.");
  }
  if (!allowed) {
    const retryAfter = Math.max(1, windowSeconds - Math.floor(now() / 1000) % windowSeconds);
    throw new AppError("RATE_LIMITED", "Too many requests. Please try again later.", retryAfter);
  }
}

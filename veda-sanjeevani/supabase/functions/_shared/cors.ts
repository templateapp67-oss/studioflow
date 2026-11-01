import type { AppEnv } from "./env.ts";
import { AppError } from "./response.ts";

export function allowedOrigins(env: Pick<AppEnv, "SITE_URL" | "ENVIRONMENT">): string[] {
  return env.ENVIRONMENT === "production"
    ? [env.SITE_URL]
    : [...new Set([env.SITE_URL, "http://localhost:5173"])];
}

/** Missing Origin is allowed for curl/cron; CORS is not a substitute for auth. */
export function corsHeaders(
  request: Request,
  env: Pick<AppEnv, "SITE_URL" | "ENVIRONMENT">,
): Headers {
  const headers = new Headers({ Vary: "Origin" });
  const origin = request.headers.get("Origin");
  if (origin === null) return headers;
  if (!allowedOrigins(env).includes(origin)) {
    throw new AppError("FORBIDDEN", "This origin is not allowed.");
  }
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, apikey, x-client-info, x-cron-secret",
  );
  headers.set("Access-Control-Max-Age", "600");
  return headers;
}

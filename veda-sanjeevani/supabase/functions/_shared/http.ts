import { corsHeaders } from "./cors.ts";
import { type AppEnv, ConfigurationError, getEnv } from "./env.ts";
import { AppError, errorResponse, logWarning } from "./response.ts";
import { type AdminClient, adminClient, type Fetcher } from "./supabase.ts";
import type { Actor } from "./auth.ts";

export type Background = (task: Promise<void>) => void;
export type Dependencies = {
  env?: AppEnv;
  fetcher?: Fetcher;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  actor?: Actor;
  background?: Background;
};
export type Context = {
  env: AppEnv;
  admin: AdminClient;
  fetcher: Fetcher;
  now: () => number;
  sleep: (milliseconds: number) => Promise<void>;
  actor?: Actor;
  background: Background;
};
export type Handler = (request: Request) => Promise<Response>;
export const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

declare global {
  // Supabase provides EdgeRuntime; ordinary Deno does not.
  var EdgeRuntime: { waitUntil(task: Promise<unknown>): void } | undefined;
}
export const defaultBackground: Background = (task) => {
  const safe = task.catch(() => logWarning("background_task", "INTERNAL"));
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(safe);
  // On native Deno the already-started promise keeps running. On Supabase,
  // waitUntil explicitly extends its lifetime beyond the booking response.
};

export function endpoint(
  name: string,
  handle: (request: Request, context: Context) => Promise<Response>,
  dependencies: Dependencies = {},
  methods: readonly string[] = ["POST"],
): Handler {
  return async (request) => {
    let headers = new Headers({ Vary: "Origin" });
    try {
      const env = dependencies.env ?? getEnv();
      headers = corsHeaders(request, env);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
      if (!methods.includes(request.method)) {
        headers.set("Allow", [...methods, "OPTIONS"].join(", "));
        throw new AppError("METHOD_NOT_ALLOWED", "This HTTP method is not supported.");
      }
      const fetcher = dependencies.fetcher ?? fetch;
      const context: Context = {
        env,
        fetcher,
        admin: adminClient(env, fetcher),
        now: dependencies.now ?? Date.now,
        sleep: dependencies.sleep ?? sleep,
        background: dependencies.background ?? defaultBackground,
        ...(dependencies.actor ? { actor: dependencies.actor } : {}),
      };
      return await handle(request, context);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        // Names only: never print environment values.
        console.error(JSON.stringify({ event: "configuration", fields: error.variables }));
        return errorResponse(
          new AppError("INTERNAL", "Server configuration is incomplete. Please contact the owner."),
          headers,
        );
      }
      if (!(error instanceof AppError)) logWarning(name, "INTERNAL");
      return errorResponse(error, headers);
    }
  };
}

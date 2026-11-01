import { z } from "zod";
import type { AppEnv } from "./env.ts";
import { AppError } from "./response.ts";
import { type AdminClient, type Fetcher, userClient } from "./supabase.ts";
import { parseOutput, uuid } from "./validate.ts";

export type Actor = { id: string; role: "owner" | "staff" };
const profileSchema = z.object({ id: uuid, role: z.enum(["owner", "staff"]) }).strict();

export function bearerToken(request: Request): string {
  const value = request.headers.get("Authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/i.exec(value);
  if (!match?.[1] || match[1].length > 8192) {
    throw new AppError("UNAUTHENTICATED", "Sign in to continue.");
  }
  return match[1];
}

/** Auth verifies signature/expiry; the database, not a JWT claim, supplies the role. */
export async function verifyJwt(
  request: Request,
  env: AppEnv,
  fetcher?: Fetcher,
): Promise<{ actor: Actor; client: AdminClient }> {
  const token = bearerToken(request);
  const client = userClient(request, env, fetcher);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new AppError("UNAUTHENTICATED", "Your session has expired. Please sign in again.");
  }
  const { data: profile, error: profileError } = await client.from("profiles")
    .select("id,role").eq("id", data.user.id).maybeSingle();
  if (profileError) {
    throw new AppError("INTERNAL", "Could not check your permissions. Please try again.");
  }
  const parsed = parseOutput(profileSchema, profile);
  if (!parsed || parsed.id !== data.user.id) {
    throw new AppError("FORBIDDEN", "A workspace profile is required.");
  }
  return { actor: parsed, client };
}
export async function requireOwner(
  request: Request,
  env: AppEnv,
  fetcher?: Fetcher,
): Promise<Actor> {
  const { actor } = await verifyJwt(request, env, fetcher);
  if (actor.role !== "owner") {
    throw new AppError("FORBIDDEN", "Only the owner can use this action.");
  }
  return actor;
}
export async function requireStaffOrOwner(
  request: Request,
  env: AppEnv,
  fetcher?: Fetcher,
): Promise<Actor> {
  return (await verifyJwt(request, env, fetcher)).actor;
}

async function equalSecret(actual: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(actual)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(expected)),
  ]);
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i]! ^ right[i]!;
  return difference === 0;
}
export async function requireCron(request: Request, env: AppEnv): Promise<void> {
  if (!env.CRON_SECRET) throw new AppError("INTERNAL", "Internal scheduling is not configured.");
  const supplied = request.headers.get("x-cron-secret");
  if (!supplied || supplied.length > 512 || !await equalSecret(supplied, env.CRON_SECRET)) {
    throw new AppError("UNAUTHENTICATED", "Internal authentication is required.");
  }
}
export async function requireInternal(request: Request, env: AppEnv): Promise<void> {
  const cron = request.headers.get("x-cron-secret");
  if (cron !== null) return await requireCron(request, env);
  const authorization = request.headers.get("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7);
    if (await equalSecret(token, env.SUPABASE_SERVICE_ROLE_KEY)) return;
  }
  throw new AppError("UNAUTHENTICATED", "Internal authentication is required.");
}

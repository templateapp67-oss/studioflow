import { z } from "zod";

const names = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "OWNER_EMAIL",
  "SITE_URL",
  "CRON_SECRET",
  "ENVIRONMENT",
] as const;
type Name = typeof names[number];
export interface EnvSource {
  get(key: string): string | undefined;
}

const absoluteUrl = z.string().trim().url().max(2048).refine((value) => {
  const url = new URL(value);
  return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
}, "Must be an HTTP(S) URL without credentials");
const origin = absoluteUrl.refine((value) => {
  const url = new URL(value);
  return (url.pathname === "/" || url.pathname === "") && !url.search && !url.hash;
}, "SITE_URL must be an origin, without a path, query or fragment");
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => value === "" ? undefined : value, schema.optional());
const email = z.string().trim().email().max(254).refine((value) => !/[\r\n]/.test(value));

export const envSchema = z.object({
  SUPABASE_URL: absoluteUrl,
  SUPABASE_ANON_KEY: z.string().trim().min(20).max(4096),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(20).max(4096),
  SITE_URL: origin,
  ENVIRONMENT: z.enum(["development", "test", "production"]).default("development"),
  GEMINI_API_KEY: optional(z.string().trim().min(10).max(4096)),
  GEMINI_MODEL: z.string().trim().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/)
    .default("gemini-flash-latest"),
  RESEND_API_KEY: optional(z.string().trim().min(10).max(4096)),
  EMAIL_FROM: optional(email.or(
    z.string().trim().max(320).regex(
      /^[^<>\r\n]+ <[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/,
      "Use an email address or Name <email@example.com>",
    ),
  )),
  OWNER_EMAIL: optional(email),
  CRON_SECRET: optional(z.string().min(32).max(512).refine((value) => !/[\r\n\s]/.test(value))),
}).superRefine((env, ctx) => {
  if (env.ENVIRONMENT === "production") {
    for (const key of ["SUPABASE_URL", "SITE_URL"] as const) {
      if (!env[key].startsWith("https://")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "HTTPS is required in production",
        });
      }
    }
  }
  if (env.SUPABASE_SERVICE_ROLE_KEY === env.SUPABASE_ANON_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SUPABASE_SERVICE_ROLE_KEY"],
      message: "Must differ from the anon key",
    });
  }
});
export type AppEnv = Readonly<z.infer<typeof envSchema>>;

export class ConfigurationError extends Error {
  constructor(public readonly variables: readonly string[]) {
    super(`Server configuration requires attention: ${variables.join(", ")}`);
    this.name = "ConfigurationError";
  }
}

/** Read only named variables; error messages never contain configuration values. */
export function parseEnv(source: EnvSource): AppEnv {
  const raw: Record<string, string | undefined> = {};
  for (const name of names) raw[name] = source.get(name);
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new ConfigurationError(fields.length ? fields : ["environment"]);
  }
  return Object.freeze({
    ...result.data,
    SUPABASE_URL: result.data.SUPABASE_URL.replace(/\/+$/, ""),
    SITE_URL: new URL(result.data.SITE_URL).origin,
  });
}

let cached: AppEnv | undefined;
export function getEnv(): AppEnv {
  cached ??= parseEnv(Deno.env);
  return cached;
}

/** Test-only escape hatch; never call with application-supplied input. */
export function resetEnvCache(): void {
  cached = undefined;
}
export const environmentNames: readonly Name[] = names;

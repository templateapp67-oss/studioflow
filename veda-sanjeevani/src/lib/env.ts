import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().refine((value) => /^https?:\/\//.test(value), 'Use an HTTP(S) project URL.'),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, 'Add your public Supabase anon key.'),
  VITE_SITE_URL: z.string().url(),
}).superRefine((value, ctx) => {
  if (/secret|service_role/i.test(value.VITE_SUPABASE_ANON_KEY)) ctx.addIssue({ code: 'custom', path: ['VITE_SUPABASE_ANON_KEY'], message: 'Only a public anon key belongs in the browser.' });
  try { const payload: unknown = JSON.parse(atob(value.VITE_SUPABASE_ANON_KEY.split('.')[1] ?? ''));
    if (typeof payload === 'object' && payload !== null && 'role' in payload && payload.role !== 'anon') ctx.addIssue({ code: 'custom', path: ['VITE_SUPABASE_ANON_KEY'], message: 'The browser key must have the anon role.' });
  } catch { /* Opaque publishable keys are also supported. */ }
  if (import.meta.env.PROD && !value.VITE_SITE_URL.startsWith('https://')) ctx.addIssue({ code: 'custom', path: ['VITE_SITE_URL'], message: 'Production requires HTTPS.' });
});
export type Env = z.infer<typeof envSchema>;
export type EnvResult = { ok: true; value: Env } | { ok: false; issues: string[] };
export function validateEnv(input: Record<string, unknown>): EnvResult {
  const result = envSchema.safeParse(input);
  return result.success ? { ok: true, value: result.data } : { ok: false, issues: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) };
}
export const envResult = validateEnv({ VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY, VITE_SITE_URL: import.meta.env.VITE_SITE_URL });

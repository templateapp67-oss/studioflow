import { z } from "zod";
import { requireOwner } from "../_shared/auth.ts";
import {
  aiSchemas,
  buildPrompt,
  type ContentType,
  type Generated,
  shapeContent,
} from "../_shared/ai.ts";
import { generateSafe } from "../_shared/gemini.ts";
import { type Dependencies, endpoint } from "../_shared/http.ts";
import { consumeRateLimit } from "../_shared/rateLimit.ts";
import { AppError, ok } from "../_shared/response.ts";
import type { Service } from "../_shared/supabase.ts";
import {
  generateAllInput,
  type JsonValue,
  parseInput,
  parseOutput,
  readJson,
  uuid,
} from "../_shared/validate.ts";

const serviceSchema = z.object({
  id: uuid,
  name: z.string(),
  slug: z.string(),
  category: z.string(),
  short_desc: z.string(),
  duration_min: z.number().int().positive(),
  price: z.number().nonnegative(),
  benefits: z.array(z.string()),
  dosha_tags: z.array(z.string()),
  sort_order: z.number(),
});
type Item = { key: string; status: "ok"; value: Generated } | {
  key: string;
  status: "failed";
  error: { code: "AI_UNAVAILABLE"; message: string };
};
const failure = (key: string): Item => ({
  key,
  status: "failed",
  error: {
    code: "AI_UNAVAILABLE",
    message: "This item was not completed. Retry using only this key.",
  },
});

export function createHandler(dependencies: Dependencies = {}) {
  return endpoint("ai_generate_all", async (request, ctx) => {
    const actor = ctx.actor ?? await requireOwner(request, ctx.env, ctx.fetcher);
    if (actor.role !== "owner") {
      throw new AppError("FORBIDDEN", "Only the owner can generate content.");
    }
    const input = parseInput(generateAllInput, await readJson(request));
    // Reserve the whole-request budget before reading the catalogue, not after it.
    const deadline = ctx.now() + 100000;
    const services: Service[] = [];
    for (let page = 0; page < 10; page++) {
      if (ctx.now() >= deadline) {
        throw new AppError("AI_UNAVAILABLE", "The catalogue took too long to read. Please retry.");
      }
      const { data, error } = await ctx.admin.from("services").select(
        "id,name,slug,category,short_desc,duration_min,price,benefits,dosha_tags,sort_order",
      ).eq("active", true).order("sort_order").order("id").range(page * 200, page * 200 + 199);
      const rows = parseOutput(z.array(serviceSchema).max(200), data);
      if (error || !rows) throw new AppError("INTERNAL", "Could not read the service catalogue.");
      services.push(...rows);
      if (rows.length < 200) break;
      if (page === 9) {
        throw new AppError(
          "INVALID_INPUT",
          "Too many active services; use smaller catalogue batches.",
        );
      }
    }
    const facts = {
      business_name: input.business_name,
      city: input.city,
      keywords: input.keywords,
    };
    const jobs: { key: string; type: ContentType; context: JsonValue; schema: z.ZodType }[] = [
      ...services.map((service) => ({
        key: `service:${service.id}`,
        type: "service_description" as const,
        context: { ...facts, service },
        schema: aiSchemas.service_description,
      })),
      { key: "about", type: "about", context: facts, schema: aiSchemas.about },
      {
        key: "faq",
        type: "faq",
        context: {
          ...facts,
          count: 6,
          services: services.map((s) => ({ name: s.name, duration_min: s.duration_min })),
        },
        schema: aiSchemas.faq.refine((v) => v.faqs.length === 6),
      },
      { key: "seo", type: "seo", context: facts, schema: aiSchemas.seo },
    ];
    const known = new Set(jobs.map((job) => job.key));
    if (input.only?.some((key) => !known.has(key))) {
      throw new AppError("INVALID_INPUT", "The only list contains unknown or inactive item keys.");
    }
    const selected = input.only ? jobs.filter((job) => input.only?.includes(job.key)) : jobs;
    await consumeRateLimit(ctx.admin, ctx.env, "ai-all", actor.id, 5, 3600, ctx.now);
    const items: Item[] = [];
    // Bounded concurrency + a whole-request deadline. Unfinished keys are retryable;
    // no catalogue/About/FAQ/SEO rows are changed by this endpoint.
    for (let offset = 0; offset < selected.length; offset += 4) {
      const batch = selected.slice(offset, offset + 4);
      items.push(
        ...await Promise.all(batch.map(async (job): Promise<Item> => {
          if (ctx.now() >= deadline) return failure(job.key);
          try {
            const value = await generateSafe({
              env: ctx.env,
              prompt: buildPrompt(job.type, job.context, input.tone, input.language),
              schema: job.schema,
              fetcher: ctx.fetcher,
              sleep: ctx.sleep,
              now: ctx.now,
              deadline,
              maxOutputTokens: 8192,
            });
            return { key: job.key, status: "ok", value: shapeContent(job.type, value) };
          } catch {
            return failure(job.key);
          }
        })),
      );
    }
    return ok({
      items,
      retry_keys: items.filter((item) => item.status === "failed").map((item) => item.key),
    });
  }, dependencies);
}
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);

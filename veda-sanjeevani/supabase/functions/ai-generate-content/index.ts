import { z } from "zod";
import { requireOwner } from "../_shared/auth.ts";
import { aiSchemas, buildPrompt, logGeneration, shapeContent } from "../_shared/ai.ts";
import { generateSafe } from "../_shared/gemini.ts";
import { type Dependencies, endpoint } from "../_shared/http.ts";
import { consumeRateLimit } from "../_shared/rateLimit.ts";
import { AppError, ok } from "../_shared/response.ts";
import { contentInput, parseInput, readJson } from "../_shared/validate.ts";

export function createHandler(dependencies: Dependencies = {}) {
  return endpoint("ai_generate_content", async (request, ctx) => {
    const actor = ctx.actor ?? await requireOwner(request, ctx.env, ctx.fetcher);
    if (actor.role !== "owner") {
      throw new AppError("FORBIDDEN", "Only the owner can generate content.");
    }
    const input = parseInput(contentInput, await readJson(request));
    await consumeRateLimit(ctx.admin, ctx.env, "ai-content", actor.id, 30, 3600, ctx.now);
    const prompt = buildPrompt(input.type, input.context, input.tone, input.language);
    const schema: z.ZodType<unknown> = aiSchemas[input.type];
    try {
      const value = await generateSafe({
        env: ctx.env,
        prompt,
        schema,
        fetcher: ctx.fetcher,
        sleep: ctx.sleep,
        now: ctx.now,
        deadline: ctx.now() + 110000,
      });
      const result = shapeContent(input.type, value);
      await logGeneration(
        ctx.admin,
        actor.id,
        input.type,
        prompt,
        JSON.stringify(result),
        "success",
      );
      return ok(result);
    } catch (error) {
      // An audit failure must not trigger a second, paid generation.
      try {
        await logGeneration(ctx.admin, actor.id, input.type, prompt, "", "failed");
      } catch {
        /* Preserve the original friendly error; never log the prompt or provider response. */
      }
      throw error;
    }
  }, dependencies);
}
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);

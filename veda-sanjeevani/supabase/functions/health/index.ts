import { type Dependencies, endpoint } from "../_shared/http.ts";
import { AppError, ok } from "../_shared/response.ts";

export function createHandler(dependencies: Dependencies = {}) {
  return endpoint(
    "health",
    async (_request, ctx) => {
      const { error } = await ctx.admin.from("site_settings").select("id").limit(1);
      if (error) throw new AppError("INTERNAL", "The database is temporarily unavailable.");
      return ok({ db: true, time: new Date(ctx.now()).toISOString() });
    },
    dependencies,
    ["GET"],
  );
}
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);

import { z } from "zod";
import { requireStaffOrOwner } from "../_shared/auth.ts";
import { type Context, type Dependencies, endpoint } from "../_shared/http.ts";
import { AppError, ok } from "../_shared/response.ts";
import { mediaInput, parseInput, parseOutput, readJson, uuid } from "../_shared/validate.ts";

const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const metadataSchema = z.object({ bytes: z.number().int().min(1).max(5242880), type: z.string() });

export function projectImagePath(value: string, supabaseUrl: string): boolean {
  const url = new URL(value), project = new URL(supabaseUrl);
  if (url.origin !== project.origin || url.username || url.password || url.search || url.hash) {
    return false;
  }
  const prefix = "/storage/v1/object/public/site-images/";
  if (!url.pathname.startsWith(prefix)) return false;
  let path: string;
  try {
    path = decodeURIComponent(url.pathname.slice(prefix.length));
  } catch {
    return false;
  }
  return path.length > 0 && path.length <= 512 && !path.includes("\\") && !path.includes("%") &&
    !path.split("/").some((part) => !part || part === "." || part === "..") &&
    ![...path].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
}

async function inspectImage(ctx: Context, value: string, original: boolean): Promise<number> {
  if (!projectImagePath(value, ctx.env.SUPABASE_URL)) {
    throw new AppError(
      "INVALID_INPUT",
      "Every image must be a public site-images URL in this Supabase project.",
    );
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    // Metadata only: no image decoding, conversion, sharp, or server-side resizing.
    const response = await ctx.fetcher(value, { method: "HEAD", signal: controller.signal });
    await response.body?.cancel();
    if (response.status === 404) {
      throw new AppError("NOT_FOUND", "Upload the image before registering it.");
    }
    if (!response.ok) throw new AppError("UPSTREAM_ERROR", "Could not verify the uploaded image.");
    const metadata = parseOutput(metadataSchema, {
      bytes: Number(response.headers.get("Content-Length")),
      type: response.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase(),
    });
    if (
      !metadata || !allowedTypes.includes(metadata.type) ||
      (!original && metadata.type !== "image/webp")
    ) {
      throw new AppError(
        "INVALID_INPUT",
        "Use JPEG/PNG/WebP/AVIF originals and WebP variants, each at most 5 MB.",
      );
    }
    return metadata.bytes;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("UPSTREAM_ERROR", "Could not verify the uploaded image.");
  } finally {
    clearTimeout(timer);
  }
}

export function createHandler(dependencies: Dependencies = {}) {
  return endpoint("register_media", async (request, ctx) => {
    const actor = ctx.actor ?? await requireStaffOrOwner(request, ctx.env, ctx.fetcher);
    const input = parseInput(mediaInput, await readJson(request, 16384));
    const urls = [input.original_url, input.url_400, input.url_800, input.url_1600];
    const sizes = await Promise.all(urls.map((url, index) => inspectImage(ctx, url, index === 0)));
    if (sizes[0] !== input.bytes) {
      throw new AppError(
        "INVALID_INPUT",
        "The supplied byte count does not match the original image.",
      );
    }
    const { data, error } = await ctx.admin.from("media").insert({
      ...input,
      uploaded_by: actor.id,
    })
      .select("id,original_url,url_400,url_800,url_1600,alt_text,bytes,uploaded_by,created_at")
      .single();
    const media = parseOutput(
      z.object({
        id: uuid,
        original_url: z.string().url(),
        url_400: z.string().url(),
        url_800: z.string().url(),
        url_1600: z.string().url(),
        alt_text: z.string(),
        bytes: z.number().int(),
        uploaded_by: uuid,
        created_at: z.string(),
      }).strict(),
      data,
    );
    if (error || !media) throw new AppError("INTERNAL", "Could not register the image.");
    return ok({ media }, 201);
  }, dependencies);
}
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);

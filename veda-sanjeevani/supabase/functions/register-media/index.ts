import { z } from "zod";
import { requireStaffOrOwner } from "../_shared/auth.ts";
import { type Context, type Dependencies, endpoint } from "../_shared/http.ts";
import { AppError, ok } from "../_shared/response.ts";
import { mediaInput, parseInput, parseOutput, readJson, uuid } from "../_shared/validate.ts";
import { MAX_IMAGE_BYTES, sniffImageSignature } from "../_shared/mediaSignature.ts";
import { safeOutboundFetch } from "../_shared/safeOutbound.ts";

const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];

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
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    // The actual bytes are fetched and sniffed — a HEAD check would let any
    // upload through with a forged Content-Type or Content-Length. The URL is
    // pinned to this project's public site-images prefix by projectImagePath,
    // and redirects are never followed by the guard.
    const response = await safeOutboundFetch(value, {
      method: "GET",
      signal: controller.signal,
    }, ctx.fetcher);
    if (response.status === 404) {
      throw new AppError("NOT_FOUND", "Upload the image before registering it.");
    }
    if (response.status >= 300 && response.status < 400) {
      throw new AppError("UPSTREAM_ERROR", "Image redirects are not accepted.");
    }
    if (!response.ok) throw new AppError("UPSTREAM_ERROR", "Could not verify the uploaded image.");
    const declaredLength = Number(response.headers.get("Content-Length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
      throw new AppError("INVALID_INPUT", "Each image must be at most 5 MB.");
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) {
      throw new AppError("INVALID_INPUT", "The uploaded image is empty.");
    }
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new AppError("INVALID_INPUT", "Each image must be at most 5 MB.");
    }
    const sniffed = sniffImageSignature(bytes);
    if (!sniffed || !allowedTypes.includes(sniffed) || (!original && sniffed !== "image/webp")) {
      throw new AppError(
        "INVALID_INPUT",
        "Use JPEG/PNG/WebP/AVIF originals and WebP variants, each at most 5 MB.",
      );
    }
    const declaredType = response.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
    if (declaredType && declaredType !== sniffed) {
      throw new AppError(
        "INVALID_INPUT",
        "The stored object's content does not match its declared type.",
      );
    }
    return bytes.byteLength;
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

import { z } from "zod";
import { AppError } from "./response.ts";

export const uuid = z.string().uuid();
export const isoDate = z.string().datetime({ offset: true }).refine((value) =>
  Number.isFinite(Date.parse(value))
);
export const tone = z.enum(["calm", "premium", "traditional"]);
export const language = z.enum(["en", "hi", "hinglish"]);
export const hasControlCharacters = (value: string): boolean =>
  [...value].some((char) => {
    const code = char.charCodeAt(0);
    return code < 32 || code === 127;
  });
export const shortText = (max: number) =>
  z.string().trim().min(1).max(max)
    .refine((value) => !hasControlCharacters(value), "Control characters are not allowed");
export const name = shortText(80).refine((value) => value.length >= 2, "Name is too short")
  .transform((value) => value.normalize("NFC").replace(/\s+/g, " "));
export const email = z.string().trim().toLowerCase().email().max(254);
export const phone = z.string().trim().max(32).transform((value) =>
  value.replace(/\s+/g, "").replace(/^(\+91|0091|0)/, "")
).pipe(z.string().regex(/^[6-9][0-9]{9}$/, "Enter a valid Indian mobile number"));

export type JsonValue = string | number | boolean | null | JsonValue[] | {
  [key: string]: JsonValue;
};
export const jsonValue: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string().max(8000),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValue).max(50),
    z.record(z.string().max(100), jsonValue),
  ])
);
export const context = z.record(z.string().min(1).max(100), jsonValue).superRefine((value, ctx) => {
  if (Object.keys(value).length > 50 || JSON.stringify(value).length > 12000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Context is too large (maximum 12,000 JSON characters)",
    });
  }
});

export const contentTypes = [
  "service_description",
  "about",
  "blog",
  "faq",
  "seo",
  "review_reply",
  "alt_text",
] as const;
export const contentInput = z.object({
  type: z.enum(contentTypes),
  context,
  tone,
  language,
}).strict();
export const generateAllInput = z.object({
  business_name: shortText(200),
  city: shortText(100),
  keywords: z.array(shortText(100)).length(3).refine(
    (items) => new Set(items.map((v) => v.toLowerCase())).size === 3,
    "Keywords must be distinct",
  ),
  tone,
  language,
  only: z.array(shortText(100)).min(1).max(100).refine((items) =>
    new Set(items).size === items.length
  ).optional(),
}).strict();
export const bookingInput = z.object({
  service_id: uuid,
  staff_id: uuid.nullable().optional(),
  start_at: isoDate,
  name,
  phone,
  email: email.nullable().optional(),
  notes: z.string().trim().max(500).optional(),
  website: z.string().max(2000).optional(),
}).strict().transform((value) => ({
  ...value,
  notes: value.notes ?? "",
  website: value.website ?? "",
}));
export const reviewRequestInput = z.union([
  z.object({ booking_id: uuid }).strict(),
  z.object({
    booking_ids: z.array(uuid).min(1).max(100).refine(
      (ids) => new Set(ids).size === ids.length,
      "Duplicate booking IDs",
    ),
  }).strict(),
]);
export const notificationInput = z.object({ booking_id: uuid }).strict();
export const summarizeInput = z.object({
  save: z.boolean().optional().default(false),
  language: language.optional().default("en"),
}).strict();
export const mediaInput = z.object({
  original_url: z.string().url().max(2048),
  url_400: z.string().url().max(2048),
  url_800: z.string().url().max(2048),
  url_1600: z.string().url().max(2048),
  alt_text: z.string().trim().max(250).refine((value) => !hasControlCharacters(value)),
  bytes: z.number().int().min(1).max(5242880),
}).strict();

export function parseInput<Output, Input>(
  schema: z.ZodType<Output, z.ZodTypeDef, Input>,
  value: unknown,
): Output {
  const result = schema.safeParse(value);
  if (!result.success) {
    // Do not echo submitted values, credentials, tokens or contact details.
    const paths = [...new Set(result.error.issues.map((issue) => issue.path.join(".") || "body"))];
    throw new AppError("INVALID_INPUT", `Invalid request. Check: ${paths.slice(0, 8).join(", ")}.`);
  }
  return result.data;
}
export function parseOutput<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}

export async function readJson(request: Request, maxBytes = 32768): Promise<unknown> {
  const type = request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
  if (type !== "application/json") {
    throw new AppError("INVALID_INPUT", "Use Content-Type: application/json.");
  }
  const declared = request.headers.get("Content-Length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > maxBytes) {
    throw new AppError("INVALID_INPUT", "The request body is too large.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("INVALID_INPUT", "A JSON request body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new AppError("INVALID_INPUT", "The request body is too large.");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new AppError("INVALID_INPUT", "The request body must contain valid JSON.");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError("INVALID_INPUT", "The request body must be a JSON object.");
  }
  return value;
}

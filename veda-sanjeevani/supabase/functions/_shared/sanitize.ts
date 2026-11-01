const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char,
  );
}
function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity.startsWith("#")) {
      const hex = entity.toLowerCase().startsWith("#x");
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return entities[entity.toLowerCase()] ?? whole;
  });
}

/** Produce plain text, not trusted HTML. Remove active elements and their contents. */
export function stripHtml(value: string): string {
  let text = value;
  for (let i = 0; i < 3; i++) {
    text = text.replace(/<(script|style|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<[^>]*>/g, " ");
    text = decodeEntities(text);
  }
  text = [...text].filter((char) => {
    const code = char.charCodeAt(0);
    return (code >= 32 && code !== 127) || code === 9 || code === 10 || code === 13;
  }).join("");
  return text.replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n/g, "\n\n").trim();
}

const forbidden: readonly (readonly [string, RegExp])[] = [
  ["CURE", /\bcur(?:e[sd]?|ing|ative)\b/i],
  ["GUARANTEE", /\bguarantee(?:s|d)?\b/i],
  ["PERMANENT_SOLUTION", /\bpermanent\s+(?:solution|relief|fix)\b/i],
  [
    "HUNDRED_PERCENT",
    /(?:^|\D)100\s*(?:%|percent\b|pratishat\b)|\bresults?\b[^.!?\n]{0,40}\b100\s*(?:%|percent)/i,
  ],
  [
    "DISEASE_CLAIM",
    /\btreat(?:s|ing|ment)?\b[^.!?\n]{0,60}\bdiseases?\b|\bdiseases?\b[^.!?\n]{0,40}\btreat(?:s|ing|ment)?\b/i,
  ],
  ["HINDI_CLAIM", /इलाज|गारंटी|रोग(?:ों)?\s+को\s+ठीक|बीमारी\s+ठीक|पक्का\s+(?:आराम|इलाज)/u],
  [
    "HINGLISH_CLAIM",
    /\b(?:ilaaj|guaranti)\b|\b(?:bimari|disease)\b[^.!?\n]{0,40}\b(?:theek|thik)\b/i,
  ],
];
export function forbiddenClaims(value: string): string[] {
  const normalized = stripHtml(value).normalize("NFKC")
    .replace(/[\u200b-\u200f\u2060\ufeff]/g, "").replace(/\s+/g, " ");
  return forbidden.filter(([, pattern]) => pattern.test(normalized)).map(([code]) => code);
}

/** Sanitize only string values; validated object keys and non-text values stay intact. */
export function sanitizeTree<T>(value: T): T {
  if (typeof value === "string") return stripHtml(value) as T;
  if (Array.isArray(value)) return value.map((item: unknown) => sanitizeTree(item)) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeTree(item)]),
    ) as T;
  }
  return value;
}
export function treeClaims(value: unknown): string[] {
  const strings: string[] = [];
  const visit = (item: unknown): void => {
    if (typeof item === "string") strings.push(item);
    else if (Array.isArray(item)) item.forEach(visit);
    else if (item !== null && typeof item === "object") Object.values(item).forEach(visit);
  };
  visit(value);
  return [...new Set(strings.flatMap(forbiddenClaims))];
}

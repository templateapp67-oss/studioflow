/**
 * Inline formatting for Clinic Journal article bodies.
 *
 * The article body is owner-editable content that is stored in the database and
 * rendered on the public clinic website, so it is untrusted input. The previous
 * implementation turned `**bold**` markers into HTML with `String.replace` and
 * handed the result to `dangerouslySetInnerHTML`, which meant any HTML in the
 * body — `<img onerror=...>`, `<script>`, an event handler on a link — was
 * executed in every visitor's browser.
 *
 * This module returns plain segments instead: React escapes text nodes, so an
 * article can contain `<script>` and it is displayed as the characters
 * `<script>`. No markup from the content ever reaches the DOM as markup.
 */

export interface JournalInlineSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/** Matches `**bold**` first, then `*italic*`. Unmatched markers stay literal. */
const INLINE_PATTERN = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;

/**
 * Splits one line of article text into plain, bold and italic segments.
 *
 * Only text is extracted; no HTML is produced or interpreted, so this is safe
 * for content that came from the database, a paste or an AI draft.
 */
export function parseJournalInline(value: unknown): JournalInlineSegment[] {
  const text = typeof value === 'string' ? value : '';
  if (!text) return [];

  const segments: JournalInlineSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    if (match[1] !== undefined) {
      segments.push({ text: match[1], bold: true });
    } else if (match[2] !== undefined) {
      segments.push({ text: match[2], italic: true });
    }
    cursor = start + match[0].length;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

/**
 * Escapes the five HTML-significant characters.
 *
 * The article renderer no longer builds HTML, so this is not on that path. It is
 * exported, and covered by `scripts/verify-journal-richtext.mjs`, because any
 * future place that must produce an HTML string from article text (an email
 * template, a share card, a prerendered document) has to use it — and because a
 * explicit, tested escape function is cheaper to review than an inline
 * `replace(/</g, '&lt;')` scattered across components.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character] as string,
  );
}

/**
 * Plain text of an article line, with the formatting markers removed.
 * Useful for `aria-label`, an excerpt or a share message.
 */
export function journalInlinePlainText(value: unknown): string {
  return parseJournalInline(value)
    .map((segment) => segment.text)
    .join('');
}

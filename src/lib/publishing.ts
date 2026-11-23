/**
 * Convert Supabase/PostgREST errors (plain objects, not native Error instances)
 * into actionable text for the salon owner.
 */
export function formatPublishingError(error: unknown): string {
  if (typeof error === 'string' && error.trim()) return error.trim();
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>;
    const parts: string[] = [];
    const message = typeof value.message === 'string' ? value.message.trim() : '';
    const fallback = typeof value.error_description === 'string'
      ? value.error_description.trim()
      : typeof value.error === 'string' ? value.error.trim() : '';
    if (message || fallback) parts.push(message || fallback);
    if (typeof value.details === 'string' && value.details.trim() && value.details.trim() !== message) {
      parts.push(`Details: ${value.details.trim()}`);
    }
    if (typeof value.hint === 'string' && value.hint.trim()) {
      parts.push(`Hint: ${value.hint.trim()}`);
    }
    if (typeof value.code === 'string' && value.code.trim()) {
      parts.push(`Code: ${value.code.trim()}`);
    }
    if (parts.length) return parts.join(' · ');
  }
  return 'Publishing failed. Please try again.';
}

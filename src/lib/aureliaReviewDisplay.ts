export interface AureliaReviewLike {
  id?: string | null;
  name?: string | null;
  comment?: string | null;
  date?: string | null;
  isDemo?: boolean;
}

/** Empty, demo and seeded "AURELIA GUEST 1" cards are not customer testimonials. */
export function isAureliaPlaceholderReview(review: AureliaReviewLike): boolean {
  const name = typeof review.name === 'string' ? review.name.trim() : '';
  const comment = typeof review.comment === 'string' ? review.comment.trim() : '';
  const date = typeof review.date === 'string' ? review.date.trim().toLowerCase() : '';
  const placeholderName =
    /^(?:nexora\s+)?aurelia\s+guest(?:\s*#?\s*\d+)?$/i.test(name) ||
    /^guest\s*#?\s*\d+$/i.test(name);

  return !comment || review.isDemo === true || date === 'demo' || placeholderName;
}

/** Keep only complete, non-demo Aurelia reviews and remove duplicate IDs/comments. */
export function filterAureliaReviews<T extends AureliaReviewLike>(items: readonly T[]): T[] {
  const seenIds = new Set<string>();
  const seenComments = new Set<string>();

  return items.filter((item) => {
    if (isAureliaPlaceholderReview(item)) return false;

    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const comment = typeof item.comment === 'string' ? item.comment.trim().toLocaleLowerCase() : '';
    if ((id && seenIds.has(id)) || (comment && seenComments.has(comment))) return false;

    if (id) seenIds.add(id);
    if (comment) seenComments.add(comment);
    return true;
  });
}

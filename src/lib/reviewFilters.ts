export interface SalonReviewItem {
  id?: string;
  name?: string;
  rating?: number;
  comment?: string;
  serviceName?: string;
  location?: string;
  date?: string;
  created_at?: string;
  updated_at?: string;
  imageUrl?: string;
  photos?: string[];
  verified?: boolean;
  isDemo?: boolean;
  isCustomer?: boolean;
  isOwnerReview?: boolean;
}

export type RatingFilterValue = 'all' | '5' | '4plus' | '4' | '3plus' | '3' | '2' | '1' | number;
export type RecencyFilterValue = 'all' | '30d' | '90d' | '180d' | '365d' | 'month' | '3months' | 'year' | 'newest' | 'oldest';
export type RecencySortValue = 'newest' | 'oldest' | 'highest' | 'lowest';

export interface FilterSalonReviewsOptions {
  rating?: RatingFilterValue;
  recency?: RecencyFilterValue;
  sort?: RecencySortValue;
  photosOnly?: boolean;
  now?: number;
}

const MS_PER_DAY = 86400000;

export function parseReviewDate(dateStr?: string | null, referenceNow = Date.now()): number {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const trimmed = dateStr.trim();
  if (!trimmed) return 0;

  // Check for common relative time strings
  const lower = trimmed.toLowerCase();
  if (lower === 'today' || lower === 'just now') {
    return referenceNow;
  }
  if (lower === 'yesterday') {
    return referenceNow - MS_PER_DAY;
  }
  const daysMatch = lower.match(/^(\d+)\s*days?\s*ago$/);
  if (daysMatch) {
    return referenceNow - parseInt(daysMatch[1], 10) * MS_PER_DAY;
  }
  const weeksMatch = lower.match(/^(\d+)\s*weeks?\s*ago$/);
  if (weeksMatch) {
    return referenceNow - parseInt(weeksMatch[1], 10) * 7 * MS_PER_DAY;
  }
  const monthsMatch = lower.match(/^(\d+)\s*months?\s*ago$/);
  if (monthsMatch) {
    return referenceNow - parseInt(monthsMatch[1], 10) * 30 * MS_PER_DAY;
  }
  const yearsMatch = lower.match(/^(\d+)\s*years?\s*ago$/);
  if (yearsMatch) {
    return referenceNow - parseInt(yearsMatch[1], 10) * 365 * MS_PER_DAY;
  }

  // Parse ISO / standard date strings
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  return 0;
}

export function formatReviewDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // If already relative (e.g. "2 days ago", "Yesterday"), return as-is
  if (/ago|yesterday|today|just now/i.test(trimmed)) {
    return trimmed;
  }

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) {
    return trimmed;
  }

  const date = new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export const RATING_FILTER_OPTIONS: Array<{ value: RatingFilterValue; label: string }> = [
  { value: 'all', label: 'All Ratings' },
  { value: '5', label: '5 Stars ★' },
  { value: '4plus', label: '4★ & up' },
  { value: '4', label: '4 Stars ★' },
  { value: '3plus', label: '3★ & up' },
  { value: '3', label: '3 Stars ★' },
  { value: '2', label: '2 Stars ★' },
  { value: '1', label: '1 Star ★' }
];

export const RECENCY_FILTER_OPTIONS: Array<{ value: RecencyFilterValue; label: string }> = [
  { value: 'all', label: 'All Time' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 3 Months' },
  { value: '180d', label: 'Last 6 Months' },
  { value: '365d', label: 'Past Year' }
];

export const RECENCY_SORT_OPTIONS: Array<{ value: RecencySortValue; label: string }> = [
  { value: 'newest', label: 'Most Recent First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'highest', label: 'Highest Rating First' },
  { value: 'lowest', label: 'Lowest Rating First' }
];

export function filterSalonReviews<T extends SalonReviewItem>(
  reviews: T[],
  options: FilterSalonReviewsOptions = {}
): T[] {
  if (!Array.isArray(reviews) || !reviews.length) return [];

  const {
    rating = 'all',
    recency = 'all',
    sort = 'newest',
    photosOnly = false,
    now = Date.now()
  } = options;

  let result = [...reviews];

  // 1. Photos only filter
  if (photosOnly) {
    result = result.filter(r => {
      const hasDirect = Boolean(r.imageUrl && r.imageUrl.trim().length > 0);
      const hasArray = Array.isArray(r.photos) && r.photos.some(p => Boolean(p && p.trim().length > 0));
      return hasDirect || hasArray;
    });
  }

  // 2. Rating filter
  if (rating !== 'all' && rating !== undefined) {
    if (rating === '4plus') {
      result = result.filter(r => Number(r.rating || 0) >= 4);
    } else if (rating === '3plus') {
      result = result.filter(r => Number(r.rating || 0) >= 3);
    } else {
      const targetRating = typeof rating === 'number' ? rating : parseInt(rating, 10);
      if (!Number.isNaN(targetRating)) {
        result = result.filter(r => Math.round(Number(r.rating || 0)) === targetRating);
      }
    }
  }

  // 3. Recency time window filter
  if (recency !== 'all' && recency !== 'newest' && recency !== 'oldest' && recency !== undefined) {
    let maxDays = 0;
    if (recency === '30d' || recency === 'month') maxDays = 30;
    else if (recency === '90d' || recency === '3months') maxDays = 90;
    else if (recency === '180d') maxDays = 180;
    else if (recency === '365d' || recency === 'year') maxDays = 365;

    if (maxDays > 0) {
      const cutoffTime = now - maxDays * MS_PER_DAY;
      result = result.filter(r => {
        const reviewDateStr = r.date || r.created_at || r.updated_at;
        const reviewTime = parseReviewDate(reviewDateStr, now);
        // If no date is available, include it if recency is all, otherwise exclude
        return reviewTime >= cutoffTime;
      });
    }
  }

  // 4. Sort (Recency / Rating)
  const sortDirection = recency === 'oldest' ? 'oldest' : recency === 'newest' ? 'newest' : sort;

  result.sort((a, b) => {
    const timeA = parseReviewDate(a.date || a.created_at || a.updated_at, now);
    const timeB = parseReviewDate(b.date || b.created_at || b.updated_at, now);
    const ratingA = Number(a.rating || 0);
    const ratingB = Number(b.rating || 0);

    if (sortDirection === 'oldest') {
      return timeA - timeB;
    }
    if (sortDirection === 'highest') {
      if (ratingB !== ratingA) return ratingB - ratingA;
      return timeB - timeA;
    }
    if (sortDirection === 'lowest') {
      if (ratingA !== ratingB) return ratingA - ratingB;
      return timeB - timeA;
    }
    // Default: 'newest' (Most recent first)
    return timeB - timeA;
  });

  return result;
}

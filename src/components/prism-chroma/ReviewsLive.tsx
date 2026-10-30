import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, MessageSquareQuote, ShieldCheck, Star, X } from 'lucide-react';
import type { SalonService } from '../../types';
import { submitPrismReview, type PrismLiveReview } from '../../lib/prismSite';
import { PrismEmptyState, PrismInlineNotice, PrismSectionError, PrismSectionSkeleton } from './LiveStates';

function Stars({ rating, size = 14, label }: { rating: number; size?: number; label?: string }) {
  return (
    <span className="pc-stars" role="img" aria-label={label || `Rated ${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={size}
          aria-hidden="true"
          fill={value <= Math.round(rating) ? 'var(--coral)' : 'none'}
          color="var(--coral)"
        />
      ))}
    </span>
  );
}

const dateLabel = (value: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function PrismReviewsLive({
  reviews,
  ownReview,
  summary,
  loading,
  error,
  retrying = false,
  onRetry,
  onReload,
  signedIn,
  slug,
  services,
  brandName,
  customerName,
  onSignIn,
}: {
  reviews: PrismLiveReview[];
  ownReview: PrismLiveReview | null;
  summary: { count: number; average: number };
  loading?: boolean;
  error?: string;
  retrying?: boolean;
  onRetry?: () => void;
  onReload?: () => void;
  signedIn?: boolean;
  slug: string;
  services: SalonService[];
  brandName: string;
  customerName?: string;
  onSignIn: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState('');
  const [name, setName] = useState(customerName || '');
  const [rating, setRating] = useState(5);
  const [service, setService] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const nameField = useRef<HTMLInputElement>(null);
  const commentField = useRef<HTMLTextAreaElement>(null);

  const published = useMemo(() => reviews.filter((review) => review.status === 'approved'), [reviews]);
  const pending = ownReview && ownReview.status !== 'approved' ? ownReview : null;
  const average = summary.count > 0 ? summary.average : 0;
  const serviceNames = useMemo(
    () => Array.from(new Set(services.map((item) => `${item.name}`.trim()).filter(Boolean))),
    [services],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const timer = setTimeout(() => (nameField.current || commentField.current)?.focus(), 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, [open, busy]);

  const start = () => {
    setFormError('');
    setDone('');
    if (!slug) {
      setFormError('Reviews are available once this website is published.');
      return;
    }
    if (!signedIn) {
      onSignIn();
      return;
    }
    setName(ownReview?.name || customerName || '');
    setRating(ownReview?.rating || 5);
    setComment(ownReview?.comment || '');
    setService(ownReview?.serviceName || '');
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError('');
    try {
      await submitPrismReview({ slug, name, rating, comment, serviceName: service });
      setOpen(false);
      setDone('Thank you! Your review is saved and will appear here as soon as the salon approves it.');
      onReload?.();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Your review could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8">
      <div className="pc-review-summary pc-glass">
        <div>
          <p className="pc-display text-4xl font-extrabold">{summary.count > 0 ? average.toFixed(1) : '—'}</p>
          <Stars rating={average || 0} label={summary.count > 0 ? `Average ${average.toFixed(1)} out of 5 from ${summary.count} approved reviews` : 'No approved reviews yet'} />
          <p className="pc-muted text-xs font-semibold">
            {summary.count > 0
              ? `${summary.count} approved client review${summary.count === 1 ? '' : 's'}`
              : 'No approved reviews yet'}
          </p>
        </div>
        <div className="pc-review-summary-copy">
          <p className="text-sm font-bold">Only real, approved reviews are shown.</p>
          <p className="pc-muted text-xs">
            {signedIn
              ? 'Write about your visit. The salon owner approves it before it is published.'
              : 'Sign in with the account you booked with to share your visit.'}
          </p>
        </div>
        <button type="button" className="pc-btn pc-btn-gradient px-5 py-2.5 text-sm" onClick={start}>
          <MessageSquareQuote size={15} aria-hidden="true" />
          {pending ? 'Edit my review' : 'Write a review'}
        </button>
      </div>

      {done && <PrismInlineNotice tone="success">{done}</PrismInlineNotice>}
      {loading && <div className="mt-5"><PrismSectionSkeleton label="Client reviews" lines={3} /></div>}
      {!loading && error && <div className="mt-5"><PrismSectionError message={error} onRetry={onRetry} retrying={retrying} /></div>}

      {pending && (
        <article className="pc-review-card mt-5" data-status="pending">
          <div className="pc-review-head">
            <span className="pc-chip">Waiting for approval</span>
            <Stars rating={pending.rating} />
          </div>
          <blockquote className="pc-review-quote">“{pending.comment}”</blockquote>
          <p className="pc-muted text-xs font-semibold">
            {pending.name}
            {pending.serviceName ? ` · ${pending.serviceName}` : ''} · {dateLabel(pending.date)}
          </p>
          <p className="pc-muted text-xs">
            {pending.status === 'rejected'
              ? 'The salon could not publish this review. You can edit it and submit again.'
              : 'Your review is with the salon owner. It appears here once approved.'}
          </p>
        </article>
      )}

      {!loading && !error && published.length === 0 && !pending && (
        <div className="mt-5">
          <PrismEmptyState
            title="Be the first to review this colour studio"
            action={
              <button type="button" className="pc-btn pc-btn-ghost px-4 py-2 text-sm" onClick={start}>
                Write a review
              </button>
            }
          >
            Reviews appear after the salon approves them — no copied or invented testimonials.
          </PrismEmptyState>
        </div>
      )}

      {published.length > 0 && (
        <div className="pc-review-grid mt-6">
          {published.map((review) => (
            <article key={review.id} className="pc-review-card">
              <div className="pc-review-head">
                <div>
                  <p className="text-sm font-bold">{review.name}</p>
                  <p className="pc-muted text-[11px] font-semibold">
                    {[review.serviceName, dateLabel(review.date)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Stars rating={review.rating} />
              </div>
              <blockquote className="pc-review-quote">“{review.comment}”</blockquote>
              <div className="pc-review-tags">
                {review.verified && (
                  <span className="pc-chip">
                    <ShieldCheck size={12} aria-hidden="true" /> Verified visit
                  </span>
                )}
                {review.isOwnerReview && <span className="pc-chip">Owner update</span>}
                {review.isMine && !review.isOwnerReview && <span className="pc-chip">Your review</span>}
              </div>
              {review.salonReply && (
                <div className="pc-review-reply">
                  <p className="text-xs font-bold">{brandName} replied</p>
                  <p className="pc-muted text-xs">{review.salonReply}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {open && (
        <div className="pc-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label="Write a customer review" className="pc-modal">
            <header className="pc-modal-head">
              <h3>{pending ? 'Edit your review' : 'Write a review'}</h3>
              <button type="button" aria-label="Close review form" onClick={() => setOpen(false)} disabled={busy}>
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <form onSubmit={submit} className="pc-form">
              <label>
                <span>Your name</span>
                <input
                  ref={nameField}
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                />
              </label>
              <fieldset>
                <legend>Your rating</legend>
                <div className="pc-rating-input">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${value} star${value > 1 ? 's' : ''}`}
                      aria-pressed={rating === value}
                      onClick={() => setRating(value)}
                    >
                      <Star fill={value <= rating ? 'currentColor' : 'none'} size={20} aria-hidden="true" />
                    </button>
                  ))}
                  <span>{rating} / 5</span>
                </div>
              </fieldset>
              <label>
                <span>Service (optional)</span>
                <select value={service} onChange={(event) => setService(event.target.value)}>
                  <option value="">General studio experience</option>
                  {serviceNames.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Your review</span>
                <textarea
                  ref={commentField}
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
                <small>{comment.length} / 2000</small>
              </label>
              {formError && <p role="alert" className="pc-form-error">{formError}</p>}
              <p className="pc-muted text-xs">
                <CheckCircle2 size={12} aria-hidden="true" /> Your review is saved as pending. The salon owner approves it before it is published.
              </p>
              <button type="submit" className="pc-btn pc-btn-gradient px-5 py-3 text-sm" disabled={busy}>
                {busy ? 'Saving…' : pending ? 'Update review' : 'Submit review'}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

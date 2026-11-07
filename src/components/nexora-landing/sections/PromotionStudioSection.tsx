import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { Eyebrow } from '../ui';
import { LandingIcon } from '../icons';
import { useLandingModel } from '../LandingContentProvider';

export function PromotionStudioSection({ id = 'salon-marketing' }: { id?: string }) {
  const { copy, creatives, promoWorkflow, promoChannels, cta } = useLandingModel();
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const scrollToSlide = useCallback((target: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(target, track.children.length - 1));
    const slide = track.children[clamped] as HTMLElement | undefined;
    if (!slide) return;
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [reducedMotion]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const slide = track.firstElementChild as HTMLElement | null;
      if (!slide) return;
      const step = slide.getBoundingClientRect().width + 16;
      setIndex(Math.round(track.scrollLeft / step));
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="sl-section sl-promo" id={id} aria-labelledby="sl-promo-title">
      <div className="sl-container">
        <div className="sl-promo__head">
          <div>
            <Eyebrow tone="dark">SALON PROMOTION STUDIO</Eyebrow>
            <h2 id="sl-promo-title">{copy.promotionTitle}</h2>
            <p>{copy.promotionDescription}</p>
          </div>
          <a className="sl-btn sl-btn--accent sl-promo__cta" href={cta.promoStudio}>
            Explore Salon Promotion Tools <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>

        <div className="sl-gallery">
          <div
            className="sl-gallery__track"
            ref={trackRef}
            role="group"
            aria-label="Salon promotional creative examples. Scroll sideways for more creatives."
            tabIndex={0}
          >
            {creatives.map((creative) => (
              <article className="sl-creative" key={creative.id}>
                <div className={`sl-creative__poster sl-creative__poster--${creative.palette}`}>
                  {creative.imageUrl ? (
                    <img
                      className="sl-creative__image"
                      src={creative.imageUrl}
                      alt={creative.imageAlt ?? creative.headline}
                      width={640}
                      height={640}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <>
                      <span className="sl-creative__format">{creative.format}</span>
                      <span className="sl-creative__shape" aria-hidden="true" />
                      <p className="sl-creative__offer">{creative.offer}</p>
                      <h3 className="sl-creative__headline">{creative.headline}</h3>
                      <p className="sl-creative__detail">{creative.detail}</p>
                      <div className="sl-creative__foot">
                        <span>Your Salon Name</span>
                        <span>BOOK NOW</span>
                      </div>
                    </>
                  )}
                </div>
                <p className="sl-creative__caption">
                  <b>{creative.category}</b>
                  <span>{creative.headline}</span>
                </p>
              </article>
            ))}
          </div>

          <div className="sl-gallery__controls">
            <button
              type="button"
              className="sl-gallery__arrow"
              onClick={() => scrollToSlide(index - 1)}
              disabled={index === 0}
              aria-label="Previous promotional creative"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <ul className="sl-gallery__dots">
              {creatives.map((creative, dotIndex) => (
                <li key={creative.id}>
                  <button
                    type="button"
                    className={dotIndex === index ? 'is-active' : undefined}
                    aria-label={`Show creative ${dotIndex + 1}: ${creative.category}`}
                    aria-current={dotIndex === index ? 'true' : undefined}
                    onClick={() => scrollToSlide(dotIndex)}
                  />
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="sl-gallery__arrow"
              onClick={() => scrollToSlide(index + 1)}
              disabled={index >= creatives.length - 1}
              aria-label="Next promotional creative"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <p className="sl-promo__disclaimer">
          <Clock3 size={14} aria-hidden="true" />
          {creatives.some((creative) => creative.imageUrl)
            ? 'Published Nexora promotional creatives. They demonstrate the format and layout of a campaign creative — they are not customer campaigns and contain no live offers.'
            : 'Original sample creatives built for this page. They demonstrate the format and layout of a Nexora campaign creative — they are not customer campaigns and contain no live offers.'}
        </p>

        <div className="sl-promo__grid">
          <div className="sl-promo__workflow">
            <h3>How the promotion flow works</h3>
            <ol>
              {promoWorkflow.map((step, stepIndex) => (
                <li key={step.id}>
                  <span className="sl-promo__step-index" aria-hidden="true">
                    {stepIndex + 1}
                  </span>
                  <span className="sl-promo__step-icon">
                    <LandingIcon name={step.icon} size={18} />
                  </span>
                  <div>
                    <b>{step.title}</b>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="sl-promo__channels">
            <h3>Where you can share</h3>
            <ul>
              {promoChannels.map((channel) => (
                <li key={channel.id} className={channel.status === 'available' ? 'is-available' : 'is-planned'}>
                  <span className="sl-promo__channel-mark" aria-hidden="true">
                    {channel.status === 'available' ? <Check size={13} strokeWidth={3} /> : <Clock3 size={13} />}
                  </span>
                  <div>
                    <b>
                      {channel.label}
                      <span className="sl-promo__channel-status">
                        {channel.status === 'available' ? 'Available now' : 'Not connected yet'}
                      </span>
                    </b>
                    <p>{channel.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

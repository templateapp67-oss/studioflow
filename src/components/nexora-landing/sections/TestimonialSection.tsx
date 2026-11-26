import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { SectionHeading } from '../ui';
import { useLandingModel } from '../LandingContentProvider';

const ROLE_FOCUS = [
  {
    id: 'owner',
    title: 'Salon owners',
    body: 'A single view of bookings, billing and business activity, without assembling it from separate tools.',
  },
  {
    id: 'manager',
    title: 'Salon managers',
    body: 'Clear schedules, staff access and customer records for the day-to-day running of the floor.',
  },
  {
    id: 'team',
    title: 'Beauty professionals',
    body: 'Your services, timings and bookings organised so customers get a consistent experience.',
  },
];

export function TestimonialSection({ id = 'testimonials' }: { id?: string }) {
  const { copy, testimonials } = useLandingModel();
  const hasTestimonials = testimonials.length > 0;
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasTestimonials) return;
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const slide = track.firstElementChild as HTMLElement | null;
      if (!slide) return;
      setIndex(Math.round(track.scrollLeft / (slide.getBoundingClientRect().width + 16)));
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, [hasTestimonials]);

  const move = (target: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(target, testimonials.length - 1));
    const slide = track.children[clamped] as HTMLElement | undefined;
    if (!slide) return;
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
    setIndex(clamped);
  };

  return (
    <section className="sl-section" id={id} aria-labelledby="sl-testimonials-title">
      <div className="sl-container">
        <SectionHeading
          eyebrow="CUSTOMER PROOF"
          id="sl-testimonials-title"
          title={copy.testimonialsTitle}
          description={
            hasTestimonials
              ? 'Approved customer feedback, published with permission.'
              : 'Nexora publishes customer feedback only after it has been approved. Until then, here is what the platform is built around.'
          }
        />

        {hasTestimonials ? (
          <div className="sl-testimonials">
            <div className="sl-testimonials__track" ref={trackRef} role="group" aria-label="Customer testimonials" tabIndex={0}>
              {testimonials.map((testimonial) => (
                <figure className="sl-testimonial" key={testimonial.id}>
                  <Quote size={22} aria-hidden="true" />
                  <blockquote>{testimonial.quote}</blockquote>
                  <figcaption>
                    <b>{testimonial.name}</b>
                    <span>
                      {testimonial.role} · {testimonial.business}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="sl-testimonials__controls">
              <button type="button" className="sl-gallery__arrow" onClick={() => move(index - 1)} disabled={index === 0} aria-label="Previous testimonial">
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="sl-gallery__arrow"
                onClick={() => move(index + 1)}
                disabled={index >= testimonials.length - 1}
                aria-label="Next testimonial"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div className="sl-role-focus">
            {ROLE_FOCUS.map((role) => (
              <article key={role.id}>
                <h3>{role.title}</h3>
                <p>{role.body}</p>
              </article>
            ))}
            <p className="sl-role-focus__note">
              Approved customer quotes are published here as they are collected. No ratings, review counts or customer
              names are displayed on this page in the meantime.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

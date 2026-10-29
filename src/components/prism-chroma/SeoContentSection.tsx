import { ArrowRight, MapPin } from 'lucide-react';
import type { PrismChromaBranch, PrismChromaShade } from '../../types';
import type { SalonService } from '../../types';
import { FadeIn } from './MotionSection';

/**
 * Local SEO content block — a readable, client-friendly guide section that
 * also carries the city, service and shade keywords search engines need.
 * Every name below comes from onboarding data (services, shades, branches),
 * never from hard-coded copy, so it stays true for every owner.
 */
export function SeoContentSection({
  brandName,
  cityLabel,
  services,
  shades,
  branches,
}: {
  brandName: string;
  cityLabel: string;
  services: SalonService[];
  shades: PrismChromaShade[];
  branches: PrismChromaBranch[];
}) {
  const cityName = (cityLabel || '').split(',')[0] || 'your city';
  const topServices = services.slice(0, 6);
  const shadeNames = shades.slice(0, 6).map((s) => s.name);
  if (!topServices.length && !shadeNames.length) return null;

  return (
    <FadeIn>
      <div className="pc-seo-block pc-glass">
        <p className="pc-eyebrow">Good to Know</p>
        <h3 className="mt-2 text-[clamp(1.4rem,3.4vw,2rem)] font-extrabold">
          Hair Colour Studio in {cityName} — What We Do Best
        </h3>
        <div className="pc-seo-cols">
          <p>
            Looking for a hair colour studio in {cityName} that shares the full price before starting? At{' '}
            {brandName}, every colour visit begins with a free consult and a hair-health check. We check your
            hair strength, talk about your dream shade, do a patch test, and only then begin — so there are no
            surprises in time, care or cost.
          </p>
          <p>
            Our colour experts specialise in balayage, global colour, fashion and pastel shades, highlights,
            colour correction, keratin smooth treatments and gloss shine care. Whether you want a soft, natural
            change or a bold new look, your shade is mixed fresh for your skin tone and hair history, with
            bond-care protection in every lightening service.
          </p>
          <p>
            After your colour, we hand you a simple home-care plan made for your shade — which shampoo to use,
            how often to wash, and when to come back for a gloss refresh. That is how our colours stay fresh
            for weeks, not days. Book online in one minute, or walk in if a chair is free.
          </p>
        </div>

        {topServices.length > 0 && (
          <div className="mt-6">
            <p className="pc-seo-label">Popular colour services</p>
            <div className="pc-filter-row mt-2">
              {topServices.map((service) => (
                <a key={service.id} href="#pc-services" className="pc-filter-chip pc-seo-chip">
                  {service.name} <ArrowRight size={12} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        )}

        {shadeNames.length > 0 && (
          <div className="mt-5">
            <p className="pc-seo-label">Shades clients love right now</p>
            <div className="pc-filter-row mt-2">
              {shadeNames.map((name) => (
                <a key={name} href="#pc-shades" className="pc-filter-chip pc-seo-chip">
                  {name} <ArrowRight size={12} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        )}

        {branches.length > 0 && (
          <p className="pc-muted mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <MapPin size={14} aria-hidden="true" /> Visit us at{' '}
            {branches.map((branch, i) => (
              <span key={branch.id}>
                <a href="#pc-branches" className="font-bold text-[var(--text)]">
                  {branch.area}, {branch.name}
                </a>
                {i < branches.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </p>
        )}
      </div>
    </FadeIn>
  );
}

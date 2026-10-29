import { motion } from 'framer-motion';
import { ArrowRight, Check, Clock3, Crown } from 'lucide-react';
import type { BodhiTreePalaceItem, SalonService } from '../../types';
import { BODHI_TREE_IMAGES, bodhiFormatInr } from '../../lib/bodhiTree';
import { canObserveViewport, stagger, staggerItem, revealViewport } from '../../lib/motion';
import { SafeImage } from './SafeImage';

/**
 * The Jaipur Palace Collection — Template 09's highlight.
 * Jharokha (arch) framed cards, one for each famous Jaipur place.
 * Every card links to its bookable service (or the general booking flow).
 * `full` shows the includes list; the home preview keeps cards shorter.
 */
export function PalaceCollectionGrid({
  items,
  services,
  onBook,
  full = false,
}: {
  items: BodhiTreePalaceItem[];
  services: SalonService[];
  onBook: (service?: SalonService) => void;
  full?: boolean;
}) {
  const serviceById = new Map(services.map((service) => [service.id, service]));

  return (
    <motion.div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      variants={stagger}
      initial={canObserveViewport ? 'hidden' : 'visible'}
      whileInView={canObserveViewport ? 'visible' : undefined}
      viewport={revealViewport}
    >
      {items.map((item) => {
        const linked = item.linkedServiceId ? serviceById.get(item.linkedServiceId) : undefined;
        const price = linked?.price != null ? linked.price : item.price;
        return (
          <motion.article
            key={item.id}
            variants={staggerItem}
            className="bt-arch-frame bt-lift group flex flex-col bg-[#FFFDF8]"
          >
            <div className="bt-arch relative overflow-hidden">
              <SafeImage
                src={item.imageUrl}
                fallback={BODHI_TREE_IMAGES.palace.hawaMahal}
                alt={item.imageAlt || `${item.place}, Jaipur — ${item.title}`}
                width={750}
                height={1000}
                className="bt-arch aspect-[3/4] w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(20,42,32,0.72)] to-transparent px-4 pb-3 pt-10 text-[11px] font-bold uppercase tracking-[0.18em] text-[#FAF6EE]">
                {item.place}
              </span>
              {item.badgeLabel && (
                <span className="bt-badge absolute left-1/2 top-4 -translate-x-1/2 shadow">
                  <Crown size={12} aria-hidden="true" /> {item.badgeLabel}
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col px-4 pb-5 pt-4 text-center">
              <h3 className="bt-serif text-[1.45rem] font-semibold leading-snug text-[color:var(--bt-forest)]">
                {item.title}
              </h3>
              <p className="pt-1.5 text-sm leading-relaxed text-[color:var(--bt-muted)]">{item.blurb}</p>

              {full && item.includes.length > 0 && (
                <ul className="mx-auto w-fit space-y-1.5 pt-3 text-left text-[13px] text-[color:var(--bt-forest)]">
                  {item.includes.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Check size={14} className="mt-0.5 shrink-0 text-[color:var(--bt-sage)]" aria-hidden="true" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-auto pt-4">
                <div className="flex items-center justify-center gap-3">
                  <span className="bt-price text-2xl">{bodhiFormatInr(price)}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-[color:var(--bt-muted)]">
                    <Clock3 size={13} aria-hidden="true" /> {item.duration}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onBook(linked)}
                  className="bt-btn bt-btn-primary mt-3 w-full px-4 py-2.5 text-sm"
                  aria-label={`Book ${item.title} for ${bodhiFormatInr(price)}`}
                >
                  Book Now <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </motion.article>
        );
      })}
    </motion.div>
  );
}

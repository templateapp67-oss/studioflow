import { useMemo, useState, type ComponentProps } from 'react';
import { ChevronDown, Printer } from 'lucide-react';
import type { PrismChromaPackage } from '../../types';
import type { SalonService } from '../../types';
import { prismFormatInr } from '../../lib/prismChroma';
import { FadeIn } from './MotionSection';

/**
 * Full Price List — a clean, grouped rate card (services by category, plus
 * packages) with a print button. Owners love sharing this on WhatsApp and
 * printing it for the studio counter; clients love the clear ₹ pricing.
 */
export function PriceList({
  services,
  packages,
  brandName,
  carePlan,
}: {
  services: SalonService[];
  packages: PrismChromaPackage[];
  brandName: string;
  carePlan: boolean;
}) {
  const [openCategory, setOpenCategory] = useState<string>('');
  const groups = useMemo(() => {
    const map = new Map<string, SalonService[]>();
    for (const service of services) {
      const key = (service.category || 'Colour Services').trim() || 'Colour Services';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(service);
    }
    return Array.from(map.entries());
  }, [services]);

  if (!groups.length && !packages.length) return null;
  const activeCategory = openCategory || groups[0]?.[0] || '';

  return (
    <div className="pc-pricelist pc-glass">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="pc-display text-xl font-extrabold">Full Price List</h3>
          <p className="pc-muted text-sm">Every price in ₹ (INR). Final price confirmed free at consult — always before we start.</p>
        </div>
        <button
          type="button"
          className="pc-btn pc-btn-ghost px-4 py-2 text-xs pc-print-hide"
          onClick={() => {
            if (typeof window !== 'undefined' && typeof window.print === 'function') window.print();
          }}
        >
          <Printer size={14} aria-hidden="true" /> Print / Save PDF
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {groups.map(([category, items]) => {
          const open = activeCategory === category;
          return (
            <div key={category} className="pc-pricelist-group">
              <button
                type="button"
                className="pc-pricelist-head"
                aria-expanded={open}
                onClick={() => setOpenCategory(open ? '__none__' : category)}
              >
                <span>{category}</span>
                <span className="pc-muted text-xs font-bold">
                  {items.length} service{items.length > 1 ? 's' : ''} · from {prismFormatInr(Math.min(...items.map((i) => i.price ?? 0)))}
                </span>
                <ChevronDown size={16} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .3s ease' }} />
              </button>
              {open && (
                <table className="pc-pricelist-table">
                  <caption className="pc-sr-only">{`${category} services and prices at ${brandName}`}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Service</th>
                      <th scope="col">Time</th>
                      <th scope="col">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((service) => (
                      <tr key={service.id}>
                        <td>
                          <strong>{service.name}</strong>
                          {service.popular && <span className="pc-pricelist-pop">Popular</span>}
                        </td>
                        <td>{service.showDuration !== false && service.durationMinutes ? `${service.durationMinutes} min` : '—'}</td>
                        <td className="pc-pricelist-price">{service.price != null ? prismFormatInr(service.price) : 'On consult'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {packages.length > 0 && (
        <div className="mt-6">
          <h4 className="pc-display font-extrabold">Packages — best value</h4>
          <table className="pc-pricelist-table mt-3">
            <caption className="pc-sr-only">{`Colour packages at ${brandName}`}</caption>
            <thead>
              <tr>
                <th scope="col">Package</th>
                <th scope="col">Includes</th>
                <th scope="col">Price</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td>
                    <strong>{pkg.tier}</strong>
                    {pkg.savingsNote && <span className="block text-xs" style={{ color: 'var(--cyan)' }}>{pkg.savingsNote}</span>}
                  </td>
                  <td className="pc-muted">{pkg.includes.slice(0, 3).join(' · ')}{pkg.includes.length > 3 ? ' · …' : ''}</td>
                  <td className="pc-pricelist-price">{prismFormatInr(pkg.price + (carePlan ? pkg.carePlanAddon || 0 : 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="pc-muted mt-4 text-xs">
        Prices can change with hair length and thickness. We confirm your final price at the free consult, before any colour touches your hair.
      </p>
    </div>
  );
}

export function PriceListSection(props: ComponentProps<typeof PriceList>) {
  return (
    <FadeIn>
      <PriceList {...props} />
    </FadeIn>
  );
}

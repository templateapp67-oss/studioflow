import React, { useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { SalonProfile, ShringaarCollectionItem, ShringaarRoyalConfig, ShringaarStatItem } from '../../types';
import {
  SHRINGAAR_DEFAULT_COLLECTIONS,
  SHRINGAAR_DEFAULT_COLORS,
  SHRINGAAR_DEFAULT_STATS,
  SHRINGAAR_IMAGES,
} from '../../lib/shringaarRoyal';

type Patch = Partial<ShringaarRoyalConfig>;

const FIELDS: Array<{ key: keyof ShringaarRoyalConfig; label: string; hint?: string; multiline?: boolean }> = [
  { key: 'heroScript', label: 'Hero script flourish', hint: 'One short word shown above the headline in a script font.' },
  { key: 'heroHeading', label: 'Hero headline', hint: 'Keep it under 60 characters for the oversized serif layout.' },
  { key: 'heroSubtext', label: 'Hero paragraph', multiline: true },
  { key: 'aboutHeading', label: 'About heading' },
  { key: 'aboutStory', label: 'About story', multiline: true },
  { key: 'collectionsHeading', label: 'Collections heading' },
  { key: 'collectionsSubtext', label: 'Collections intro', multiline: true },
  { key: 'looksHeading', label: 'Lookbook heading' },
  { key: 'looksSubtext', label: 'Lookbook intro', multiline: true },
  { key: 'servicesHeading', label: 'Bridal menu heading' },
  { key: 'packageEyebrow', label: 'Packages eyebrow' },
  { key: 'packagesHeading', label: 'Packages heading' },
  { key: 'processHeading', label: 'Bridal journey heading' },
  { key: 'reviewsHeading', label: 'Reviews heading' },
  { key: 'galleryHeading', label: 'Instagram strip heading' },
  { key: 'offerHeading', label: 'Offer banner heading' },
  { key: 'offerText', label: 'Offer banner paragraph', multiline: true },
  { key: 'announcementText', label: 'Wedding-season strip text', multiline: true },
  { key: 'bookingHeading', label: 'Booking card heading' },
  { key: 'established', label: 'Established line', hint: 'Shown vertically beside the hero arch.' },
  { key: 'publicEmail', label: 'Public email' },
  { key: 'workingHoursDisplay', label: 'Public timings' },
  { key: 'mapEmbedUrl', label: 'Google Maps embed URL (optional)', hint: 'Paste the src from Google Maps → Share → Embed a map. Leave blank to show a directions card instead.' },
];

const IMAGE_FIELDS: Array<{ key: keyof ShringaarRoyalConfig; label: string; fallback: string }> = [
  { key: 'heroImageUrl', label: 'Hero arch photo', fallback: SHRINGAAR_IMAGES.hero },
  { key: 'aboutImageUrl', label: 'About photo', fallback: SHRINGAAR_IMAGES.about },
  { key: 'offerImageUrl', label: 'Offer banner photo', fallback: SHRINGAAR_IMAGES.offer },
  { key: 'bookingImageUrl', label: 'Booking background photo', fallback: SHRINGAAR_IMAGES.booking },
];

const COLOR_FIELDS: Array<{ key: keyof NonNullable<ShringaarRoyalConfig['colors']>; label: string }> = [
  { key: 'maroon', label: 'Oxblood maroon (primary)' },
  { key: 'gold', label: 'Royal gold (accent)' },
  { key: 'ivory', label: 'Antique ivory (background)' },
  { key: 'saffron', label: 'Marigold saffron (highlight)' },
  { key: 'teal', label: 'Peacock teal (secondary)' },
  { key: 'blush', label: 'Rose blush (soft surface)' },
  { key: 'ink', label: 'Charcoal brown (text)' },
];

/**
 * Owner editing panel for Template 11.
 *
 * Every field writes to `profile.shringaarRoyal` (saved with the workspace like
 * Templates 08–10). Blank fields are ignored by the resolver, so clearing an
 * input simply restores the bundled Shringaar demo copy.
 */
export function ShringaarRoyalEditor({
  profile,
  setProfile,
}: {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
}) {
  const [open, setOpen] = useState<'content' | 'collections' | 'stats' | 'colours' | ''>('content');
  const config: ShringaarRoyalConfig = profile.shringaarRoyal || {};

  const update = (patch: Patch) =>
    setProfile((previous) => ({ ...previous, shringaarRoyal: { ...(previous.shringaarRoyal || {}), ...patch } }));

  const collections = config.collections && config.collections.length ? config.collections : SHRINGAAR_DEFAULT_COLLECTIONS;
  const stats = config.stats && config.stats.length ? config.stats : SHRINGAAR_DEFAULT_STATS;
  const colors = { ...SHRINGAAR_DEFAULT_COLORS, ...(config.colors || {}) };

  const setCollection = (index: number, patch: Partial<ShringaarCollectionItem>) => {
    const next = collections.map((item, i) => (i === index ? { ...item, ...patch } : item));
    update({ collections: next });
  };
  const setStat = (index: number, patch: Partial<ShringaarStatItem>) => {
    const next = stats.map((item, i) => (i === index ? { ...item, ...patch } : item));
    update({ stats: next });
  };

  const summary = (key: typeof open, label: string) => (
    <summary
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', listStyle: 'none' }}
      onClick={(event) => {
        event.preventDefault();
        setOpen(open === key ? '' : key);
      }}
    >
      <span style={{ fontWeight: 700 }}>{label}</span>
      <ChevronDown size={16} style={{ transform: open === key ? 'rotate(180deg)' : 'none', transition: 'transform .25s ease' }} aria-hidden="true" />
    </summary>
  );

  const input = (key: keyof ShringaarRoyalConfig, label: string, hint?: string, multiline?: boolean) => (
    <label key={String(key)} style={{ display: 'grid', gap: 4, fontSize: 12 }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          value={String(config[key] || '')}
          placeholder="Leave blank to use the Shringaar demo copy"
          onChange={(event) => update({ [key]: event.target.value } as Patch)}
          style={{ border: '1px solid #d8c9a8', borderRadius: 8, padding: 8, font: 'inherit' }}
        />
      ) : (
        <input
          value={String(config[key] || '')}
          placeholder="Leave blank to use the Shringaar demo copy"
          onChange={(event) => update({ [key]: event.target.value } as Patch)}
          style={{ border: '1px solid #d8c9a8', borderRadius: 8, padding: 8, font: 'inherit' }}
        />
      )}
      {hint && <span style={{ color: '#7a6a58', fontSize: 11 }}>{hint}</span>}
    </label>
  );

  return (
    <section aria-label="Shringaar Royal website content" style={{ display: 'grid', gap: 12 }}>
      <p style={{ fontSize: 13, color: '#5c4a3a' }}>
        Edit the Shringaar Royal bridal website — hero, collections, lookbook, packages, bridal journey, reviews, offers and
        booking card. Services, ₹ prices, team and gallery come from the sections below this panel, so the website and the
        customer app always stay in sync.
      </p>

      <details open={open === 'content'} style={{ border: '1px solid #e2d3b6', borderRadius: 12, padding: 12 }}>
        {summary('content', 'Bridal content & headings')}
        {open === 'content' && (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {FIELDS.map((field) => input(field.key, field.label, field.hint, field.multiline))}
            <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
              <strong style={{ fontSize: 12 }}>Photography</strong>
              {IMAGE_FIELDS.map((field) => (
                <label key={String(field.key)} style={{ display: 'grid', gap: 4, fontSize: 12 }}>
                  <span>{field.label}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <img
                      src={String(config[field.key] || '') || field.fallback}
                      alt=""
                      width={54}
                      height={44}
                      style={{ width: 54, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2d3b6' }}
                    />
                    <input
                      value={String(config[field.key] || '')}
                      placeholder={field.fallback}
                      onChange={(event) => update({ [field.key]: event.target.value } as Patch)}
                      style={{ flex: 1, border: '1px solid #d8c9a8', borderRadius: 8, padding: 8, font: 'inherit' }}
                    />
                  </div>
                </label>
              ))}
              <p style={{ fontSize: 11, color: '#7a6a58' }}>
                Leave a photo blank to keep the bundled Shringaar Royal photograph. Broken links fall back automatically.
              </p>
            </div>
          </div>
        )}
      </details>

      <details open={open === 'collections'} style={{ border: '1px solid #e2d3b6', borderRadius: 12, padding: 12 }}>
        {summary('collections', 'Signature collections')}
        {open === 'collections' && (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {collections.map((item, index) => (
              <div key={item.id} style={{ display: 'grid', gap: 6, gridTemplateColumns: '56px 1fr', alignItems: 'start' }}>
                <img
                  src={item.image || SHRINGAAR_IMAGES.collections.lehenga}
                  alt=""
                  width={56}
                  height={72}
                  style={{ width: 56, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2d3b6' }}
                />
                <div style={{ display: 'grid', gap: 4 }}>
                  <input
                    aria-label={`Collection ${index + 1} name`}
                    value={item.name}
                    onChange={(event) => setCollection(index, { name: event.target.value })}
                    style={{ border: '1px solid #d8c9a8', borderRadius: 8, padding: 6, font: 'inherit', fontSize: 12 }}
                  />
                  <input
                    aria-label={`Collection ${index + 1} subtitle`}
                    value={item.subtitle}
                    onChange={(event) => setCollection(index, { subtitle: event.target.value })}
                    style={{ border: '1px solid #d8c9a8', borderRadius: 8, padding: 6, font: 'inherit', fontSize: 12 }}
                  />
                  <input
                    aria-label={`Collection ${index + 1} photo`}
                    value={item.image}
                    onChange={(event) => setCollection(index, { image: event.target.value })}
                    style={{ border: '1px solid #d8c9a8', borderRadius: 8, padding: 6, font: 'inherit', fontSize: 11 }}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              className="secondary-action"
              style={{ width: 'fit-content' }}
              onClick={() => update({ collections: [...collections, { ...SHRINGAAR_DEFAULT_COLLECTIONS[0], id: `col-${Date.now()}`, name: 'New collection', subtitle: 'Add a subtitle' }] })}
            >
              <Plus size={14} aria-hidden="true" /> Add collection
            </button>
          </div>
        )}
      </details>

      <details open={open === 'stats'} style={{ border: '1px solid #e2d3b6', borderRadius: 12, padding: 12 }}>
        {summary('stats', 'Trust strip numbers')}
        {open === 'stats' && (
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {stats.map((stat, index) => (
              <div key={stat.id} style={{ display: 'grid', gap: 6, gridTemplateColumns: '90px 1fr auto' }}>
                <input
                  aria-label={`Stat ${index + 1} value`}
                  value={stat.value}
                  onChange={(event) => setStat(index, { value: event.target.value })}
                  style={{ border: '1px solid #d8c9a8', borderRadius: 8, padding: 6, font: 'inherit', fontSize: 12 }}
                />
                <input
                  aria-label={`Stat ${index + 1} label`}
                  value={stat.label}
                  onChange={(event) => setStat(index, { label: event.target.value })}
                  style={{ border: '1px solid #d8c9a8', borderRadius: 8, padding: 6, font: 'inherit', fontSize: 12 }}
                />
                <button
                  type="button"
                  className="secondary-action"
                  aria-label={`Remove stat ${index + 1}`}
                  disabled={stats.length <= 1}
                  onClick={() => update({ stats: stats.filter((_, i) => i !== index) })}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary-action"
              style={{ width: 'fit-content' }}
              disabled={stats.length >= 4}
              onClick={() =>
                update({
                  stats: [
                    ...stats,
                    { id: `stat-${Date.now()}`, value: '100%', label: 'On-time bridal mornings', image: SHRINGAAR_IMAGES.looks.four, alt: 'Bridal zardozi detail' },
                  ],
                })
              }
            >
              <Plus size={14} aria-hidden="true" /> Add stat (max 4)
            </button>
          </div>
        )}
      </details>

      <details open={open === 'colours'} style={{ border: '1px solid #e2d3b6', borderRadius: 12, padding: 12 }}>
        {summary('colours', 'Theme colours')}
        {open === 'colours' && (
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', marginTop: 12 }}>
            {COLOR_FIELDS.map((field) => (
              <label key={String(field.key)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <input
                  type="color"
                  aria-label={field.label}
                  value={colors[field.key]}
                  onChange={(event) => update({ colors: { ...(config.colors || {}), [field.key]: event.target.value } })}
                  style={{ width: 34, height: 28, border: '1px solid #d8c9a8', borderRadius: 6, background: 'transparent' }}
                />
                {field.label}
              </label>
            ))}
            <button type="button" className="secondary-action" onClick={() => update({ colors: {} })}>
              Reset to Royal Rajputana palette
            </button>
          </div>
        )}
      </details>
    </section>
  );
}

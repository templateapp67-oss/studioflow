import React, { useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { ArchFlutterConfig, ArchFlutterFaq, ArchFlutterPackage, ArchFlutterPost, ArchFlutterReel, ArchFlutterReview, SalonOffer, SalonOfferType, SalonProfile } from '../../types';
import { CATEGORY_TEMPLATES } from '../../categoryTemplates';
import { uploadSalonImage } from '../../lib/supabase';
import {
  OFFER_BADGES,
  OFFER_TYPE_LABELS,
  SALON_OFFER_TYPES,
  emptySalonOffer,
  formatOfferWindow,
  offerApplicableServices,
  offerCountdownLabel,
  offerDiscountLabel,
  offerImage,
  offerIsLive,
  offerSavingINR,
  ownerSalonOffers,
  removeSalonOffer,
  resetSampleSalonOffers,
  toggleSalonOffer,
  upsertSalonOffer,
} from '../../lib/salonOffers';
import {
  ARCH_FLUTTER_DEFAULT_COLORS,
  ARCH_FLUTTER_DEFAULT_FAQS,
  ARCH_FLUTTER_DEFAULT_FEATURED_VIDEO,
  ARCH_FLUTTER_DEFAULT_PACKAGES,
  ARCH_FLUTTER_DEFAULT_POSTS,
  ARCH_FLUTTER_DEFAULT_REELS,
  ARCH_FLUTTER_DEFAULT_REVIEWS,
  ARCH_FLUTTER_IMAGES,
} from '../../lib/archFlutter';

type Patch = Partial<ArchFlutterConfig>;

const TEXT_FIELDS: Array<{ key: keyof ArchFlutterConfig; label: string; hint?: string; multiline?: boolean }> = [
  { key: 'heroKicker', label: 'Hero eyebrow', hint: 'Small caps line above the headline, e.g. “Lash & Brow Atelier · Est. 2019”.' },
  { key: 'heroHeading', label: 'Hero headline', hint: 'Oversized serif — keep under 60 characters.' },
  { key: 'heroSubtext', label: 'Hero paragraph', multiline: true },
  { key: 'aboutHeading', label: 'About heading' },
  { key: 'aboutStory', label: 'About story', multiline: true },
  { key: 'categoriesHeading', label: 'Categories heading' },
  { key: 'categoriesSubtext', label: 'Categories intro', multiline: true },
  { key: 'servicesHeading', label: 'Services menu heading' },
  { key: 'servicesSubtext', label: 'Services intro', multiline: true },
  { key: 'packagesHeading', label: 'Packages heading' },
  { key: 'packagesSubtext', label: 'Packages intro', multiline: true },
  { key: 'resultsHeading', label: 'Before & after heading' },
  { key: 'reelsHeading', label: 'Videos & reels heading' },
  { key: 'reelsSubtext', label: 'Videos & reels intro', multiline: true },
  { key: 'teamHeading', label: 'Team heading' },
  { key: 'reviewsHeading', label: 'Reviews heading' },
  { key: 'galleryHeading', label: 'Gallery heading' },
  { key: 'offersHeading', label: 'Offers heading' },
  { key: 'journalHeading', label: 'Aftercare journal heading' },
  { key: 'contactHeading', label: 'Contact heading' },
  { key: 'bookingHeading', label: 'Booking heading' },
  { key: 'bookingSubtext', label: 'Booking intro', multiline: true },
  { key: 'established', label: 'Established line', hint: 'e.g. “Est. 2019 · Jaipur”.' },
  { key: 'publicEmail', label: 'Public email' },
  { key: 'workingHoursDisplay', label: 'Public timings', hint: 'e.g. “Tue – Sun · 10:00 AM – 8:00 PM”.' },
  { key: 'mapEmbedUrl', label: 'Google Maps embed URL (optional)', hint: 'Paste the src from Google Maps → Share → Embed a map. Leave blank for a directions card.' },
];

const IMAGE_FIELDS: Array<{ key: keyof ArchFlutterConfig; label: string; fallback: string }> = [
  { key: 'heroImageUrl', label: 'Hero arch photo', fallback: ARCH_FLUTTER_IMAGES.hero.src },
  { key: 'aboutImageUrl', label: 'About / studio photo', fallback: ARCH_FLUTTER_IMAGES.about.src },
  { key: 'ctaBannerImageUrl', label: 'Booking CTA banner photo', fallback: ARCH_FLUTTER_IMAGES.ctaBanner.src },
  { key: 'footerImageUrl', label: 'Footer photo', fallback: ARCH_FLUTTER_IMAGES.footer.src },
];

const COLOR_FIELDS: Array<{ key: keyof NonNullable<ArchFlutterConfig['colors']>; label: string }> = [
  { key: 'blush', label: 'Blush rose #F4D7D3' },
  { key: 'ivory', label: 'Warm ivory #FBF6F1' },
  { key: 'espresso', label: 'Deep espresso #2B1B17' },
  { key: 'gold', label: 'Champagne gold #C9A66B' },
  { key: 'mauve', label: 'Dusty mauve #9A6B73' },
];

/**
 * Owner editing panel for Template 13 — Arch & Flutter Lash & Brow Bar.
 *
 * Every field writes to `profile.archFlutter`, saved with the workspace like
 * Templates 08–12. Blank inputs are ignored by `resolveArchFlutterConfig`, so
 * clearing a field restores the bundled Arch & Flutter demo copy. Services,
 * ₹ prices, team and gallery are edited with the shared workspace editors.
 */
export function ArchFlutterEditor({
  profile,
  setProfile,
}: {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
}) {
  const [open, setOpen] = useState<'content' | 'images' | 'packages' | 'reels' | 'reviews' | 'faq' | 'journal' | 'offers' | 'colours' | ''>('content');
  const config: ArchFlutterConfig = profile.archFlutter || {};

  const update = (patch: Patch) =>
    setProfile((previous) => ({ ...previous, archFlutter: { ...(previous.archFlutter || {}), ...patch } }));

  const packages = config.packages?.length ? config.packages : ARCH_FLUTTER_DEFAULT_PACKAGES;
  const reels = config.reels?.length ? config.reels : ARCH_FLUTTER_DEFAULT_REELS;
  const reviews = config.reviews?.length ? config.reviews : ARCH_FLUTTER_DEFAULT_REVIEWS;
  const faqs = config.faqs?.length ? config.faqs : ARCH_FLUTTER_DEFAULT_FAQS;
  const posts = config.posts?.length ? config.posts : ARCH_FLUTTER_DEFAULT_POSTS;
  const offers = ownerSalonOffers(profile);
  const menu = CATEGORY_TEMPLATES[profile.businessType]?.services || [];
  const [offerNotice, setOfferNotice] = useState('');
  const [busyOffer, setBusyOffer] = useState('');
  const colors = { ...ARCH_FLUTTER_DEFAULT_COLORS, ...(config.colors || {}) };

  const setPackage = (index: number, patch: Partial<ArchFlutterPackage>) => update({ packages: packages.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const featured = { ...ARCH_FLUTTER_DEFAULT_FEATURED_VIDEO, ...(config.featuredVideo || {}) };
  const setFeatured = (patch: Partial<ArchFlutterReel>) => update({ featuredVideo: { ...featured, ...patch } });
  const setReel = (index: number, patch: Partial<ArchFlutterReel>) => update({ reels: reels.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const setReview = (index: number, patch: Partial<ArchFlutterReview>) => update({ reviews: reviews.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const setFaq = (index: number, patch: Partial<ArchFlutterFaq>) => update({ faqs: faqs.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const setPost = (index: number, patch: Partial<ArchFlutterPost>) => update({ posts: posts.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const saveOffer = (offer: SalonOffer) => setProfile((previous) => upsertSalonOffer(previous, offer));
  const patchOffer = (offer: SalonOffer, patch: Partial<SalonOffer>) => saveOffer({ ...offer, ...patch });
  const addOffer = () => {
    setProfile((previous) => upsertSalonOffer(previous, emptySalonOffer(Date.now(), (previous.promoOffers || []).length)));
    setOfferNotice('New offer added. It stays hidden on your website until you switch it on.');
  };
  const deleteOffer = (offer: SalonOffer) => {
    setProfile((previous) => removeSalonOffer(previous, offer.id));
    setOfferNotice(`Deleted “${offer.title}”. Deleted offers never come back on reload.`);
  };
  const hideOffer = (offer: SalonOffer) => {
    setProfile((previous) => toggleSalonOffer(previous, offer.id));
    setOfferNotice(offer.isActive ? `“${offer.title}” is hidden from your website.` : `“${offer.title}” is live on your website again.`);
  };
  const resetOffers = () => {
    setProfile((previous) => resetSampleSalonOffers(previous));
    setOfferNotice('Sample offers restored. Edit any of them to make it your own.');
  };
  const uploadOfferImage = async (offer: SalonOffer, file?: File | null) => {
    if (!file) return;
    setBusyOffer(offer.id);
    setOfferNotice('');
    try {
      const url = await uploadSalonImage(file);
      saveOffer({ ...offer, image: url });
      setOfferNotice(`Photo uploaded for “${offer.title}”.`);
    } catch (error) {
      setOfferNotice(error instanceof Error ? error.message : 'Could not upload that photo.');
    } finally {
      setBusyOffer('');
    }
  };

  const box: React.CSSProperties = { border: '1px solid #e7cfc6', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 12 };
  const labelStyle: React.CSSProperties = { display: 'grid', gap: 4, fontSize: 12 };
  const inputStyle: React.CSSProperties = { border: '1px solid #e0c9bf', borderRadius: 8, padding: 8, font: 'inherit', width: '100%' };
  const primaryButton: React.CSSProperties = { border: '1px solid #2b1b17', background: '#2b1b17', color: '#fbf6f1', borderRadius: 999, padding: '8px 16px', font: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
  const ghostButton: React.CSSProperties = { border: '1px solid #c9a66b', background: '#fff', color: '#7a4f57', borderRadius: 999, padding: '8px 14px', font: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
  const chipStyle: React.CSSProperties = { border: '1px solid #e0c9bf', background: '#fbf6f1', color: '#7a4f57', borderRadius: 999, padding: '3px 9px', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' };

  const summary = (key: typeof open, label: string) => (
    <summary
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', listStyle: 'none', padding: '4px 2px' }}
      onClick={(event) => {
        event.preventDefault();
        setOpen(open === key ? '' : key);
      }}
    >
      <span style={{ fontWeight: 700 }}>{label}</span>
      <ChevronDown size={16} style={{ transform: open === key ? 'rotate(180deg)' : 'none', transition: 'transform .25s ease' }} aria-hidden="true" />
    </summary>
  );

  const textField = (field: (typeof TEXT_FIELDS)[number]) => (
    <label key={String(field.key)} style={labelStyle}>
      <span style={{ fontWeight: 700 }}>{field.label}</span>
      {field.multiline ? (
        <textarea rows={3} value={String(config[field.key] || '')} placeholder="Leave blank to use the Arch & Flutter demo copy" onChange={(event) => update({ [field.key]: event.target.value } as Patch)} style={inputStyle} />
      ) : (
        <input value={String(config[field.key] || '')} placeholder="Leave blank to use the Arch & Flutter demo copy" onChange={(event) => update({ [field.key]: event.target.value } as Patch)} style={inputStyle} />
      )}
      {field.hint && <span style={{ color: '#8a6a6f', fontSize: 11 }}>{field.hint}</span>}
    </label>
  );

  return (
    <section aria-label="Arch & Flutter template editor" style={{ display: 'grid', gap: 12 }}>
      <details open={open === 'content'} style={box}>
        {summary('content', 'Headlines & copy')}
        {open === 'content' && <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>{TEXT_FIELDS.map(textField)}</div>}
      </details>

      <details open={open === 'images'} style={box}>
        {summary('images', 'Photography')}
        {open === 'images' && (
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {IMAGE_FIELDS.map((field) => (
              <label key={String(field.key)} style={labelStyle}>
                <span style={{ fontWeight: 700 }}>{field.label}</span>
                <input value={String(config[field.key] || '')} placeholder="Leave blank for the bundled photo" onChange={(event) => update({ [field.key]: event.target.value } as Patch)} style={inputStyle} />
                <span style={{ color: '#8a6a6f', fontSize: 11 }}>Current: {String(config[field.key] || field.fallback).slice(0, 60)}</span>
              </label>
            ))}
            <label style={labelStyle}>
              <span style={{ fontWeight: 700 }}>Show “GST inclusive” note beside prices</span>
              <select value={config.showGstNote === false ? 'no' : 'yes'} onChange={(event) => update({ showGstNote: event.target.value === 'yes' })} style={inputStyle}>
                <option value="yes">Yes — show GST-inclusive note</option>
                <option value="no">No</option>
              </select>
            </label>
          </div>
        )}
      </details>

      <details open={open === 'packages'} style={box}>
        {summary('packages', 'Packages & membership tiers')}
        {open === 'packages' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {packages.map((pkg, index) => (
              <div key={pkg.id} style={{ border: '1px dashed #e0c9bf', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <label style={labelStyle}><span>Tier</span><input value={pkg.tier} onChange={(event) => setPackage(index, { tier: event.target.value })} style={inputStyle} /></label>
                  <label style={labelStyle}><span>Name</span><input value={pkg.name} onChange={(event) => setPackage(index, { name: event.target.value })} style={inputStyle} /></label>
                  <label style={labelStyle}><span>Price (₹)</span><input type="number" min={0} value={pkg.price} onChange={(event) => setPackage(index, { price: Number(event.target.value) })} style={inputStyle} /></label>
                  <label style={labelStyle}><span>Minutes</span><input type="number" min={1} value={pkg.durationMinutes} onChange={(event) => setPackage(index, { durationMinutes: Number(event.target.value) })} style={inputStyle} /></label>
                </div>
                <label style={labelStyle}><span>Inclusions (one per line)</span><textarea rows={4} value={pkg.includes.join('\n')} onChange={(event) => setPackage(index, { includes: event.target.value.split('\n').filter(Boolean) })} style={inputStyle} /></label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ ...labelStyle, flex: 1, minWidth: 200 }}><span>Photo URL (optional)</span><input value={pkg.imageUrl || ''} onChange={(event) => setPackage(index, { imageUrl: event.target.value })} style={inputStyle} /></label>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}><input type="checkbox" checked={Boolean(pkg.highlight)} onChange={(event) => setPackage(index, { highlight: event.target.checked })} /> Highlight card</label>
                </div>
              </div>
            ))}
            <button type="button" className="secondary-action" onClick={() => update({ packages: [...packages, { id: `af-pkg-${packages.length + 1}`, tier: 'New', name: 'New package', price: 2999, durationMinutes: 90, includes: ['First inclusion'] }] })}>
              <Plus size={14} /> Add package
            </button>
          </div>
        )}
      </details>

      <details open={open === 'reels'} style={box}>
        {summary('reels', 'Featured video & reels')}
        {open === 'reels' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <p style={{ fontSize: 12, margin: 0, color: '#6d4a52' }}>
              Reels added under Website → “Connect your social media & videos” appear first. These cards are the bundled demo set; replace the poster, add an uploaded MP4 (muted autoplay) or an Instagram / YouTube link.
            </p>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <label style={labelStyle}><span>Featured video title</span><input value={featured.title} onChange={(event) => setFeatured({ title: event.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}><span>Featured video caption</span><input value={featured.caption} onChange={(event) => setFeatured({ caption: event.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}><span>Featured video poster image</span><input value={featured.posterUrl} onChange={(event) => setFeatured({ posterUrl: event.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}><span>Featured video link (YouTube / Instagram)</span><input value={featured.sourceUrl || ''} placeholder="https://www.youtube.com/watch?v=…" onChange={(event) => setFeatured({ sourceUrl: event.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}><span>Featured video MP4 (optional, autoplays muted)</span><input value={featured.previewVideoUrl || ''} placeholder="https://…/film.mp4" onChange={(event) => setFeatured({ previewVideoUrl: event.target.value })} style={inputStyle} /></label>
            </div>
            {reels.map((reel, index) => (
              <div key={reel.id} style={{ border: '1px dashed #e0c9bf', borderRadius: 12, padding: 12, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <label style={labelStyle}><span>Title</span><input value={reel.title} onChange={(event) => setReel(index, { title: event.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}><span>Caption</span><input value={reel.caption} onChange={(event) => setReel(index, { caption: event.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}><span>Poster image URL</span><input value={reel.posterUrl} onChange={(event) => setReel(index, { posterUrl: event.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}><span>Instagram / YouTube link</span><input value={reel.sourceUrl || ''} onChange={(event) => setReel(index, { sourceUrl: event.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}><span>Uploaded MP4 (optional)</span><input value={reel.previewVideoUrl || ''} onChange={(event) => setReel(index, { previewVideoUrl: event.target.value })} style={inputStyle} /></label>
              </div>
            ))}
            <button type="button" className="secondary-action" onClick={() => update({ reels: [...reels, { id: `af-reel-${reels.length + 1}`, title: 'New reel', caption: 'Studio reel', posterUrl: ARCH_FLUTTER_IMAGES.reels.tour.src }] })}>
              <Plus size={14} /> Add reel card
            </button>
          </div>
        )}
      </details>

      <details open={open === 'reviews'} style={box}>
        {summary('reviews', 'Client reviews')}
        {open === 'reviews' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {reviews.map((review, index) => (
              <div key={review.id} style={{ border: '1px dashed #e0c9bf', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                  <label style={labelStyle}><span>Name</span><input value={review.name} onChange={(event) => setReview(index, { name: event.target.value })} style={inputStyle} /></label>
                  <label style={labelStyle}><span>Area</span><input value={review.area} onChange={(event) => setReview(index, { area: event.target.value })} style={inputStyle} /></label>
                  <label style={labelStyle}><span>Service</span><input value={review.service} onChange={(event) => setReview(index, { service: event.target.value })} style={inputStyle} /></label>
                  <label style={labelStyle}><span>Rating</span><input type="number" min={1} max={5} value={review.rating} onChange={(event) => setReview(index, { rating: Number(event.target.value) })} style={inputStyle} /></label>
                </div>
                <label style={labelStyle}><span>Quote</span><textarea rows={3} value={review.quote} onChange={(event) => setReview(index, { quote: event.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}><span>Avatar URL (optional)</span><input value={review.avatarUrl || ''} onChange={(event) => setReview(index, { avatarUrl: event.target.value })} style={inputStyle} /></label>
              </div>
            ))}
          </div>
        )}
      </details>

      <details open={open === 'faq'} style={box}>
        {summary('faq', 'FAQs')}
        {open === 'faq' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {faqs.map((faq, index) => (
              <div key={faq.id} style={{ border: '1px dashed #e0c9bf', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ ...labelStyle, flex: 1 }}><span>Question</span><input value={faq.question} onChange={(event) => setFaq(index, { question: event.target.value })} style={inputStyle} /></label>
                  <button type="button" className="secondary-action" aria-label={`Remove FAQ ${index + 1}`} onClick={() => update({ faqs: faqs.filter((_, i) => i !== index) })}><Trash2 size={14} /></button>
                </div>
                <label style={labelStyle}><span>Answer</span><textarea rows={3} value={faq.answer} onChange={(event) => setFaq(index, { answer: event.target.value })} style={inputStyle} /></label>
              </div>
            ))}
            <button type="button" className="secondary-action" onClick={() => update({ faqs: [...faqs, { id: `af-faq-${faqs.length + 1}`, question: 'New question?', answer: 'Answer…' }] })}><Plus size={14} /> Add FAQ</button>
          </div>
        )}
      </details>

      <details open={open === 'journal'} style={box}>
        {summary('journal', 'Aftercare journal')}
        {open === 'journal' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {posts.map((post, index) => (
              <div key={post.id} style={{ border: '1px dashed #e0c9bf', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                  <label style={labelStyle}><span>Title</span><input value={post.title} onChange={(event) => setPost(index, { title: event.target.value })} style={inputStyle} /></label>
                  <label style={labelStyle}><span>Tag</span><input value={post.tag} onChange={(event) => setPost(index, { tag: event.target.value })} style={inputStyle} /></label>
                  <label style={labelStyle}><span>Read minutes</span><input type="number" min={1} value={post.minutes} onChange={(event) => setPost(index, { minutes: Number(event.target.value) })} style={inputStyle} /></label>
                </div>
                <label style={labelStyle}><span>Excerpt</span><textarea rows={2} value={post.excerpt} onChange={(event) => setPost(index, { excerpt: event.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}><span>Full text</span><textarea rows={4} value={post.body} onChange={(event) => setPost(index, { body: event.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}><span>Cover image URL</span><input value={post.imageUrl} onChange={(event) => setPost(index, { imageUrl: event.target.value })} style={inputStyle} /></label>
              </div>
            ))}
          </div>
        )}
      </details>

      <details open={open === 'offers'} style={box}>
        {summary('offers', `Promotions & offers (${offers.length})`)}
        {open === 'offers' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#7a4f57' }}>
              These are ordinary editable records saved with your workspace — the same shape for the bundled sample offers and for offers you write yourself. A sample offer stops being a sample the moment you edit it. Hidden or expired offers stay here for you but never show on the public website or in the customer app.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={addOffer} style={primaryButton}>Add offer</button>
              <button type="button" onClick={resetOffers} style={ghostButton}>Reset to sample offers</button>
            </div>
            {offerNotice && <p role="status" style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#8a6a2f' }}>{offerNotice}</p>}
            {offers.length === 0 && (
              <p style={{ margin: 0, fontSize: 13, color: '#4a352e' }}>
                No offers yet. Your website shows a friendly “no offers running right now” card with your studio artwork instead of an empty box. Add an offer, or reset to the six sample offers.
              </p>
            )}
            {offers.map((offer, index) => {
              const photo = offerImage(offer, index);
              const applies = offerApplicableServices(offer, menu);
              const saving = offerSavingINR(offer, applies[0]);
              const live = offerIsLive(offer);
              return (
                <div key={offer.id} style={{ border: '1px dashed #e0c9bf', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <img src={photo.src || photo.fallback} alt="" width={72} height={52} style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: '999px 999px 10px 10px', border: '1px solid #e0c9bf' }} />
                    <strong style={{ fontSize: 13 }}>{offer.title || 'Untitled offer'}</strong>
                    {offer.isDemo && <span style={chipStyle}>Sample offer</span>}
                    <span style={{ ...chipStyle, background: live ? '#e8f4ea' : '#f6e9e6', color: live ? '#2f6b3f' : '#8a4a45' }}>
                      {live ? 'Live on website' : offer.isActive ? 'Expired — hidden publicly' : 'Hidden'}
                    </span>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => hideOffer(offer)} style={ghostButton}>{offer.isActive ? 'Hide' : 'Show'}</button>
                      <button type="button" onClick={() => deleteOffer(offer)} style={ghostButton}>Delete</button>
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <label style={labelStyle}><span>Title</span><input value={offer.title} onChange={(event) => patchOffer(offer, { title: event.target.value })} style={inputStyle} /></label>
                    <label style={labelStyle}>
                      <span>Badge</span>
                      <input list="af-offer-badges" value={offer.badge} onChange={(event) => patchOffer(offer, { badge: event.target.value })} style={inputStyle} />
                      <datalist id="af-offer-badges">{OFFER_BADGES.map((badge) => <option key={badge} value={badge} />)}</datalist>
                    </label>
                    <label style={labelStyle}>
                      <span>Offer type</span>
                      <select value={offer.offerType} onChange={(event) => patchOffer(offer, { offerType: event.target.value as SalonOfferType })} style={inputStyle}>
                        {SALON_OFFER_TYPES.map((type) => <option key={type} value={type}>{OFFER_TYPE_LABELS[type]}</option>)}
                      </select>
                    </label>
                    <label style={labelStyle}><span>Discount value {offer.offerType === 'percent' ? '(%)' : '(₹)'}</span><input type="number" min={0} step={offer.offerType === 'percent' ? 1 : 50} value={offer.discountValue} onChange={(event) => patchOffer(offer, { discountValue: Number(event.target.value) })} style={inputStyle} /></label>
                    <label style={labelStyle}><span>Original price (₹)</span><input type="number" min={0} step={1} value={offer.originalPriceINR} onChange={(event) => patchOffer(offer, { originalPriceINR: Number(event.target.value) })} style={inputStyle} /></label>
                    <label style={labelStyle}><span>Offer price (₹)</span><input type="number" min={0} step={1} value={offer.offerPriceINR} onChange={(event) => patchOffer(offer, { offerPriceINR: Number(event.target.value) })} style={inputStyle} /></label>
                    <label style={labelStyle}><span>Coupon code (optional)</span><input value={offer.couponCode} placeholder="e.g. FLUTTER20" onChange={(event) => patchOffer(offer, { couponCode: event.target.value.toUpperCase() })} style={inputStyle} /></label>
                    <label style={labelStyle}><span>Valid from</span><input type="date" value={offer.validFrom} onChange={(event) => patchOffer(offer, { validFrom: event.target.value })} style={inputStyle} /></label>
                    <label style={labelStyle}><span>Valid to (blank = no end date)</span><input type="date" value={offer.validTo} onChange={(event) => patchOffer(offer, { validTo: event.target.value })} style={inputStyle} /></label>
                    <label style={{ ...labelStyle, gridColumn: '1 / -1' }}><span>Description</span><textarea rows={2} value={offer.description} onChange={(event) => patchOffer(offer, { description: event.target.value })} style={inputStyle} /></label>
                    <label style={{ ...labelStyle, gridColumn: '1 / -1' }}><span>Terms &amp; conditions</span><textarea rows={2} value={offer.terms} onChange={(event) => patchOffer(offer, { terms: event.target.value })} style={inputStyle} /></label>
                    <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
                      <span>Photo URL</span>
                      <input value={offer.image} placeholder="Leave blank to use the bundled Arch & Flutter artwork" onChange={(event) => patchOffer(offer, { image: event.target.value })} style={inputStyle} />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ ...ghostButton, cursor: 'pointer', margin: 0 }}>
                      {busyOffer === offer.id ? 'Uploading…' : 'Upload photo'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(event) => { void uploadOfferImage(offer, event.target.files?.[0]); event.currentTarget.value = ''; }} />
                    </label>
                    <button type="button" onClick={() => patchOffer(offer, { image: '' })} style={ghostButton}>Use bundled artwork</button>
                  </div>
                  <fieldset style={{ border: '1px solid #f0e2da', borderRadius: 10, padding: 10, display: 'grid', gap: 6 }}>
                    <legend style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a4f57', padding: '0 6px' }}>
                      Applies to ({applies.length === 0 ? 'no matching services' : applies.length === menu.length ? 'every service' : `${applies.length} service${applies.length === 1 ? '' : 's'}`})
                    </legend>
                    <div style={{ display: 'grid', gap: 4, maxHeight: 168, overflowY: 'auto', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                      {menu.map((service) => {
                        const checked = offer.applicableServices.includes(service.id);
                        return (
                          <label key={service.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => patchOffer(offer, { applicableServices: checked ? offer.applicableServices.filter((id) => id !== service.id) : [...offer.applicableServices, service.id] })}
                            />
                            <span>{service.name} · ₹{service.price.toLocaleString('en-IN')}</span>
                          </label>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: 11, color: '#8a6a6f' }}>Tick nothing to make the offer valid on any service.</span>
                  </fieldset>
                  <p style={{ margin: 0, fontSize: 12, color: '#4a352e' }}>
                    <strong>Public card preview:</strong> {offerDiscountLabel(offer)}
                    {offer.originalPriceINR > 0 && offer.offerPriceINR > 0 ? ` · ₹${offer.offerPriceINR.toLocaleString('en-IN')} (was ₹${offer.originalPriceINR.toLocaleString('en-IN')})` : ''}
                    {saving > 0 ? ` · Save ₹${saving.toLocaleString('en-IN')}` : ''}
                    {offer.couponCode ? ` · code ${offer.couponCode}` : ''} · {formatOfferWindow(offer)} · {offerCountdownLabel(offer)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </details>

      <details open={open === 'colours'} style={box}>
        {summary('colours', 'Brand colours')}
        {open === 'colours' && (
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            {COLOR_FIELDS.map((field) => (
              <label key={field.key} style={labelStyle}>
                <span style={{ fontWeight: 700 }}>{field.label}</span>
                <input type="color" value={colors[field.key]} onChange={(event) => update({ colors: { ...colors, [field.key]: event.target.value } })} style={{ ...inputStyle, height: 40, padding: 4 }} />
              </label>
            ))}
          </div>
        )}
      </details>
    </section>
  );
}

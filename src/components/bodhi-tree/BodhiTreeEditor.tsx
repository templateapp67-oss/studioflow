import React, { useState } from 'react';
import {
  Building2,
  Crown,
  HelpCircle,
  Leaf,
  MessageSquareQuote,
  Palette,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type {
  BodhiTreeBranch,
  BodhiTreeConfig,
  BodhiTreeFaqItem,
  BodhiTreePalaceItem,
  BodhiTreeReviewItem,
  BodhiTreeThemeColors,
  SalonProfile,
} from '../../types';
import {
  BODHI_TREE_DEFAULT_BRANCHES,
  BODHI_TREE_DEFAULT_COLORS,
  BODHI_TREE_DEFAULT_FAQS,
  BODHI_TREE_DEFAULT_PALACE_COLLECTION,
  BODHI_TREE_DEFAULT_REVIEWS,
  BODHI_TREE_IMAGES,
  resolveBodhiTreeConfig,
  type ResolvedBodhiTreeConfig,
} from '../../lib/bodhiTree';
import { BrandImageField } from '../BrandImageField';

type EditorTab = 'brand' | 'palace' | 'branches' | 'reviews' | 'colors';

const COLOR_FIELDS: Array<{ key: keyof BodhiTreeThemeColors; label: string; hint: string }> = [
  { key: 'bgCream', label: 'Cream background', hint: 'Main page background' },
  { key: 'bgSage', label: 'Soft sage sections', hint: 'Alternate section background' },
  { key: 'forest', label: 'Deep forest green', hint: 'Headings and main text' },
  { key: 'sage', label: 'Sage green (buttons)', hint: 'Primary buttons — also your brand accent' },
  { key: 'gold', label: 'Soft gold', hint: 'Fine borders, icons, highlights' },
  { key: 'sandstone', label: 'Jaipur pink-sandstone', hint: 'Palace Collection band accents' },
  { key: 'textMuted', label: 'Muted text', hint: 'Secondary body text' },
];

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white';
const labelCls = 'block text-xs font-bold text-slate-700 mb-1';

function TextField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input className={inputCls} type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function AreaField({
  label, value, onChange, rows = 3, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <textarea className={inputCls} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function BodhiTreeEditor({
  profile,
  setProfile,
  showBrandIdentityFields = false,
}: {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  /** Set true when rendering standalone where core businessName/phone/address aren't already above */
  showBrandIdentityFields?: boolean;
}) {
  const [tab, setTab] = useState<EditorTab>('brand');
  const resolved = resolveBodhiTreeConfig(profile);

  const patchBodhiTree = (
    updater: (current: ResolvedBodhiTreeConfig) => Partial<BodhiTreeConfig>,
  ) => {
    setProfile((prev) => {
      const curr = resolveBodhiTreeConfig(prev);
      const nextPatch = updater(curr);
      const nextBt: BodhiTreeConfig = { ...prev.bodhiTree, ...nextPatch };
      return {
        ...prev,
        ...(nextPatch.colors?.sage ? { customAccentColor: nextPatch.colors.sage } : {}),
        ...(nextPatch.heroDesktopUrl ? { coverImageUrl: nextPatch.heroDesktopUrl } : {}),
        bodhiTree: nextBt,
      };
    });
  };

  const patchProfileField = (key: 'businessName' | 'tagline' | 'phone' | 'whatsapp' | 'email' | 'address' | 'city' | 'postalCode' | 'logoUrl', value: string) =>
    setProfile((prev) => ({ ...prev, [key]: value }));

  const resetSection = (key: EditorTab) => {
    if (key === 'colors') patchBodhiTree(() => ({ colors: { ...BODHI_TREE_DEFAULT_COLORS } }));
    if (key === 'palace') patchBodhiTree(() => ({ palaceCollection: BODHI_TREE_DEFAULT_PALACE_COLLECTION }));
    if (key === 'branches') patchBodhiTree(() => ({ branches: BODHI_TREE_DEFAULT_BRANCHES }));
    if (key === 'reviews') patchBodhiTree(() => ({ reviews: BODHI_TREE_DEFAULT_REVIEWS, faqs: BODHI_TREE_DEFAULT_FAQS }));
    if (key === 'brand') {
      patchBodhiTree(() => ({
        heroHeading: '', heroSubtext: '', heroDesktopUrl: '', heroMobileUrl: '',
        aboutHeading: '', aboutStory: '', aboutImageUrl: '', aboutImage2Url: '',
        palaceHeading: '', palaceSubtext: '', contactImageUrl: '', publicEmail: '',
        workingHoursDisplay: '', mapEmbedUrl: '',
      }));
    }
  };

  const updatePalace = (id: string, patch: Partial<BodhiTreePalaceItem>) =>
    patchBodhiTree((curr) => ({
      palaceCollection: curr.palaceCollection.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  const addPalace = () =>
    patchBodhiTree((curr) => ({
      palaceCollection: [
        ...curr.palaceCollection,
        {
          id: `bt-palace-${Date.now()}`,
          place: 'New Place',
          title: 'New Palace Ritual',
          price: 2999,
          duration: '60 min',
          blurb: 'One or two simple lines about this place and the treatment.',
          includes: ['60 min massage', 'Herbal tea'],
          imageUrl: BODHI_TREE_IMAGES.palace.hawaMahal,
          imageAlt: 'A famous Jaipur place',
        },
      ],
    }));
  const removePalace = (id: string) =>
    patchBodhiTree((curr) => ({ palaceCollection: curr.palaceCollection.filter((item) => item.id !== id) }));

  const updateBranch = (id: string, patch: Partial<BodhiTreeBranch>) =>
    patchBodhiTree((curr) => ({
      branches: curr.branches.map((branch) => (branch.id === id ? { ...branch, ...patch } : branch)),
    }));
  const addBranch = () =>
    patchBodhiTree((curr) => ({
      branches: [
        ...curr.branches,
        { id: `bt-br-${Date.now()}`, name: 'New Branch', area: '', address: 'Full address with city and PIN code', phone: '', hours: '9:00 AM - 9:00 PM' },
      ],
    }));
  const removeBranch = (id: string) =>
    patchBodhiTree((curr) => ({ branches: curr.branches.filter((branch) => branch.id !== id) }));

  const updateReview = (id: string, patch: Partial<BodhiTreeReviewItem>) =>
    patchBodhiTree((curr) => ({
      reviews: curr.reviews.map((review) => (review.id === id ? { ...review, ...patch } : review)),
    }));
  const addReview = () =>
    patchBodhiTree((curr) => ({
      reviews: [
        ...curr.reviews,
        { id: `bt-rev-${Date.now()}`, name: 'Guest Name', tag: 'Jaipur', rating: 5, quote: 'Write a short, simple review here.', serviceName: '', avatarUrl: '' },
      ],
    }));
  const removeReview = (id: string) =>
    patchBodhiTree((curr) => ({ reviews: curr.reviews.filter((review) => review.id !== id) }));

  const updateFaq = (id: string, patch: Partial<BodhiTreeFaqItem>) =>
    patchBodhiTree((curr) => ({
      faqs: curr.faqs.map((faq) => (faq.id === id ? { ...faq, ...patch } : faq)),
    }));
  const addFaq = () =>
    patchBodhiTree((curr) => ({
      faqs: [...curr.faqs, { id: `bt-faq-${Date.now()}`, question: 'New question?', answer: 'Write a simple answer here.' }],
    }));
  const removeFaq = (id: string) =>
    patchBodhiTree((curr) => ({ faqs: curr.faqs.filter((faq) => faq.id !== id) }));

  const tabs: Array<{ id: EditorTab; label: string; icon: typeof Leaf }> = [
    { id: 'brand', label: 'Brand & Hero', icon: Leaf },
    { id: 'palace', label: 'Palace Collection', icon: Crown },
    { id: 'branches', label: 'Branches', icon: Building2 },
    { id: 'reviews', label: 'Reviews & FAQs', icon: MessageSquareQuote },
    { id: 'colors', label: 'Colours', icon: Palette },
  ];

  return (
    <section className="border border-emerald-900/20 rounded-2xl p-4 sm:p-5 bg-white space-y-5" aria-labelledby="bt-editor-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full mb-1.5">
            Template 09 · Bodhi Tree
          </span>
          <h3 id="bt-editor-heading" className="text-lg font-bold text-slate-900">
            Bodhi Tree Website Controls
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Edit your royal Jaipur storefront: hero, Jaipur Palace Collection, branches, reviews, FAQs and brand
            colours. Services, ₹ prices, staff and gallery photos are edited in their normal sections below.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50"
          onClick={() => resetSection(tab)}
        >
          <RotateCcw size={13} aria-hidden="true" /> Reset this tab to demo
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Bodhi Tree editor tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold border ${
              tab === t.id
                ? 'bg-[#1E3A2F] text-[#FAF6EE] border-[#1E3A2F]'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <t.icon size={14} aria-hidden="true" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'brand' && (
        <div className="space-y-5">
          {showBrandIdentityFields && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Business name" value={profile.businessName || ''} onChange={(v) => patchProfileField('businessName', v)} />
              <TextField label="Tagline (e.g. Rest well. Feel light. Padharo, Jaipur.)" value={profile.tagline || ''} onChange={(v) => patchProfileField('tagline', v)} />
              <TextField label="Phone (+91 98XXX XXXXX)" value={profile.phone || ''} onChange={(v) => patchProfileField('phone', v)} />
              <TextField label="WhatsApp (+91 98XXX XXXXX)" value={profile.whatsapp || ''} onChange={(v) => patchProfileField('whatsapp', v)} />
              <TextField label="Address" value={profile.address || ''} onChange={(v) => patchProfileField('address', v)} />
              <TextField label="City" value={profile.city || ''} onChange={(v) => patchProfileField('city', v)} />
              <BrandImageField label="Business logo" logo value={profile.logoUrl || ''} onChange={(v) => patchProfileField('logoUrl', v)} hint="If empty, the Bodhi Tree leaf logo is used." />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Hero heading" value={resolved.heroHeading} onChange={(v) => patchBodhiTree(() => ({ heroHeading: v }))} />
            <TextField label="Working hours (shown on site)" value={resolved.workingHoursDisplay} placeholder="Open all days · 9:00 AM - 9:00 PM" onChange={(v) => patchBodhiTree(() => ({ workingHoursDisplay: v }))} />
          </div>
          <AreaField label="Hero text (under the heading)" value={resolved.heroSubtext} onChange={(v) => patchBodhiTree(() => ({ heroSubtext: v }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <BrandImageField label="Hero photo (wide — desktop)" value={resolved.heroDesktopUrl} onChange={(v) => patchBodhiTree(() => ({ heroDesktopUrl: v }))} hint="Wide photo, about 1920 × 1080. Also becomes your website cover." />
            <BrandImageField label="Hero photo (tall — mobile)" value={resolved.heroMobileUrl} onChange={(v) => patchBodhiTree(() => ({ heroMobileUrl: v }))} hint="Portrait crop for phones." />
            <BrandImageField label="About photo 1 (massage)" value={resolved.aboutImageUrl} onChange={(v) => patchBodhiTree(() => ({ aboutImageUrl: v }))} />
            <BrandImageField label="About photo 2 (hot stones)" value={resolved.aboutImage2Url} onChange={(v) => patchBodhiTree(() => ({ aboutImage2Url: v }))} />
            <BrandImageField label="Contact page photo (reception)" value={resolved.contactImageUrl} onChange={(v) => patchBodhiTree(() => ({ contactImageUrl: v }))} />
            <TextField label="Public email" value={resolved.publicEmail} onChange={(v) => patchBodhiTree(() => ({ publicEmail: v }))} />
          </div>
          <TextField label="About heading" value={resolved.aboutHeading} onChange={(v) => patchBodhiTree(() => ({ aboutHeading: v }))} />
          <AreaField label="About your centre (simple words work best)" rows={4} value={resolved.aboutStory} onChange={(v) => patchBodhiTree(() => ({ aboutStory: v }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Palace Collection heading" value={resolved.palaceHeading} onChange={(v) => patchBodhiTree(() => ({ palaceHeading: v }))} />
            <TextField label="Google Map embed URL (optional)" value={resolved.mapEmbedUrl} placeholder="Leave empty to auto-map your address" onChange={(v) => patchBodhiTree(() => ({ mapEmbedUrl: v }))} />
          </div>
          <AreaField label="Palace Collection intro line" rows={2} value={resolved.palaceSubtext} onChange={(v) => patchBodhiTree(() => ({ palaceSubtext: v }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            {resolved.stats.map((stat, idx) => (
              <div key={stat.id} className="grid grid-cols-2 gap-2">
                <TextField
                  label={`Stat ${idx + 1} value`}
                  value={stat.value}
                  onChange={(v) => patchBodhiTree((curr) => ({ stats: curr.stats.map((s) => (s.id === stat.id ? { ...s, value: v } : s)) }))}
                />
                <TextField
                  label={`Stat ${idx + 1} label`}
                  value={stat.label}
                  onChange={(v) => patchBodhiTree((curr) => ({ stats: curr.stats.map((s) => (s.id === stat.id ? { ...s, label: v } : s)) }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'palace' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            These are the arch (jharokha) cards on Home and the Palace Collection page. Each card books the linked
            service — keep the price the same as that service in ₹. Edit the services themselves under Service
            Management.
          </p>
          {resolved.palaceCollection.map((item) => (
            <div key={item.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/60">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-slate-900">{item.place} — {item.title}</strong>
                <button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-red-700" onClick={() => removePalace(item.id)}>
                  <Trash2 size={13} aria-hidden="true" /> Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <TextField label="Jaipur place" value={item.place} onChange={(v) => updatePalace(item.id, { place: v })} />
                <TextField label="Treatment name" value={item.title} onChange={(v) => updatePalace(item.id, { title: v })} />
                <label className="block">
                  <span className={labelCls}>Price (₹ INR only)</span>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    value={item.price}
                    onChange={(e) => updatePalace(item.id, { price: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </label>
                <TextField label="Duration (e.g. 60 min / Full day)" value={item.duration} onChange={(v) => updatePalace(item.id, { duration: v })} />
              </div>
              <AreaField label="Short line about the place & treatment (simple English)" rows={2} value={item.blurb} onChange={(v) => updatePalace(item.id, { blurb: v })} />
              <AreaField
                label="What is included (one item per line)"
                rows={3}
                value={item.includes.join('\n')}
                onChange={(v) => updatePalace(item.id, { includes: v.split('\n').map((l) => l.trim()).filter(Boolean) })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <BrandImageField label="Place photo (portrait 3:4 looks best in the arch)" value={item.imageUrl} onChange={(v) => updatePalace(item.id, { imageUrl: v })} />
                <div className="space-y-3">
                  <TextField label="Photo alt text (for screen readers)" value={item.imageAlt || ''} onChange={(v) => updatePalace(item.id, { imageAlt: v })} />
                  <TextField label="Badge (optional, e.g. Most Loved)" value={item.badgeLabel || ''} onChange={(v) => updatePalace(item.id, { badgeLabel: v, popular: Boolean(v) })} />
                  <TextField label="Linked service ID (booking)" value={item.linkedServiceId || ''} onChange={(v) => updatePalace(item.id, { linkedServiceId: v })} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E3A2F] border border-[#1E3A2F]/40 rounded-lg px-3 py-2 hover:bg-emerald-50" onClick={addPalace}>
            <Plus size={13} aria-hidden="true" /> Add Palace treatment
          </button>
        </div>
      )}

      {tab === 'branches' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Your branches shown on Home and Contact. Start with the four Jaipur branches — you can add more areas
            and cities any time.
          </p>
          {resolved.branches.map((branch) => (
            <div key={branch.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/60">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-slate-900">{branch.name}</strong>
                <button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-red-700" onClick={() => removeBranch(branch.id)}>
                  <Trash2 size={13} aria-hidden="true" /> Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <TextField label="Branch name" value={branch.name} onChange={(v) => updateBranch(branch.id, { name: v })} />
                <TextField label="Area" value={branch.area} onChange={(v) => updateBranch(branch.id, { area: v })} />
                <TextField label="Phone (+91 …)" value={branch.phone || ''} onChange={(v) => updateBranch(branch.id, { phone: v })} />
                <TextField label="Timings (e.g. 9:00 AM - 9:00 PM)" value={branch.hours || ''} onChange={(v) => updateBranch(branch.id, { hours: v })} />
              </div>
              <TextField label="Full address (with city & PIN code)" value={branch.address} onChange={(v) => updateBranch(branch.id, { address: v })} />
            </div>
          ))}
          <button type="button" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E3A2F] border border-[#1E3A2F]/40 rounded-lg px-3 py-2 hover:bg-emerald-50" onClick={addBranch}>
            <Plus size={13} aria-hidden="true" /> Add branch / city
          </button>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
              <MessageSquareQuote size={15} aria-hidden="true" /> Homepage testimonials
            </h4>
            <p className="text-xs text-slate-600">Short, natural reviews in simple English work best. Leave the photo empty to show initials.</p>
            {resolved.reviews.map((review) => (
              <div key={review.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/60">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm text-slate-900">{review.name}</strong>
                  <button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-red-700" onClick={() => removeReview(review.id)}>
                    <Trash2 size={13} aria-hidden="true" /> Remove
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <TextField label="Guest name (e.g. Neha S.)" value={review.name} onChange={(v) => updateReview(review.id, { name: v })} />
                  <TextField label="Branch / area" value={review.tag} onChange={(v) => updateReview(review.id, { tag: v })} />
                  <TextField label="Treatment taken" value={review.serviceName || ''} onChange={(v) => updateReview(review.id, { serviceName: v })} />
                  <label className="block">
                    <span className={labelCls}>Stars (1–5)</span>
                    <input
                      className={inputCls}
                      type="number"
                      min={1}
                      max={5}
                      value={review.rating}
                      onChange={(e) => updateReview(review.id, { rating: Math.min(5, Math.max(1, Number(e.target.value) || 5)) })}
                    />
                  </label>
                </div>
                <AreaField label="Review (simple words)" rows={2} value={review.quote} onChange={(v) => updateReview(review.id, { quote: v })} />
                <BrandImageField label="Guest photo (optional — initials shown if empty)" value={review.avatarUrl || ''} onChange={(v) => updateReview(review.id, { avatarUrl: v })} />
              </div>
            ))}
            <button type="button" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E3A2F] border border-[#1E3A2F]/40 rounded-lg px-3 py-2 hover:bg-emerald-50" onClick={addReview}>
              <Plus size={13} aria-hidden="true" /> Add review
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
              <HelpCircle size={15} aria-hidden="true" /> Common questions (FAQs)
            </h4>
            {resolved.faqs.map((faq) => (
              <div key={faq.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/60">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm text-slate-900">{faq.question}</strong>
                  <button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-red-700" onClick={() => removeFaq(faq.id)}>
                    <Trash2 size={13} aria-hidden="true" /> Remove
                  </button>
                </div>
                <TextField label="Question" value={faq.question} onChange={(v) => updateFaq(faq.id, { question: v })} />
                <AreaField label="Answer" rows={2} value={faq.answer} onChange={(v) => updateFaq(faq.id, { answer: v })} />
              </div>
            ))}
            <button type="button" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E3A2F] border border-[#1E3A2F]/40 rounded-lg px-3 py-2 hover:bg-emerald-50" onClick={addFaq}>
              <Plus size={13} aria-hidden="true" /> Add question
            </button>
          </div>
        </div>
      )}

      {tab === 'colors' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Bodhi Tree colours: sage green + cream, soft gold and deep forest-green text, with a touch of Jaipur
            pink-sandstone. Change any colour — the whole website updates. Keep text colours dark on light
            backgrounds so guests can read easily.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {COLOR_FIELDS.map((field) => (
              <label key={field.key} className="flex items-center gap-3 border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                <input
                  type="color"
                  className="h-11 w-14 shrink-0 cursor-pointer rounded border border-slate-300 bg-white"
                  value={resolved.colors[field.key]}
                  onChange={(e) =>
                    patchBodhiTree((curr) => ({ colors: { ...curr.colors, [field.key]: e.target.value.toUpperCase() } }))
                  }
                  aria-label={field.label}
                />
                <span>
                  <span className="block text-xs font-bold text-slate-800">{field.label}</span>
                  <span className="block text-[11px] text-slate-500">{field.hint} · {resolved.colors[field.key]}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

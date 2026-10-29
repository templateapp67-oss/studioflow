import React, { useState } from 'react';
import { HelpCircle, Images, ListChecks, MapPin, MessageSquareQuote, Palette, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import type {
  PrismChromaBranch,
  PrismChromaConfig,
  PrismChromaFaqItem,
  PrismChromaReviewItem,
  PrismChromaShade,
  PrismChromaThemeColors,
  SalonProfile,
} from '../../types';
import {
  PRISM_CHROMA_DEFAULT_BRANCHES,
  PRISM_CHROMA_DEFAULT_COLORS,
  PRISM_CHROMA_DEFAULT_FAQS,
  PRISM_CHROMA_DEFAULT_BEFORE_AFTER,
  PRISM_CHROMA_DEFAULT_CARE_GUIDE,
  PRISM_CHROMA_DEFAULT_PROCESS_STEPS,
  PRISM_CHROMA_DEFAULT_PACKAGES,
  PRISM_CHROMA_DEFAULT_REVIEWS,
  PRISM_CHROMA_DEFAULT_SHADES,
  resolvePrismChromaConfig,
} from '../../lib/prismChroma';
import { BrandImageField } from '../BrandImageField';

type EditorTab = 'brand' | 'shades' | 'packages' | 'results' | 'journey' | 'branches' | 'reviews' | 'seo' | 'colors';

const COLOR_FIELDS: Array<{ key: keyof PrismChromaThemeColors; label: string; hint: string }> = [
  { key: 'bg', label: 'Ink background', hint: 'Main page background (--bg)' },
  { key: 'violet', label: 'Violet', hint: 'Main brand colour — also your accent' },
  { key: 'magenta', label: 'Magenta', hint: 'Gradient colour 2' },
  { key: 'coral', label: 'Coral', hint: 'Gradient colour 3' },
  { key: 'cyan', label: 'Cyan', hint: 'Gradient colour 4' },
  { key: 'text', label: 'Main text', hint: 'Headings and body text' },
  { key: 'muted', label: 'Muted text', hint: 'Small / light text' },
];

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white';
const labelCls = 'block text-xs font-bold text-slate-700 mb-1';

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input className={inputCls} type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function AreaField({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <textarea className={inputCls} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function PrismChromaEditor({
  profile,
  setProfile,
  showBrandIdentityFields = false,
}: {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  showBrandIdentityFields?: boolean;
}) {
  const [tab, setTab] = useState<EditorTab>('brand');
  const config = resolvePrismChromaConfig(profile);
  const raw: PrismChromaConfig = profile.prismChroma || {};

  const patch = (next: Partial<PrismChromaConfig>) =>
    setProfile((p) => ({ ...p, prismChroma: { ...(p.prismChroma || {}), ...next } }));
  const patchColor = (key: keyof PrismChromaThemeColors, value: string) =>
    patch({ colors: { ...(raw.colors || {}), [key]: value } });

  const tabs: Array<{ id: EditorTab; label: string; icon: React.ReactNode }> = [
    { id: 'brand', label: 'Brand & Hero', icon: <Sparkles size={15} aria-hidden="true" /> },
    { id: 'shades', label: 'Shade Studio', icon: <Palette size={15} aria-hidden="true" /> },
    { id: 'packages', label: 'Packages', icon: <Sparkles size={15} aria-hidden="true" /> },
    { id: 'results', label: 'Before & After', icon: <Images size={15} aria-hidden="true" /> },
    { id: 'journey', label: 'Journey & Care', icon: <ListChecks size={15} aria-hidden="true" /> },
    { id: 'branches', label: 'Branches & FAQs', icon: <MapPin size={15} aria-hidden="true" /> },
    { id: 'reviews', label: 'Reviews', icon: <MessageSquareQuote size={15} aria-hidden="true" /> },
    { id: 'seo', label: 'SEO & Share', icon: <Sparkles size={15} aria-hidden="true" /> },
    { id: 'colors', label: 'Brand Colours', icon: <Palette size={15} aria-hidden="true" /> },
  ];

  return (
    <section className="workspace-card space-y-4" aria-label="Prism and Chroma Template 10 editor">
      <div>
        <h3 className="font-bold text-slate-900">Prism &amp; Chroma (Template 10) — website content</h3>
        <p className="text-xs text-slate-500">
          Edit your hero, Shade Studio, branches, reviews and brand colours. Salon name, logo, phone, city,
          services, prices and team are edited in the normal onboarding steps — this template fills them in on its own.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Prism and Chroma editor sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${tab === t.id ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'brand' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {showBrandIdentityFields && (
            <>
              <TextField label="Salon name" value={profile.businessName} onChange={(v) => setProfile((p) => ({ ...p, businessName: v }))} />
              <TextField label="Tagline" value={profile.tagline} onChange={(v) => setProfile((p) => ({ ...p, tagline: v }))} />
              <TextField label="Phone" value={profile.phone} onChange={(v) => setProfile((p) => ({ ...p, phone: v }))} />
              <TextField label="City" value={profile.city} onChange={(v) => setProfile((p) => ({ ...p, city: v }))} />
            </>
          )}
          <TextField label="Hero heading" value={raw.heroHeading || ''} placeholder={config.heroHeading} onChange={(v) => patch({ heroHeading: v })} />
          <TextField label="Public email" value={raw.publicEmail || ''} placeholder={config.publicEmail} onChange={(v) => patch({ publicEmail: v })} />
          <div className="sm:col-span-2">
            <AreaField label="Hero small text" value={raw.heroSubtext || ''} placeholder={config.heroSubtext} onChange={(v) => patch({ heroSubtext: v })} />
          </div>
          <TextField label="About heading" value={raw.aboutHeading || ''} placeholder={config.aboutHeading} onChange={(v) => patch({ aboutHeading: v })} />
          <TextField label="Timings text" value={raw.workingHoursDisplay || ''} placeholder={config.workingHoursDisplay} onChange={(v) => patch({ workingHoursDisplay: v })} />
          <TextField label="Google Maps embed URL (optional)" value={raw.mapEmbedUrl || ''} placeholder="Leave empty — the map is made from your address" onChange={(v) => patch({ mapEmbedUrl: v })} />
          <TextField label="Offer bar text (top of site, optional)" value={raw.announcementText || ''} placeholder="e.g. Flat 20% off on Balayage this week" onChange={(v) => patch({ announcementText: v })} />
          <TextField label="Offer bar button label" value={raw.announcementCtaLabel || ''} placeholder="See Offer" onChange={(v) => patch({ announcementCtaLabel: v })} />
          <TextField label="Opens at (24h, e.g. 10:00)" value={raw.openTime || ''} placeholder="10:00" onChange={(v) => patch({ openTime: v })} />
          <TextField label="Closes at (24h, e.g. 20:30)" value={raw.closeTime || ''} placeholder="20:30" onChange={(v) => patch({ closeTime: v })} />
          <div className="sm:col-span-2">
            <span className={labelCls}>About / hero stat cards (value | label, one per line)</span>
            <textarea
              className={inputCls}
              rows={4}
              value={config.stats.map((s) => `${s.value} | ${s.label}`).join('\n')}
              onChange={(e) => patch({ stats: e.target.value.split('\n').map((line, i) => { const [value, ...rest] = line.split('|'); return { id: config.stats[i]?.id || `pc-stat-${i + 1}`, value: (value || '').trim(), label: rest.join('|').trim() }; }).filter((s) => s.value || s.label) })}
            />
          </div>
          <div className="sm:col-span-2">
            <AreaField label="About your studio (story)" value={raw.aboutStory || ''} placeholder={config.aboutStory} rows={4} onChange={(v) => patch({ aboutStory: v })} />
          </div>
          <BrandImageField label="Logo" logo value={profile.logoUrl || ''} onChange={(url) => setProfile((p) => ({ ...p, logoUrl: url }))} hint="Shown in the top bar and footer. Leave empty to use your salon name." />
          <BrandImageField label="Hero photo (vivid colour model)" value={raw.heroImageUrl || ''} onChange={(url) => patch({ heroImageUrl: url })} hint="Leave empty to use the Template 10 hero photo." />
          <BrandImageField label="About photo (colour mixing)" value={raw.aboutImageUrl || ''} onChange={(url) => patch({ aboutImageUrl: url })} hint="Leave empty to use the Template 10 about photo." />
          <BrandImageField label="Booking section photo" value={raw.bookingImageUrl || ''} onChange={(url) => patch({ bookingImageUrl: url })} hint="Shown in the big Book Now section at the bottom." />
        </div>
      )}

      {tab === 'shades' && (
        <div className="space-y-3">
          <TextField label="Shade Studio heading" value={raw.shadesHeading || ''} placeholder={config.shadesHeading} onChange={(v) => patch({ shadesHeading: v })} />
          <AreaField label="Shade Studio small text" value={raw.shadesSubtext || ''} placeholder={config.shadesSubtext} onChange={(v) => patch({ shadesSubtext: v })} />
          {config.shades.map((shade, idx) => (
            <div key={shade.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-4">
              <TextField label={`Shade ${idx + 1} name`} value={shade.name} onChange={(v) => { const next = [...config.shades]; next[idx] = { ...shade, name: v }; patch({ shades: next }); }} />
              <label className="block">
                <span className={labelCls}>Swatch colour</span>
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(shade.swatch) ? shade.swatch : '#7C5CFF'} onChange={(e) => { const next = [...config.shades]; next[idx] = { ...shade, swatch: e.target.value }; patch({ shades: next }); }} className="h-10 w-full rounded-lg border border-slate-300 bg-white p-1" />
              </label>
              <TextField label="Price (₹)" value={String(shade.price)} onChange={(v) => { const next = [...config.shades]; next[idx] = { ...shade, price: Number(v.replace(/[^0-9]/g, '')) || shade.price }; patch({ shades: next }); }} />
              <div className="flex items-end gap-2">
                <button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50" onClick={() => patch({ shades: config.shades.filter((s) => s.id !== shade.id) })} aria-label={`Remove shade ${shade.name}`}>
                  <Trash2 size={14} aria-hidden="true" /> Remove
                </button>
              </div>
              <div className="sm:col-span-4">
                <AreaField label="One line about the shade" value={shade.blurb} rows={2} onChange={(v) => { const next = [...config.shades]; next[idx] = { ...shade, blurb: v }; patch({ shades: next }); }} />
              </div>
              <div className="sm:col-span-4">
                <BrandImageField label={`Shade photo — ${shade.name}`} value={shade.imageUrl} onChange={(url) => { const next = [...config.shades]; next[idx] = { ...shade, imageUrl: url }; patch({ shades: next }); }} hint="Leave empty to keep the Template 10 shade photo." />
              </div>
              <label className="block">
                <span className={labelCls}>Shade family (for Find-My-Shade quiz)</span>
                <select className={inputCls} value={shade.family || 'vivid'} onChange={(e) => { const next = [...config.shades]; next[idx] = { ...shade, family: e.target.value }; patch({ shades: next }); }}>
                  <option value="vivid">Bold &amp; bright (vivid)</option>
                  <option value="pastel">Soft pastel</option>
                  <option value="natural">Natural &amp; sunny</option>
                  <option value="warm">Warm glow</option>
                  <option value="cool">Cool &amp; icy</option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Home-care level</span>
                <select className={inputCls} value={String(shade.maintenanceLevel || 3)} onChange={(e) => { const next = [...config.shades]; next[idx] = { ...shade, maintenanceLevel: Number(e.target.value) }; patch({ shades: next }); }}>
                  <option value="1">1 — Very easy</option>
                  <option value="2">2 — Easy</option>
                  <option value="3">3 — Some care</option>
                  <option value="4">4 — High care</option>
                  <option value="5">5 — Very high care</option>
                </select>
              </label>
              <TextField label="Stays fresh for" value={shade.longevityWeeks || ''} placeholder="6-8 weeks" onChange={(v) => { const next = [...config.shades]; next[idx] = { ...shade, longevityWeeks: v }; patch({ shades: next }); }} />
              <TextField label="Undertone" value={shade.undertone || ''} placeholder="Cool / Warm / Neutral" onChange={(v) => { const next = [...config.shades]; next[idx] = { ...shade, undertone: v }; patch({ shades: next }); }} />
              <TextField label="Best for" value={shade.bestFor || ''} placeholder="Who this shade suits" onChange={(v) => { const next = [...config.shades]; next[idx] = { ...shade, bestFor: v }; patch({ shades: next }); }} />
              <TextField label="Home-care tip" value={shade.careTip || ''} placeholder="One simple care tip" onChange={(v) => { const next = [...config.shades]; next[idx] = { ...shade, careTip: v }; patch({ shades: next }); }} />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white" onClick={() => patch({ shades: [...config.shades, { id: `pc-sh-${Date.now()}`, name: 'New Shade', swatch: '#7C5CFF', tintFilter: 'saturate(1.3)', price: 4999, blurb: 'A fresh new shade, mixed just for you.', imageUrl: config.shades[0]?.imageUrl || '' } as PrismChromaShade] })}>
              <Plus size={14} aria-hidden="true" /> Add shade
            </button>
            <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700" onClick={() => patch({ shades: PRISM_CHROMA_DEFAULT_SHADES })}>
              <RotateCcw size={14} aria-hidden="true" /> Reset shades
            </button>
          </div>
        </div>
      )}

      {tab === 'packages' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">The three glass package cards on your site. Prices here are display prices — the bookable package services are edited in Services.</p>
          {config.packages.map((pkg, idx) => (
            <div key={pkg.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-3">
              <TextField label={`Package ${idx + 1} name`} value={pkg.tier} onChange={(v) => { const next = [...config.packages]; next[idx] = { ...pkg, tier: v }; patch({ packages: next }); }} />
              <TextField label="Price (₹)" value={String(pkg.price)} onChange={(v) => { const next = [...config.packages]; next[idx] = { ...pkg, price: Number(v.replace(/[^0-9]/g, '')) || pkg.price }; patch({ packages: next }); }} />
              <TextField label="Badge (optional)" value={pkg.badgeLabel || ''} onChange={(v) => { const next = [...config.packages]; next[idx] = { ...pkg, badgeLabel: v }; patch({ packages: next }); }} />
              <div className="sm:col-span-2">
                <AreaField label="What is included (one per line)" value={pkg.includes.join('\n')} rows={4} onChange={(v) => { const next = [...config.packages]; next[idx] = { ...pkg, includes: v.split('\n').map((s) => s.trim()).filter(Boolean) }; patch({ packages: next }); }} />
              </div>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input type="checkbox" checked={Boolean(pkg.popular)} onChange={(e) => { const next = [...config.packages]; next[idx] = { ...pkg, popular: e.target.checked }; patch({ packages: next }); }} /> Highlight this package
                </label>
                <button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50" onClick={() => patch({ packages: config.packages.filter((x) => x.id !== pkg.id) })} aria-label={`Remove package ${pkg.tier}`}>
                  <Trash2 size={14} aria-hidden="true" /> Remove
                </button>
              </div>
              <div className="sm:col-span-3">
                <BrandImageField label={`Package photo — ${pkg.tier}`} value={pkg.imageUrl} onChange={(url) => { const next = [...config.packages]; next[idx] = { ...pkg, imageUrl: url }; patch({ packages: next }); }} hint="Leave empty to keep the Template 10 package photo." />
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white" onClick={() => patch({ packages: [...config.packages, { id: `pc-pack-${Date.now()}`, tier: 'New Package', price: 2999, imageUrl: config.packages[0]?.imageUrl || '', includes: ['Add what is included'], linkedServiceId: '' }] })}>
              <Plus size={14} aria-hidden="true" /> Add package
            </button>
            <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700" onClick={() => patch({ packages: PRISM_CHROMA_DEFAULT_PACKAGES })}>
              <RotateCcw size={14} aria-hidden="true" /> Reset packages
            </button>
          </div>
        </div>
      )}

      {tab === 'results' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">The three Before / After sliders on your site. Upload matching before and after photos for the truest result.</p>
          {config.beforeAfter.map((item, idx) => (
            <div key={item.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
              <TextField label={`Result ${idx + 1} title`} value={item.title} onChange={(v) => { const next = [...config.beforeAfter]; next[idx] = { ...item, title: v }; patch({ beforeAfter: next }); }} />
              <TextField label="Service used" value={item.serviceLabel || ''} placeholder="Signature Balayage" onChange={(v) => { const next = [...config.beforeAfter]; next[idx] = { ...item, serviceLabel: v }; patch({ beforeAfter: next }); }} />
              <TextField label="Sittings note" value={item.sessionsNote || ''} placeholder="Done in 1 sitting (about 3 hours)" onChange={(v) => { const next = [...config.beforeAfter]; next[idx] = { ...item, sessionsNote: v }; patch({ beforeAfter: next }); }} />
              <TextField label="Done by (expert first name)" value={item.stylistName || ''} placeholder="Kiara" onChange={(v) => { const next = [...config.beforeAfter]; next[idx] = { ...item, stylistName: v }; patch({ beforeAfter: next }); }} />
              <BrandImageField label="Before photo" value={item.beforeUrl} onChange={(url) => { const next = [...config.beforeAfter]; next[idx] = { ...item, beforeUrl: url }; patch({ beforeAfter: next }); }} />
              <BrandImageField label="After photo" value={item.afterUrl} onChange={(url) => { const next = [...config.beforeAfter]; next[idx] = { ...item, afterUrl: url }; patch({ beforeAfter: next }); }} />
              <div className="sm:col-span-2">
                <button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50" onClick={() => patch({ beforeAfter: config.beforeAfter.filter((x) => x.id !== item.id) })} aria-label={`Remove result ${item.title}`}>
                  <Trash2 size={14} aria-hidden="true" /> Remove result
                </button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white" onClick={() => patch({ beforeAfter: [...config.beforeAfter, { id: `pc-ba-${Date.now()}`, title: 'New transformation', beforeUrl: config.beforeAfter[0]?.beforeUrl || '', afterUrl: config.beforeAfter[0]?.afterUrl || '', beforeAlt: 'Hair before colour', afterAlt: 'Hair after colour', serviceLabel: '', sessionsNote: '', stylistName: '' }] })}>
              <Plus size={14} aria-hidden="true" /> Add result
            </button>
            <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700" onClick={() => patch({ beforeAfter: PRISM_CHROMA_DEFAULT_BEFORE_AFTER })}>
              <RotateCcw size={14} aria-hidden="true" /> Reset results
            </button>
          </div>
        </div>
      )}

      {tab === 'journey' && (
        <div className="space-y-5">
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900">Visit steps (Step by Step section)</h4>
            {config.processSteps.map((step, idx) => (
              <div key={step.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                <TextField label={`Step ${idx + 1} title`} value={step.title} onChange={(v) => { const next = [...config.processSteps]; next[idx] = { ...step, title: v }; patch({ processSteps: next }); }} />
                <TextField label="Time it takes" value={step.durationLabel || ''} placeholder="15 mins" onChange={(v) => { const next = [...config.processSteps]; next[idx] = { ...step, durationLabel: v }; patch({ processSteps: next }); }} />
                <div className="sm:col-span-2">
                  <AreaField label="What happens" value={step.text} rows={2} onChange={(v) => { const next = [...config.processSteps]; next[idx] = { ...step, text: v }; patch({ processSteps: next }); }} />
                </div>
                <div className="sm:col-span-2">
                  <AreaField label="Check points (one per line)" value={(step.points || []).join('\n')} rows={3} onChange={(v) => { const next = [...config.processSteps]; next[idx] = { ...step, points: v.split('\n').map((s) => s.trim()).filter(Boolean) }; patch({ processSteps: next }); }} />
                </div>
                <div className="sm:col-span-2">
                  <BrandImageField label={`Step photo — ${step.title}`} value={step.image} onChange={(url) => { const next = [...config.processSteps]; next[idx] = { ...step, image: url }; patch({ processSteps: next }); }} />
                </div>
              </div>
            ))}
            <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700" onClick={() => patch({ processSteps: PRISM_CHROMA_DEFAULT_PROCESS_STEPS })}>
              <RotateCcw size={14} aria-hidden="true" /> Reset steps
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-900">Colour Care Guide (after-visit timeline)</h4>
            {config.careGuide.map((step, idx) => (
              <div key={step.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                <TextField label="When" value={step.when} placeholder="Week 1" onChange={(v) => { const next = [...config.careGuide]; next[idx] = { ...step, when: v }; patch({ careGuide: next }); }} />
                <TextField label="Title" value={step.title} onChange={(v) => { const next = [...config.careGuide]; next[idx] = { ...step, title: v }; patch({ careGuide: next }); }} />
                <div className="sm:col-span-2">
                  <AreaField label="Care advice" value={step.text} rows={2} onChange={(v) => { const next = [...config.careGuide]; next[idx] = { ...step, text: v }; patch({ careGuide: next }); }} />
                </div>
                <div className="sm:col-span-2">
                  <button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50" onClick={() => patch({ careGuide: config.careGuide.filter((x) => x.id !== step.id) })} aria-label={`Remove care step ${step.title}`}>
                    <Trash2 size={14} aria-hidden="true" /> Remove
                  </button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white" onClick={() => patch({ careGuide: [...config.careGuide, { id: `pc-care-${Date.now()}`, when: 'Week 2', title: 'New care step', text: 'Write the care advice here.' }] })}>
                <Plus size={14} aria-hidden="true" /> Add care step
              </button>
              <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700" onClick={() => patch({ careGuide: PRISM_CHROMA_DEFAULT_CARE_GUIDE })}>
                <RotateCcw size={14} aria-hidden="true" /> Reset care guide
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'branches' && (
        <div className="space-y-3">
          {config.branches.map((branch, idx) => (
            <div key={branch.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-3">
              <TextField label="City / branch name" value={branch.name} onChange={(v) => { const next = [...config.branches]; next[idx] = { ...branch, name: v }; patch({ branches: next }); }} />
              <TextField label="Area" value={branch.area} onChange={(v) => { const next = [...config.branches]; next[idx] = { ...branch, area: v }; patch({ branches: next }); }} />
              <TextField label="Phone" value={branch.phone || ''} onChange={(v) => { const next = [...config.branches]; next[idx] = { ...branch, phone: v }; patch({ branches: next }); }} />
              <div className="sm:col-span-2">
                <TextField label="Full address" value={branch.address} onChange={(v) => { const next = [...config.branches]; next[idx] = { ...branch, address: v }; patch({ branches: next }); }} />
              </div>
              <TextField label="Hours" value={branch.hours || ''} onChange={(v) => { const next = [...config.branches]; next[idx] = { ...branch, hours: v }; patch({ branches: next }); }} />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white" onClick={() => patch({ branches: [...config.branches, { id: `pc-br-${Date.now()}`, name: 'New City', area: '', address: '', hours: '10:00 AM - 8:30 PM' } as PrismChromaBranch] })}>
              <Plus size={14} aria-hidden="true" /> Add branch
            </button>
            <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700" onClick={() => patch({ branches: PRISM_CHROMA_DEFAULT_BRANCHES })}>
              <RotateCcw size={14} aria-hidden="true" /> Reset branches
            </button>
          </div>
          <h4 className="flex items-center gap-1 pt-2 font-bold text-slate-900"><HelpCircle size={15} aria-hidden="true" /> FAQs</h4>
          {config.faqs.map((faq, idx) => (
            <div key={faq.id} className="grid gap-2 rounded-xl border border-slate-200 p-3">
              <TextField label={`Question ${idx + 1}`} value={faq.question} onChange={(v) => { const next = [...config.faqs]; next[idx] = { ...faq, question: v }; patch({ faqs: next }); }} />
              <AreaField label="Answer" value={faq.answer} rows={2} onChange={(v) => { const next = [...config.faqs]; next[idx] = { ...faq, answer: v }; patch({ faqs: next }); }} />
              <TextField label="Topic (filter chip on site)" value={faq.category || ''} placeholder="Colour Care / Hair Health / Booking / Pricing" onChange={(v) => { const next = [...config.faqs]; next[idx] = { ...faq, category: v }; patch({ faqs: next }); }} />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white" onClick={() => patch({ faqs: [...config.faqs, { id: `pc-faq-${Date.now()}`, question: 'New question?', answer: 'Write the answer here.' } as PrismChromaFaqItem] })}>
              <Plus size={14} aria-hidden="true" /> Add FAQ
            </button>
            <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700" onClick={() => patch({ faqs: PRISM_CHROMA_DEFAULT_FAQS })}>
              <RotateCcw size={14} aria-hidden="true" /> Reset FAQs
            </button>
          </div>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="space-y-3">
          {config.reviews.map((rev, idx) => (
            <div key={rev.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-3">
              <TextField label="Client name" value={rev.name} onChange={(v) => { const next = [...config.reviews]; next[idx] = { ...rev, name: v }; patch({ reviews: next }); }} />
              <TextField label="City / area" value={rev.tag} onChange={(v) => { const next = [...config.reviews]; next[idx] = { ...rev, tag: v }; patch({ reviews: next }); }} />
              <TextField label="Rating (1-5)" value={String(rev.rating)} onChange={(v) => { const next = [...config.reviews]; next[idx] = { ...rev, rating: Math.min(5, Math.max(1, Number(v) || 5)) }; patch({ reviews: next }); }} />
              <div className="sm:col-span-3">
                <AreaField label="What the client said" value={rev.quote} rows={2} onChange={(v) => { const next = [...config.reviews]; next[idx] = { ...rev, quote: v }; patch({ reviews: next }); }} />
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white" onClick={() => patch({ reviews: [...config.reviews, { id: `pc-rev-${Date.now()}`, name: 'New Client', tag: profile.city || 'Mumbai', rating: 5, quote: 'Lovely colour and very caring team.', avatarUrl: '' } as PrismChromaReviewItem] })}>
              <Plus size={14} aria-hidden="true" /> Add review
            </button>
            <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700" onClick={() => patch({ reviews: PRISM_CHROMA_DEFAULT_REVIEWS })}>
              <RotateCcw size={14} aria-hidden="true" /> Reset reviews
            </button>
          </div>
        </div>
      )}

      {tab === 'seo' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="text-xs text-slate-500 sm:col-span-2">
            These lines appear on Google search and when your site link is shared on WhatsApp. Leave empty to use the automatic Template 10 text with your salon name and city.
          </p>
          <TextField label="Google title (meta title)" value={profile.seo?.metaTitle || ''} placeholder="Salon name | Hair Colour Studio in City" onChange={(v) => setProfile({ ...profile, seo: { ...profile.seo, metaTitle: v } })} />
          <TextField label="Share title (WhatsApp / social)" value={profile.seo?.ogTitle || ''} placeholder="Same as Google title if empty" onChange={(v) => setProfile({ ...profile, seo: { ...profile.seo, ogTitle: v } })} />
          <div className="sm:col-span-2">
            <AreaField label="Google description (meta description)" value={profile.seo?.metaDescription || ''} rows={3} onChange={(v) => setProfile({ ...profile, seo: { ...profile.seo, metaDescription: v } })} />
          </div>
          <div className="sm:col-span-2">
            <AreaField label="Share description" value={profile.seo?.ogDescription || ''} rows={2} onChange={(v) => setProfile({ ...profile, seo: { ...profile.seo, ogDescription: v } })} />
          </div>
          <TextField label="Keywords (comma separated)" value={profile.seo?.keywords || ''} placeholder="balayage in Mumbai, hair colour, keratin" onChange={(v) => setProfile({ ...profile, seo: { ...profile.seo, keywords: v } })} />
          <BrandImageField label="Share photo (Open Graph image)" value={profile.seo?.ogImageUrl || ''} onChange={(url) => setProfile({ ...profile, seo: { ...profile.seo, ogImageUrl: url } })} hint="Shown when your link is shared. Leave empty to use the Template 10 hero photo." />
        </div>
      )}

      {tab === 'colors' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">These colours drive the whole Template 10 look — background, gradient glow, buttons and swatches. Changes apply at once.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {COLOR_FIELDS.map((field) => (
              <label key={field.key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(config.colors[field.key]) ? config.colors[field.key] : '#7C5CFF'}
                  onChange={(e) => patchColor(field.key, e.target.value)}
                  className="h-10 w-14 shrink-0 rounded-lg border border-slate-300 bg-white p-1"
                  aria-label={`${field.label} colour picker`}
                />
                <span>
                  <span className="block text-xs font-bold text-slate-800">{field.label}</span>
                  <span className="block text-[11px] text-slate-500">{field.hint} · {config.colors[field.key]}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="h-3 rounded-full" style={{ background: `linear-gradient(120deg, ${config.colors.violet}, ${config.colors.magenta}, ${config.colors.coral}, ${config.colors.cyan})` }} aria-hidden="true" />
          <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700" onClick={() => patch({ colors: { ...PRISM_CHROMA_DEFAULT_COLORS } })}>
            <RotateCcw size={14} aria-hidden="true" /> Reset to Prism colours
          </button>
        </div>
      )}
    </section>
  );
}

import React, { useState } from 'react';
import {
  GraduationCap,
  HelpCircle,
  Image as ImageIcon,
  MessageSquareQuote,
  Palette,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  SalonProfile,
  VogueNoirAcademyCourse,
  VogueNoirBeforeAfterItem,
  VogueNoirBridalPackage,
  VogueNoirConfig,
  VogueNoirFaqItem,
  VogueNoirPortfolioCategory,
  VogueNoirPortfolioItem,
  VogueNoirReviewItem,
  VogueNoirThemeColors,
} from '../../types';
import {
  VOGUE_NOIR_DEFAULT_BEFORE_AFTER,
  VOGUE_NOIR_DEFAULT_BRIDAL_PACKAGES,
  VOGUE_NOIR_DEFAULT_COLORS,
  VOGUE_NOIR_DEFAULT_COURSES,
  VOGUE_NOIR_DEFAULT_FAQS,
  VOGUE_NOIR_DEFAULT_PORTFOLIO,
  VOGUE_NOIR_DEFAULT_REVIEWS,
  VOGUE_NOIR_IMAGES,
  resolveVogueNoirConfig,
  upcomingAcademyBatchDates,
  type ResolvedVogueNoirConfig,
} from '../../lib/vogueNoir';
import { BrandImageField } from '../BrandImageField';

type EditorTab =
  | 'brand'
  | 'colors'
  | 'packages'
  | 'academy'
  | 'portfolio'
  | 'reviews'
  | 'faqs';

const COLOR_FIELDS: Array<{ key: keyof VogueNoirThemeColors; label: string; cssVar: string }> = [
  { key: 'bgPrimary', label: 'Primary Background (Deep Noir)', cssVar: '--bg-primary' },
  { key: 'bgSurface', label: 'Elevated Surface', cssVar: '--bg-secondary' },
  { key: 'borderSubtle', label: 'Subtle Border', cssVar: '--border-subtle' },
  { key: 'accentGold', label: 'Champagne Gold Accent', cssVar: '--accent-gold' },
  { key: 'textPrimary', label: 'Primary Ivory Text', cssVar: '--text-primary' },
  { key: 'textMuted', label: 'Muted Warm Grey Text', cssVar: '--text-muted' },
  { key: 'highlightBlush', label: 'Soft Rose Blush Highlight', cssVar: '--highlight-blush' },
];

const PORTFOLIO_CATEGORIES: VogueNoirPortfolioCategory[] = [
  'Bridal',
  'Party',
  'Editorial',
  'Academy Work',
];

export function VogueNoirEditor({
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
  const resolved = resolveVogueNoirConfig(profile);
  const autoBatches = upcomingAcademyBatchDates(new Date(), 4);

  const patchVogueNoir = (
    updater: (current: ResolvedVogueNoirConfig) => Partial<VogueNoirConfig>,
  ) => {
    setProfile((prev) => {
      const curr = resolveVogueNoirConfig(prev);
      const nextPatch = updater(curr);
      const nextVn: VogueNoirConfig = {
        ...prev.vogueNoir,
        ...nextPatch,
      };
      return {
        ...prev,
        ...(nextPatch.colors?.accentGold
          ? { customAccentColor: nextPatch.colors.accentGold }
          : {}),
        ...(nextPatch.heroDesktopUrl
          ? { coverImageUrl: nextPatch.heroDesktopUrl }
          : {}),
        vogueNoir: nextVn,
      };
    });
  };

  return (
    <section
      className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white space-y-5"
      aria-labelledby="vn-editor-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full mb-1.5">
            Template 08 · Vogue Noir
          </span>
          <h3 id="vn-editor-heading" className="text-lg font-bold text-slate-900">
            Vogue Noir Studio &amp; Academy Controls
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Customize your luxury dark-editorial storefront, Bridal Packages, optional Makeup Academy module, Lookbook, and theme colors.
          </p>
        </div>

        <label className="inline-flex items-center gap-2.5 border border-slate-300 rounded-xl px-3.5 py-2 bg-slate-50 cursor-pointer text-sm font-semibold text-slate-900">
          <input
            type="checkbox"
            checked={resolved.academyEnabled}
            onChange={(e) =>
              patchVogueNoir(() => ({ academyEnabled: e.target.checked }))
            }
          />
          <GraduationCap size={16} className="text-amber-700" />
          <span>Makeup Academy Section ({resolved.academyEnabled ? 'ON' : 'OFF'})</span>
        </label>
      </div>

      {/* Navigation Tabs */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Vogue Noir customization tabs"
      >
        {(
          [
            ['brand', 'Hero, About & Contact', Sparkles],
            ['colors', 'Theme Colors', Palette],
            ['packages', `Bridal Packages (${resolved.bridalPackages.length})`, Sparkles],
            ['academy', `Academy (${resolved.academyEnabled ? 'ON' : 'OFF'})`, GraduationCap],
            ['portfolio', `Portfolio & Sliders (${resolved.portfolio.length})`, ImageIcon],
            ['reviews', `Reviews (${resolved.reviews.length})`, MessageSquareQuote],
            ['faqs', `FAQs (${resolved.faqs.length})`, HelpCircle],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition ${
              tab === id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: BRAND, HERO, ABOUT & CONTACT */}
      {tab === 'brand' && (
        <div className="space-y-5">
          {showBrandIdentityFields && (
            <div className="form-grid">
              <label>
                <span className="field-label">Brand Name</span>
                <input
                  className="workspace-input"
                  value={profile.businessName}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, businessName: e.target.value }))
                  }
                />
              </label>
              <label>
                <span className="field-label">Phone Number</span>
                <input
                  className="workspace-input"
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, phone: e.target.value }))
                  }
                />
              </label>
              <label>
                <span className="field-label">WhatsApp Number</span>
                <input
                  className="workspace-input"
                  value={profile.whatsapp}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, whatsapp: e.target.value }))
                  }
                />
              </label>
              <label>
                <span className="field-label">City</span>
                <input
                  className="workspace-input"
                  value={profile.city}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, city: e.target.value }))
                  }
                />
              </label>
              <label className="sm:col-span-2">
                <span className="field-label">Studio Address</span>
                <input
                  className="workspace-input"
                  value={profile.address}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, address: e.target.value }))
                  }
                />
              </label>
            </div>
          )}

          <div className="form-grid">
            <label>
              <span className="field-label">Hero Headline</span>
              <input
                className="workspace-input"
                maxLength={140}
                value={resolved.heroHeading}
                onChange={(e) =>
                  patchVogueNoir(() => ({ heroHeading: e.target.value }))
                }
              />
            </label>
            <label>
              <span className="field-label">Working Hours Display</span>
              <input
                className="workspace-input"
                maxLength={160}
                value={resolved.workingHoursDisplay}
                onChange={(e) =>
                  patchVogueNoir(() => ({ workingHoursDisplay: e.target.value }))
                }
              />
            </label>
            <label className="sm:col-span-2">
              <span className="field-label">Hero Subtext / Tagline</span>
              <textarea
                className="workspace-input"
                rows={2}
                maxLength={320}
                value={resolved.heroSubtext}
                onChange={(e) => {
                  const val = e.target.value;
                  setProfile((p) => ({
                    ...p,
                    tagline: val,
                    vogueNoir: { ...p.vogueNoir, heroSubtext: val },
                  }));
                }}
              />
            </label>
            <label>
              <span className="field-label">Public Studio Email</span>
              <input
                type="email"
                className="workspace-input"
                value={resolved.publicEmail}
                onChange={(e) =>
                  patchVogueNoir(() => ({ publicEmail: e.target.value }))
                }
              />
            </label>
            <label>
              <span className="field-label">Google Maps Embed URL (optional https://www.google.com/maps/embed?...)</span>
              <input
                type="url"
                className="workspace-input"
                placeholder="https://www.google.com/maps/embed?pb=..."
                value={resolved.mapEmbedUrl}
                onChange={(e) =>
                  patchVogueNoir(() => ({ mapEmbedUrl: e.target.value }))
                }
              />
            </label>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <BrandImageField
              label="Studio Logo"
              logo
              uploadName="Studio Logo"
              value={profile.logoUrl || VOGUE_NOIR_IMAGES.logoSvg}
              onChange={(url) => setProfile((p) => ({ ...p, logoUrl: url }))}
            />
            <BrandImageField
              label="Desktop Hero Image (1920×1080)"
              uploadName="Desktop Hero"
              value={resolved.heroDesktopUrl}
              onChange={(url) => patchVogueNoir(() => ({ heroDesktopUrl: url }))}
            />
            <BrandImageField
              label="Mobile Hero Image (900×1400)"
              uploadName="Mobile Hero"
              value={resolved.heroMobileUrl}
              onChange={(url) => patchVogueNoir(() => ({ heroMobileUrl: url }))}
            />
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-4">
            <h4 className="font-bold text-sm text-slate-900">About Studio &amp; Milestone Counters</h4>
            <div className="form-grid">
              <label>
                <span className="field-label">About Section Heading</span>
                <input
                  className="workspace-input"
                  value={resolved.aboutHeading}
                  onChange={(e) =>
                    patchVogueNoir(() => ({ aboutHeading: e.target.value }))
                  }
                />
              </label>
              <BrandImageField
                label="About Studio Portrait (1000×1200)"
                uploadName="About Image"
                value={resolved.aboutImageUrl}
                onChange={(url) => patchVogueNoir(() => ({ aboutImageUrl: url }))}
              />
              <label className="sm:col-span-2">
                <span className="field-label">About Studio Story</span>
                <textarea
                  className="workspace-input"
                  rows={3}
                  value={resolved.aboutStory}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfile((p) => ({
                      ...p,
                      about: val,
                      vogueNoir: { ...p.vogueNoir, aboutStory: val },
                    }));
                  }}
                />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {resolved.stats.map((stat, idx) => (
                <div key={stat.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Stat #{idx + 1} Value
                    <input
                      className="workspace-input mt-1"
                      value={stat.value}
                      onChange={(e) => {
                        const val = e.target.value;
                        patchVogueNoir((curr) => ({
                          stats: curr.stats.map((s, i) =>
                            i === idx ? { ...s, value: val } : s,
                          ),
                        }));
                      }}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">
                    Stat #{idx + 1} Label
                    <input
                      className="workspace-input mt-1"
                      value={stat.label}
                      onChange={(e) => {
                        const val = e.target.value;
                        patchVogueNoir((curr) => ({
                          stats: curr.stats.map((s, i) =>
                            i === idx ? { ...s, label: val } : s,
                          ),
                        }));
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: THEME COLORS */}
      {tab === 'colors' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600">
              All 7 CSS theme variables update live across your Vogue Noir storefront.
            </p>
            <button
              type="button"
              className="secondary-action text-xs inline-flex items-center gap-1.5"
              onClick={() =>
                patchVogueNoir(() => ({ colors: { ...VOGUE_NOIR_DEFAULT_COLORS } }))
              }
            >
              <RotateCcw size={13} /> Reset to Default Noir &amp; Gold
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {COLOR_FIELDS.map(({ key, label, cssVar }) => (
              <label
                key={key}
                className="border border-slate-200 rounded-xl p-3 flex items-center gap-3 bg-slate-50"
              >
                <input
                  type="color"
                  aria-label={label}
                  value={resolved.colors[key]}
                  onChange={(e) => {
                    const hex = e.target.value;
                    patchVogueNoir((curr) => ({
                      colors: { ...curr.colors, [key]: hex },
                    }));
                  }}
                  className="w-10 h-10 rounded cursor-pointer border border-slate-300 bg-transparent p-0"
                />
                <div className="min-w-0 flex-1">
                  <strong className="block text-xs text-slate-900 truncate">{label}</strong>
                  <code className="block text-[11px] text-slate-500">
                    {cssVar}: {resolved.colors[key]}
                  </code>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BRIDAL PACKAGES */}
      {tab === 'packages' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600">
              Configure your signature Bridal Package tiers (Classic, Signature, Royal). Each inclusion line renders with a gold check mark.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="secondary-action text-xs inline-flex items-center gap-1"
                onClick={() =>
                  patchVogueNoir((curr) => ({
                    bridalPackages: [
                      ...curr.bridalPackages,
                      {
                        id: `vn-tier-${Date.now()}`,
                        tier: 'Destination Bride',
                        price: 75000,
                        popular: false,
                        badgeLabel: 'Destination Suite',
                        imageUrl: VOGUE_NOIR_IMAGES.packages.royal,
                        imageAlt: 'Destination bridal makeup look',
                        inclusions: [
                          'Multi-day Bridal Makeup & Hair',
                          'Dedicated Senior Artist Team',
                          'Luxury Skin Prep & Lashes',
                        ],
                      },
                    ],
                  }))
                }
              >
                <Plus size={14} /> Add Tier
              </button>
              <button
                type="button"
                className="secondary-action text-xs inline-flex items-center gap-1"
                onClick={() =>
                  patchVogueNoir(() => ({
                    bridalPackages: VOGUE_NOIR_DEFAULT_BRIDAL_PACKAGES.map((p) => ({
                      ...p,
                      inclusions: [...p.inclusions],
                    })),
                  }))
                }
              >
                <RotateCcw size={13} /> Reset Defaults
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {resolved.bridalPackages.map((tier, idx) => {
              const updateTier = (changes: Partial<VogueNoirBridalPackage>) =>
                patchVogueNoir((curr) => ({
                  bridalPackages: curr.bridalPackages.map((item, i) =>
                    i === idx ? { ...item, ...changes } : item,
                  ),
                }));
              return (
                <div
                  key={tier.id}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm text-slate-900">
                      Tier #{idx + 1}: {tier.tier}
                    </strong>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(tier.popular)}
                          onChange={(e) => updateTier({ popular: e.target.checked })}
                        />
                        Highlight as Most Popular
                      </label>
                      {resolved.bridalPackages.length > 1 && (
                        <button
                          type="button"
                          className="text-red-700 text-xs inline-flex items-center gap-1"
                          onClick={() =>
                            patchVogueNoir((curr) => ({
                              bridalPackages: curr.bridalPackages.filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="form-grid">
                    <label>
                      <span className="field-label">Tier Name</span>
                      <input
                        className="workspace-input"
                        value={tier.tier}
                        onChange={(e) => updateTier({ tier: e.target.value })}
                      />
                    </label>
                    <label>
                      <span className="field-label">Package Price (INR ₹)</span>
                      <input
                        type="number"
                        min={0}
                        className="workspace-input"
                        value={tier.price}
                        onChange={(e) => updateTier({ price: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <label>
                      <span className="field-label">Badge Label (optional)</span>
                      <input
                        className="workspace-input"
                        placeholder="Most Popular"
                        value={tier.badgeLabel || ''}
                        onChange={(e) => updateTier({ badgeLabel: e.target.value })}
                      />
                    </label>
                    <BrandImageField
                      label={`${tier.tier} Photo`}
                      uploadName={`${tier.tier} Image`}
                      value={tier.imageUrl}
                      onChange={(url) => updateTier({ imageUrl: url })}
                    />
                    <label className="sm:col-span-2">
                      <span className="field-label">Inclusions (one bullet per line)</span>
                      <textarea
                        className="workspace-input"
                        rows={4}
                        value={tier.inclusions.join('\n')}
                        onChange={(e) =>
                          updateTier({
                            inclusions: e.target.value
                              .split('\n')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: MAKEUP ACADEMY */}
      {tab === 'academy' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <div className="text-xs text-amber-950">
              <strong>Academy Module Status:</strong>{' '}
              {resolved.academyEnabled
                ? 'Active — Courses, syllabus accordion, and Enquire / Enroll form are live on your website.'
                : 'Hidden — Only Makeup Studio sections are shown on your website.'}
            </div>
            <button
              type="button"
              className="secondary-action text-xs"
              onClick={() =>
                patchVogueNoir((curr) => ({ academyEnabled: !curr.academyEnabled }))
              }
            >
              {resolved.academyEnabled ? 'Turn Academy OFF' : 'Turn Academy ON'}
            </button>
          </div>

          <div className="form-grid">
            <label>
              <span className="field-label">Academy Section Heading</span>
              <input
                className="workspace-input"
                value={resolved.academyHeading}
                onChange={(e) =>
                  patchVogueNoir(() => ({ academyHeading: e.target.value }))
                }
              />
            </label>
            <label>
              <span className="field-label">Academy Highlights (one per line)</span>
              <textarea
                className="workspace-input"
                rows={3}
                value={resolved.academyHighlights.join('\n')}
                onChange={(e) =>
                  patchVogueNoir(() => ({
                    academyHighlights: e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </label>
            <label className="sm:col-span-2">
              <span className="field-label">Academy Supporting Copy</span>
              <textarea
                className="workspace-input"
                rows={2}
                value={resolved.academySubtext}
                onChange={(e) =>
                  patchVogueNoir(() => ({ academySubtext: e.target.value }))
                }
              />
            </label>
            <div className="sm:col-span-2">
              <BrandImageField
                label="Academy Hero Banner (1600×700)"
                uploadName="Academy Hero"
                value={resolved.academyHeroUrl}
                onChange={(url) => patchVogueNoir(() => ({ academyHeroUrl: url }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
            <h4 className="font-bold text-sm text-slate-900">
              Academy Courses ({resolved.courses.length})
            </h4>
            <div className="flex gap-2">
              <button
                type="button"
                className="secondary-action text-xs inline-flex items-center gap-1"
                onClick={() =>
                  patchVogueNoir((curr) => ({
                    courses: [
                      ...curr.courses,
                      {
                        id: `vn-course-${Date.now()}`,
                        title: 'Advanced Editorial & Airbrush Intensive',
                        duration: '10 Days',
                        fee: 32000,
                        imageUrl: VOGUE_NOIR_IMAGES.academy.pro,
                        imageAlt: 'Advanced editorial makeup course',
                        summary:
                          'Intensive silicone airbrush, high-fashion eye artistry, and live editorial shoot mentorship.',
                        certification: 'Vogue Noir Advanced Airbrush Certificate',
                        emiNote: '2-part installment available',
                        syllabus: [
                          'Module 1: Editorial Skin & Lighting',
                          'Module 2: Silicone Airbrush Mastery',
                          'Module 3: High-Fashion Eye Architecture',
                          'Module 4: Studio Portfolio Shoot',
                        ],
                      },
                    ],
                  }))
                }
              >
                <Plus size={14} /> Add Course
              </button>
              <button
                type="button"
                className="secondary-action text-xs inline-flex items-center gap-1"
                onClick={() =>
                  patchVogueNoir(() => ({
                    courses: VOGUE_NOIR_DEFAULT_COURSES.map((c) => ({
                      ...c,
                      syllabus: [...c.syllabus],
                    })),
                  }))
                }
              >
                <RotateCcw size={13} /> Reset Courses
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {resolved.courses.map((course, idx) => {
              const updateCourse = (changes: Partial<VogueNoirAcademyCourse>) =>
                patchVogueNoir((curr) => ({
                  courses: curr.courses.map((c, i) =>
                    i === idx ? { ...c, ...changes } : c,
                  ),
                }));
              return (
                <div
                  key={course.id}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm text-slate-900">
                      Course #{idx + 1}: {course.title}
                    </strong>
                    {resolved.courses.length > 1 && (
                      <button
                        type="button"
                        className="text-red-700 text-xs inline-flex items-center gap-1"
                        onClick={() =>
                          patchVogueNoir((curr) => ({
                            courses: curr.courses.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </div>

                  <div className="form-grid">
                    <label>
                      <span className="field-label">Course Title</span>
                      <input
                        className="workspace-input"
                        value={course.title}
                        onChange={(e) => updateCourse({ title: e.target.value })}
                      />
                    </label>
                    <label>
                      <span className="field-label">Duration</span>
                      <input
                        className="workspace-input"
                        placeholder="8 Weeks"
                        value={course.duration}
                        onChange={(e) => updateCourse({ duration: e.target.value })}
                      />
                    </label>
                    <label>
                      <span className="field-label">Course Fee (INR ₹)</span>
                      <input
                        type="number"
                        min={0}
                        className="workspace-input"
                        value={course.fee}
                        onChange={(e) => updateCourse({ fee: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <label>
                      <span className="field-label">
                        Upcoming Batch Date (blank = auto {autoBatches[idx % autoBatches.length]})
                      </span>
                      <input
                        className="workspace-input"
                        placeholder={`Auto: ${autoBatches[idx % autoBatches.length]}`}
                        value={course.batchOverride || ''}
                        onChange={(e) => updateCourse({ batchOverride: e.target.value })}
                      />
                    </label>
                    <label>
                      <span className="field-label">Certificate Highlight</span>
                      <input
                        className="workspace-input"
                        value={course.certification}
                        onChange={(e) => updateCourse({ certification: e.target.value })}
                      />
                    </label>
                    <label>
                      <span className="field-label">EMI / Installment Note</span>
                      <input
                        className="workspace-input"
                        value={course.emiNote}
                        onChange={(e) => updateCourse({ emiNote: e.target.value })}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="field-label">Course Summary</span>
                      <textarea
                        className="workspace-input"
                        rows={2}
                        value={course.summary}
                        onChange={(e) => updateCourse({ summary: e.target.value })}
                      />
                    </label>
                    <div className="sm:col-span-2">
                      <BrandImageField
                        label={`${course.title} Image`}
                        uploadName="Course Image"
                        value={course.imageUrl}
                        onChange={(url) => updateCourse({ imageUrl: url })}
                      />
                    </div>
                    <label className="sm:col-span-2">
                      <span className="field-label">Syllabus Modules (4–6 modules, one per line)</span>
                      <textarea
                        className="workspace-input"
                        rows={5}
                        value={course.syllabus.join('\n')}
                        onChange={(e) =>
                          updateCourse({
                            syllabus: e.target.value
                              .split('\n')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: PORTFOLIO & BEFORE/AFTER SLIDERS */}
      {tab === 'portfolio' && (
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h4 className="font-bold text-sm text-slate-900">
                Before &amp; After Interactive Sliders ({resolved.beforeAfter.length})
              </h4>
              <button
                type="button"
                className="secondary-action text-xs inline-flex items-center gap-1"
                onClick={() =>
                  patchVogueNoir(() => ({
                    beforeAfter: VOGUE_NOIR_DEFAULT_BEFORE_AFTER.map((b) => ({ ...b })),
                  }))
                }
              >
                <RotateCcw size={13} /> Reset Sliders
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              {resolved.beforeAfter.map((pair, idx) => {
                const updatePair = (changes: Partial<VogueNoirBeforeAfterItem>) =>
                  patchVogueNoir((curr) => ({
                    beforeAfter: curr.beforeAfter.map((p, i) =>
                      i === idx ? { ...p, ...changes } : p,
                    ),
                  }));
                return (
                  <div
                    key={pair.id}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3"
                  >
                    <label className="block">
                      <span className="field-label">Slider #{idx + 1} Title</span>
                      <input
                        className="workspace-input"
                        value={pair.title}
                        onChange={(e) => updatePair({ title: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="field-label">Category / Subtitle</span>
                      <input
                        className="workspace-input"
                        value={pair.category}
                        onChange={(e) => updatePair({ category: e.target.value })}
                      />
                    </label>
                    <BrandImageField
                      label="Before Photo"
                      uploadName="Before Photo"
                      value={pair.beforeUrl}
                      onChange={(url) => updatePair({ beforeUrl: url })}
                    />
                    <BrandImageField
                      label="After Photo"
                      uploadName="After Photo"
                      value={pair.afterUrl}
                      onChange={(url) => updatePair({ afterUrl: url })}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h4 className="font-bold text-sm text-slate-900">
                Lookbook Gallery Photos ({resolved.portfolio.length})
              </h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="secondary-action text-xs inline-flex items-center gap-1"
                  onClick={() =>
                    patchVogueNoir((curr) => ({
                      portfolio: [
                        {
                          id: `vn-port-${Date.now()}`,
                          category: 'Bridal',
                          imageUrl: VOGUE_NOIR_IMAGES.gallery.bridal1,
                          title: 'New Studio Makeover',
                          alt: 'Luxury bridal makeup look',
                        },
                        ...curr.portfolio,
                      ],
                    }))
                  }
                >
                  <Plus size={14} /> Add Lookbook Photo
                </button>
                <button
                  type="button"
                  className="secondary-action text-xs inline-flex items-center gap-1"
                  onClick={() =>
                    patchVogueNoir(() => ({
                      portfolio: VOGUE_NOIR_DEFAULT_PORTFOLIO.map((p) => ({ ...p })),
                    }))
                  }
                >
                  <RotateCcw size={13} /> Reset 16 Default Looks
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3 max-h-[540px] overflow-y-auto pr-1">
              {resolved.portfolio.map((item, idx) => {
                const updateItem = (changes: Partial<VogueNoirPortfolioItem>) =>
                  patchVogueNoir((curr) => ({
                    portfolio: curr.portfolio.map((p, i) =>
                      i === idx ? { ...p, ...changes } : p,
                    ),
                  }));
                return (
                  <div
                    key={item.id}
                    className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <select
                        aria-label={`Category for ${item.title}`}
                        value={item.category}
                        onChange={(e) =>
                          updateItem({
                            category: e.target.value as VogueNoirPortfolioCategory,
                          })
                        }
                        className="border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold bg-white"
                      >
                        {PORTFOLIO_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {resolved.portfolio.length > 1 && (
                        <button
                          type="button"
                          className="text-red-700 text-xs inline-flex items-center gap-1"
                          onClick={() =>
                            patchVogueNoir((curr) => ({
                              portfolio: curr.portfolio.filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                    </div>
                    <input
                      className="workspace-input text-xs"
                      placeholder="Look title"
                      value={item.title}
                      onChange={(e) =>
                        updateItem({ title: e.target.value, alt: e.target.value })
                      }
                    />
                    <BrandImageField
                      label="Look Photo"
                      uploadName="Lookbook Photo"
                      value={item.imageUrl}
                      onChange={(url) => updateItem({ imageUrl: url })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: TESTIMONIALS */}
      {tab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600">
              Manage featured bride and academy graduate reviews shown on your Vogue Noir website.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="secondary-action text-xs inline-flex items-center gap-1"
                onClick={() =>
                  patchVogueNoir((curr) => ({
                    reviews: [
                      ...curr.reviews,
                      {
                        id: `vn-rev-${Date.now()}`,
                        name: 'Meera K.',
                        tag: 'Bridal Makeup',
                        rating: 5,
                        quote: 'Flawless luminous skin finish that lasted all night.',
                        avatarUrl: VOGUE_NOIR_IMAGES.testimonials.ananya,
                      },
                    ],
                  }))
                }
              >
                <Plus size={14} /> Add Review
              </button>
              <button
                type="button"
                className="secondary-action text-xs inline-flex items-center gap-1"
                onClick={() =>
                  patchVogueNoir(() => ({
                    reviews: VOGUE_NOIR_DEFAULT_REVIEWS.map((r) => ({ ...r })),
                  }))
                }
              >
                <RotateCcw size={13} /> Reset Defaults
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {resolved.reviews.map((rev, idx) => {
              const updateRev = (changes: Partial<VogueNoirReviewItem>) =>
                patchVogueNoir((curr) => ({
                  reviews: curr.reviews.map((r, i) =>
                    i === idx ? { ...r, ...changes } : r,
                  ),
                }));
              return (
                <div
                  key={rev.id}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-xs text-slate-900">{rev.name}</strong>
                    {resolved.reviews.length > 1 && (
                      <button
                        type="button"
                        className="text-red-700 text-xs inline-flex items-center gap-1"
                        onClick={() =>
                          patchVogueNoir((curr) => ({
                            reviews: curr.reviews.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="workspace-input text-xs"
                      placeholder="Client / Student Name"
                      value={rev.name}
                      onChange={(e) => updateRev({ name: e.target.value })}
                    />
                    <input
                      className="workspace-input text-xs"
                      placeholder="Service / Course Tag"
                      value={rev.tag}
                      onChange={(e) => updateRev({ tag: e.target.value })}
                    />
                  </div>
                  <textarea
                    className="workspace-input text-xs"
                    rows={2}
                    value={rev.quote}
                    onChange={(e) => updateRev({ quote: e.target.value })}
                  />
                  <BrandImageField
                    label="Client Avatar (200×200)"
                    uploadName="Reviewer Photo"
                    value={rev.avatarUrl}
                    onChange={(url) => updateRev({ avatarUrl: url })}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 7: FAQS */}
      {tab === 'faqs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600">
              Manage Frequently Asked Questions for bridal bookings, hygiene, travel, and academy certification.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="secondary-action text-xs inline-flex items-center gap-1"
                onClick={() =>
                  patchVogueNoir((curr) => ({
                    faqs: [
                      ...curr.faqs,
                      {
                        id: `vn-faq-${Date.now()}`,
                        question: 'How early should I book my bridal dates?',
                        answer:
                          'We recommend reserving peak wedding dates 3 to 6 months in advance with a 25% booking retainer.',
                      },
                    ],
                  }))
                }
              >
                <Plus size={14} /> Add FAQ
              </button>
              <button
                type="button"
                className="secondary-action text-xs inline-flex items-center gap-1"
                onClick={() =>
                  patchVogueNoir(() => ({
                    faqs: VOGUE_NOIR_DEFAULT_FAQS.map((f) => ({ ...f })),
                  }))
                }
              >
                <RotateCcw size={13} /> Reset Defaults
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {resolved.faqs.map((faq, idx) => {
              const updateFaq = (changes: Partial<VogueNoirFaqItem>) =>
                patchVogueNoir((curr) => ({
                  faqs: curr.faqs.map((f, i) =>
                    i === idx ? { ...f, ...changes } : f,
                  ),
                }));
              return (
                <div
                  key={faq.id}
                  className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Question #{idx + 1}
                    </span>
                    {resolved.faqs.length > 1 && (
                      <button
                        type="button"
                        className="text-red-700 text-xs inline-flex items-center gap-1"
                        onClick={() =>
                          patchVogueNoir((curr) => ({
                            faqs: curr.faqs.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </div>
                  <input
                    className="workspace-input text-xs font-medium"
                    value={faq.question}
                    onChange={(e) => updateFaq({ question: e.target.value })}
                  />
                  <textarea
                    className="workspace-input text-xs"
                    rows={2}
                    value={faq.answer}
                    onChange={(e) => updateFaq({ answer: e.target.value })}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

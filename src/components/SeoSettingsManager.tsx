import React, { useState } from 'react';
import type { SalonProfile } from '../types';
import { Globe, Search, Check } from 'lucide-react';

export function SeoSettingsManager({
  profile,
  setProfile,
}: {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
}) {
  const seo = profile.seo || {};
  const [notice, setNotice] = useState('');

  const update = (field: string, value: string) => {
    setProfile((prev) => ({
      ...prev,
      seo: {
        ...(prev.seo || {}),
        [field]: value,
      },
    }));
  };

  const title = seo.metaTitle || profile.businessName || 'Salon Website';
  const description = seo.metaDescription || profile.tagline || profile.about || 'Book your appointment online for premium beauty and grooming services.';
  const ogImage = seo.ogImageUrl || profile.coverImageUrl || '';

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 2500);
  };

  return (
    <section className="workspace-card space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Search Engine Optimization & Social Sharing</p>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-600" />
            SEO & OpenGraph Metadata
          </h2>
          <p className="text-sm text-slate-500">
            Optimize how your salon appears on Google search results, WhatsApp previews, Twitter, and Facebook when shared.
          </p>
        </div>
        {notice && (
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            {notice}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5">
        <label className="block">
          <div className="flex justify-between items-center mb-1">
            <span className="field-label">Meta Title (&lt;title&gt;)</span>
            <span className={`text-xs ${title.length >= 30 && title.length <= 60 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {title.length} chars (recommended: 30–60)
            </span>
          </div>
          <input
            type="text"
            className="workspace-input"
            value={seo.metaTitle || ''}
            placeholder={`${profile.businessName} – Salon & Spa Services`}
            onChange={(e) => update('metaTitle', e.target.value)}
          />
        </label>

        <label className="block">
          <div className="flex justify-between items-center mb-1">
            <span className="field-label">Meta Description (&lt;meta name="description"&gt;)</span>
            <span className={`text-xs ${description.length >= 120 && description.length <= 160 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {description.length} chars (recommended: 120–160)
            </span>
          </div>
          <textarea
            className="workspace-input min-h-[90px]"
            value={seo.metaDescription || ''}
            placeholder={`Discover expert styling, relaxing treatments, and instant online booking at ${profile.businessName}.`}
            onChange={(e) => update('metaDescription', e.target.value)}
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="field-label">OpenGraph Title (og:title)</span>
            <input
              type="text"
              className="workspace-input"
              value={seo.ogTitle || ''}
              placeholder={profile.businessName}
              onChange={(e) => update('ogTitle', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="field-label">Search Keywords (keywords)</span>
            <input
              type="text"
              className="workspace-input"
              value={seo.keywords || ''}
              placeholder="hair salon, spa, beauty parlour, hair cut, facial near me"
              onChange={(e) => update('keywords', e.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <span className="field-label">OpenGraph Description (og:description)</span>
          <input
            type="text"
            className="workspace-input"
            value={seo.ogDescription || ''}
            placeholder="Short description for social media shares..."
            onChange={(e) => update('ogDescription', e.target.value)}
          />
        </label>

        <label className="block">
          <span className="field-label">OpenGraph / Social Share Image URL (og:image)</span>
          <input
            type="url"
            className="workspace-input"
            value={seo.ogImageUrl || ''}
            placeholder="https://images.unsplash.com/... or upload link"
            onChange={(e) => update('ogImageUrl', e.target.value)}
          />
          <small className="text-slate-400 mt-1 block">If left blank, your salon cover image will be used automatically.</small>
        </label>
      </div>

      {/* Live Preview Card */}
      <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-4">
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" />
          Live Search Engine & Social Preview
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Google Preview */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>https://{profile.subdomain || 'salon'}.studioflow.app</span>
            </div>
            <h4 className="text-blue-700 font-medium text-sm hover:underline cursor-pointer line-clamp-1">
              {title}
            </h4>
            <p className="text-xs text-slate-600 line-clamp-2">
              {description}
            </p>
          </div>

          {/* Social Share Card Preview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {ogImage ? (
              <div className="h-28 bg-slate-200 relative overflow-hidden">
                <img src={ogImage} alt="OG Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-24 bg-gradient-to-br from-violet-900 to-indigo-900 text-white flex items-center justify-center text-xs font-mono">
                No preview image set
              </div>
            )}
            <div className="p-3">
              <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                {profile.subdomain ? `${profile.subdomain}.studioflow.app` : 'studioflow.app'}
              </div>
              <h5 className="font-bold text-xs text-slate-900 line-clamp-1 mt-0.5">
                {seo.ogTitle || title}
              </h5>
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {seo.ogDescription || description}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => flash('SEO settings updated successfully!')}
          className="primary-action"
        >
          Save SEO Metadata
        </button>
      </div>
    </section>
  );
}

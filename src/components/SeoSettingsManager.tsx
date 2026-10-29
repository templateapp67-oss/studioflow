import React, { useState } from 'react';
import type { SalonProfile } from '../types';
import { generateSeoDefaults } from '../lib/useSeoMetadata';
import { Globe, Search, Check, Sparkles, Image as ImageIcon, Share2, Code, Copy, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BrandImageField } from './BrandImageField';

export function SeoSettingsManager({
  profile,
  setProfile,
}: {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
}) {
  const seo = profile.seo || {};
  const [notice, setNotice] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'meta' | 'social' | 'schema'>('meta');
  const [previewPlatform, setPreviewPlatform] = useState<'google' | 'facebook' | 'twitter' | 'jsonld'>('google');

  const defaults = generateSeoDefaults(profile);

  const metaTitle = seo.metaTitle || defaults.metaTitle;
  const metaDescription = seo.metaDescription || defaults.metaDescription;
  const ogTitle = seo.ogTitle || seo.metaTitle || defaults.ogTitle;
  const ogDescription = seo.ogDescription || seo.metaDescription || defaults.ogDescription;
  const ogImageUrl = seo.ogImageUrl || profile.coverImageUrl || profile.logoUrl || defaults.ogImageUrl;
  const keywords = seo.keywords || defaults.keywords;
  const twitterCard = seo.twitterCard || 'summary_large_image';

  const hostDomain = profile.subdomain ? `${profile.subdomain}.studioflow.app` : 'salon.studioflow.app';
  const fullUrl = `https://${hostDomain}`;

  const updateField = (field: string, value: string) => {
    setProfile((prev) => ({
      ...prev,
      seo: {
        ...(prev.seo || {}),
        [field]: value,
      },
    }));
  };

  const handleAutoGenerate = () => {
    const generated = generateSeoDefaults(profile);
    setProfile((prev) => ({
      ...prev,
      seo: {
        ...(prev.seo || {}),
        metaTitle: generated.metaTitle,
        metaDescription: generated.metaDescription,
        ogTitle: generated.ogTitle,
        ogDescription: generated.ogDescription,
        ogImageUrl: generated.ogImageUrl,
        keywords: generated.keywords,
        twitterCard: 'summary_large_image',
      },
    }));
    flash('Optimal SEO metadata generated from your salon profile!');
  };

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(fullUrl).catch(() => {});
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // SEO Score calculation
  const titleScore = metaTitle.length >= 30 && metaTitle.length <= 60 ? 25 : metaTitle.length > 0 ? 15 : 0;
  const descScore = metaDescription.length >= 120 && metaDescription.length <= 160 ? 25 : metaDescription.length > 0 ? 15 : 0;
  const imgScore = ogImageUrl ? 25 : 0;
  const kwScore = keywords.length > 10 ? 25 : keywords.length > 0 ? 15 : 0;
  const totalScore = titleScore + descScore + imgScore + kwScore;

  // Keyword recommendations
  const keywordChips = [
    `${profile.businessName}`,
    `${profile.businessType?.replace(/_/g, ' ') || 'salon'} near me`,
    `${profile.city || 'local'} salon`,
    'online appointment booking',
    'hair cut & styling',
    'facial & skin treatment',
    'bridal makeup studio',
    'verified specialists',
  ];

  const addKeywordChip = (chip: string) => {
    if (!keywords.toLowerCase().includes(chip.toLowerCase())) {
      const updated = keywords ? `${keywords}, ${chip}` : chip;
      updateField('keywords', updated);
    }
  };

  const jsonLdPreview = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'HealthAndBeautyBusiness',
      name: profile.businessName || 'Salon Website',
      description: metaDescription,
      url: fullUrl,
      telephone: profile.phone || '',
      image: ogImageUrl,
      address: {
        '@type': 'PostalAddress',
        streetAddress: profile.address || '',
        addressLocality: profile.city || '',
        postalCode: profile.postalCode || '',
        addressCountry: 'IN',
      },
    },
    null,
    2
  );

  return (
    <section className="workspace-card space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <p className="eyebrow flex items-center gap-1.5 text-purple-600 font-semibold">
            <Globe className="w-4 h-4" /> Search & Social Optimization
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            SEO & Social Share Cards
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Customize how your salon appears on Google search results, WhatsApp, Facebook, and Twitter shares.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAutoGenerate}
            className="secondary-action flex items-center gap-1.5 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
            title="Auto-fill recommended title, description and keywords based on your profile"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Auto-Generate SEO</span>
          </button>

          <button
            type="button"
            onClick={() => flash('SEO settings saved successfully!')}
            className="primary-action flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Save SEO Metadata</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {notice}
          </span>
          <button type="button" onClick={() => setNotice('')} className="text-xs text-emerald-600 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Health / Score Indicator */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">SEO Health Score</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              totalScore >= 80 ? 'bg-emerald-100 text-emerald-800' : totalScore >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
            }`}>
              {totalScore}% Complete
            </span>
          </div>
          <button type="button" onClick={copyUrl} className="text-xs font-mono text-purple-700 hover:underline flex items-center gap-1">
            <Copy className="w-3 h-3" />
            {copiedUrl ? 'Copied URL!' : fullUrl}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              totalScore >= 80 ? 'bg-emerald-500' : totalScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${totalScore}%` }}
          />
        </div>

        {/* Checklist */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className={`flex items-center gap-1.5 ${titleScore === 25 ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
            {titleScore === 25 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
            <span>Meta Title (30–60 chars)</span>
          </div>
          <div className={`flex items-center gap-1.5 ${descScore === 25 ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
            {descScore === 25 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
            <span>Meta Desc (120–160 chars)</span>
          </div>
          <div className={`flex items-center gap-1.5 ${imgScore === 25 ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
            {imgScore === 25 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
            <span>Social Share Card Image</span>
          </div>
          <div className={`flex items-center gap-1.5 ${kwScore === 25 ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
            {kwScore === 25 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
            <span>Target Search Keywords</span>
          </div>
        </div>
      </div>

      {/* Configuration Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          type="button"
          onClick={() => setActiveTab('meta')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'meta'
              ? 'border-purple-600 text-purple-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>1. Search Engine Tags</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('social')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'social'
              ? 'border-purple-600 text-purple-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>2. Social Share Cards (OpenGraph)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schema')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'schema'
              ? 'border-purple-600 text-purple-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>3. Structured Data (JSON-LD)</span>
        </button>
      </div>

      {/* TAB 1: Search Engine Meta Tags */}
      {activeTab === 'meta' && (
        <div className="space-y-5">
          <label className="block">
            <div className="flex justify-between items-center mb-1">
              <span className="field-label">Page Title (&lt;title&gt;)</span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                  metaTitle.length >= 30 && metaTitle.length <= 60
                    ? 'bg-emerald-100 text-emerald-800'
                    : metaTitle.length === 0
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {metaTitle.length} / 60 chars (Recommended: 30–60)
              </span>
            </div>
            <input
              type="text"
              className="workspace-input font-medium"
              value={seo.metaTitle || ''}
              placeholder={defaults.metaTitle}
              onChange={(e) => updateField('metaTitle', e.target.value)}
            />
            <small className="text-slate-400 mt-1 block">
              Shown as the main clickable headline on Google Search results. Include your salon name and primary location.
            </small>
          </label>

          <label className="block">
            <div className="flex justify-between items-center mb-1">
              <span className="field-label">Meta Description (&lt;meta name="description"&gt;)</span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                  metaDescription.length >= 120 && metaDescription.length <= 160
                    ? 'bg-emerald-100 text-emerald-800'
                    : metaDescription.length === 0
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {metaDescription.length} / 160 chars (Recommended: 120–160)
              </span>
            </div>
            <textarea
              className="workspace-input min-h-[90px]"
              value={seo.metaDescription || ''}
              placeholder={defaults.metaDescription}
              onChange={(e) => updateField('metaDescription', e.target.value)}
            />
            <small className="text-slate-400 mt-1 block">
              1–2 sentence summary encouraging users to book online. Truncated on Google if over 160 characters.
            </small>
          </label>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="field-label">Search Keywords (keywords)</span>
              <span className="text-xs text-slate-400">Comma separated</span>
            </div>
            <input
              type="text"
              className="workspace-input"
              value={seo.keywords || ''}
              placeholder={defaults.keywords}
              onChange={(e) => updateField('keywords', e.target.value)}
            />

            <div className="mt-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Click to add suggested keywords:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {keywordChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => addKeywordChip(chip)}
                    className="text-xs bg-slate-100 hover:bg-purple-100 hover:text-purple-800 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1 font-medium transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Social Share Cards (OpenGraph & Twitter) */}
      {activeTab === 'social' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="field-label">OpenGraph Title (og:title)</span>
              <input
                type="text"
                className="workspace-input"
                value={seo.ogTitle || ''}
                placeholder={metaTitle}
                onChange={(e) => updateField('ogTitle', e.target.value)}
              />
              <small className="text-slate-400 mt-1 block">Headline shown on WhatsApp and Facebook shares.</small>
            </label>

            <label className="block">
              <span className="field-label">Twitter / X Card Format</span>
              <select
                className="workspace-input cursor-pointer"
                value={twitterCard}
                onChange={(e) => updateField('twitterCard', e.target.value)}
              >
                <option value="summary_large_image">Large Summary Image Card (Recommended)</option>
                <option value="summary">Compact Summary Card</option>
              </select>
              <small className="text-slate-400 mt-1 block">Controls Twitter link card layout.</small>
            </label>
          </div>

          <label className="block">
            <span className="field-label">OpenGraph Description (og:description)</span>
            <input
              type="text"
              className="workspace-input"
              value={seo.ogDescription || ''}
              placeholder={metaDescription}
              onChange={(e) => updateField('ogDescription', e.target.value)}
            />
            <small className="text-slate-400 mt-1 block">Subtext shown below the title when shared on messaging platforms.</small>
          </label>

          <div>
            <span className="field-label block mb-1">OpenGraph Social Share Image (og:image)</span>

            {/* Direct Image Field */}
            <BrandImageField
              label="Social Share Image"
              value={ogImageUrl}
              uploadName="Social Card"
              hint="Recommended image size: 1200 × 630 px (1.91:1 aspect ratio). High clarity banner or salon showcase photo."
              onChange={(url) => updateField('ogImageUrl', url)}
            />

            {/* Quick Image Sources */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Quick image sources:</span>
              {profile.coverImageUrl && (
                <button
                  type="button"
                  onClick={() => updateField('ogImageUrl', profile.coverImageUrl)}
                  className="text-xs bg-slate-100 hover:bg-purple-100 text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-1 font-medium transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  Use Salon Cover Photo
                </button>
              )}
              {profile.logoUrl && (
                <button
                  type="button"
                  onClick={() => updateField('ogImageUrl', profile.logoUrl || '')}
                  className="text-xs bg-slate-100 hover:bg-purple-100 text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-1 font-medium transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  Use Salon Logo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Structured Data & Canonical URL */}
      {activeTab === 'schema' && (
        <div className="space-y-5">
          <label className="block">
            <span className="field-label">Canonical URL (&lt;link rel="canonical"&gt;)</span>
            <input
              type="url"
              className="workspace-input font-mono text-sm"
              value={seo.canonicalUrl || ''}
              placeholder={fullUrl}
              onChange={(e) => updateField('canonicalUrl', e.target.value)}
            />
            <small className="text-slate-400 mt-1 block">
              Canonical link tells search engines the official primary URL of your salon website.
            </small>
          </label>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="field-label">Schema.org Structured Data Payload (HealthAndBeautyBusiness)</span>
              <a
                href="https://search.google.com/test/rich-results"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-purple-700 hover:underline flex items-center gap-1 font-medium"
              >
                Google Rich Results Test <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-60 border border-slate-800">
              {jsonLdPreview}
            </pre>
            <small className="text-slate-400 mt-1 block">
              This JSON-LD structured data is automatically injected into your published website head tag for Google local search indexing.
            </small>
          </div>
        </div>
      )}

      {/* Live Preview Console */}
      <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <h3 className="text-xs font-extrabold font-mono uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-purple-600" />
            Live Search & Social Card Previews
          </h3>

          <div className="flex flex-wrap gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setPreviewPlatform('google')}
              className={`px-3 py-1 rounded-lg transition-all ${
                previewPlatform === 'google' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Google Search
            </button>
            <button
              type="button"
              onClick={() => setPreviewPlatform('facebook')}
              className={`px-3 py-1 rounded-lg transition-all ${
                previewPlatform === 'facebook' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              WhatsApp & Facebook
            </button>
            <button
              type="button"
              onClick={() => setPreviewPlatform('twitter')}
              className={`px-3 py-1 rounded-lg transition-all ${
                previewPlatform === 'twitter' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              X (Twitter)
            </button>
            <button
              type="button"
              onClick={() => setPreviewPlatform('jsonld')}
              className={`px-3 py-1 rounded-lg transition-all ${
                previewPlatform === 'jsonld' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              JSON-LD Code
            </button>
          </div>
        </div>

        {/* Google Search Snippet Preview */}
        {previewPlatform === 'google' && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1 max-w-2xl">
            <div className="text-xs font-mono text-slate-600 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-slate-700">{fullUrl}</span>
            </div>
            <h4 className="text-blue-700 font-medium text-base hover:underline cursor-pointer line-clamp-1">
              {metaTitle}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
              {metaDescription}
            </p>
          </div>
        )}

        {/* WhatsApp & Facebook Share Card Preview */}
        {previewPlatform === 'facebook' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden max-w-md">
            {ogImageUrl ? (
              <div className="h-44 bg-slate-200 relative overflow-hidden">
                <img src={ogImageUrl} alt="Social Card" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-32 bg-slate-100 flex items-center justify-center text-xs text-slate-400 font-mono">
                No share image set
              </div>
            )}
            <div className="p-3.5 bg-slate-100 border-t border-slate-200">
              <div className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                {hostDomain}
              </div>
              <h5 className="font-bold text-sm text-slate-900 line-clamp-1 mt-0.5">
                {ogTitle}
              </h5>
              <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                {ogDescription}
              </p>
            </div>
          </div>
        )}

        {/* X / Twitter Card Preview */}
        {previewPlatform === 'twitter' && (
          <div className="bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-lg p-4 max-w-md space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                {profile.businessName ? profile.businessName.charAt(0) : 'S'}
              </div>
              <div>
                <p className="text-xs font-bold text-white">{profile.businessName || 'Salon'}</p>
                <p className="text-[10px] text-slate-400">@{profile.instagramHandle || profile.subdomain || 'salon'}</p>
              </div>
            </div>

            <p className="text-xs text-slate-200">
              Check out our official website and book your next appointment online! {fullUrl}
            </p>

            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
              {ogImageUrl ? (
                <div className="h-40 bg-slate-800 overflow-hidden">
                  <img src={ogImageUrl} alt="Twitter Card" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-28 bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                  No Twitter Card Image
                </div>
              )}
              <div className="p-3">
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-500" />
                  {hostDomain}
                </div>
                <h6 className="font-bold text-xs text-white line-clamp-1 mt-0.5">
                  {ogTitle}
                </h6>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                  {ogDescription}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* JSON-LD Preview */}
        {previewPlatform === 'jsonld' && (
          <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-52 border border-slate-800">
            {jsonLdPreview}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-2">
        <a
          href={fullUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-purple-700 hover:underline flex items-center gap-1 font-semibold"
        >
          View Live Website <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <button
          type="button"
          onClick={() => flash('SEO & Social metadata updated successfully!')}
          className="primary-action"
        >
          Save SEO Metadata
        </button>
      </div>
    </section>
  );
}

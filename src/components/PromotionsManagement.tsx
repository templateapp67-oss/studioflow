import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Zap, 
  Tag, 
  Calendar, 
  Clock, 
  Check, 
  Copy, 
  Eye, 
  Save, 
  Flame, 
  Gift, 
  ArrowRight, 
  Palette, 
  CheckCircle2, 
  Sliders, 
  Info,
  Layers,
  Crown
} from 'lucide-react';
import type { 
  SalonProfile, 
  SalonService, 
  SeasonalPromotion, 
  PromotionPlacement, 
  PromotionType, 
  PromotionTheme 
} from '../types';
import { DEFAULT_SEASONAL_PROMOTION } from '../mockData';

interface PromotionsManagementProps {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  services: SalonService[];
  onNavigateToPreview?: () => void;
  onSaveNow?: () => Promise<void> | void;
}

interface PresetOption {
  id: string;
  name: string;
  badge: string;
  icon: string;
  type: PromotionType;
  theme: PromotionTheme;
  title: string;
  highlightBadge: string;
  message: string;
  discountPercent: number;
  discountText: string;
  promoCode: string;
  placement: PromotionPlacement;
  accentColor: string;
  buttonText: string;
}

const PRESET_PROMOTIONS: PresetOption[] = [
  {
    id: 'diwali_festive',
    name: 'Festive Diwali Glamour',
    badge: 'Festive Season',
    icon: '✨',
    type: 'seasonal_banner',
    theme: 'festive_diwali',
    title: 'Diwali Festive Glamour & Hair Revival',
    highlightBadge: '✨ FESTIVE DIWALI SPECIAL',
    message: 'Celebrate the festive season with 25% off all signature hair styling, balayage & restorative spa treatments.',
    discountPercent: 25,
    discountText: 'FLAT 25% OFF',
    promoCode: 'DIWALI25',
    placement: 'all',
    accentColor: '#d97706',
    buttonText: 'Book with Festive Offer',
  },
  {
    id: 'flash_sale_24h',
    name: '24-Hour Flash Sale',
    badge: 'High Urgency',
    icon: '⚡',
    type: 'flash_sale',
    theme: 'flash_sale_24h',
    title: '⚡ 24-Hour Flash Sale: 30% Off Signature Services',
    highlightBadge: '🔥 24H FLASH SALE',
    message: 'Strictly limited slots! Book today to unlock exclusive 30% savings on top salon hair & beauty experiences.',
    discountPercent: 30,
    discountText: '30% FLASH SAVINGS',
    promoCode: 'FLASH30',
    placement: 'floating_alert',
    accentColor: '#e11d48',
    buttonText: 'Claim Flash Deal',
  },
  {
    id: 'summer_refresh',
    name: 'Summer Hydration & Spa',
    badge: 'Seasonal Refresh',
    icon: '☀️',
    type: 'seasonal_banner',
    theme: 'summer_refresh',
    title: 'Summer Hydration & Sun-Shield Hair Spa',
    highlightBadge: '☀️ SUMMER GLOW SPECIAL',
    message: 'Beat the heat with restorative sun-shield treatments, soothing scalp rituals & deeply hydrating hair therapies.',
    discountPercent: 20,
    discountText: '20% OFF SUMMER SPA',
    promoCode: 'SUMMER20',
    placement: 'hero_banner',
    accentColor: '#0284c7',
    buttonText: 'Book Summer Ritual',
  },
  {
    id: 'monsoon_care',
    name: 'Monsoon Anti-Frizz Care',
    badge: 'Seasonal Revival',
    icon: '🌧️',
    type: 'seasonal_banner',
    theme: 'monsoon_rejuvenation',
    title: 'Monsoon Frizz-Control & Keratin Care',
    highlightBadge: '🌧️ MONSOON HAIR CARE',
    message: 'Keep your locks sleek, smooth, and humidity-resistant with our deep nourishing protein therapies.',
    discountPercent: 15,
    discountText: 'SAVE 15% ON KERATIN',
    promoCode: 'MONSOON15',
    placement: 'all',
    accentColor: '#059669',
    buttonText: 'Book Anti-Frizz Care',
  },
  {
    id: 'bridal_season',
    name: 'Royal Bridal & Wedding Suite',
    badge: 'Bridal Glamour',
    icon: '👑',
    type: 'seasonal_banner',
    theme: 'bridal_season',
    title: 'Royal Bridal Makeover & Pre-Wedding Glamour',
    highlightBadge: '👑 BRIDAL SUITE EXCLUSIVE',
    message: 'Book complete bridal party styling, bespoke trials, and priority master stylist consultations.',
    discountPercent: 20,
    discountText: 'COMPLIMENTARY BRIDAL TRIAL',
    promoCode: 'BRIDAL20',
    placement: 'top_announcement_bar',
    accentColor: '#9333ea',
    buttonText: 'Book Bridal Consultation',
  },
  {
    id: 'new_year_glow',
    name: 'New Year Glow 2026',
    badge: 'Celebration',
    icon: '🎉',
    type: 'seasonal_banner',
    theme: 'new_year_glow',
    title: 'New Year, New You: Signature Transformation Bundle',
    highlightBadge: '✨ NEW YEAR GLOW',
    message: 'Kick off the new year with a bespoke haircut, color treatment, and deluxe restorative manicure bundle.',
    discountPercent: 25,
    discountText: 'FLAT ₹750 OFF BUNDLES',
    promoCode: 'GLOW2026',
    placement: 'all',
    accentColor: '#4f46e5',
    buttonText: 'Book Transformation',
  },
  {
    id: 'weekend_rush',
    name: 'Weekend Priority Rush',
    badge: 'Flash Alert',
    icon: '🚀',
    type: 'flash_sale',
    theme: 'weekend_rush',
    title: 'Weekend Priority Booking Flash Deal',
    highlightBadge: '⚡ WEEKEND FLASH PERK',
    message: 'Early weekend booking perk: complimentary scalp massage with any premium haircut or styling.',
    discountPercent: 10,
    discountText: 'COMPLIMENTARY ADD-ON',
    promoCode: 'WEEKEND',
    placement: 'floating_alert',
    accentColor: '#b45309',
    buttonText: 'Reserve Weekend Slot',
  },
];

const COLOR_SWATCHES = [
  { name: 'Amber Gold', hex: '#d97706' },
  { name: 'Vivid Crimson', hex: '#e11d48' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Sky / Teal', hex: '#0284c7' },
  { name: 'Royal Purple', hex: '#9333ea' },
  { name: 'Indigo Night', hex: '#4f46e5' },
  { name: 'Coral Rose', hex: '#f43f5e' },
  { name: 'Dark Slate', hex: '#1e293b' },
];

export const PromotionsManagement: React.FC<PromotionsManagementProps> = ({
  profile,
  setProfile,
  services = [],
  onNavigateToPreview,
  onSaveNow,
}) => {
  // Current active promotion or fallback default
  const activePromotion: SeasonalPromotion = useMemo(() => {
    return profile.promotions || DEFAULT_SEASONAL_PROMOTION;
  }, [profile.promotions]);

  // Local draft state for reactive editing
  const [promoDraft, setPromoDraft] = useState<SeasonalPromotion>(activePromotion);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'all' | 'top_bar' | 'floating' | 'hero'>('all');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync draft if external profile.promotions changes
  useEffect(() => {
    if (profile.promotions) {
      setPromoDraft(profile.promotions);
    }
  }, [profile.promotions]);

  // Helper to patch draft
  const patchDraft = <K extends keyof SeasonalPromotion>(key: K, value: SeasonalPromotion[K]) => {
    setPromoDraft((prev) => {
      const updated = { ...prev, [key]: value };
      return updated;
    });
    setProfile((p) => ({
      ...p,
      promotions: { ...promoDraft, [key]: value }
    }));
  };

  // Quick apply preset
  const applyPreset = (preset: PresetOption) => {
    const updated: SeasonalPromotion = {
      ...promoDraft,
      enabled: true,
      type: preset.type,
      theme: preset.theme,
      title: preset.title,
      highlightBadge: preset.highlightBadge,
      message: preset.message,
      discountPercent: preset.discountPercent,
      discountText: preset.discountText,
      promoCode: preset.promoCode,
      placement: preset.placement,
      accentColor: preset.accentColor,
      buttonText: preset.buttonText,
      expiryDate: preset.type === 'flash_sale' 
        ? new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
        : promoDraft.expiryDate || '2026-11-30',
    };
    setPromoDraft(updated);
    setProfile((p) => ({ ...p, promotions: updated }));
    flashNotice(`Applied "${preset.name}" preset!`);
  };

  const flashNotice = (msg: string) => {
    setSaveSuccessNotice(msg);
    window.setTimeout(() => setSaveSuccessNotice(''), 3000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveExplicitly = async () => {
    setIsSaving(true);
    try {
      setProfile((p) => ({ ...p, promotions: promoDraft }));
      if (onSaveNow) {
        await onSaveNow();
      }
      flashNotice('Promotions saved to your salon profile and database!');
    } catch {
      flashNotice('Failed to persist promotions. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Simulated countdown values for flash sale preview
  const countdownDisplay = '14h : 28m : 45s';

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* SECTION HEADER BANNER */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Flame className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                Salon Marketing · Promotions
              </span>
              {promoDraft.enabled ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live on Website
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  Currently Paused
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              Promotions & Seasonal Banners
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Configure festive seasonal banners, limited-time flash sale alerts, and VIP promo codes to boost client bookings on your published salon website.
            </p>
          </div>
        </div>

        {/* TOP CONTROLS */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onNavigateToPreview && (
            <button
              type="button"
              onClick={onNavigateToPreview}
              className="px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-purple-700" />
              <span>Client Preview</span>
            </button>
          )}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSaveExplicitly()}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Promotions</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK TOAST */}
      {saveSuccessNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* MASTER TOGGLE & PROMOTION TYPE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Master Status Toggle */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                Website Visibility
              </span>
              <span className={`w-3 h-3 rounded-full ${promoDraft.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Publish Promotion on Website
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Turn on to immediately show this promotional banner or flash sale alert across your salon website.
            </p>
          </div>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
            <span className="text-xs font-extrabold text-slate-800">
              {promoDraft.enabled ? 'Promotion is ACTIVE' : 'Promotion is DISABLED'}
            </span>
            <input
              type="checkbox"
              checked={promoDraft.enabled}
              onChange={(e) => patchDraft('enabled', e.target.checked)}
              className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Card 2: Promotion Type Selector */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs lg:col-span-2 flex flex-col justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">
              Campaign Format
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Select Promotion Experience
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Choose the promotional style that matches your marketing goal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => patchDraft('type', 'seasonal_banner')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                promoDraft.type === 'seasonal_banner'
                  ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-2 ring-amber-400/30'
                  : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">✨</span>
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                  promoDraft.type === 'seasonal_banner' ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-700'
                }`}>
                  Seasonal
                </span>
              </div>
              <strong className="text-xs text-slate-900 font-bold">Seasonal Banner</strong>
              <small className="text-[11px] text-slate-500 leading-tight">
                Festive celebrations, seasonal makeovers & holiday packages.
              </small>
            </button>

            <button
              type="button"
              onClick={() => patchDraft('type', 'flash_sale')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                promoDraft.type === 'flash_sale'
                  ? 'border-rose-500 bg-rose-50/70 shadow-xs ring-2 ring-rose-400/30'
                  : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">⚡</span>
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                  promoDraft.type === 'flash_sale' ? 'bg-rose-200 text-rose-900' : 'bg-slate-200 text-slate-700'
                }`}>
                  Urgent Deal
                </span>
              </div>
              <strong className="text-xs text-slate-900 font-bold">Flash Sale Alert</strong>
              <small className="text-[11px] text-slate-500 leading-tight">
                Countdown timer, high urgency & instant discount claiming.
              </small>
            </button>

            <button
              type="button"
              onClick={() => patchDraft('type', 'announcement')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                promoDraft.type === 'announcement'
                  ? 'border-indigo-500 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-400/30'
                  : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">📢</span>
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                  promoDraft.type === 'announcement' ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-200 text-slate-700'
                }`}>
                  VIP Ribbon
                </span>
              </div>
              <strong className="text-xs text-slate-900 font-bold">VIP Announcement</strong>
              <small className="text-[11px] text-slate-500 leading-tight">
                New stylist arrivals, anniversary notices & special hours.
              </small>
            </button>
          </div>
        </div>
      </div>

      {/* CURATED SEASONAL PRESETS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-900 font-display">
                Curated Indian Salon Seasonal Presets
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              One-click templates tailored for Indian festivals, wedding seasons, and flash marketing spikes.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 font-bold">
            Click any preset to auto-populate
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {PRESET_PROMOTIONS.map((preset) => {
            const isSelected = promoDraft.theme === preset.theme;
            return (
              <div
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{preset.icon}</span>
                    <span 
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {preset.badge}
                    </span>
                  </div>
                  <h3 className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {preset.name}
                  </h3>
                  <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {preset.message}
                  </p>
                </div>

                <div className={`pt-2 border-t flex items-center justify-between text-xs font-mono font-bold ${
                  isSelected ? 'border-white/20 text-amber-300' : 'border-slate-100 text-emerald-600'
                }`}>
                  <span>{preset.discountText}</span>
                  <span className="group-hover:translate-x-1 transition-transform">Apply →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAILED PROMOTION CONFIGURATION FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Form Inputs */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">
              Promotion Details & Offer Terms
            </h2>
          </div>

          {/* Promotion Headline */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
              Promotion Headline / Title
            </label>
            <input
              type="text"
              value={promoDraft.title}
              onChange={(e) => patchDraft('title', e.target.value)}
              placeholder="e.g. Diwali Festive Glamour & Hair Revival"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs sm:text-sm font-semibold"
            />
          </div>

          {/* Highlight Badge */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
              Highlight Badge Pill
            </label>
            <input
              type="text"
              value={promoDraft.highlightBadge}
              onChange={(e) => patchDraft('highlightBadge', e.target.value)}
              placeholder="e.g. ✨ FESTIVE DIWALI SPECIAL or 🔥 24H FLASH SALE"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs sm:text-sm font-mono font-bold"
            />
          </div>

          {/* Offer Message */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
              Offer Description & Terms
            </label>
            <textarea
              rows={3}
              value={promoDraft.message}
              onChange={(e) => patchDraft('message', e.target.value)}
              placeholder="Describe the offer, included services, or booking conditions..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs sm:text-sm"
            />
          </div>

          {/* Discount Percentage & Discount Text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono font-bold text-slate-700 uppercase">
                  Discount Rate
                </label>
                <span className="text-xs font-mono font-extrabold text-emerald-700">
                  {promoDraft.discountPercent || 0}% OFF
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={promoDraft.discountPercent || 0}
                onChange={(e) => patchDraft('discountPercent', Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                Discount Badge Text
              </label>
              <input
                type="text"
                value={promoDraft.discountText}
                onChange={(e) => patchDraft('discountText', e.target.value)}
                placeholder="e.g. FLAT 25% OFF or SAVE ₹500"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-bold font-mono"
              />
            </div>
          </div>

          {/* Promo Code & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                Promo Code Voucher
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={promoDraft.promoCode}
                  onChange={(e) => patchDraft('promoCode', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  placeholder="e.g. DIWALI25"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-mono font-extrabold tracking-wider"
                />
                <span className="absolute right-3 top-2.5 text-slate-400">
                  <Tag className="w-4 h-4" />
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                Flash Sale / Offer Expiry Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={promoDraft.expiryDate || ''}
                  onChange={(e) => patchDraft('expiryDate', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Target Service Selection (Optional) */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
              Highlight Specific Salon Service (Optional)
            </label>
            <select
              value={promoDraft.selectedServiceId || ''}
              onChange={(e) => patchDraft('selectedServiceId', e.target.value || undefined)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-medium bg-white"
            >
              <option value="">Applies to All Services / Whole Menu</option>
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name} — ₹{svc.price.toLocaleString('en-IN')} ({svc.category})
                </option>
              ))}
            </select>
          </div>

          {/* Action Button Label */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
              Call to Action Button Label
            </label>
            <input
              type="text"
              value={promoDraft.buttonText || 'Book with Offer'}
              onChange={(e) => patchDraft('buttonText', e.target.value)}
              placeholder="e.g. Book with Festive Offer"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs sm:text-sm font-semibold"
            />
          </div>

          {/* Placement Options */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-2">
              Website Placement & Display Locations
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'all', label: 'All Locations', icon: '🌐' },
                  { id: 'top_announcement_bar', label: 'Top Banner', icon: '🔝' },
                  { id: 'hero_banner', label: 'Hero Section', icon: '🌟' },
                  { id: 'floating_alert', label: 'Floating Alert', icon: '🚨' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patchDraft('placement', opt.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    promoDraft.placement === opt.id
                      ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                  }`}
                >
                  <span className="text-base">{opt.icon}</span>
                  <span className="text-[11px]">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color Palette */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-2">
              Banner Accent & Theme Color
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => patchDraft('accentColor', swatch.hex)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    promoDraft.accentColor === swatch.hex ? 'scale-125 border-slate-900 shadow-sm' : 'border-white hover:scale-110'
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                  title={swatch.name}
                />
              ))}
              <label className="flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-300 text-xs font-mono cursor-pointer hover:bg-slate-50">
                <Palette className="w-3.5 h-3.5 text-slate-600" />
                <span>Custom</span>
                <input
                  type="color"
                  value={promoDraft.accentColor || '#d97706'}
                  onChange={(e) => patchDraft('accentColor', e.target.value)}
                  className="w-5 h-5 opacity-0 absolute pointer-events-none"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Preview */}
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-slate-700" />
                <h2 className="text-lg font-bold text-slate-900">
                  Live Interactive Website Preview
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">
                What clients will see
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Inspect how your promotion renders across website placements. When enabled, your visitors can view the offer, copy the promo code, and book appointments instantly.
            </p>

            {/* PREVIEW TABS */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start">
              <button
                type="button"
                onClick={() => setActivePreviewTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activePreviewTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Previews
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('top_bar')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activePreviewTab === 'top_bar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Top Announcement
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('hero')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activePreviewTab === 'hero' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hero Card
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('floating')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activePreviewTab === 'floating' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Flash Alert Pill
              </button>
            </div>

            {/* PREVIEW 1: TOP ANNOUNCEMENT BAR */}
            {(activePreviewTab === 'all' || activePreviewTab === 'top_bar') && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                  1. Top Announcement Bar (Header Sticky)
                </span>
                <div
                  className="rounded-2xl p-3 sm:p-4 text-white shadow-md flex flex-wrap items-center justify-between gap-3 transition-colors"
                  style={{ backgroundColor: promoDraft.accentColor || '#d97706' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white shrink-0">
                      {promoDraft.highlightBadge || '✨ SPECIAL OFFER'}
                    </span>
                    <span className="text-xs sm:text-sm font-bold truncate">
                      {promoDraft.title || 'Limited Time Promotional Offer'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {promoDraft.promoCode && (
                      <button
                        type="button"
                        onClick={() => handleCopyCode(promoDraft.promoCode)}
                        className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>{promoDraft.promoCode}</span>
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
                    >
                      {promoDraft.buttonText || 'Book with Offer'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW 2: HERO SECTION PROMO CARD */}
            {(activePreviewTab === 'all' || activePreviewTab === 'hero') && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                  2. Hero Section Promotion Card
                </span>
                <div className="rounded-2xl bg-slate-950 text-white p-5 border border-slate-800 shadow-xl relative overflow-hidden">
                  <div
                    className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full blur-2xl opacity-30 pointer-events-none"
                    style={{ backgroundColor: promoDraft.accentColor || '#d97706' }}
                  />
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-md">
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full text-white uppercase"
                          style={{ backgroundColor: promoDraft.accentColor || '#d97706' }}
                        >
                          {promoDraft.highlightBadge}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">
                          {promoDraft.discountText}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-base text-white font-display">
                        {promoDraft.title}
                      </h4>
                      <p className="text-xs text-slate-300 line-clamp-2">
                        {promoDraft.message}
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      <div className="text-xs font-mono text-amber-300 font-bold">
                        Code: <strong className="bg-white/10 px-2 py-0.5 rounded text-white">{promoDraft.promoCode}</strong>
                      </div>
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl text-xs font-extrabold text-white shadow-md transition-transform hover:scale-105 cursor-pointer"
                        style={{ backgroundColor: promoDraft.accentColor || '#d97706' }}
                      >
                        {promoDraft.buttonText || 'Book with Offer'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW 3: FLOATING FLASH SALE ALERT */}
            {(activePreviewTab === 'all' || activePreviewTab === 'floating') && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                  3. Floating Flash Sale Alert (Bottom Corner)
                </span>
                <div className="p-4 rounded-2xl bg-slate-900 border-2 text-white shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  style={{ borderColor: promoDraft.accentColor || '#e11d48' }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: promoDraft.accentColor || '#e11d48' }}
                    >
                      <Zap className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded bg-white/10 text-amber-300">
                          {promoDraft.highlightBadge}
                        </span>
                        <span className="text-xs font-mono font-extrabold text-rose-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {countdownDisplay}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-white mt-1">
                        {promoDraft.title}
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                        {promoDraft.discountText} • Use code {promoDraft.promoCode}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl text-xs font-extrabold text-white shrink-0 shadow-md transition-transform hover:scale-105 cursor-pointer self-stretch sm:self-auto text-center"
                    style={{ backgroundColor: promoDraft.accentColor || '#e11d48' }}
                  >
                    {promoDraft.buttonText || 'Claim Deal'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* QUICK SUMMARY CARD */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Info className="w-4 h-4 text-slate-500" />
              <span>How Promotions Work on Published Websites</span>
            </div>
            <p>
              • <strong>Real-time publishing:</strong> Whenever you hit <strong>Save Promotions</strong>, your website draft automatically incorporates the active promotion banner.
            </p>
            <p>
              • <strong>Promo Code Auto-Apply:</strong> When clients click <strong>Book with Offer</strong>, the booking flow pre-selects the promotional service and applies the discount code.
            </p>
            <p>
              • <strong>Urgency Countdown:</strong> Flash sales compute live remaining hours and minutes until the selected expiration date.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

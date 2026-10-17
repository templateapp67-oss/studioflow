import {BrandImageField} from './BrandImageField';
import {renderCampaignBanner,downloadCampaignAd,type CampaignAd} from '../lib/campaignBanner';
import { websiteLink } from '../lib/supabase';
import React, { useState, useRef, useEffect } from 'react';
import { SalonProfile, SalonService } from '../types';
import { CATEGORY_STANDARDIZED_DATA } from '../templateData';

interface PromoStudioProps {
  profile: SalonProfile;
  services: SalonService[];
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  primaryAccentColor?: string;
  onNavigateToPreview?: () => void;
  onAdReady?: (ad:CampaignAd|null) => void;
}

type AspectRatioType = '1:1' | '9:16' | '16:9';
type AestheticStyle = 'luxury_gold' | 'minimalist_chic' | 'festive_glow' | 'botanical_zen' | 'modern_studio';
type TemplateTheme = 'flash_discount' | 'luxury_pamper' | 'festive_special' | 'vip_welcome';

export const PromoStudio: React.FC<PromoStudioProps> = ({
  profile,
  setProfile,
  services,
  primaryAccentColor = '#b0004a',
  onNavigateToPreview,
  onAdReady,
}) => {
  // 1. Service Selection
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    profile.promoCampaign?.selectedServiceId || (services.length > 0 ? services[0].id : '')
  );

  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0] || {
    id: 'srv-default',
    name: 'Signature Treatment',
    price: 2500,
    durationMinutes: 60,
    category: 'Hair & Beauty',
    description: 'Transformative salon treatment with restorative care and precision styling.',
  };

  // 2. Campaign Config
  const [campaignTheme, setCampaignTheme] = useState<TemplateTheme>(profile.promoCampaign?.campaignTheme as any ?? 'flash_discount');
  const [discountPercent, setDiscountPercent] = useState<number>(profile.promoCampaign?.discountPercent ?? 20);
  const [customOfferText, setCustomOfferText] = useState<string>(profile.promoCampaign?.customOfferText ?? 'FLAT 20% OFF THIS WEEK');
  const [promoCode, setPromoCode] = useState<string>(profile.promoCampaign?.promoCode ?? 'GLOW20');
  const [headline, setHeadline] = useState<string>(profile.promoCampaign?.headline ?? 'Weekend Glow & Transformation Special');
  const [subtext, setSubtext] = useState<string>(profile.promoCampaign?.subtext ?? 'Limited 10 VIP slots • 100% Organic Products • Expert Artists');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>(profile.promoCampaign?.aspectRatio as any ?? '1:1');
  const [aesthetic, setAesthetic] = useState<AestheticStyle>(profile.promoCampaign?.aesthetic as any ?? 'luxury_gold');

  // 3. Image Generation State
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>(profile.promoCampaign?.customPrompt||'');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);
  const [selectedCuratedPhotoUrl, setSelectedCuratedPhotoUrl] = useState<string>(profile.promoCampaign?.imageUrl||'');

  const [logoUrl,setLogoUrl]=useState(profile.promoCampaign?.logoUrl??profile.logoUrl??'');
  const [readyAd,setReadyAd]=useState<CampaignAd|null>(null),[exportBusy,setExportBusy]=useState(false),[exportError,setExportError]=useState('');
  // 4. Copy & Share Templates
  const [whatsappTemplate, setWhatsappTemplate] = useState<string>('');
  const [instagramCaption, setInstagramCaption] = useState<string>('');
  const [activeTemplateTab, setActiveTemplateTab] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hidden canvas for exporting high-res PNG image
  const exportTicket=useRef(0);useEffect(()=>()=>{exportTicket.current++},[]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Get curated category gallery photos as high-res presets
  const categoryData = CATEGORY_STANDARDIZED_DATA[profile.businessType || 'hair_salon'] || CATEGORY_STANDARDIZED_DATA.hair_salon;
  const curatedPhotos = categoryData?.gallery || [];

  // Set default curated photo when category/service changes
  useEffect(() => {
    if (curatedPhotos.length > 0 && !selectedCuratedPhotoUrl) {
      setSelectedCuratedPhotoUrl(curatedPhotos[0].url);
    }
  }, [profile.businessType]);

  // Update default prompt and copy when service or theme changes
  useEffect(() => {
    const discountedPrice = Math.round(selectedService.price * (1 - discountPercent / 100));
    
    // Set intelligent AI prompt
    const serviceName = selectedService.name;
    const catName = selectedService.category || profile.businessType || 'Salon';
    const styleDescriptions: Record<AestheticStyle, string> = {
      luxury_gold: 'High-end editorial photoshoot, golden hour warm lighting, gold leaf accents, ultra-luxurious beauty aesthetic',
      minimalist_chic: 'Clean Scandinavian minimalist salon interior, soft neutral tones, high key lighting, crisp details',
      festive_glow: 'Vibrant Indian festive celebration aesthetic, warm bokeh lights, marigold tones, radiant celebratory glow',
      botanical_zen: 'Serene spa atmosphere, lush green foliage, essential oil steam, natural bamboo and stone textures',
      modern_studio: 'Contemporary sleek studio lighting, neon edge lighting accents, high-contrast fashion editorial look',
    };

    const bizName = profile?.businessName || 'Our Salon';
    const subDomain = profile?.subdomain || 'salon';
    const city = profile?.city || 'India';
    const address = profile?.address || 'Our Studio';

    setCustomPrompt(
      `An ultra-high resolution, commercial salon promotional image for "${serviceName}" at ${bizName}. Style: ${styleDescriptions[aesthetic]}. Clean, professional beauty photography with space for promotional text overlay.`
    );

    // Generate WhatsApp Template
    const bookingUrl = websiteLink(profile.subdomain);
    const waText = `✨ *SPECIAL INVITATION FROM ${bizName.toUpperCase()}* ✨

Namaste! 🌸

Treat yourself to our signature *${selectedService.name}* at an exclusive promotional rate!

💎 *Special Offer*: ${customOfferText || `${discountPercent}% OFF`}
💰 *Promotional Price*: *₹${discountedPrice.toLocaleString('en-IN')}* (Regular ~₹${selectedService.price.toLocaleString('en-IN')}~)
🎟️ *Promo Code*: \`${promoCode}\`
⏱️ *Duration*: ${selectedService.durationMinutes} mins of pure pampering
📍 *Location*: ${address || city || 'Our Studio'}

👉 *Claim your slot online*:
${bookingUrl}

Or reply to this message directly with your preferred date and time to reserve your appointment! 📲`;

    setWhatsappTemplate(waText);

    // Generate Instagram Caption
    const igText = `✨ *Glow up with ${bizName}!* ✨

Ready for a transformation? Experience our signature *${selectedService.name}* with an exclusive limited-time promotion! 💆‍♀️💇‍♂️

🌟 *Highlights*:
• Professional care by master artists
• 100% single-use sanitized hygiene protocols
• Premium organic and toxin-safe formulas

🎁 *Special Deal*: ${customOfferText || `Enjoy ${discountPercent}% OFF`}
🏷️ *Price*: ₹${discountedPrice.toLocaleString('en-IN')} (Reg. ₹${selectedService.price.toLocaleString('en-IN')})
🔑 *Use Code*: ${promoCode}

📍 ${city ? `${city} • ` : ''}${address || 'Visit us in studio'}
⏰ Limited slots available this week!

👇 *Tap the link in our bio to book your slot now*:
${bookingUrl}

#${bizName.replace(/\s+/g, '')} #${selectedService.name.replace(/\s+/g, '')} #SalonOffers #IndianSalons #${city.replace(/\s+/g, '')}Beauty #HairTransformation #SkinGlow #BridalGlam #NexoraSalons #SalonDeals`;

    setInstagramCaption(igText);
  }, [selectedServiceId, campaignTheme, discountPercent, aesthetic, profile?.businessName, profile?.city, profile?.subdomain, profile?.address, customOfferText, promoCode, headline, subtext]);

  const [endsAt,setEndsAt]=useState(profile.promoCampaign?.endsAt||'');
  const [lastMinute,setLastMinute]=useState(profile.promoCampaign?.lastMinute??false);
  const localExpiry=endsAt&&Number.isFinite(Date.parse(endsAt))?new Date(Date.parse(endsAt)-new Date(endsAt).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  const [enabled,setEnabled]=useState(profile.promoCampaign?.enabled??false);
  useEffect(()=>{
    const campaign={enabled,endsAt,lastMinute,selectedServiceId,campaignTheme,discountPercent,customOfferText,promoCode,headline,subtext,aspectRatio,aesthetic,logoUrl,imageUrl:generatedImageUrl||selectedCuratedPhotoUrl,customPrompt};
    setProfile(prev=>JSON.stringify(prev.promoCampaign)===JSON.stringify(campaign)?prev:{...prev,promoCampaign:campaign});
  },[enabled,endsAt,lastMinute,selectedServiceId,campaignTheme,discountPercent,customOfferText,promoCode,headline,subtext,aspectRatio,aesthetic,logoUrl,generatedImageUrl,selectedCuratedPhotoUrl,customPrompt,setProfile]);

  // Handle AI Image Generation
  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setGenerationNotice(null);

    setGeneratedImageUrl(null);
    const photo = curatedPhotos.find(p => p.url !== selectedCuratedPhotoUrl) || curatedPhotos[0];
    if (photo) { setSelectedCuratedPhotoUrl(photo.url); setGenerationNotice('Selected curated photography. Customize the text and export your banner below.'); }
    else setGenerationNotice('Choose a photo before exporting your banner.');
    setIsGeneratingImage(false);
  };

  // Active Background Image Source
  const activeBackgroundUrl = generatedImageUrl || selectedCuratedPhotoUrl || (curatedPhotos[0]?.url) || 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1200&q=80';

  const discountedPrice = Math.round(selectedService.price * (1 - discountPercent / 100));

  // Export Canvas as High-Res PNG
  useEffect(()=>{exportTicket.current++;setReadyAd(null);onAdReady?.(null);},[activeBackgroundUrl,logoUrl,aspectRatio,headline,subtext,customOfferText,discountPercent,promoCode,selectedServiceId,profile.businessName,profile.city,profile.subdomain,selectedService.name,selectedService.price,primaryAccentColor,whatsappTemplate,onAdReady]);
  const prepareReadyAd=async(download=false)=>{if(exportBusy)return;setExportBusy(true);setExportError('');const ticket=exportTicket.current;try{const blob=await renderCampaignBanner({imageUrl:activeBackgroundUrl,logoUrl,aspectRatio,salon:profile.businessName,city:profile.city,service:selectedService.name,headline,subtext,offer:customOfferText||`${discountPercent}% OFF`,price:discountedPrice,originalPrice:selectedService.price,code:promoCode,bookingUrl:websiteLink(profile.subdomain||''),accent:primaryAccentColor});if(ticket!==exportTicket.current)throw new Error('The ad changed while exporting. Prepare it again to use the latest version.');const file=new File([blob],`${(profile.businessName||'salon').replace(/[^a-z0-9]/gi,'-')}-ad.png`,{type:'image/png'});const ad={file,caption:whatsappTemplate};setReadyAd(ad);onAdReady?.(ad);if(download)downloadCampaignAd(file);showToast(download?'Ready ad PNG downloaded.':'Ready ad added to your customer campaign below.');}catch(e){setExportError(e instanceof Error?e.message:'Ad export failed. Please retry.');}finally{setExportBusy(false)}};
  const handleDownloadBanner=()=>void prepareReadyAd(true);
  const shareReadyAd=async()=>{if(!readyAd)return;try{if(navigator.canShare?.({files:[readyAd.file]})){await navigator.share({files:[readyAd.file],title:profile.businessName,text:readyAd.caption});showToast('Share screen opened. Choose WhatsApp and your opted-in recipients.');}else{downloadCampaignAd(readyAd.file);showToast('Ad downloaded. Open WhatsApp, choose your broadcast list, and attach this image.');}}catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setExportError('Sharing could not open. Download the ad and attach it in WhatsApp.')}};

  // Share to WhatsApp Handler
  const handleShareToWhatsApp = () => {
    const encodedText = encodeURIComponent(whatsappTemplate);
    const waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    showToast('🚀 Opening WhatsApp with pre-filled promo template!');
  };

  // Share to Instagram Handler
  const handleShareToInstagram = () => {
    navigator.clipboard.writeText(instagramCaption);
    showToast('📋 Instagram caption copied to clipboard! Opening Instagram...');
    setTimeout(() => {
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    }, 600);
  };

  // Copy Template to Clipboard
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`✓ Copied ${label} to clipboard!`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: primaryAccentColor }}
            >
              <span className="material-symbols-outlined text-xl">photo_camera_back</span>
            </span>
            <h2 className="font-display font-bold text-xl text-gray-900">
              Promotional Banner & Social Campaign Studio
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Generate high-converting advertising banners for your salon services using curated photography, complete with pre-filled WhatsApp & Instagram templates.
          </p>
        </div>

        {onNavigateToPreview && (
          <button
            onClick={onNavigateToPreview}
            className="text-xs font-bold px-4 py-2 rounded-xl border border-gray-300 hover:border-gray-400 bg-white text-gray-800 flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">visibility</span>
            <span>Live Salon Preview</span>
          </button>
        )}
      </div>

      {/* TOAST NOTICE */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-3 rounded-xl flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* 2-COLUMN STUDIO WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <section className="col-span-full bg-white border rounded-xl p-4 flex flex-wrap items-center gap-4">
          <label className="flex gap-2 items-center font-bold text-sm"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>Show this promotion on my salon website & customer app</label>
          <label className="text-sm flex flex-col gap-1">Offer expiry (your local time)<input type="datetime-local" className="border rounded p-2" value={localExpiry} onChange={e=>setEndsAt(e.target.value?new Date(e.target.value).toISOString():'')}/></label>
          <label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={lastMinute} onChange={e=>setLastMinute(e.target.checked)}/>Include in Last-Minute Deals during the final 24 hours</label>
          {lastMinute&&!endsAt&&<p className="text-sm text-amber-700">Set an expiry to feature this promotion in Last-Minute Deals.</p>}
          {endsAt&&Date.parse(endsAt)<=Date.now()&&<p className="text-sm text-amber-700">This promotion has expired and is hidden from customers.</p>}
          <p className="text-xs text-gray-500">Changes autosave to your workspace. Publish your website to update both the website and customer app. Offer codes are display information; checkout discounts are not applied automatically.</p>
        </section>
        {/* LEFT COLUMN: CONTROLS & CAMPAIGN CONFIGURATION (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* Step 1: Select Service */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold font-mono-caps text-gray-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Select Salon Service</span>
              </label>
              <span className="text-[11px] font-mono text-gray-500">{services.length} services available</span>
            </div>

            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-800 focus:ring-2 focus:ring-gray-400 outline-none cursor-pointer"
            >
              {services.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} — ₹{srv.price.toLocaleString('en-IN')} ({srv.durationMinutes}m)
                </option>
              ))}
            </select>

            <div className="p-3 bg-white rounded-lg border border-gray-200 text-xs flex justify-between items-center">
              <div>
                <div className="font-bold text-gray-800">{selectedService.name}</div>
                <div className="text-[11px] text-gray-500">{selectedService.category || 'Beauty'} • {selectedService.durationMinutes} mins</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm" style={{ color: primaryAccentColor }}>
                  ₹{selectedService.price.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-600 font-bold">Standard Rate</div>
              </div>
            </div>
          </div>

          {/* Step 2: Campaign Theme & Discount */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col gap-3">
            <label className="text-xs font-bold font-mono-caps text-gray-700 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center text-[10px]">2</span>
              <span>Campaign Theme & Offer</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'flash_discount', label: '🔥 Flash Deal', desc: 'High urgency weekend special' },
                { id: 'luxury_pamper', label: '👑 Luxury Pamper', desc: 'Bespoke VIP treatment' },
                { id: 'festive_special', label: '✨ Festive Glam', desc: 'Wedding & festival ready' },
                { id: 'vip_welcome', label: '🌸 New Client', desc: 'First-time customer trial' },
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setCampaignTheme(theme.id as TemplateTheme)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    campaignTheme === theme.id
                      ? 'bg-white font-bold shadow-xs'
                      : 'border-gray-200 bg-white/60 hover:bg-white text-gray-600'
                  }`}
                  style={campaignTheme === theme.id ? { borderColor: primaryAccentColor } : {}}
                >
                  <div className="font-bold text-gray-900">{theme.label}</div>
                  <div className="text-[10px] text-gray-500 truncate mt-0.5">{theme.desc}</div>
                </button>
              ))}
            </div>

            {/* Discount Slider */}
            <div className="mt-1">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-bold text-gray-700">Special Discount:</span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {discountPercent}% OFF (₹{discountedPrice.toLocaleString('en-IN')})
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            <label className="text-xs font-bold">Promo headline<input className="workspace-input" value={headline} onChange={e=>setHeadline(e.target.value)} maxLength={200}/></label>
            <label className="text-xs font-bold">Promo description<textarea className="workspace-textarea" value={subtext} onChange={e=>setSubtext(e.target.value)} maxLength={1000}/></label>
            {/* Promo Details Grid */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <label className="text-[10px] font-bold font-mono-caps text-gray-500 block mb-1">Promo Code</label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="w-full p-2 rounded-lg border border-gray-300 font-mono text-xs uppercase bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold font-mono-caps text-gray-500 block mb-1">Badge Tag</label>
                <input
                  type="text"
                  value={customOfferText}
                  onChange={(e) => setCustomOfferText(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-300 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Image Generation Style & Format */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col gap-3">
            <label className="text-xs font-bold font-mono-caps text-gray-700 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center text-[10px]">3</span>
              <span>Photography & Style</span>
            </label>

            {/* Aspect Ratio Selector */}
            <div>
              <span className="text-[11px] font-bold text-gray-600 block mb-1.5">Image Format / Canvas Ratio:</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '1:1', label: 'Square (1:1)', icon: 'crop_square', desc: 'Instagram Feed / WhatsApp' },
                  { id: '9:16', label: 'Story (9:16)', icon: 'crop_portrait', desc: 'Instagram Stories & Reels' },
                  { id: '16:9', label: 'Wide (16:9)', icon: 'crop_16_9', desc: 'Banner & Facebook' },
                ].map((ar) => (
                  <button
                    key={ar.id}
                    onClick={() => setAspectRatio(ar.id as AspectRatioType)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      aspectRatio === ar.id
                        ? 'bg-white font-bold shadow-xs'
                        : 'border-gray-200 bg-white/60 hover:bg-white text-gray-600'
                    }`}
                    style={aspectRatio === ar.id ? { borderColor: primaryAccentColor } : {}}
                  >
                    <span className="material-symbols-outlined text-base block">{ar.icon}</span>
                    <div className="text-xs font-bold text-gray-800 mt-0.5">{ar.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Aesthetic Style Selector */}
            <div>
              <span className="text-[11px] font-bold text-gray-600 block mb-1.5">Visual Aesthetic:</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'luxury_gold', label: '👑 Luxury Gold Editorial' },
                  { id: 'minimalist_chic', label: '🤍 Minimalist Modern' },
                  { id: 'festive_glow', label: '✨ Festive Warm Glow' },
                  { id: 'botanical_zen', label: '🌿 Botanical Spa Zen' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setAesthetic(st.id as AestheticStyle)}
                    className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      aesthetic === st.id
                        ? 'bg-white font-bold shadow-xs'
                        : 'border-gray-200 bg-white/60 hover:bg-white text-gray-600'
                    }`}
                    style={aesthetic === st.id ? { borderColor: primaryAccentColor } : {}}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-t pt-4"><h3 className="font-bold text-sm">Your ad images & logo</h3><BrandImageField label="Ad background image" uploadName="Ad Image" value={activeBackgroundUrl} onChange={url=>{setGeneratedImageUrl(null);setSelectedCuratedPhotoUrl(url)}}/><BrandImageField label="Ad logo" logo uploadName="Ad Logo" value={logoUrl} onChange={setLogoUrl}/><p className="text-xs text-slate-500">These images are used in this ad. Logo proportions and transparent PNG backgrounds are preserved.</p></div>
            {/* AI Prompt Input */}
            <div>
              <label className="text-[10px] font-bold font-mono-caps text-gray-500 block mb-1">
                Campaign notes (for your reference)
              </label>
              <textarea
                rows={2}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-gray-300 text-xs font-mono bg-white text-gray-800"
              />
            </div>

            {/* Action: Generate Image with Gemini */}
            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="w-full py-3 rounded-xl font-bold text-xs text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
              style={{ backgroundColor: primaryAccentColor }}
            >
              <span className="material-symbols-outlined text-base animate-pulse">
                {isGeneratingImage ? 'hourglass_top' : 'auto_awesome'}
              </span>
              <span>
                {isGeneratingImage ? 'Selecting photo…' : 'Choose another promo photo'}
              </span>
            </button>

            {generationNotice && (
              <div className="text-[11px] text-gray-500 bg-white p-2 rounded-lg border border-gray-200 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-amber-600">info</span>
                <span>{generationNotice}</span>
              </div>
            )}

            {/* Curated Photography Presets Switcher */}
            <div className="pt-2 border-t border-gray-200">
              <span className="text-[11px] font-bold text-gray-600 block mb-1.5">
                Or Pick from High-Res Studio Photography:
              </span>
              <div className="grid grid-cols-6 gap-1.5">
                {curatedPhotos.map((photo) => {
                  const isSelected = !generatedImageUrl && selectedCuratedPhotoUrl === photo.url;
                  return (
                    <button
                      key={photo.id}
                      onClick={() => {
                        setGeneratedImageUrl(null);
                        setSelectedCuratedPhotoUrl(photo.url);
                        showToast(`Selected "${photo.title}" photo preset`);
                      }}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-transform hover:scale-105 ${
                        isSelected ? 'border-emerald-500 ring-2 ring-emerald-300' : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={photo.url}
                        alt={photo.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE PROMOTIONAL BANNER COMPOSITOR & ONE-CLICK SHARING (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          
          {/* LIVE COMPOSITED BANNER PREVIEW CARD */}
          <div className="p-4 rounded-2xl border border-gray-200 bg-gray-900 text-white flex flex-col gap-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-lg">preview</span>
                <span className="font-bold text-xs font-mono-caps tracking-wider text-gray-200">
                  Live Promotional Banner Preview ({aspectRatio})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadBanner}
                  disabled={exportBusy}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/20"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  <span>Download High-Res PNG</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2"><button type="button" className="primary-action" disabled={exportBusy} onClick={()=>void prepareReadyAd(false)}>{exportBusy?'Preparing ad…':'Use ready ad in customer campaign'}</button><button type="button" className="secondary-action" disabled={!readyAd||exportBusy} onClick={()=>void shareReadyAd()}>Share ready ad / WhatsApp broadcast</button></div>{exportError&&<p role="alert" className="bg-rose-50 text-rose-800 rounded-xl p-3">{exportError}</p>}
            {/* BANNER STAGE */}
            <div className="flex items-center justify-center p-2 bg-black/40 rounded-xl overflow-hidden min-h-[380px]">
              <div
                id="promo-banner-container"
                className={`relative overflow-hidden rounded-xl shadow-2xl border border-white/10 transition-all flex flex-col justify-between p-6 ${
                  aspectRatio === '1:1'
                    ? 'w-full max-w-[420px] aspect-square'
                    : aspectRatio === '9:16'
                      ? 'w-full max-w-[320px] aspect-[9/16]'
                      : 'w-full max-w-[540px] aspect-video'
                }`}
                style={{
                  backgroundImage: `url(${activeBackgroundUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* DARK GRADIENT OVERLAY */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-black/95 pointer-events-none" />

                {/* BANNER TOP: SALON BRANDING & RATING */}
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-md"
                        style={{ backgroundColor: primaryAccentColor }}
                      >
                        {logoUrl?<img src={logoUrl} alt="Ad logo" className="w-full h-full object-contain bg-white"/>:(profile?.businessName || 'S').charAt(0)}
                      </span>
                      <div>
                        <div className="font-display font-extrabold text-sm tracking-wide text-white drop-shadow-md">
                          {(profile?.businessName || 'OUR SALON').toUpperCase()}
                        </div>
                        <div className="text-[10px] text-gray-300 font-mono">
                          {profile.city || 'India'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Badge Tag */}
                  <div
                    className="px-3 py-1 rounded-full text-[10px] font-mono font-bold text-white shadow-lg tracking-wider"
                    style={{ backgroundColor: primaryAccentColor }}
                  >
                    {customOfferText || `${discountPercent}% OFF`}
                  </div>
                </div>

                {/* BANNER MIDDLE: SERVICE HIGHLIGHT & OFFER */}
                <div className="relative z-10 my-auto py-3">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-white/20 backdrop-blur-xs text-[10px] font-mono-caps font-bold text-white/90 mb-1 border border-white/20">
                    {selectedService.category || 'SIGNATURE SERVICE'}
                  </div>
                  <h3 className="font-display font-bold text-2xl sm:text-3xl text-white leading-tight drop-shadow-md">
                    {selectedService.name}
                  </h3>
                  <p className="text-xs text-slate-200 mt-1 font-medium drop-shadow-xs line-clamp-2">
                    {headline}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-mono line-clamp-1">
                    {subtext}
                  </p>
                </div>

                {/* BANNER BOTTOM: PRICE & BOOKING CTA */}
                <div className="relative z-10 pt-3 border-t border-white/20 flex justify-between items-end">
                  <div>
                    <div className="text-[10px] font-mono text-gray-400">Special Offer Price</div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono font-extrabold text-2xl text-white">
                        ₹{discountedPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="font-mono text-xs text-red-400 line-through">
                        ₹{selectedService.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="mt-1 inline-block px-2 py-0.5 rounded bg-black/60 border border-white/20 text-[10px] font-mono text-sky-300">
                      CODE: <span className="font-bold text-white">{promoCode}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[9px] text-gray-300 font-mono">Book Instantly Online:</div>
                    <div className="text-[11px] font-bold text-emerald-400 font-mono truncate max-w-[150px]">
                      {websiteLink(profile.subdomain)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-gray-400 text-center font-mono">
              ✓ Ready for instant download or 1-click sharing to WhatsApp and Instagram.
            </div>
          </div>

          {/* HIDDEN CANVAS FOR HIGH-RES EXPORTS */}


          {/* PRE-FILLED SHARE TEMPLATES & ACTIONS */}
          <div className="p-5 rounded-2xl border border-gray-200 bg-white flex flex-col gap-4 shadow-xs">
            
            {/* TABS: WHATSAPP VS INSTAGRAM */}
            <div className="flex border-b border-gray-200 gap-4">
              <button
                onClick={() => setActiveTemplateTab('whatsapp')}
                className={`pb-2.5 text-xs font-bold font-mono-caps flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
                  activeTemplateTab === 'whatsapp'
                    ? 'border-emerald-600 text-emerald-700 font-extrabold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <span className="material-symbols-outlined text-lg text-emerald-600">chat</span>
                <span>Share to WhatsApp Template</span>
              </button>

              <button
                onClick={() => setActiveTemplateTab('instagram')}
                className={`pb-2.5 text-xs font-bold font-mono-caps flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
                  activeTemplateTab === 'instagram'
                    ? 'border-[#E1306C] text-[#E1306C] font-extrabold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <span className="material-symbols-outlined text-lg text-[#E1306C]">photo_camera</span>
                <span>Share to Instagram Template</span>
              </button>
            </div>

            {/* TAB CONTENT: WHATSAPP */}
            {activeTemplateTab === 'whatsapp' && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold font-mono-caps text-gray-700">
                    Pre-filled WhatsApp Message Template (Ready to Send)
                  </label>
                  <button
                    onClick={() => handleCopyText(whatsappTemplate, 'WhatsApp template')}
                    className="text-[11px] text-gray-600 hover:text-gray-900 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    <span>Copy Text</span>
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={whatsappTemplate}
                  onChange={(e) => setWhatsappTemplate(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 font-mono text-xs text-gray-800 focus:ring-2 focus:ring-emerald-400 outline-none"
                />

                {/* ACTION BUTTONS FOR WHATSAPP */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={handleShareToWhatsApp}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all hover:shadow-md"
                  >
                    <span className="material-symbols-outlined text-base">send</span>
                    <span>Share to WhatsApp Now</span>
                  </button>

                  <button
                    onClick={handleDownloadBanner}
                  disabled={exportBusy}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 hover:border-gray-400 bg-white text-gray-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">image</span>
                    <span>Download Image to Attach</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: INSTAGRAM */}
            {activeTemplateTab === 'instagram' && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold font-mono-caps text-gray-700">
                    Pre-filled Instagram Caption & Hashtags
                  </label>
                  <button
                    onClick={() => handleCopyText(instagramCaption, 'Instagram caption')}
                    className="text-[11px] text-gray-600 hover:text-gray-900 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    <span>Copy Caption</span>
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={instagramCaption}
                  onChange={(e) => setInstagramCaption(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 font-mono text-xs text-gray-800 focus:ring-2 focus:ring-purple-400 outline-none"
                />

                {/* ACTION BUTTONS FOR INSTAGRAM */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={handleShareToInstagram}
                    className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-90 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all hover:shadow-md"
                  >
                    <span className="material-symbols-outlined text-base">open_in_new</span>
                    <span>Copy Caption & Share to Instagram</span>
                  </button>

                  <button
                    onClick={handleDownloadBanner}
                  disabled={exportBusy}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 hover:border-gray-400 bg-white text-gray-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    <span>Download 1:1 Image for Post</span>
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

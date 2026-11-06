import type { CategoryTemplateConfig } from '../types';
import { ACCENT_PALETTES, DEFAULT_CATEGORY_ACCENTS, getContrastTextColor } from '../themeAccents';
import { nexoraDisplayName } from '../lib/nexoraTemplateCatalogue';
import { nexoraPreviewImage } from '../lib/nexoraPreviewImages';

// Backward-compatible exports for the template editor and verification harnesses.
export { TemplatePreviewModal } from './TemplatePreviewModal';
export type { TemplateChooseWorkspace } from './TemplatePreviewModal';

export function TemplateThumbnail({ template: t }: { template: CategoryTemplateConfig }) {
  const isRoopMahal = t.id === 'beauty_parlour';
  const isKeshPrakriti = t.id === 'hair_spa';
  const isVogueNoir = t.id === 'makeup_studio';
  const isBodhiTree = t.id === 'massage_wellness';
  const isPrismChroma = t.id === 'hair_coloring';
  const isShringaar = t.id === 'bridal_lounge';
  const isIronInk = t.id === 'tattoo_studio';
  const isArchFlutter = t.id === 'lash_brow';
  const isLuxuryEditorial = t.id === 'hair_salon';
  const accent = ACCENT_PALETTES[DEFAULT_CATEGORY_ACCENTS[t.id]];
  const accentHex = isLuxuryEditorial ? '#31251F' : isArchFlutter ? '#9A6B73' : isIronInk ? '#E11D48' : isShringaar ? '#5A0F1E' : isVogueNoir ? '#C9A96E' : isBodhiTree ? '#4E6E58' : isPrismChroma ? '#FF4FD8' : isKeshPrakriti ? '#183D32' : isRoopMahal ? '#6D2638' : accent.primaryHex;
  const split = isLuxuryEditorial || (!isVogueNoir && (isRoopMahal || isShringaar || isArchFlutter || ['modern_minimalist', 'clinical_clean', 'contemporary_balanced', 'urban_monochrome'].includes(t.layoutStyle)));
  const rounded = isLuxuryEditorial ? false : isArchFlutter || ['curved_elegant', 'chic_nude', 'zen_emerald', 'earth_bamboo', 'palace_heritage'].includes(t.layoutStyle);
  return <div aria-hidden="true" className="p-4 pb-0 bg-slate-100">
    <div className={`rounded-t-xl border shadow-sm overflow-hidden ${isIronInk ? 'border-[#E11D48]/50 bg-[#0A0A0B]' : isVogueNoir ? 'border-[#2A2A2D] bg-[#0B0B0C]' : isPrismChroma ? 'border-white/20 bg-[#0B0B14]' : isShringaar ? 'border-[#C9A24B]/60 bg-[#FBF4E6]' : isArchFlutter ? 'border-[#C9A66B]/60 bg-[#FBF6F1]' : isLuxuryEditorial ? 'border-[#D8C5A3] bg-[#F7F3EC]' : 'border-slate-300 bg-white'}`}>
      <div className={`h-6 flex items-center gap-1 px-2 border-b ${isIronInk ? 'bg-[#141417] border-white/10' : isVogueNoir ? 'bg-[#151517] border-[#2A2A2D]' : isPrismChroma ? 'bg-[#12121F] border-white/10' : isArchFlutter ? 'bg-[#FFFDFB] border-[#E0CBA6]' : isLuxuryEditorial ? 'bg-[#FBF8F2] border-[#E9E0D4]' : 'bg-white border-slate-200'}`}><i className="w-1.5 h-1.5 rounded-full bg-rose-300"/><i className="w-1.5 h-1.5 rounded-full bg-amber-300"/><i className="w-1.5 h-1.5 rounded-full bg-emerald-300"/><span data-nexora-card-mark className="ml-1.5 inline-flex items-center gap-1 rounded-sm bg-[#2A1E4A] px-1 py-[1px] text-[6px] font-black uppercase tracking-[0.12em] text-[#F5E9D6]">NEXORA</span><span className={`ml-auto text-[7px] ${isVogueNoir ? 'text-[#C9A96E] font-semibold tracking-wider' : isPrismChroma ? 'text-[#35E0F0] font-semibold tracking-wider' : isShringaar ? 'text-[#5A0F1E] font-semibold tracking-[0.18em] uppercase' : isArchFlutter ? 'text-[#7A4F57] font-semibold tracking-[0.18em] uppercase' : isLuxuryEditorial ? 'text-[#6F5B4D] font-semibold tracking-[0.2em] uppercase' : 'text-slate-400'}`}>{isIronInk ? 'IRON & INK · 12' : isShringaar ? 'Shringaar Royal · 11' : isArchFlutter ? 'Arch & Flutter · 13' : t.shortName}</span></div>
      <div className={`relative h-40 overflow-hidden ${t.themeStyle.heroBackground} ${t.themeStyle.heroTextColor} ${split ? 'flex' : ''}`}>
        <img src={nexoraPreviewImage(t)} alt="" loading="lazy" decoding="async" style={isShringaar ? { borderTopLeftRadius: '999px', borderTopRightRadius: '999px' } : isArchFlutter ? { borderRadius: '999px 999px 18px 18px' } : undefined} className={`${split ? 'w-1/2 order-2' : 'absolute inset-0 w-full'} h-full object-cover object-top motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105`} />
        {!split && <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10"/>}
        <div className={`relative z-10 p-3 flex flex-col justify-end h-full ${split ? 'w-1/2' : 'text-white w-4/5'} ${rounded || isVogueNoir || isLuxuryEditorial ? 'font-serif' : ''}`}>
          <span className={`text-[7px] uppercase tracking-widest mb-2 ${isVogueNoir ? 'text-[#C9A96E]' : isArchFlutter ? 'text-[#8A6A2F]' : 'opacity-80'}`}>{t.defaultCity.split(',')[0]} · {t.shortName}</span>
          <span className={`text-sm font-bold leading-tight ${isVogueNoir ? 'text-[#F5EFE6]' : isArchFlutter ? 'text-[#2B1B17]' : ''}`}>{nexoraDisplayName(t.id, t.title)}</span>
          <span className="text-[8px] leading-relaxed mt-1 line-clamp-2 opacity-80">{t.tagline}</span>
          <span style={{backgroundColor:accentHex, color:getContrastTextColor(accentHex)}} className={`text-[7px] font-sans font-semibold w-fit px-2.5 py-1.5 mt-2 ${rounded ? 'rounded-full' : 'rounded-sm'}`}>Explore services →</span>
        </div>
      </div>
      <div className={`grid grid-cols-3 gap-1.5 p-2 ${isIronInk ? 'bg-[#141417]' : isVogueNoir ? 'bg-[#151517]' : isPrismChroma ? 'bg-[#12121F]' : isArchFlutter ? 'bg-[#FFFDFB]' : isLuxuryEditorial ? 'bg-[#F7F3EC]' : 'bg-white'}`}>{t.services.slice(0,3).map(s => <div key={s.id} className={`border px-1.5 py-2 ${isIronInk ? 'border-[#E11D48]/50 bg-[#0A0A0B]' : isVogueNoir ? 'border-[#2A2A2D] bg-[#0B0B0C]' : isPrismChroma ? 'border-white/10 bg-white/5' : isArchFlutter ? 'border-[#C9A66B]/40 bg-[#F4D7D3]/25' : isLuxuryEditorial ? 'border-[#E9E0D4] bg-[#FBF8F2]' : 'border-slate-100'} ${rounded ? 'rounded-lg' : ''}`}><span className={`block text-[7px] truncate ${isIronInk || isVogueNoir || isPrismChroma ? 'text-[#F5F3FF]' : isArchFlutter ? 'text-[#2B1B17]' : isLuxuryEditorial ? 'text-[#31251F]' : 'text-slate-700'}`}>{s.name}</span><span style={{color:accentHex}} className="text-[8px] font-bold">₹{s.price.toLocaleString('en-IN')}</span></div>)}</div>
    </div>
  </div>;
}

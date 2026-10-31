import type {BusinessTypeId,SalonProfile} from '../types';
import {ACCENT_PALETTES,DEFAULT_CATEGORY_ACCENTS,getLuminance} from '../themeAccents';
type RewardTheme={surface:string;card:string;text:string;muted:string;border:string;radius:string;dark:boolean;font:string};
const sans='inherit',serif='Georgia, serif';
export const LOYALTY_THEMES:Record<BusinessTypeId,RewardTheme>={
 hair_salon:{surface:'#f8fafc',card:'#ffffff',text:'#0f172a',muted:'#475569',border:'#cbd5e1',radius:'0px',dark:false,font:sans},
 barber:{surface:'#181512',card:'#211711',text:'#f5efe6',muted:'#c9bdb0',border:'#705638',radius:'8px',dark:true,font:serif},
 unisex_salon:{surface:'#fff5fa',card:'#ffffff',text:'#3b1830',muted:'#77566b',border:'#f2cbdc',radius:'14px',dark:false,font:sans},
 beauty_parlour:{surface:'#fff6f3',card:'#ffffff',text:'#44241f',muted:'#795950',border:'#f2d5cf',radius:'24px',dark:false,font:serif},
 nail_studio:{surface:'#FFF5F7',card:'#FFFCFA',text:'#30242A',muted:'#7A626B',border:'#F4C8D5',radius:'20px',dark:false,font:sans},
 hair_spa:{surface:'#ecf7ef',card:'#f7fcf9',text:'#173d30',muted:'#496658',border:'#bbdfc9',radius:'18px',dark:false,font:sans},
 skincare_clinic:{surface:'#f0f9ff',card:'#ffffff',text:'#12354d',muted:'#47677a',border:'#bae6fd',radius:'12px',dark:false,font:sans},
 makeup_studio:{surface:'#0c0c10',card:'#18181e',text:'#faf5e9',muted:'#c8bfae',border:'#786b3b',radius:'12px',dark:true,font:serif},
 massage_wellness:{surface:'#f4ede3',card:'#faf6f0',text:'#3c3025',muted:'#71604d',border:'#d4c5b3',radius:'14px',dark:false,font:serif},
 hair_coloring:{surface:'#fdf4ff',card:'#ffffff',text:'#4a174e',muted:'#78557b',border:'#f0abfc',radius:'14px',dark:false,font:sans},
 bridal_lounge:{surface:'#fff3e6',card:'#fffaf5',text:'#4f1427',muted:'#835761',border:'#e9c785',radius:'18px',dark:false,font:serif},
 tattoo_studio:{surface:'#0b0b0b',card:'#181818',text:'#f5f5f5',muted:'#bcbcbc',border:'#555555',radius:'0px',dark:true,font:sans},
 lash_brow:{surface:'#f7f0e7',card:'#ffffff',text:'#3f302a',muted:'#77665c',border:'#e8ded2',radius:'14px',dark:false,font:serif},
 ayurvedic_spa:{surface:'#f9ecda',card:'#fffaf2',text:'#512e1e',muted:'#7c5b45',border:'#e7ba91',radius:'18px',dark:false,font:serif},
};
export function loyaltyTheme(profile:SalonProfile){
 const base=LOYALTY_THEMES[profile.businessType]||LOYALTY_THEMES.hair_salon;
 const palette=ACCENT_PALETTES[profile.themeAccentKey]||ACCENT_PALETTES[DEFAULT_CATEGORY_ACCENTS[profile.businessType]]||ACCENT_PALETTES.slate;
 const accent=/^#[0-9a-f]{6}$/i.test(profile.customAccentColor||'')?profile.customAccentColor:profile.businessType==='barber'?'#c49a6c':palette.primaryHex;
 const dark=profile.businessType==='barber'||(profile.darkCanvas??(base.dark||profile.themeAccentKey==='obsidian'));
 const theme=dark===base.dark?base:dark?{...base,surface:'#101216',card:'#1b1e24',text:'#f8fafc',muted:'#c1cad6',border:'#495260'}:{...base,surface:'#faf7f2',card:'#ffffff',text:'#292420',muted:'#655d54',border:'#d8cfc5'};
 return {dark,accent,style:{'--loyalty-surface':theme.surface,'--loyalty-card':theme.card,'--loyalty-text':theme.text,'--loyalty-muted':theme.muted,'--loyalty-border':theme.border,'--loyalty-radius':theme.radius,'--loyalty-font':theme.font,'--loyalty-accent':accent,'--loyalty-accent-text':(getLuminance(accent)>.179?'#000000':'#ffffff')}};
}

import type {SalonProfile} from '../types';
import {CATEGORY_TEMPLATES} from '../categoryTemplates';

export type AboutAnswers = {specialties:string; experience:string; difference:string; atmosphere:string; language:'English'|'Hindi'|'Hinglish'; tone:'Warm'|'Elegant'|'Simple'};
export const emptyAboutAnswers:AboutAnswers={specialties:'',experience:'',difference:'',atmosphere:'',language:'English',tone:'Warm'};
const clean=(value:string,limit=400)=>value.trim().replace(/\s+/g,' ').slice(0,limit);
export function buildAboutDraft(profile:SalonProfile,answers:AboutAnswers):string {
  const name=clean(profile.businessName,120),owner=clean(profile.ownerName,120),city=clean(profile.city,120);
  const specialties=clean(answers.specialties),experience=clean(answers.experience,160),difference=clean(answers.difference),atmosphere=clean(answers.atmosphere,160);
  if(!name||!specialties)return '';
  const category=CATEGORY_TEMPLATES[profile.businessType]?.shortName||'Salon & Studio';
  if(answers.language==='Hindi')return [
    `${name} में आपका स्वागत है${city?` — ${city} में आपका अपना स्टूडियो`:''}। हमारी पहचान: ${category}।`,
    [owner?`${owner} इस स्टूडियो के पीछे की प्रेरणा हैं।`:'',`हमारी मुख्य सेवाएँ: ${specialties}।`,experience?`हमारी पृष्ठभूमि और अनुभव: ${experience}।`:''].filter(Boolean).join(' '),
    [difference?`हमें खास बनाता है: ${difference}।`:'',atmosphere?`स्टूडियो का माहौल: ${atmosphere}।`:'',answers.tone==='Elegant'?'अपने लिए कुछ सुकून भरे पल चुनें।':answers.tone==='Simple'?'सेवाएँ देखें और अपनी पसंद का समय बुक करें।':'आपकी पसंद जानने और आपके अगले विज़िट का स्वागत करने के लिए हम तैयार हैं।'].filter(Boolean).join(' ')
  ].join('\n\n');
  if(answers.language==='Hinglish')return [
    `${name} mein aapka swagat hai${city?` — ${city} mein`:''}. Hamari category: ${category}.`,
    [owner?`${owner} is studio ke peeche ki pehchaan hain.`:'',`Hamari main services: ${specialties}.`,experience?`Hamari background aur experience: ${experience}.`:''].filter(Boolean).join(' '),
    [difference?`Hamari khaas baat: ${difference}.`:'',atmosphere?`Studio ka mahaul: ${atmosphere}.`:'',answers.tone==='Elegant'?'Apne liye ek khaas pal chuniye.':answers.tone==='Simple'?'Services dekhein aur apna preferred time book karein.':'Aapki pasand samajhne aur aapke agle visit ka swagat karne ke liye hum taiyar hain.'].filter(Boolean).join(' ')
  ].join('\n\n');
  return [
    `${answers.tone==='Elegant'?'Discover':answers.tone==='Simple'?'This is':'Welcome to'} ${name}${city?` in ${city}`:''}. Our focus: ${category}.`,
    [owner?`${owner} is the person behind our studio.`:'',`Our services include ${specialties}.`,experience?`Our background and experience: ${experience}.`:''].filter(Boolean).join(' '),
    [difference?`What makes us different: ${difference}.`:'',atmosphere?`Our studio atmosphere: ${atmosphere}.`:'',answers.tone==='Elegant'?'Make time for a visit shaped around you.':answers.tone==='Simple'?'Explore our services and book your preferred time.':'We look forward to understanding your preferences and welcoming you for your next visit.'].filter(Boolean).join(' ')
  ].join('\n\n');
}

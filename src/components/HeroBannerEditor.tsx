import React, {useState} from 'react';
import type {SalonProfile} from '../types';
import {CATEGORY_STANDARDIZED_DATA} from '../templateData';
import {CATEGORY_TEMPLATES} from '../categoryTemplates';
import {BrandImageField} from './BrandImageField';
import {HeroBackgroundPrompt} from './HeroBackgroundPrompt';

export function HeroBannerEditor({profile,setProfile}:{profile:SalonProfile;setProfile:React.Dispatch<React.SetStateAction<SalonProfile>>}) {
 const [busy,setBusy]=useState(false);
 const template=CATEGORY_TEMPLATES[profile.businessType];
 const presets=[{name:template?.shortName||'Current template',url:template?.coverImageUrl},...(CATEGORY_STANDARDIZED_DATA[profile.businessType]?.gallery||[]).map(photo=>({name:photo.title,url:photo.url}))].filter(p=>p.url);
 return <section className="workspace-card"><h2>Hero Banner Cover Image</h2><p className="muted">Reflected on your website hero section. Available in every template.</p><HeroBackgroundPrompt profile={profile}/><BrandImageField label="Hero image" value={profile.coverImageUrl || ''} onChange={value=>setProfile(p=>({...p,coverImageUrl:value}))} onBusyChange={setBusy}/><p className="field-label mt-5">Curated studio banner presets · {template?.shortName}</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{presets.map((p,i)=><button key={`${p.url}-${i}`} type="button" disabled={busy} aria-pressed={profile.coverImageUrl===p.url} onClick={()=>setProfile(prev=>({...prev,coverImageUrl:p.url!}))} className="rounded-xl overflow-hidden border-2 text-left" style={{borderColor:profile.coverImageUrl===p.url?'var(--color-primary)':'transparent'}}><img className="h-24 w-full object-cover" src={p.url} alt={p.name}/><span className="block p-2 text-xs">{p.name}</span></button>)}</div><p className="muted text-xs mt-3">Changes save with your workspace. Publish to make a draft website live.</p></section>;
}

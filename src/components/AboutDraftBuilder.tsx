import React,{useId,useState} from 'react';
import type {SalonProfile} from '../types';
import {CATEGORY_TEMPLATES} from '../categoryTemplates';
import {buildAboutDraft,emptyAboutAnswers,type AboutAnswers} from '../lib/aboutBuilder';

export function AboutDraftBuilder({profile,onApply}:{profile:SalonProfile;onApply:(text:string)=>void}){
  const id=useId();
  const [answers,setAnswers]=useState<AboutAnswers>({...emptyAboutAnswers});
  const [draft,setDraft]=useState('');
  const [baseline,setBaseline]=useState('');
  const [identity,setIdentity]=useState('');
  const [replace,setReplace]=useState(false);
  const [notice,setNotice]=useState('');
  const template=CATEGORY_TEMPLATES[profile.businessType]||CATEGORY_TEMPLATES.hair_salon;
  const currentIdentity=JSON.stringify([profile.businessName,profile.ownerName,profile.city,profile.businessType]);
  const stale=Boolean(draft&&(identity!==currentIdentity||baseline!==(profile.about||'')));
  const hasAbout=Boolean(profile.about?.trim());
  const change=(key:keyof AboutAnswers,value:string)=>{setAnswers(old=>({...old,[key]:value}));setDraft('');setReplace(false);setNotice('');};
  const generate=()=>{const text=buildAboutDraft(profile,answers);if(!text){setNotice('Business Details mein salon name bharein aur neeche main services batayein.');return;}setDraft(text);setBaseline(profile.about||'');setIdentity(currentIdentity);setReplace(false);setNotice('Draft ready! Review/edit karke Apply karein. Abhi aapka saved About nahi badla hai.');};
  return <details className="about-builder"><summary>Build About from your answers · No API</summary>
    <p className="muted">Kuch sawalon ke jawab dein. Yeh template-based writing helper hai, AI/API service nahi. Answers isi page par draft banane ke liye use honge; sirf Apply kiya hua About existing workspace save se save hoga.</p>
    <p className="about-builder-context"><strong>{profile.businessName||'Salon name missing'}</strong> · Owner: {profile.ownerName||'Not added'}<br/>Selected template: {template.title} · {template.shortName}{profile.city&&<> · {profile.city}</>}</p>
    <p className="muted">Name, owner ya city badalni ho to Business Details edit karein. Sirf sachchi details likhein. Draft ki language choose karein; aapke answers jis language mein hain woh waise hi include honge.</p>
    <div className="form-grid">
      <label htmlFor={`${id}-specialties`}><span className="field-label">1. Aapki main services kya hain? *</span><textarea id={`${id}-specialties`} className="workspace-input" rows={3} maxLength={400} value={answers.specialties} onChange={e=>change('specialties',e.target.value)} placeholder="Apni actual services likhein ya neeche suggestions choose karein"/></label>
      <label htmlFor={`${id}-experience`}><span className="field-label">2. Owner / team ka experience ya studio ki journey?</span><input id={`${id}-experience`} className="workspace-input" maxLength={160} value={answers.experience} onChange={e=>change('experience',e.target.value)} placeholder="e.g. 5 years in nail art, started in 2021 (sirf agar sahi ho)"/></label>
      <label htmlFor={`${id}-difference`}><span className="field-label">3. Aapke studio ki khaas baat kya hai?</span><textarea id={`${id}-difference`} className="workspace-input" rows={3} maxLength={400} value={answers.difference} onChange={e=>change('difference',e.target.value)} placeholder="e.g. personalised consultation, custom designs"/></label>
      <label htmlFor={`${id}-atmosphere`}><span className="field-label">4. Studio ka mahaul kaisa hai?</span><input id={`${id}-atmosphere`} className="workspace-input" maxLength={160} value={answers.atmosphere} onChange={e=>change('atmosphere',e.target.value)} placeholder="e.g. calm and welcoming, minimal interiors"/></label>
      <label htmlFor={`${id}-language`}><span className="field-label">Draft language</span><select id={`${id}-language`} className="workspace-input" value={answers.language} onChange={e=>change('language',e.target.value)}>{['English','Hindi','Hinglish'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label htmlFor={`${id}-tone`}><span className="field-label">Writing style</span><select id={`${id}-tone`} className="workspace-input" value={answers.tone} onChange={e=>change('tone',e.target.value)}>{['Warm','Elegant','Simple'].map(x=><option key={x}>{x}</option>)}</select></label>
    </div>
    <p className="muted">Service ideas from your template — sirf jo aap offer karte hain unhe add karein:</p>
    <div className="about-service-ideas">{template.subCategories.map(service=><button type="button" className="secondary-action" key={service} disabled={answers.specialties.split(',').some(x=>x.trim().toLowerCase()===service.toLowerCase())} onClick={()=>change('specialties',[answers.specialties.trim(),service].filter(Boolean).join(', ').slice(0,400))}>+ {service}</button>)}</div>
    <button type="button" className="secondary-action" onClick={generate}>Generate About draft</button>
    {draft&&<div className="about-draft-preview"><label htmlFor={`${id}-draft`}><span className="field-label">Review & edit generated About</span><textarea id={`${id}-draft`} className="workspace-input" rows={9} maxLength={5000} value={draft} onChange={e=>{setDraft(e.target.value);setReplace(false);}}/></label>
      <small className="muted">{draft.length}/5000 characters · Review all claims before applying.</small>
      {stale&&<p role="status">Salon details ya current About badal gaya hai. Latest details se draft dobara generate karein.</p>}
      {hasAbout&&<label className="about-replace-confirm"><input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)}/> Reviewed draft se mera current About text replace karein.</label>}
      <div className="action-buttons"><button type="button" className="secondary-action" disabled={!draft.trim()||stale||(hasAbout&&!replace)} onClick={()=>{if(stale||!draft.trim()||(hasAbout&&!replace))return;onApply(draft.trim());setDraft('');setReplace(false);setNotice('About draft applied. Neeche final text edit kar sakte hain. Workspace ka save status complete hone dein.');}}>Apply reviewed About</button><button type="button" className="secondary-action" onClick={()=>{setDraft('');setReplace(false);setNotice('Draft discarded. Current About unchanged.');}}>Discard draft</button></div>
    </div>}
    {notice&&<p className="about-builder-notice" role="status" aria-live="polite">{notice}</p>}
  </details>;
}

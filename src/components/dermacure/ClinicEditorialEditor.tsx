import type { Dispatch, SetStateAction } from 'react';
import type { ClinicFaq, SalonProfile, SalonService } from '../../types';
import { PatientBenefitsManager } from './PatientBenefitsManager';
import { ClinicJournalManager } from './ClinicJournalManager';
import { ClinicOffersManager } from './ClinicOffersManager';
import { ClinicTreatmentStoriesManager } from './ClinicTreatmentStoriesManager';

export function ClinicEditorialEditor({profile,setProfile,services}: {profile:SalonProfile;setProfile:Dispatch<SetStateAction<SalonProfile>>;services?:SalonService[]}) {
  const faqs=profile.clinicFaq||[];
  const updateFaq=(id:string,patch:Partial<ClinicFaq>)=>setProfile(p=>({...p,clinicFaq:(p.clinicFaq||[]).map(f=>f.id===id?{...f,...patch,...(Object.keys(patch).some(k=>k!=='published' && patch[k as keyof ClinicFaq]!==f[k as keyof ClinicFaq])?{published:false}:{})}:f)}));

  return <div className="mb-6"><h3 className="font-bold mb-3">Clinic offers, treatment stories, articles, FAQs &amp; Patient Benefits</h3><p className="muted mb-3">Add clinic-approved information only. New items are not displayed until you choose to publish them. Editing a published item returns it to draft; wait for the save before reviewing and publishing it again. Your changes save with website content.</p>
    
    <ClinicOffersManager profile={profile} setProfile={setProfile} services={services} />

    <ClinicTreatmentStoriesManager profile={profile} setProfile={setProfile} />

    <ClinicJournalManager profile={profile} setProfile={setProfile} />

    <h4 className="font-bold mt-6">Clinic FAQs</h4><p className="muted">Once a custom question is published, published custom questions replace the default booking guidance. Drafts remain private.</p><button type="button" className="secondary-action my-3" onClick={()=>setProfile(p=>({...p,clinicFaq:[...(p.clinicFaq||[]),{id:crypto.randomUUID(),question:'',answer:'',published:false}]}))}>Add question draft</button>
    {faqs.map(f=><fieldset key={f.id} className="border rounded-xl p-4 mb-3"><legend>{f.question||'Question draft'}</legend><label><span className="field-label">Question</span><input className="workspace-input" value={f.question} onChange={e=>updateFaq(f.id,{question:e.target.value})}/></label><label><span className="field-label">Answer</span><textarea className="workspace-input" rows={3} value={f.answer} onChange={e=>updateFaq(f.id,{answer:e.target.value})}/></label><label><input type="checkbox" checked={f.published} disabled={!f.published&&(!f.question.trim()||!f.answer.trim())} onChange={e=>updateFaq(f.id,{published:e.target.checked})}/> Publish this approved answer</label> <button type="button" className="secondary-action" onClick={()=>setProfile(p=>({...p,clinicFaq:(p.clinicFaq||[]).filter(x=>x.id!==f.id)}))}>Remove</button></fieldset>)}
    {profile.clinicFaq!==undefined&&<button type="button" className="secondary-action" onClick={()=>setProfile(p=>({...p,clinicFaq:undefined}))}>Restore default FAQ guidance</button>}

    <PatientBenefitsManager profile={profile} setProfile={setProfile} />
  </div>;
}


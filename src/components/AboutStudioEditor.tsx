import React,{useId} from 'react';
import type {SalonProfile} from '../types';
import {BrandImageField} from './BrandImageField';
export function AboutStudioEditor({profile,setProfile}:{profile:SalonProfile;setProfile:React.Dispatch<React.SetStateAction<SalonProfile>>}){
 const id=useId();
 return <section className="mt-6" aria-label="Edit About our studio"><h3 className="font-bold mb-3">Edit About our studio</h3><p className="muted mb-3">Update the description and photo shown in your website’s About section. Changes save with your workspace.</p><div className="form-grid"><label htmlFor={`${id}-about`}><span className="field-label">About your studio</span><textarea id={`${id}-about`} className="workspace-input" rows={7} maxLength={5000} value={profile.about||''} onChange={event=>setProfile(previous=>({...previous,about:event.target.value}))} placeholder="Tell customers about your salon, experience and approach to care."/><small className="muted">{(profile.about||'').length}/5000 characters</small></label><BrandImageField label="About studio photo" uploadName="Studio Photo" value={profile.ownerPhotoUrl||''} onChange={ownerPhotoUrl=>setProfile(previous=>({...previous,ownerPhotoUrl}))} hint="Shown in About our studio. The photo fills the card and may be cropped at the edges."/></div></section>;
}

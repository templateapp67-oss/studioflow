import {ClinicEditorialEditor} from './dermacure/ClinicEditorialEditor';
import {ClinicContentEditor} from './dermacure/ClinicContentEditor';
import {clinicPublicEmail} from '../lib/dermacureContent';
import type { SalonService } from '../types';
import {ReviewSourceEditor} from './ConversionEditors';
import {AboutStudioEditor} from './AboutStudioEditor';
import {PhotoGalleryManager} from './PhotoGalleryManager';
import {HeaderNavigationManager} from './HeaderNavigationManager';
import {clientExperiences} from '../lib/demoWebsiteContent';
import React, { useId, useState } from 'react';
import type { SalonProfile } from '../types';
import type { Testimonial } from '../templateData';
import { WEBSITE_SECTIONS, SECTION_LABELS, websiteSections } from '../lib/websiteContent';
import { TestimonialModal } from './ClientTestimonials';
export function WebsiteContentManager({profile,setProfile,gallery=[],setGallery,services=[],showAbout=true,showGallery=true}:{showAbout?:boolean;showGallery?:boolean;services?:SalonService[];profile:SalonProfile;setProfile:React.Dispatch<React.SetStateAction<SalonProfile>>;gallery?:string[];setGallery?:(images:string[])=>void}) {
 const jumpId=useId();
 const [editing,setEditing]=useState<Testimonial|null>(null),[open,setOpen]=useState(false);
 const reviews=clientExperiences(profile);
 return <section className="workspace-card"><h2>Website sections & content</h2><p className="muted mb-5">These controls apply to every salon design. Saved changes update your preview and published website.</p>
 {showAbout&&<AboutStudioEditor profile={profile} setProfile={setProfile}/>}
 <nav className="content-editor-jumps" aria-label="Content editor sections">{[['menu','Header menu'],['visibility','Show / hide sections'],['headings','Section headings'],['testimonials','Client reviews']].map(([key,label])=><a key={key} href={`#${jumpId}-${key}`}>{label}</a>)}</nav>
 <div id={`${jumpId}-menu`} className="content-editor-anchor"><HeaderNavigationManager profile={profile} setProfile={setProfile}/></div>
 <h3 id={`${jumpId}-visibility`} className="font-bold mb-3 content-editor-anchor">Show / hide website sections</h3><p className="muted mb-3">In switches se sections ki visibility badalti hai. Content edit karne ke liye sidebar ka matching step kholein.</p>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">{Object.entries(websiteSections(profile)).map(([key,enabled])=><label key={key} className="border rounded-xl p-3 flex gap-3 items-center capitalize"><input type="checkbox" checked={enabled} onChange={e=>setProfile(p=>({...p,websiteSections:{...websiteSections(p),[key]:e.target.checked}}))}/>{SECTION_LABELS[key as keyof typeof WEBSITE_SECTIONS] || key}</label>)}</div>
 <h3 id={`${jumpId}-headings`} className="font-bold mb-3 content-editor-anchor">Section headings & subtitles</h3><div className="form-grid mb-6">{['packagesTitle','servicesTitle','servicesSubtitle','stylistsTitle','stylistsSubtitle','testimonialsTitle','galleryTitle','locationTitle','videosTitle','videosSubtitle','socialTitle','loyaltyTitle','policiesTitle'].map(key=><label key={key}><span className="field-label">{key.replace(/([A-Z])/g,' $1')}</span><input className="workspace-input" value={profile.sectionHeadings?.[key]||''} placeholder="Use template default" onChange={e=>setProfile(p=>({...p,sectionHeadings:{...p.sectionHeadings,[key]:e.target.value}}))}/></label>)}</div>
 {profile.businessType==='skincare_clinic'&&<><label className="block mb-6"><span className="field-label">Public clinic contact email (optional)</span><input className="workspace-input" type="email" maxLength={254} value={profile.clinicPublicEmail||''} aria-invalid={!!profile.clinicPublicEmail&&!clinicPublicEmail(profile.clinicPublicEmail)} onChange={e=>setProfile(p=>({...p,clinicPublicEmail:e.target.value}))}/><small>This address appears on your clinic website. Your account/business email remains private; it is not copied here automatically.</small>{!!profile.clinicPublicEmail&&!clinicPublicEmail(profile.clinicPublicEmail)&&<small role="alert">Enter a valid public email or leave this blank.</small>}</label><ClinicContentEditor profile={profile} setProfile={setProfile} services={services}/><ClinicEditorialEditor profile={profile} setProfile={setProfile}/></>}
 {showGallery&&<PhotoGalleryManager profile={profile} setProfile={setProfile} gallery={gallery} setGallery={setGallery}/>}
 <ReviewSourceEditor profile={profile} setProfile={setProfile}/><h3 id={`${jumpId}-testimonials`} className="font-bold mb-3 content-editor-anchor">Featured client experiences</h3><p className="muted mb-3">Add client-approved testimonials. These are owner-entered reviews, not verified platform ratings.</p><button className="secondary-action mb-4" onClick={()=>{setEditing(null);setOpen(true);}}>Add testimonial</button><div className="space-y-3">{reviews.map(r=><article key={r.id} className="border rounded-lg p-3"><strong>{r.name}</strong>{r.isDemo&&<small className="block text-amber-700">Demo testimonial · Replace with a real client experience</small>}<p>{r.comment}</p><button className="underline mr-4" onClick={()=>{setEditing(r);setOpen(true);}}>Edit</button><button className="underline" onClick={()=>setProfile(p=>({...p,demoTestimonialsInitialized:true,websiteTestimonials:reviews.filter(x=>x.id!==r.id)}))}>Remove</button></article>)}</div>
 <TestimonialModal isOpen={open} onClose={()=>setOpen(false)} editingTestimonial={editing} onSave={saved=>{setProfile(p=>({...p,demoTestimonialsInitialized:true,websiteTestimonials:[{...saved,isDemo:false,verified:false},...reviews.filter(r=>r.id!==saved.id)]}));setOpen(false);}}/>
 </section>;
}

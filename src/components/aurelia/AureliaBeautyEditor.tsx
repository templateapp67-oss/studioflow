import React, {useMemo, useState} from 'react';
import {ChevronDown, ChevronUp, Plus, Save, Trash2, Video} from 'lucide-react';
import {ServiceManagement} from '../ServiceManagement';
import {TeamManagement} from '../TeamManagement';
import {WebsiteContentManager} from '../WebsiteContentManager';
import {uploadSalonImage} from '../../lib/supabase';
import {AURELIA_DEFAULT_OFFERS, AURELIA_IMAGES, aureliaConfigFor} from '../../lib/aureliaBeauty';
import type {AureliaBeautyConfig, SalonOffer, SalonProfile, SocialVideo} from '../../types';
import type {SalonWebsitePreviewProps} from '../SalonWebsitePreview';

export function AureliaBeautyEditor(props:SalonWebsitePreviewProps){
 const {profile}=props;
 const [uploading,setUploading]=useState('');
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [newOfferTitle,setNewOfferTitle]=useState('');
 const [newOfferDescription,setNewOfferDescription]=useState('');
 const [newOfferPrice,setNewOfferPrice]=useState('0');
 const [videoLines,setVideoLines]=useState(()=> (profile.socialVideos||[]).map(v=>(v.title||'Studio video')+' | '+(v.previewVideoUrl||v.youtubeUrl)).join('\n'));
 const config=aureliaConfigFor(profile);
 const offers=useMemo(()=>profile.promoOffers===undefined?AURELIA_DEFAULT_OFFERS:profile.promoOffers,[profile.promoOffers]);
 const accent=profile.customAccentColor||'#9b7652';
 const updateProfile=(patch:Partial<SalonProfile>)=>props.setProfile?.(current=>({...current,...patch}));
 const updateConfig=(patch:Partial<AureliaBeautyConfig>)=>props.setProfile?.(current=>({...current,aureliaBeauty:{...aureliaConfigFor(current),...patch}}));
 const updateOffer=(id:string,patch:Partial<SalonOffer>)=>updateProfile({promoOffers:offers.map(offer=>offer.id===id?{...offer,...patch,isDemo:false}:offer)});
 const addOffer=()=>{
  const title=newOfferTitle.trim();
  if(!title){setError('Enter an offer title first.');return;}
  const price=Math.max(0,Number(newOfferPrice)||0);
  const item:SalonOffer={id:'aurelia-offer-'+Date.now(),title,description:newOfferDescription.trim()||'Ask the salon to confirm this offer.',image:AURELIA_IMAGES.hero,badge:'New offer',offerType:'flat',discountValue:0,originalPriceINR:price,offerPriceINR:price,applicableServices:[],couponCode:'',validFrom:new Date().toISOString().slice(0,10),validTo:'',terms:'Confirm price and availability with the salon.',isActive:true,isDemo:true};
  updateProfile({promoOffers:[...offers,item]});setNewOfferTitle('');setNewOfferDescription('');setNewOfferPrice('0');setMessage('Offer added to your Aurelia workspace.');
 };
 const deleteOffer=(id:string)=>updateProfile({promoOffers:offers.filter(offer=>offer.id!==id)});
 const moveSection=(index:number,direction:-1|1)=>{
  const order=[...(config.sectionOrder||['hero','services','story','team','menu','gallery','videos','offers','reviews','contact'])];
  const target=index+direction;if(target<0||target>=order.length)return;
  [order[index],order[target]]=[order[target],order[index]];
  updateConfig({sectionOrder:order});
 };
 const uploadLogo=async(file:File)=>{
  setError('');setMessage('');setUploading('logo');
  try{const url=await uploadSalonImage(file);updateProfile({logoUrl:url});setMessage('Logo uploaded to this salon workspace.');}
  catch(e){setError(e instanceof Error?e.message:'Logo upload failed.');}
  finally{setUploading('');}
 };
 const uploadImage=async (file:File,key:'heroImageUrl'|'storyImageUrl')=>{
  setError('');setMessage('');setUploading(key);
  try{const url=await uploadSalonImage(file);updateConfig({[key]:url} as Partial<AureliaBeautyConfig>);setMessage('Image uploaded and saved to this salon workspace.');}
  catch(e){setError(e instanceof Error?e.message:'Image upload failed.');}
  finally{setUploading('');}
 };
 const uploadGallery=async(file:File)=>{
  setError('');setMessage('');setUploading('gallery');
  try{
   const url=await uploadSalonImage(file);
   const current=Array.isArray(profile.photoGallery)?profile.photoGallery:[];
   updateProfile({photoGallery:[...current,{id:'aurelia-gallery-'+Date.now(),category:'Skin',url,title:file.name.replace(/\.[^.]+$/,''),isDemo:false}],photoGalleryInitialized:true,photoGalleryType:'aurelia_beauty_parlour'});
   setMessage('Gallery photo uploaded.');
  }catch(e){setError(e instanceof Error?e.message:'Gallery upload failed.');}
  finally{setUploading('');}
 };
 const saveVideoLinks=()=>{
  const items:SocialVideo[]=videoLines.split('\n').map((line,index)=>{
   const parts=line.split('|');const title=(parts[0]||'Studio video').trim();const url=(parts.slice(1).join('|')||'').trim();
   return {id:'aurelia-owner-video-'+index+'-'+Date.now(),title,description:'Video added by the salon owner.',youtubeUrl:url,previewVideoUrl:/\.(mp4|webm)(\?|$)/i.test(url)?url:undefined,videoId:'',thumbnailUrl:AURELIA_IMAGES.galleryStudio,categoryTag:'SHOWCASE',isOwnerVideo:true,views:'',isDemo:false};
  }).filter(video=>video.youtubeUrl.startsWith('https://')||video.youtubeUrl.startsWith('http://'));
  updateProfile({socialVideos:items,demoVideosInitialized:true});
  setMessage(items.length+' video link(s) saved.');
 };
 return <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6" aria-label="Aurelia Beauty Parlour owner editor">
  <header className="workspace-card flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[.2em] text-amber-800">Template 16 · Beauty Parlour</p><h1 className="text-2xl font-semibold">Aurelia Website Editor</h1><p className="muted">Your changes are saved with the current salon workspace and appear on this salon's preview and published website.</p></div><span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-2 text-xs">Supabase workspace</span></header>
  {message&&<p role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">{message}</p>}
  {error&&<p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-900">{error}</p>}
  <section className="workspace-card space-y-4">
   <div><h2>Brand, hero and story</h2><p className="muted">This is the salon's own brand name. NEXORA is used only for the platform template catalogue.</p></div>
   <div className="grid md:grid-cols-2 gap-4">
    <label><span className="field-label">Salon display name</span><input className="workspace-input" value={profile.businessName} onChange={e=>updateProfile({businessName:e.target.value})}/></label>
    <label><span className="field-label">Tagline</span><input className="workspace-input" value={profile.tagline} onChange={e=>updateProfile({tagline:e.target.value})}/></label>
    <label className="md:col-span-2"><span className="field-label">Hero heading</span><input className="workspace-input" value={config.heroHeading||''} onChange={e=>updateConfig({heroHeading:e.target.value})}/></label>
    <label className="md:col-span-2"><span className="field-label">Hero subtext</span><textarea className="workspace-input min-h-24" value={config.heroSubtext||''} onChange={e=>updateConfig({heroSubtext:e.target.value})}/></label>
    <label className="md:col-span-2"><span className="field-label">About / story</span><textarea className="workspace-input min-h-28" value={profile.about} onChange={e=>updateProfile({about:e.target.value})}/></label>
    <label className="md:col-span-2"><span className="field-label">Story heading</span><input className="workspace-input" value={config.storyHeading||''} onChange={e=>updateConfig({storyHeading:e.target.value})}/></label></div><div className="grid md:grid-cols-2 gap-4">
    <label><span className="field-label">Announcement bar</span><input className="workspace-input" value={config.announcementText||''} onChange={e=>updateConfig({announcementText:e.target.value})}/></label>
    <label><span className="field-label">Hero eyebrow</span><input className="workspace-input" value={config.heroEyebrow||''} onChange={e=>updateConfig({heroEyebrow:e.target.value})}/></label>
    <label><span className="field-label">Hero badge</span><input className="workspace-input" value={config.heroBadge||''} onChange={e=>updateConfig({heroBadge:e.target.value})}/></label>
    <label><span className="field-label">Story eyebrow</span><input className="workspace-input" value={config.storyEyebrow||''} onChange={e=>updateConfig({storyEyebrow:e.target.value})}/></label>
    <label><span className="field-label">Working hours display</span><input className="workspace-input" value={config.workingHoursDisplay||''} onChange={e=>updateConfig({workingHoursDisplay:e.target.value})}/></label>
   </div>
   <div className="grid md:grid-cols-2 gap-4">
    <div className="border rounded-xl p-3 space-y-2"><span className="field-label">Salon logo</span>{profile.logoUrl&&<img src={profile.logoUrl} alt="Salon logo" className="h-16 max-w-40 object-contain"/>}<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" disabled={!!uploading} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadLogo(file);}}/><small>Logo is stored in this salon's Supabase media area.</small></div>
   </div>
   <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
    <label><span className="field-label">Background colour</span><input className="workspace-input h-11 p-1" type="color" value={config.backgroundColor||'#f6f1ea'} onChange={e=>updateConfig({backgroundColor:e.target.value})}/></label>
    <label><span className="field-label">Text colour</span><input className="workspace-input h-11 p-1" type="color" value={config.inkColor||'#1d1612'} onChange={e=>updateConfig({inkColor:e.target.value})}/></label>
    <label><span className="field-label">Accent colour</span><input className="workspace-input h-11 p-1" type="color" value={config.accentColor||'#d9b98f'} onChange={e=>updateConfig({accentColor:e.target.value})}/></label>
    <label><span className="field-label">Border colour</span><input className="workspace-input h-11 p-1" type="color" value={config.lineColor||'#d8c8b4'} onChange={e=>updateConfig({lineColor:e.target.value})}/></label>
   </div>
   <div className="grid md:grid-cols-2 gap-4">
    <div className="border rounded-xl p-3 space-y-2"><span className="field-label">Hero image</span><img src={config.heroImageUrl||profile.coverImageUrl} alt="Hero preview" className="w-full h-40 object-cover rounded-lg"/><input type="file" accept="image/jpeg,image/png,image/webp" disabled={!!uploading} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadImage(file,'heroImageUrl');}}/><small>JPG, PNG or WebP · max 5 MB · uploaded to your Supabase media folder.</small></div>
    <div className="border rounded-xl p-3 space-y-2"><span className="field-label">Story image</span><img src={config.storyImageUrl||AURELIA_IMAGES.story} alt="Story preview" className="w-full h-40 object-cover rounded-lg"/><input type="file" accept="image/jpeg,image/png,image/webp" disabled={!!uploading} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadImage(file,'storyImageUrl');}}/><small>JPG, PNG or WebP · max 5 MB.</small></div>
   </div>
  </section>
  <section className="workspace-card space-y-4">
   <h2>Website sections and headings</h2>
   <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{Object.entries(websiteVisibility(profile)).map(([key,value])=><label key={key} className="border rounded-xl p-3 flex items-center gap-3 capitalize"><input type="checkbox" checked={value} onChange={e=>updateProfile({websiteSections:{...websiteVisibility(profile),[key]:e.target.checked}})}/>{key.replace(/([A-Z])/g,' $1')}</label>)}</div>
   <div className="grid md:grid-cols-2 gap-3">
    {(['servicesHeading','menuHeading','teamHeading','galleryHeading','videosHeading','offersHeading','reviewsHeading','contactHeading'] as const).map(key=><label key={key}><span className="field-label">{key.replace(/([A-Z])/g,' $1')}</span><input className="workspace-input" value={config[key]||''} onChange={e=>updateConfig({[key]:e.target.value})}/></label>)}
   </div>
   <div className="border-t pt-4 space-y-2">
    <h3 className="font-semibold">Website section order</h3>
    {(config.sectionOrder||['hero','services','story','team','menu','gallery','videos','offers','reviews','contact']).map((key,index)=><div key={key} className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2"><span className="capitalize text-sm">{key.replace(/([A-Z])/g,' $1')}</span><div className="flex gap-1"><button className="secondary-action" disabled={index===0} onClick={()=>moveSection(index,-1)} aria-label={'Move '+key+' up'}><ChevronUp size={14}/></button><button className="secondary-action" disabled={index===(config.sectionOrder||['hero','services','story','team','menu','gallery','videos','offers','reviews','contact']).length-1} onClick={()=>moveSection(index,1)} aria-label={'Move '+key+' down'}><ChevronDown size={14}/></button></div></div>)}
   </div>
  </section>
  <section className="workspace-card space-y-4">
   <div><h2>Gallery photos</h2><p className="muted">Upload real photos from this salon. They are saved in the existing private owner media path in Supabase Storage.</p></div>
   <input type="file" accept="image/jpeg,image/png,image/webp" disabled={!!uploading} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadGallery(file);}}/>
   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{(profile.photoGallery||[]).filter(p=>p.url).map(item=><div key={item.id} className="relative"><img src={item.url} alt={item.title} className="w-full aspect-square object-cover rounded-lg"/><button className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-2" onClick={()=>updateProfile({photoGallery:(profile.photoGallery||[]).filter(p=>p.id!==item.id),photoGalleryInitialized:true})} aria-label="Remove gallery photo"><Trash2 size={14}/></button></div>)}</div>
  </section>
  <section className="workspace-card space-y-4">
   <div className="flex items-center gap-2"><Video size={18}/><h2>Video gallery</h2></div>
   <p className="muted">Add one video per line in this format: Video title | Public YouTube, Instagram or direct MP4 URL. Demo stock clips from the source repository are not added as real salon videos.</p>
   <textarea className="workspace-input min-h-32" value={videoLines} onChange={e=>setVideoLines(e.target.value)} placeholder={'Aurelia studio tour | https://...'} />
   <button className="primary-action" onClick={saveVideoLinks}><Save size={16}/> Save video links</button>
  </section>
  <section className="workspace-card space-y-4">
   <div><h2>Promotions & offers</h2><p className="muted">These offers are saved in the salon workspace. Sample offers stay clearly labelled until you edit and approve them.</p></div>
   {offers.map(offer=><article key={offer.id} className="border rounded-xl p-3 grid md:grid-cols-[1fr_auto] gap-3">
    <div className="grid md:grid-cols-2 gap-3">
     <label><span className="field-label">Offer title</span><input className="workspace-input" value={offer.title} onChange={e=>updateOffer(offer.id,{title:e.target.value})}/></label>
     <label><span className="field-label">Badge</span><input className="workspace-input" value={offer.badge} onChange={e=>updateOffer(offer.id,{badge:e.target.value})}/></label>
     <label className="md:col-span-2"><span className="field-label">Description</span><textarea className="workspace-input" value={offer.description} onChange={e=>updateOffer(offer.id,{description:e.target.value})}/></label>
     <label><span className="field-label">Offer price (₹)</span><input className="workspace-input" type="number" min="0" value={offer.offerPriceINR} onChange={e=>updateOffer(offer.id,{offerPriceINR:Number(e.target.value)||0})}/></label>
     <label><span className="field-label">Expiry date</span><input className="workspace-input" type="date" value={offer.validTo} onChange={e=>updateOffer(offer.id,{validTo:e.target.value})}/></label>
    </div>
    <div className="flex md:flex-col items-center justify-between gap-3"><label className="text-sm flex items-center gap-2"><input type="checkbox" checked={offer.isActive} onChange={e=>updateOffer(offer.id,{isActive:e.target.checked})}/> Active</label><button className="secondary-action text-red-700" onClick={()=>deleteOffer(offer.id)}><Trash2 size={14}/> Delete</button><small>{offer.isDemo?'Demo':'Owner edited'}</small></div>
   </article>)}
   <div className="border-t pt-4 grid md:grid-cols-3 gap-3">
    <input className="workspace-input" value={newOfferTitle} onChange={e=>setNewOfferTitle(e.target.value)} placeholder="New offer name"/>
    <input className="workspace-input" value={newOfferDescription} onChange={e=>setNewOfferDescription(e.target.value)} placeholder="Short offer description"/>
    <input className="workspace-input" type="number" min="0" value={newOfferPrice} onChange={e=>setNewOfferPrice(e.target.value)} placeholder="Offer price ₹"/>
   </div>
   <button className="primary-action" onClick={addOffer}><Plus size={16}/> Add new offer</button>
  </section>
  <section className="workspace-card space-y-4"><h2>Services and prices</h2><p className="muted">Manage actual bookable services using the shared StudioFlow service manager.</p>{props.setServices?<ServiceManagement services={props.services} setServices={props.setServices} profile={profile} primaryAccentColor={accent}/>:<p role="status">Service editing requires an owner workspace.</p>}</section>
  <section className="workspace-card space-y-4"><h2>Artists and staff</h2>{props.setStylists?<TeamManagement stylists={props.stylists} setStylists={props.setStylists} services={props.services} setServices={props.setServices} businessType="aurelia_beauty_parlour" primaryAccentColor={accent}/>:<p role="status">Staff editing requires an owner workspace.</p>}</section>
  {props.setProfile&&<WebsiteContentManager profile={profile} setProfile={props.setProfile} services={props.services} showAbout={false} showGallery={false}/>}
 </main>;
}
function websiteVisibility(profile:SalonProfile){return {header:true,announcement:true,hero:true,about:true,services:true,packages:true,stylists:true,gallery:true,videos:true,promo:true,testimonials:true,location:true,footer:true,homeServices:true,...(profile.websiteSections||{})};}

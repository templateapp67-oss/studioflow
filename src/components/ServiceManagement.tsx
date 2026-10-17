import {isPackage} from '../lib/packageCatalogue';
import {ServiceImageTemplates} from './ServiceImageTemplates';
import {serviceDescriptionSuggestions} from '../lib/serviceDescriptions';
import {ServiceImageCropper} from './ServiceImageCropper';
import {ServiceDescriptionSuggestions} from './ServiceDescriptionSuggestions';
import {ServicePhoto} from './ServicePhoto';
import {uploadServicePhoto,discardServicePhoto,servicePhotoFromUrl} from '../lib/servicePhoto';
import React,{useEffect,useRef,useState} from 'react';
import {Plus,Edit3,Trash2,Clock,Eye,X,Search,Camera} from 'lucide-react';
import type {SalonService,SalonProfile} from '../types';
import {CATEGORY_TEMPLATES} from '../categoryTemplates';
import {MAX_SERVICES,serviceOrigin,serviceValidation} from '../lib/serviceCatalogue';

interface ServiceManagementProps {
 services:SalonService[];
 setServices:React.Dispatch<React.SetStateAction<SalonService[]>>;
 primaryAccentColor:string;
 profile?:SalonProfile;
 onNavigateToPreview?:()=>void;
}
type ServiceForm={name:string;category:string;description:string;price:string;duration:string;popular:boolean;showDuration:boolean;imageUrl:string;imagePath:string};
export function ServiceManagement({services,setServices,primaryAccentColor,profile,onNavigateToPreview}:ServiceManagementProps){
 const template=CATEGORY_TEMPLATES[profile?.businessType||'hair_salon'];
 const categories=Array.from(new Set([...template.subCategories,...services.map(service=>service.category)].filter(Boolean)));
 const [offering,setOffering]=useState<'all'|'services'|'packages'>(()=>typeof location!=='undefined'&&new URLSearchParams(location.search).get('offerings')==='packages'?'packages':'all');
 const [search,setSearch]=useState(''),[category,setCategory]=useState('All'),[editing,setEditing]=useState<string|null|undefined>(undefined),[remove,setRemove]=useState<string|null>(null),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [form,setForm]=useState<ServiceForm>({name:'',category:'',description:'',price:'',duration:'45',popular:false,showDuration:true,imageUrl:'',imagePath:''});
 const [selectedImageTemplate,setSelectedImageTemplate]=useState('');const [cropping,setCropping]=useState(false);const [uploading,setUploading]=useState(false);const [photoUrl,setPhotoUrl]=useState('');const uploadVersion=useRef(0),newUploads=useRef<string[]>([]);
 const dialog=useRef<HTMLElement>(null),opener=useRef<HTMLElement|null>(null);
 const close=(keepPath='')=>{uploadVersion.current++;setUploading(false);setCropping(false);for(const path of newUploads.current)if(path!==keepPath)void discardServicePhoto(path);newUploads.current=[];setEditing(undefined);opener.current?.focus();};
 useEffect(()=>()=>{uploadVersion.current++;for(const path of newUploads.current)void discardServicePhoto(path);},[]);
 useEffect(()=>{
  if(editing===undefined)return;
  dialog.current?.querySelector<HTMLElement>('select,input')?.focus();
  const keys=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();close();}
   if(event.key==='Tab'){
    const nodes=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select')||[]) as HTMLElement[],first=nodes[0],last=nodes[nodes.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
   }
  };
  document.addEventListener('keydown',keys);return()=>document.removeEventListener('keydown',keys);
 },[editing]);
 const open=(service?:SalonService)=>{
  opener.current=document.activeElement as HTMLElement;
  setEditing(service?.id||null);setSelectedImageTemplate('');setCropping(false);setError('');setPhotoUrl('');
  setForm(service?{name:service.name,category:service.category,description:service.description,price:String(service.price),duration:String(service.durationMinutes),popular:!!service.popular,showDuration:service.showDuration!==false,imageUrl:service.imageUrl||'',imagePath:service.imagePath||''}:{name:'',category:'',description:'',price:'',duration:'45',popular:false,showDuration:true,imageUrl:'',imagePath:''});
 };
 const adding=editing===null;
 const serviceNames=Array.from(new Set(template.services.map(item=>item.name)));
 const recommendedCategory=template.services.find(item=>item.name===form.name)?.category||'';
 const relatedCategories=form.name?Array.from(new Set([recommendedCategory,...template.subCategories,...template.services.map(item=>item.category)].filter(Boolean))):[];
 const descriptionOptions=serviceDescriptionSuggestions(form.name,form.category);
 const chooseService=(name:string)=>{
  const options=template.services.filter(item=>item.name===name);
  const selected=options[0];
  setSelectedImageTemplate('');setError('');setForm(previous=>({...previous,name:selected?.name||'',category:selected?.category||'',description:'',price:selected?String(selected.price):'',duration:selected?String(selected.durationMinutes):'45',popular:!!selected?.popular,imageUrl:'',imagePath:''}));
 };
 const patch=<K extends keyof ServiceForm>(key:K,value:ServiceForm[K])=>setForm(previous=>({...previous,[key]:value}));
 const upload=async(file?:File,url?:string,templateId='')=>{
  if((!file&&!url)||uploading)return;const version=++uploadVersion.current;setUploading(true);setError('');
  try{
   const source=file||await servicePhotoFromUrl(url!);
   if(version!==uploadVersion.current)return;
   const photo=await uploadServicePhoto(source);
   if(version!==uploadVersion.current){void discardServicePhoto(photo.imagePath);return;}
   newUploads.current.push(photo.imagePath);setSelectedImageTemplate(templateId);setForm(previous=>({...previous,...photo}));return true;
  }catch(cause){if(version===uploadVersion.current)setError(cause instanceof Error?cause.message:'Service photo upload failed.');}
  finally{if(version===uploadVersion.current)setUploading(false);}
 };
 const save=(event:React.FormEvent)=>{
  event.preventDefault();if(uploading||cropping)return;
  if(adding&&(!serviceNames.includes(form.name)||!relatedCategories.includes(form.category)||!descriptionOptions.some(option=>option.text===form.description))){setError('Select a template service, its category and one description before saving.');return;}
  const service:SalonService={id:editing||`srv-${crypto.randomUUID()}`,name:form.name.trim(),category:form.category.trim(),description:form.description.trim(),price:Number(form.price),durationMinutes:Number(form.duration),icon:services.find(item=>item.id===editing)?.icon||template.services.find(item=>item.name===form.name&&item.category===form.category)?.icon||'spa',popular:form.popular,showDuration:form.showDuration,imageUrl:form.imageUrl,imagePath:form.imagePath,origin:'custom'};
  const issue=serviceValidation(service)||(!form.price.trim()?'Enter a price.':!form.duration.trim()?'Enter a duration.':!editing&&services.length>=MAX_SERVICES?'You can add up to 500 services.':'');
  if(issue){setError(issue);return;}
  setServices(previous=>editing?previous.map(item=>item.id===editing?{...item,...service}:item):[...previous,service]);
  setCategory('All');setSearch('');setNotice(`${service.name} ${editing?'updated':'added'}. Changes are queued for cloud save.`);close(form.imagePath);
 };
 const filtered=services.filter(service=>(offering==='all'||(offering==='packages'?isPackage(service):!isPackage(service)))&&(category==='All'||service.category===category)&&`${service.name} ${service.description} ${service.category}`.toLowerCase().includes(search.toLowerCase()));
 return <section id="services-management-section" className="service-editor" style={{'--service-accent':primaryAccentColor} as React.CSSProperties}>
  <header className="service-editor-header"><div><p className="eyebrow">Your business catalogue</p><h2>Business Services & Custom Service Offerings</h2><p>Add your treatments, categories, INR pricing, appointment duration and service or package photos. Edit any card to upload, replace or import an image URL. Packages use the same saved photo in both website sections. Your saved menu appears in every theme and live preview.</p></div><div className="service-editor-actions">{onNavigateToPreview&&<button type="button" className="secondary-action" onClick={onNavigateToPreview}><Eye size={16}/>Preview menu</button>}<button type="button" className="primary-action" onClick={()=>open()} disabled={services.length>=MAX_SERVICES}><Plus size={16}/>Add service</button></div></header>
  {notice&&<p className="service-editor-notice" role="status">{notice}</p>}
  <div className="service-editor-categories" role="group" aria-label="Offering type"><button type="button" aria-pressed={offering==='all'} onClick={()=>{setOffering('all');setCategory('All');setSearch('');}}>All offerings</button><button type="button" aria-pressed={offering==='services'} onClick={()=>{setOffering('services');setCategory('All');setSearch('');}}>Services</button><button type="button" aria-pressed={offering==='packages'} onClick={()=>{setOffering('packages');setCategory('All');setSearch('');}}>Packages &amp; Signature Rituals ({services.filter(isPackage).length})</button></div>
  {offering==='packages'&&<p className="muted text-sm">Five starter packages are included for each template. Edit any package to update its name, category, description, price, duration or photo. Remove a package to delete it permanently from your saved menu.</p>}
  <div className="service-editor-filters"><label><Search size={16}/><span className="sr-only">Search services</span><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search your service menu"/></label><span>{services.length} / {MAX_SERVICES} services</span></div>
  <div className="service-editor-categories" aria-label="Filter services by category">{['All',...Array.from(new Set(services.map(service=>service.category)))].map(item=><button type="button" key={item} aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}</button>)}</div>
  {!filtered.length&&<div className="service-editor-empty"><h3>{services.length?'No matching services':'Build your service menu'}</h3><p>{services.length?'Try another category or search.':'Add a service to set your own name, description, category, price and duration.'}</p>{services.length?<button className="secondary-action" onClick={()=>{setCategory('All');setSearch('');}}>Clear filters</button>:<button className="primary-action" onClick={()=>open()}>Add your first service</button>}</div>}
  <div className="service-editor-grid">{filtered.map(service=><article key={service.id} className="service-editor-card" data-service-id={service.id}><div className="service-editor-card-top"><span>{service.category}</span><small>{serviceOrigin(service)==='custom'?'Custom offering':'Template starter'}</small></div><ServicePhoto service={service} type={profile?.businessType} className="service-editor-image"/><h3>{service.name}</h3>{service.description&&<p>{service.description}</p>}<div className="service-editor-price"><strong>₹{service.price.toLocaleString('en-IN')}</strong><span><Clock size={14}/>{service.durationMinutes} min</span></div><div className="service-editor-options"><label><input type="checkbox" checked={!!service.popular} onChange={()=>setServices(previous=>previous.map(item=>item.id===service.id?{...item,popular:!item.popular,origin:'custom'}:item))}/>Featured service</label><label><input type="checkbox" checked={service.showDuration!==false} onChange={()=>setServices(previous=>previous.map(item=>item.id===service.id?{...item,showDuration:item.showDuration===false,origin:'custom'}:item))}/>Show duration on website</label></div><div className="service-editor-actions">{remove===service.id?<><p>Remove this service?</p><button type="button" className="service-remove" onClick={()=>{setServices(previous=>previous.filter(item=>item.id!==service.id));setRemove(null);setCategory('All');setNotice(`${service.name} removed. Changes are queued for cloud save.`);}}>Confirm removal</button><button type="button" className="secondary-action" onClick={()=>setRemove(null)}>Cancel</button></>:<><button type="button" className="secondary-action" aria-label={`Edit ${service.name}`} onClick={()=>open(service)}><Edit3 size={15}/>Edit</button><button type="button" className="service-remove" aria-label={`Remove ${service.name}`} onClick={()=>setRemove(service.id)}><Trash2 size={15}/>Remove</button></>}</div></article>)}</div>
  {editing!==undefined&&<div className="service-editor-backdrop" onClick={event=>{if(event.target===event.currentTarget)close();}}><section ref={dialog} className="service-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="service-form-title"><header><h3 id="service-form-title">{editing?'Edit service':'Add service'}</h3><button type="button" className="secondary-action" aria-label="Close service editor" onClick={()=>close()}><X size={20}/></button></header><form onSubmit={save}>{adding?<>
   <label>Service name<select required aria-label="Service name" value={form.name} disabled={uploading||cropping} onChange={event=>chooseService(event.target.value)}><option value="">Select a service</option>{serviceNames.map(name=><option key={name} value={name}>{name}</option>)}</select><small>{template.shortName} · Choose a service from your selected template.</small></label>
   <label>Category<select required aria-label="Service category" value={form.category} disabled={!form.name||uploading||cropping} onChange={event=>{const value=event.target.value;setError('');setForm(previous=>({...previous,category:value,description:''}));}}><option value="">Select category</option>{relatedCategories.map(item=><option key={item} value={item}>{item}{item===recommendedCategory?' (Recommended)':''}</option>)}</select><small>Choose from your selected template’s categories. The recommended category is selected automatically; you can change it.</small></label>
   <fieldset className="service-description-choices"><legend>Description · Choose one</legend>{form.name&&form.category?descriptionOptions.map((option,index)=><label key={option.label} className="service-description-choice"><input type="radio" name="new-service-description" required value={option.text} checked={form.description===option.text} onChange={()=>patch('description',option.text)}/><span><strong>{index+1}. {option.label}</strong><span>{option.text}</span></span></label>):<small>Select a service to see three ready descriptions.</small>}</fieldset>
  </>:<><label>Service name<input required maxLength={160} value={form.name} onChange={event=>patch('name',event.target.value)}/></label><label>Category<input required maxLength={100} list="business-service-categories" value={form.category} onChange={event=>patch('category',event.target.value)}/><small>Choose a suggestion or type your own category.</small><datalist id="business-service-categories">{categories.map(item=><option key={item} value={item}/>)}</datalist></label><label>Description<textarea rows={4} maxLength={2000} value={form.description} onChange={event=>patch('description',event.target.value)}/></label><ServiceDescriptionSuggestions name={form.name} category={form.category} value={form.description} onSelect={text=>patch('description',text)}/></>}<div className="service-editor-form-row"><label>Price (INR ₹)<input type="number" required min={0} max={10000000} step="0.01" value={form.price} onChange={event=>patch('price',event.target.value)}/></label><label>Duration (minutes)<input type="number" required min={1} max={720} step="1" value={form.duration} onChange={event=>patch('duration',event.target.value)}/></label></div><fieldset className="service-editor-photo"><legend>Service / package image</legend><ServiceImageTemplates key={`${form.name}|${form.category}|${form.description}`} name={form.name} category={form.category} description={form.description} type={profile?.businessType||'hair_salon'} enabled={!!(form.name&&form.category&&form.description.trim())} disabled={uploading||cropping} selected={selectedImageTemplate} onBusyChange={setUploading} onChoose={photo=>{setSelectedImageTemplate(photo.imageUrl);setForm(previous=>({...previous,...photo}));}}/>{form.imageUrl&&<div className="service-editor-image"><img src={form.imageUrl} alt="Service photo preview" width={600} height={400}/></div>}<div className="service-editor-actions">{form.imageUrl&&<button type="button" className="secondary-action" disabled={uploading||cropping} onClick={()=>setCropping(true)}>Crop &amp; Adjust</button>}<label className="service-editor-upload"><Camera size={18}/>{uploading?'Resizing & uploading…':form.imageUrl?'Replace photo':'Upload photo'}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload service image" disabled={uploading||cropping} onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}}/></label>{form.imageUrl&&<button type="button" className="service-remove" disabled={uploading||cropping} onClick={()=>{setSelectedImageTemplate('');setForm(previous=>({...previous,imageUrl:'',imagePath:''}));}}>Remove photo</button>}</div>{cropping&&form.imageUrl&&<ServiceImageCropper src={form.imageUrl} onApply={file=>upload(file)} onCancel={()=>setCropping(false)}/>}<label>Image URL<input type="url" placeholder="https://…" value={photoUrl} disabled={uploading||cropping} onChange={e=>setPhotoUrl(e.target.value)}/></label><button type="button" className="secondary-action" disabled={uploading||cropping||!photoUrl.trim()} onClick={()=>void upload(undefined,photoUrl.trim())}>Import &amp; replace from URL</button><small>JPG, PNG or WebP · Up to 20 MB · Auto resize · 3:2 card frame. URL images are copied to your salon storage. If the host blocks import, download the image and upload it instead. Removing a custom photo restores category photography.</small>{uploading&&<p role="status">Optimizing and uploading your photo…</p>}</fieldset><label className="service-editor-check"><input type="checkbox" checked={form.popular} onChange={event=>patch('popular',event.target.checked)}/>Feature this service</label><label className="service-editor-check"><input type="checkbox" checked={form.showDuration} onChange={event=>patch('showDuration',event.target.checked)}/>Show duration on website</label>{error&&<p role="alert" className="service-editor-error">{error}</p>}<footer><button type="button" className="secondary-action" onClick={()=>close()}>Cancel</button><button type="submit" className="primary-action" disabled={uploading||cropping}>{editing?'Save changes':'Add to service menu'}</button></footer></form></section></div>}
 </section>;
}

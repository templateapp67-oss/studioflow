import {uploadServicePhoto,discardServicePhoto} from '../lib/servicePhoto';
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
 const [search,setSearch]=useState(''),[category,setCategory]=useState('All'),[editing,setEditing]=useState<string|null|undefined>(undefined),[remove,setRemove]=useState<string|null>(null),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [form,setForm]=useState<ServiceForm>({name:'',category:'',description:'',price:'',duration:'45',popular:false,showDuration:true,imageUrl:'',imagePath:''});
 const [uploading,setUploading]=useState(false);const uploadVersion=useRef(0),newUploads=useRef<string[]>([]);
 const dialog=useRef<HTMLElement>(null),opener=useRef<HTMLElement|null>(null);
 const close=(keepPath='')=>{uploadVersion.current++;setUploading(false);for(const path of newUploads.current)if(path!==keepPath)void discardServicePhoto(path);newUploads.current=[];setEditing(undefined);opener.current?.focus();};
 useEffect(()=>()=>{uploadVersion.current++;for(const path of newUploads.current)void discardServicePhoto(path);},[]);
 useEffect(()=>{
  if(editing===undefined)return;
  dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
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
  setEditing(service?.id||null);setError('');
  setForm(service?{name:service.name,category:service.category,description:service.description,price:String(service.price),duration:String(service.durationMinutes),popular:!!service.popular,showDuration:service.showDuration!==false,imageUrl:service.imageUrl||'',imagePath:service.imagePath||''}:{name:'',category:categories[0]||'General',description:'',price:'',duration:'45',popular:false,showDuration:true,imageUrl:'',imagePath:''});
 };
 const patch=<K extends keyof ServiceForm>(key:K,value:ServiceForm[K])=>setForm(previous=>({...previous,[key]:value}));
 const upload=async(file?:File)=>{
  if(!file)return;const version=++uploadVersion.current;setUploading(true);setError('');
  try{
   const photo=await uploadServicePhoto(file);
   if(version!==uploadVersion.current){void discardServicePhoto(photo.imagePath);return;}
   newUploads.current.push(photo.imagePath);setForm(previous=>({...previous,...photo}));
  }catch(cause){if(version===uploadVersion.current)setError(cause instanceof Error?cause.message:'Service photo upload failed.');}
  finally{if(version===uploadVersion.current)setUploading(false);}
 };
 const save=(event:React.FormEvent)=>{
  event.preventDefault();if(uploading)return;
  const service:SalonService={id:editing||`srv-${crypto.randomUUID()}`,name:form.name.trim(),category:form.category.trim(),description:form.description.trim(),price:Number(form.price),durationMinutes:Number(form.duration),icon:services.find(item=>item.id===editing)?.icon||'spa',popular:form.popular,showDuration:form.showDuration,imageUrl:form.imageUrl,imagePath:form.imagePath,origin:'custom'};
  const issue=serviceValidation(service)||(!form.price.trim()?'Enter a price.':!form.duration.trim()?'Enter a duration.':!editing&&services.length>=MAX_SERVICES?'You can add up to 500 services.':'');
  if(issue){setError(issue);return;}
  setServices(previous=>editing?previous.map(item=>item.id===editing?{...item,...service}:item):[...previous,service]);
  setCategory('All');setSearch('');setNotice(`${service.name} ${editing?'updated':'added'}. Changes are queued for cloud save.`);close(form.imagePath);
 };
 const filtered=services.filter(service=>(category==='All'||service.category===category)&&`${service.name} ${service.description} ${service.category}`.toLowerCase().includes(search.toLowerCase()));
 return <section id="services-management-section" className="service-editor" style={{'--service-accent':primaryAccentColor} as React.CSSProperties}>
  <header className="service-editor-header"><div><p className="eyebrow">Your business catalogue</p><h2>Business Services & Custom Service Offerings</h2><p>Add your treatments, categories, INR pricing, appointment duration and service photos. Your saved menu appears in every theme and live preview.</p></div><div className="service-editor-actions">{onNavigateToPreview&&<button type="button" className="secondary-action" onClick={onNavigateToPreview}><Eye size={16}/>Preview menu</button>}<button type="button" className="primary-action" onClick={()=>open()} disabled={services.length>=MAX_SERVICES}><Plus size={16}/>Add service</button></div></header>
  {notice&&<p className="service-editor-notice" role="status">{notice}</p>}
  <div className="service-editor-filters"><label><Search size={16}/><span className="sr-only">Search services</span><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search your service menu"/></label><span>{services.length} / {MAX_SERVICES} services</span></div>
  <div className="service-editor-categories" aria-label="Filter services by category">{['All',...Array.from(new Set(services.map(service=>service.category)))].map(item=><button type="button" key={item} aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}</button>)}</div>
  {!filtered.length&&<div className="service-editor-empty"><h3>{services.length?'No matching services':'Build your service menu'}</h3><p>{services.length?'Try another category or search.':'Add a service to set your own name, description, category, price and duration.'}</p>{services.length?<button className="secondary-action" onClick={()=>{setCategory('All');setSearch('');}}>Clear filters</button>:<button className="primary-action" onClick={()=>open()}>Add your first service</button>}</div>}
  <div className="service-editor-grid">{filtered.map(service=><article key={service.id} className="service-editor-card" data-service-id={service.id}><div className="service-editor-card-top"><span>{service.category}</span><small>{serviceOrigin(service)==='custom'?'Custom offering':'Template starter'}</small></div>{service.imageUrl&&<div className="service-editor-image"><img src={service.imageUrl} alt={service.name} width={600} height={400} loading="lazy"/></div>}<h3>{service.name}</h3>{service.description&&<p>{service.description}</p>}<div className="service-editor-price"><strong>₹{service.price.toLocaleString('en-IN')}</strong><span><Clock size={14}/>{service.durationMinutes} min</span></div><div className="service-editor-options"><label><input type="checkbox" checked={!!service.popular} onChange={()=>setServices(previous=>previous.map(item=>item.id===service.id?{...item,popular:!item.popular,origin:'custom'}:item))}/>Featured service</label><label><input type="checkbox" checked={service.showDuration!==false} onChange={()=>setServices(previous=>previous.map(item=>item.id===service.id?{...item,showDuration:item.showDuration===false,origin:'custom'}:item))}/>Show duration on website</label></div><div className="service-editor-actions">{remove===service.id?<><p>Remove this service?</p><button type="button" className="service-remove" onClick={()=>{setServices(previous=>previous.filter(item=>item.id!==service.id));setRemove(null);setCategory('All');setNotice(`${service.name} removed. Changes are queued for cloud save.`);}}>Confirm removal</button><button type="button" className="secondary-action" onClick={()=>setRemove(null)}>Cancel</button></>:<><button type="button" className="secondary-action" aria-label={`Edit ${service.name}`} onClick={()=>open(service)}><Edit3 size={15}/>Edit</button><button type="button" className="service-remove" aria-label={`Remove ${service.name}`} onClick={()=>setRemove(service.id)}><Trash2 size={15}/>Remove</button></>}</div></article>)}</div>
  {editing!==undefined&&<div className="service-editor-backdrop" onClick={event=>{if(event.target===event.currentTarget)close();}}><section ref={dialog} className="service-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="service-form-title"><header><h3 id="service-form-title">{editing?'Edit service':'Add service'}</h3><button type="button" className="secondary-action" aria-label="Close service editor" onClick={()=>close()}><X size={20}/></button></header><form onSubmit={save}><label>Service name<input required maxLength={160} value={form.name} onChange={event=>patch('name',event.target.value)}/></label><label>Category<input required maxLength={100} list="business-service-categories" value={form.category} onChange={event=>patch('category',event.target.value)}/><small>Choose a suggestion or type your own category.</small><datalist id="business-service-categories">{categories.map(item=><option key={item} value={item}/>)}</datalist></label><label>Description<textarea rows={4} maxLength={2000} value={form.description} onChange={event=>patch('description',event.target.value)}/></label><div className="service-editor-form-row"><label>Price (INR ₹)<input type="number" required min={0} max={10000000} step="0.01" value={form.price} onChange={event=>patch('price',event.target.value)}/></label><label>Duration (minutes)<input type="number" required min={1} max={720} step="1" value={form.duration} onChange={event=>patch('duration',event.target.value)}/></label></div><fieldset className="service-editor-photo"><legend>Service image</legend>{form.imageUrl&&<div className="service-editor-image"><img src={form.imageUrl} alt="Service photo preview" width={600} height={400}/></div>}<div className="service-editor-actions"><label className="service-editor-upload"><Camera size={18}/>{uploading?'Resizing & uploading…':form.imageUrl?'Replace photo':'Upload photo'}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload service image" disabled={uploading} onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}}/></label>{form.imageUrl&&<button type="button" className="service-remove" disabled={uploading} onClick={()=>setForm(previous=>({...previous,imageUrl:'',imagePath:''}))}>Remove photo</button>}</div><small>JPG, PNG or WebP · Auto resize · Consistent 3:2 card frame</small>{uploading&&<p role="status">Optimizing and uploading your photo…</p>}</fieldset><label className="service-editor-check"><input type="checkbox" checked={form.popular} onChange={event=>patch('popular',event.target.checked)}/>Feature this service</label><label className="service-editor-check"><input type="checkbox" checked={form.showDuration} onChange={event=>patch('showDuration',event.target.checked)}/>Show duration on website</label>{error&&<p role="alert" className="service-editor-error">{error}</p>}<footer><button type="button" className="secondary-action" onClick={()=>close()}>Cancel</button><button type="submit" className="primary-action" disabled={uploading}>{editing?'Save changes':'Add to service menu'}</button></footer></form></section></div>}
 </section>;
}

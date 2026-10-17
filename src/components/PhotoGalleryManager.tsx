import React,{useEffect,useId,useRef,useState} from 'react';
import {defaultGalleryCategory,photoGallery,withPhotoGallery,type PhotoCategory,type SalonGalleryPhoto} from '../lib/photoGallery';
import type {SalonProfile} from '../types';
import {GalleryPhotoImage} from './GalleryPhotoImage';
import {secureMediaUrl} from '../lib/socialVideoSource';
import {compressAndResizeImage} from '../utils/imageUploadHelper';
import {uploadSalonImage} from '../lib/supabase';
export function PhotoGalleryManager({profile,setProfile,gallery=[],setGallery}:{profile:SalonProfile;setProfile:React.Dispatch<React.SetStateAction<SalonProfile>>;gallery?:string[];setGallery?:(urls:string[])=>void}){
 const photos=photoGallery(profile,gallery),id=useId();
 const [category,setCategory]=useState<PhotoCategory>(defaultGalleryCategory(profile.businessType)),[editing,setEditing]=useState<SalonGalleryPhoto|null>(null),[url,setUrl]=useState(''),[title,setTitle]=useState(''),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setCategory(defaultGalleryCategory(profile.businessType));setEditing(null);setFile(null);setError('')},[profile.businessType]);
 const categories=Array.from(new Set([defaultGalleryCategory(profile.businessType),...photos.map(p=>p.category)]));
 const lock=useRef(false),fileInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(!file){setPreview('');return}const src=URL.createObjectURL(file);setPreview(src);return()=>URL.revokeObjectURL(src)},[file]);
 const commit=(next:SalonGalleryPhoto[])=>{setProfile(prev=>withPhotoGallery(prev,next));setGallery?.(next.map(photo=>photo.url));};
 const edit=(photo:SalonGalleryPhoto)=>{if(lock.current)return;setEditing(photo);setUrl(photo.url);setTitle(photo.title);setFile(null);setError('')};
 async function save(event:React.FormEvent){event.preventDefault();if(!editing||lock.current)return;
  if(!file&&!secureMediaUrl(url)){setError('Paste a public HTTPS image URL or choose a photo.');return}
  lock.current=true;setBusy(true);setError('');
  try{let imageUrl=secureMediaUrl(url);if(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('Use a JPG, PNG or WebP photo smaller than 20 MB.');const result=await compressAndResizeImage(file,1600,2*1024*1024);if(!result.isValid||!result.dataUrl)throw new Error(result.errorMessage||'Photo resizing failed.');const blob=await(await fetch(result.dataUrl)).blob();if(blob.size>2*1024*1024)throw new Error('Could not optimize this photo. Choose another image.');imageUrl=await uploadSalonImage(new File([blob],'gallery-photo.jpg',{type:blob.type}));}
   const replacement={...editing,url:imageUrl,title:title.trim()||`${editing.category} photo`,isDemo:false};commit(photos.some(p=>p.id===editing.id)?photos.map(p=>p.id===editing.id?replacement:p):[...photos,replacement]);setEditing(null);setFile(null);
  }catch(e){setError(e instanceof Error?e.message:'Photo could not be saved. Please retry.')}finally{lock.current=false;setBusy(false)}
 }
 return <section className="space-y-4" aria-label="Photo Gallery Manager"><div><h2 className="font-bold text-xl">Photo Gallery</h2><p className="text-sm text-slate-500 mt-1">Five professional sample images from your selected template only. Replace samples with your salon’s work. Changes save to your workspace; publish to update your website.</p></div>
 <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Gallery categories">{categories.map(cat=><button type="button" key={cat} aria-pressed={category===cat} onClick={()=>setCategory(cat)} className={category===cat?'primary-action whitespace-nowrap':'secondary-action whitespace-nowrap'}>{cat} ({photos.filter(p=>p.category===cat).length})</button>)}</div>
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{photos.filter(p=>p.category===category).map(photo=><article key={photo.id} className="relative rounded-xl border border-slate-200 overflow-hidden bg-white"><GalleryPhotoImage photo={photo} className="w-full aspect-square object-cover"/><button type="button" aria-label={`Delete ${photo.title}`} title="Delete photo" className="absolute top-2 right-2 bg-white text-rose-700 shadow rounded-full w-8 h-8 font-bold" disabled={busy} onClick={()=>{if(!lock.current){commit(photos.filter(p=>p.id!==photo.id));if(editing?.id===photo.id)setEditing(null)}}}>×</button><div className="p-2"><p className="text-xs font-semibold truncate">{photo.title}</p><small className="text-[10px] text-slate-500">{photo.isDemo?'Demo / sample image':'Salon photo'}</small><button type="button" aria-label={`Replace ${photo.title}`} className="secondary-action w-full mt-2 text-xs" disabled={busy} onClick={()=>edit(photo)}>Replace / Edit</button></div></article>)}</div>
 {!photos.some(p=>p.category===category)&&<p className="text-sm text-slate-500">No photos in {category}. Deleted photos stay removed. Add your own photo below.</p>}
 <button type="button" className="secondary-action" onClick={()=>edit({id:`gallery-${crypto.randomUUID()}`,category,url:'',title:'',isDemo:false})}>Add {category} photo</button>
 {editing&&<form onSubmit={save} className="border rounded-2xl p-4 bg-slate-50 space-y-3" aria-label="Edit gallery photo"><h3 className="font-bold">{editing.category} — Replace / Edit Photo</h3><fieldset disabled={busy} className="space-y-3">
 {(preview||secureMediaUrl(url))&&<img src={preview||secureMediaUrl(url)} alt="Replacement preview" className="w-36 h-36 rounded-xl object-cover"/>}
 <label className="block text-sm" htmlFor={id+'title'}>Photo title</label><input id={id+'title'} value={title} maxLength={120} onChange={e=>setTitle(e.target.value)} className="workspace-input"/>
 <label className="block text-sm" htmlFor={id+'file'}>Upload from your device</label><input id={id+'file'} ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="block max-w-full text-xs" onChange={e=>{setFile(e.target.files?.[0]||null);setError('')}}/><p className="text-xs text-slate-500">JPG, PNG or WebP, up to 20 MB. Automatically optimized; uploads only on Save.</p>
 <label className="block text-sm" htmlFor={id+'url'}>Or direct image URL</label><input id={id+'url'} type="url" value={file?'':url} placeholder="https://example.com/salon-photo.jpg" onChange={e=>{setFile(null);if(fileInput.current)fileInput.current.value='';setUrl(e.target.value);setError('')}} className="workspace-input"/>
 {file&&<button type="button" className="text-xs underline" onClick={()=>setFile(null)}>Remove selected file</button>}
 {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}<div className="flex gap-2"><button className="primary-action" type="submit">{busy?'Saving photo…':'Save photo'}</button><button className="secondary-action" type="button" onClick={()=>{if(!lock.current){setEditing(null);setFile(null)}}}>Cancel</button></div></fieldset></form>}
 </section>;
}

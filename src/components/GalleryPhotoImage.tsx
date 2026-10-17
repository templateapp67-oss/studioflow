import React,{useState} from 'react';
import type {SalonGalleryPhoto} from '../lib/photoGallery';
import {SALON_IMAGES} from '../assets/images';
export const GalleryPhotoImage:React.FC<{photo:SalonGalleryPhoto;className?:string}>=({photo,className})=>{
 const [failed,setFailed]=useState('');
 return <img src={failed===photo.url?(photo.category==='Nails'?SALON_IMAGES.nailArt:photo.category==='Skin'?SALON_IMAGES.lashBrow:SALON_IMAGES.hero):photo.url} alt={photo.title} className={className} loading="lazy" onError={()=>setFailed(photo.url)}/>;
}

import React,{useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Play,VolumeX} from 'lucide-react';
import {secureMediaUrl,socialVideoSource} from '../../lib/socialVideoSource';
import type {Salon} from './model';
export function CustomerReelCard({video,salon,active,activate,stop,open}:{key?:React.Key;video:any;salon:Salon;active:boolean;activate:()=>void;stop:()=>void;open:()=>void}){
 const node=useRef<HTMLButtonElement>(null);
 const [visible,setVisible]=useState(true),[directFailed,setDirectFailed]=useState(false),[posterFailed,setPosterFailed]=useState(false);
 const direct=secureMediaUrl(video.previewVideoUrl),source=socialVideoSource(video.youtubeUrl);
 useEffect(()=>{setDirectFailed(false);setPosterFailed(false)},[direct,video.thumbnailUrl,video.youtubeUrl]);
 useEffect(()=>{const el=node.current;if(!el||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(entries=>setVisible((entries[0]?.intersectionRatio||0)>=.5),{threshold:[0,.5,1]});observer.observe(el);return()=>observer.disconnect()},[]);
 const playing=active&&visible,canPreview=!!(direct&&!directFailed||source?.platform==='YouTube');
 const poster=posterFailed?salon.content.profile.coverImageUrl:secureMediaUrl(video.thumbnailUrl)||salon.content.profile.coverImageUrl;
 return <button ref={node} className="cr-customer-reel" aria-label={'Watch '+(video.title||salon.content.profile.businessName)} onMouseEnter={activate} onMouseLeave={stop} onFocus={activate} onBlur={stop} onClick={open}>
  <img src={poster} alt="" loading="lazy" onError={()=>setPosterFailed(true)}/>
  {playing&&direct&&!directFailed&&<video className="cr-reel-preview" src={direct} autoPlay muted playsInline loop preload="none" onError={()=>setDirectFailed(true)}/>}
  {playing&&(!direct||directFailed)&&source?.platform==='YouTube'&&<iframe className="cr-reel-preview" src={`https://www.youtube-nocookie.com/embed/${source.id}?autoplay=1&mute=1&playsinline=1&controls=0&rel=0&loop=1&playlist=${source.id}`} title={`${video.title||'Salon reel'} — muted preview`} allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" tabIndex={-1}/>}
  <i>REEL{salon.demoTemplateId?' · DEMO':''}</i>
  {playing&&canPreview?<b className="cr-reel-muted" aria-label="Sound off"><VolumeX size={14}/></b>:<b className="cr-reel-play"><Play size={18} fill="currentColor"/></b>}
  <span><small>{salon.content.profile.businessName}</small>{video.title||'Salon story'}<ArrowUpRight size={12}/>{playing&&!canPreview&&<small>Tap to watch this reel</small>}</span>
 </button>;
}

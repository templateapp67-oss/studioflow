import {EditorialImage} from "./dermacure/EditorialImage";
import React,{useEffect,useRef,useState} from 'react';
import {Play,VolumeX,ExternalLink} from 'lucide-react';
import type {SocialVideo} from '../types';
import {secureMediaUrl,reelSource} from '../lib/socialVideoSource';
import {InlineEditable} from './InlineEditable';

type Props={resilientPosters?:boolean;videos:SocialVideo[];salonName:string;fallbackImage:string;editable?:boolean;onTitle?:(id:string,title:string)=>void};
function ReelCard({resilientPosters,video,salonName,fallbackImage,active,onActivate,onStop,editable,onTitle}:Props&{key?:React.Key;video:SocialVideo;active:boolean;onActivate:()=>void;onStop:()=>void}){
 const source=reelSource(video),node=useRef<HTMLElement>(null);
 const [visible,setVisible]=useState(true),[failed,setFailed]=useState(false),[posterFailed,setPosterFailed]=useState(false);
 useEffect(()=>{const element=node.current;if(!element||typeof IntersectionObserver==='undefined')return;
  const observer=new IntersectionObserver(entries=>setVisible(entries[0]?.intersectionRatio>=0.5),{threshold:[0,0.5,1]});observer.observe(element);return()=>observer.disconnect();
 },[]);
 if(!source)return null;
 const playing=active&&visible&&!failed,preview=secureMediaUrl(video.previewVideoUrl);
 const poster=posterFailed?fallbackImage:secureMediaUrl(video.thumbnailUrl)||(source.platform==='YouTube'?`https://img.youtube.com/vi/${source.id}/hqdefault.jpg`:fallbackImage);
 return <article ref={node} className="video-card" onMouseEnter={onActivate} onMouseLeave={onStop} onFocus={onActivate} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))onStop();}}>
  <a className="sf-reel-media" href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${video.title} on ${source.platform}`}>
   {resilientPosters?<EditorialImage className="sf-reel-poster" src={poster} fallback={fallbackImage} fallbackAlt="Video thumbnail unavailable — illustrative clinic image" alt={video.title} loading="lazy"/>:<img className="sf-reel-poster" src={poster} alt={video.title} loading="lazy" onError={()=>setPosterFailed(true)}/>}
   {playing&&preview&&<video className="sf-reel-player" src={preview} poster={poster} autoPlay muted playsInline loop preload="none" onLoadedMetadata={event=>{if(event.currentTarget.duration>180)setFailed(true);}} onError={()=>setFailed(true)}/>}
   {playing&&!preview&&source.platform==='YouTube'&&<iframe className="sf-reel-player" src={`https://www.youtube-nocookie.com/embed/${source.id}?autoplay=1&mute=1&playsinline=1&controls=0&rel=0&loop=1&playlist=${source.id}`} title={`${video.title} — muted preview`} allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" tabIndex={-1}/>}
   <span className="sf-reel-brand">✂ <span>{salonName}</span></span>
   <span className="sf-reel-muted" aria-label="Muted preview"><VolumeX size={16}/></span>
   {(!playing||source.platform==='Instagram'&&!preview||failed)&&<span className="sf-reel-play"><Play size={25} fill="currentColor"/></span>}
   <span className="sf-reel-platform">{source.platform}</span>
   {video.views&&<span className="sf-reel-views">{video.views}</span>}
  </a>
  <div className="video-card-content">
   <InlineEditable tag="h3" value={video.title} isEditingActive={editable} onSave={title=>onTitle?.(video.id,String(title))}/>
   {video.isDemo&&<p className="sf-reel-attribution">DEMO / REFERENCE{video.channelTitle?` · ${video.channelTitle}`:''}</p>}
   <a className="sf-reel-source" href={source.url} target="_blank" rel="noopener noreferrer">Watch on {source.platform}<ExternalLink size={13}/></a>
  </div>
 </article>;
}
export function FeaturedReels(props:Props){
 const [active,setActive]=useState<string|null>(null);
 useEffect(()=>{const hide=()=>{if(document.hidden)setActive(null);};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 return <div className="videos-container" tabIndex={0} aria-label="Featured reels. Swipe horizontally. Hover for a muted preview; select a video to open its original source.">{props.videos.map(video=><ReelCard key={video.id} {...props} video={video} active={active===video.id} onActivate={()=>setActive(video.id)} onStop={()=>setActive(current=>current===video.id?null:current)}/>)}</div>;
}

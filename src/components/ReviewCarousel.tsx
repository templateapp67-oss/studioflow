import React,{useEffect,useRef,useState} from 'react';
import {Star} from 'lucide-react';
export interface ReviewCarouselItem {id:string;name:string;rating:number;comment:string;serviceName?:string;location?:string;isDemo?:boolean;isCustomer?:boolean;isOwnerReview?:boolean;verified?:boolean;imageUrl?:string;reviewImageUrl?:string;avatarUrl?:string;}
export const REVIEW_CARD_SECONDS=30; // Each card takes about thirty seconds to pass.
export function reviewMarqueeItems(items:ReviewCarouselItem[]){
 const source=items.slice(0,10);
 return [...source,...source].map((review,index)=>({review,clone:index>=source.length,loopStart:index===source.length,key:`${review.id}-${index}`}));
}
function ReviewCard({review:r,clone=false,loopStart=false}:{key?:React.Key;review:ReviewCarouselItem;clone?:boolean;loopStart?:boolean}){
 return <article className="sf-review-card" data-review-loop-start={loopStart?'true':undefined} data-review-clone={clone?'true':undefined} aria-hidden={clone||undefined}><div className="sf-card-top"><span className="sf-review-stars" aria-label={`${r.rating} out of 5 stars`}>{Array.from({length:Math.max(0,Math.min(5,Math.round(r.rating)))}).map((_,i)=><Star key={i} size={14}/>)}</span><span className="sf-category-label">{r.isDemo?'Demo testimonial':r.isCustomer?(r.isOwnerReview?'Owner update':r.verified?'Verified visit':'Customer review'):(r.verified?'Verified client':'Client experience')}</span></div>{(r.imageUrl||r.reviewImageUrl)&&<a className="sf-review-media" href={r.imageUrl||r.reviewImageUrl} tabIndex={clone?-1:undefined} target="_blank" rel="noreferrer"><img className="sf-review-photo" src={r.imageUrl||r.reviewImageUrl} alt={`Photo shared with ${r.name}'s review`} loading="lazy" width={400} height={300}/></a>}<blockquote tabIndex={clone?-1:0} aria-label={`Review by ${r.name}`}>“{r.comment}”</blockquote><div className="sf-review-author">{r.avatarUrl&&<img src={r.avatarUrl} alt="" loading="lazy"/>}<div><strong>{r.name}</strong><small>{r.serviceName}{r.location?` · ${r.location}`:''}</small></div></div></article>;
}
export function ReviewCarousel({items,formOpen=false}:{items:ReviewCarouselItem[];formOpen?:boolean}){
 const container=useRef<HTMLElement>(null);
 const [clicked,setClicked]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false);
 const stopped=clicked||hovered||focused||formOpen;
 const slots=reviewMarqueeItems(items);
 const resume=()=>{setClicked(false);setHovered(false);setFocused(false);};
 useEffect(()=>{const away=(event:Event)=>{if(container.current&&!container.current.contains(event.target as Node))resume();};document.addEventListener('pointerdown',away);document.addEventListener('click',away);return()=>{document.removeEventListener('pointerdown',away);document.removeEventListener('click',away);};},[]);

 if(!items.length)return null;
 return <section ref={container} className="sf-review-carousel-section" aria-label="Client review carousel" onMouseEnter={()=>setHovered(true)} onMouseLeave={resume} onClick={()=>setClicked(true)} onPointerDown={()=>setClicked(true)} onTouchStart={()=>setClicked(true)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocused(false);}}><div className="sf-review-carousel-controls"><span>{Math.min(items.length,10)} experiences · Hover or tap to read</span></div><div className="sf-review-carousel" tabIndex={0} aria-label="Scrollable reviews. Hover or click to pause; leave or click outside to resume."><div className="sf-review-track" style={{animationDuration:`${Math.min(items.length,10)*REVIEW_CARD_SECONDS}s`,animationPlayState:stopped?'paused':'running'}}>{slots.map(slot=><ReviewCard key={slot.key} review={slot.review} clone={slot.clone} loopStart={slot.loopStart}/>)}</div></div></section>;
}

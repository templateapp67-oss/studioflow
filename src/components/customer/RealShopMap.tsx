import React,{useEffect,useRef,useState} from 'react';
import {Plus,Minus,LocateFixed,Maximize2,Navigation,RefreshCw,MapPin} from 'lucide-react';
import {loadLeaflet} from '../../lib/loadLeaflet';
import {useMapPlaces,type MapPlace} from './useMapPlaces';
import {DiscoveryPhoto} from './DiscoverySections';
import {rupees,starting,advance,type Salon} from './model';
import {Notice} from './Parts';
export function mapPlaceLabel(p:MapPlace){return p.salon.demoTemplateId?'Template demo · city area':p.accuracy==='verified'?'Owner-published pin':p.accuracy==='address'?'Published address · approximate':'Published address area · exact pin pending'}
export function mapPlaceGroups(places:MapPlace[]){const groups=new Map<string,MapPlace[]>();for(const p of places){const key=p.latitude.toFixed(4)+','+p.longitude.toFixed(4);groups.set(key,[...(groups.get(key)||[]),p])}return [...groups.values()]}
function kilometres(a:[number,number],b:MapPlace){const r=(n:number)=>n*Math.PI/180,dlat=r(b.latitude-a[0]),dlon=r(b.longitude-a[1]);const x=Math.sin(dlat/2)**2+Math.cos(r(a[0]))*Math.cos(r(b.latitude))*Math.sin(dlon/2)**2;return 12742*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)))}
export function RealShopMap({salons,point,nearby,open,book,priceForSalon}:{salons:Salon[];point:[number,number]|null;nearby:()=>void;open:(s:Salon)=>void;book:(s:Salon)=>void;priceForSalon?:(s:Salon)=>number}){
 const {places,pending,failures,retry}=useMapPlaces(salons),[ready,setReady]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState(''),[radius,setRadius]=useState(0);
 const canvas=useRef<HTMLDivElement>(null),root=useRef<HTMLDivElement>(null),map=useRef<any>(null),layers=useRef<any>(null),markers=useRef<Map<string,any>>(new Map()),cards=useRef<HTMLDivElement>(null),latest=useRef({open,book});latest.current={open,book};
 const visible=point&&radius?places.filter(p=>kilometres(point,p)<=radius):places;
 const placeKey=JSON.stringify(visible.map(p=>[p.salon.slug,p.salon.content.profile.businessName,p.latitude,p.longitude,p.accuracy]));
 useEffect(()=>{if(!canvas.current)return;let active=true,resize:ResizeObserver|undefined;
  void loadLeaflet().then(()=>{if(!active||!canvas.current)return;const L=(window as any).L;const instance=L.map(canvas.current,{zoomControl:false,scrollWheelZoom:false}).setView(point||[22.5,79],5);map.current=instance;
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'}).addTo(instance);
   layers.current=L.layerGroup().addTo(instance);resize=new ResizeObserver(()=>instance.invalidateSize());resize.observe(canvas.current);setReady(true);
  }).catch(()=>{if(active)setError('The map could not load. Check your connection and try again.')});
  return()=>{active=false;resize?.disconnect();map.current?.remove();map.current=null;layers.current=null};
 },[]);
 useEffect(()=>{if(!ready||!layers.current)return;const L=(window as any).L;layers.current.clearLayers();markers.current.clear();
  for(const group of mapPlaceGroups(visible)){const p=group[0],coords=[p.latitude,p.longitude],label=document.createElement('div');label.className='cr-shop-pin '+(group.every(g=>g.salon.demoTemplateId)?'is-demo':p.accuracy==='verified'?'is-owner':'is-approximate');
   const title=document.createElement('strong');title.textContent=group.length>1?`${group.length} listings in this area`:p.salon.content.profile.businessName;label.appendChild(title);
   const detail=document.createElement('small');detail.textContent=group.length>1?'Tap to choose a shop / demo':mapPlaceLabel(p);label.appendChild(detail);
   const marker=L.marker(coords,{icon:L.divIcon({html:label,className:'cr-shop-map-icon',iconSize:[160,42],iconAnchor:[80,42]}),title:group.map(g=>g.salon.content.profile.businessName).join(', ')}).addTo(layers.current);
   const popup=document.createElement('div');popup.className='cr-shop-popup';for(const place of group){const section=document.createElement('section'),name=document.createElement('strong'),caption=document.createElement('p'),button=document.createElement('button');name.textContent=place.salon.content.profile.businessName;caption.textContent=mapPlaceLabel(place);button.textContent=place.salon.demoTemplateId?'View Template Demo':'View Salon & Menu';button.type='button';button.addEventListener('click',()=>latest.current.open(place.salon));section.append(name,caption,button);popup.appendChild(section);markers.current.set(place.salon.slug,marker)}
   marker.bindPopup(popup,{maxWidth:290});marker.on('click',()=>setSelected(group[0].salon.slug));
   if(p.accuracy!=='verified')L.circle(coords,{radius:p.salon.demoTemplateId?2000:1500,color:p.salon.demoTemplateId?'#8b5cf6':'#d28a1b',weight:1,fillOpacity:.06,interactive:false}).addTo(layers.current);
  }
  if(point)L.circleMarker(point,{radius:7,color:'#fff',weight:3,fillColor:'#2563eb',fillOpacity:1}).addTo(layers.current).bindTooltip('Your approximate location');
  if(visible.length&&(!selected||!visible.some(p=>p.salon.slug===selected))){const bounds=L.latLngBounds(visible.map(p=>[p.latitude,p.longitude]));map.current.fitBounds(bounds,{paddingTopLeft:[80,70],paddingBottomRight:[80,145],maxZoom:visible.length===1?12:10,animate:false})}
 },[ready,placeKey,point?.join(',')]);
 function focus(place:MapPlace){setSelected(place.salon.slug);map.current?.setView([place.latitude,place.longitude],Math.max(map.current.getZoom(),place.accuracy==='verified'?15:12),{animate:true});markers.current.get(place.salon.slug)?.openPopup();const card=cards.current?.querySelector<HTMLElement>('[data-map-salon="'+CSS.escape(place.salon.slug)+'"]');if(card&&cards.current)cards.current.scrollTo({left:card.offsetLeft-cards.current.offsetLeft,behavior:'smooth'})}
 function fit(){setSelected('');setRadius(0);const L=(window as any).L;if(map.current&&places.length)map.current.fitBounds(L.latLngBounds(places.map(p=>[p.latitude,p.longitude])),{paddingTopLeft:[80,70],paddingBottomRight:[80,145],maxZoom:12});else map.current?.setView(point||[22.5,79],5)}
 return <section className="cr-real-map-section" aria-label="Real map of salon locations"><div className="cr-real-map" ref={root}>
  <div className="cr-real-map-canvas" ref={canvas} role="region" aria-label="Interactive OpenStreetMap salon map"/>
  <div className="cr-real-map-toolbar"><span><i/>{visible.filter(p=>!p.salon.demoTemplateId).length} shops · {visible.filter(p=>p.salon.demoTemplateId).length} template demos</span><div>{[0,3,5,10].map(value=><button key={value} aria-pressed={radius===value} onClick={()=>{if(value&&!point){nearby();return}setRadius(value)}}>{value?value+'km':'All'}</button>)}<button aria-label="Show all mapped shops" onClick={fit}><LocateFixed size={14}/></button><button aria-label="Zoom in map" onClick={()=>map.current?.zoomIn()}><Plus size={14}/></button><button aria-label="Zoom out map" onClick={()=>map.current?.zoomOut()}><Minus size={14}/></button><button aria-label="Expand salon map" onClick={()=>void root.current?.requestFullscreen?.().catch(()=>{})}><Maximize2 size={14}/></button></div></div>
  {!ready&&!error&&<div className="cr-map-loading">Loading real map…</div>}{pending>0&&<p className="cr-map-progress">Finding {pending} published address / template city location{pending===1?'':'s'}…</p>}
  {ready&&!visible.length&&pending===0&&<div className="cr-map-no-pins"><MapPin size={20}/><p>{radius&&point?'No mapped listings within this radius. Choose All to see other locations.':'No locatable addresses match these filters yet. Shops can publish an exact location pin from their owner dashboard.'}</p></div>}
  {ready&&visible.length>0&&<div className="cr-map-shop-cards" ref={cards}>{visible.map(p=><article className={selected===p.salon.slug?'active':''} key={p.salon.slug} data-map-salon={p.salon.slug}><button className="cr-map-shop-select" onClick={()=>focus(p)}><span><DiscoveryPhoto salon={p.salon} alt=""/></span><div><h3>{p.salon.content.profile.businessName}</h3><small>{mapPlaceLabel(p)}</small><b>{p.salon.demoTemplateId?'Sample from ': '25% advance from '}{rupees(p.salon.demoTemplateId?(priceForSalon?.(p.salon)??starting(p.salon)):advance(priceForSalon?.(p.salon)??starting(p.salon)??0))}</b></div></button><div><button className="cr-text-button" onClick={()=>open(p.salon)}>View Menu</button><button className="cr-primary cr-tiny" onClick={()=>p.salon.demoTemplateId?open(p.salon):book(p.salon)}>{p.salon.demoTemplateId?'View Demo':'Book Slot →'}</button></div></article>)}</div>}
 </div>{error&&<Notice>{error} <a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer">Open Map ↗</a></Notice>}
 <div className="cr-map-legend"><span><i className="owner"/>Owner pin</span><span><i className="approx"/>Address area · approximate</span><span><i className="demo"/>Template city · demo</span><button className="cr-text-button" onClick={retry}><RefreshCw size={11}/>Retry locations</button></div>
 {pending===0&&salons.length>places.length&&<p className="cr-muted">{salons.length-places.length} listing(s) have no locatable published address. They remain in the list below.</p>}{failures>0&&<Notice>Some locations could not load. Use Retry locations.</Notice>}
 </section>;
}

import {useEffect,useRef,useState} from 'react';
import {supabase} from '../../lib/supabase';
import {coordinates,type Salon} from './model';
export type MapPlace={salon:Salon;latitude:number;longitude:number;accuracy:'verified'|'address'|'area'|'city'};
type Lookup={latitude:number;longitude:number;accuracy:'address'|'area'|'city'}|null;
const cache=new Map<string,Lookup>();
const sourceKey=(s:Salon)=>JSON.stringify([s.demoTemplateId||s.slug,s.content.profile.address,s.content.profile.city,s.content.profile.postalCode]);
export function knownMapPlaces(salons:Salon[]):MapPlace[]{return salons.flatMap<MapPlace>(s=>{const c=coordinates(s);if(!s.demoTemplateId&&c&&Math.abs(c[0])<=85)return[{salon:s,latitude:c[0],longitude:c[1],accuracy:'verified' as const}];const lookup=cache.get(sourceKey(s));return lookup?[{salon:s,...lookup}]:[]})}
export function useMapPlaces(salons:Salon[]){const [revision,setRevision]=useState(0),[retry,setRetry]=useState(0),[pending,setPending]=useState(0),[failures,setFailures]=useState(0);const latest=useRef(salons);latest.current=salons;
 const key=JSON.stringify(salons.map(s=>[sourceKey(s),coordinates(s)]));
 useEffect(()=>{let active=true;const jobs=latest.current.filter(s=>!(!s.demoTemplateId&&coordinates(s))&&!cache.has(sourceKey(s)));setPending(jobs.length);setFailures(0);
  void(async()=>{for(const salon of jobs){if(!active)return;try{for(let attempt=0;attempt<5&&active;attempt++){
    const {data,error}=await supabase.functions.invoke('studioflow-map-locations',{body:{kind:salon.demoTemplateId?'template':'salon',key:salon.demoTemplateId||salon.slug}});if(error)throw error;
    if(data?.status==='busy'){if(attempt===4)throw new Error('Lookup busy');await new Promise(resolve=>setTimeout(resolve,Math.min(3000,Number(data.retryAfterMs)||1500)));continue}
    if(data?.status==='ready'&&Number.isFinite(data.latitude)&&Number.isFinite(data.longitude)&&Math.abs(data.latitude)<=85&&Math.abs(data.longitude)<=180)cache.set(sourceKey(salon),{latitude:data.latitude,longitude:data.longitude,accuracy:data.accuracy==='address'?'address':data.accuracy==='area'?'area':'city'});
    else if(['missing','unavailable'].includes(data?.status))cache.set(sourceKey(salon),null);
    else throw new Error('Lookup unavailable');break;
   }}catch{if(active)setFailures(n=>n+1)}if(active){setRevision(n=>n+1);setPending(n=>Math.max(0,n-1))}}
  })();return()=>{active=false};
 },[key,retry]);
 return{places:knownMapPlaces(salons),pending,failures,revision,retry:()=>{for(const s of salons)if(cache.get(sourceKey(s))===null)cache.delete(sourceKey(s));setRetry(n=>n+1)}};
}

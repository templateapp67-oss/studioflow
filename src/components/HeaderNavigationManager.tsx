import React from 'react';
import {ArrowUp,ArrowDown} from 'lucide-react';
import type {SalonProfile} from '../types';
import {HEADER_LINKS,headerSettings} from '../lib/headerNavigation';
export function HeaderNavigationManager({profile,setProfile}:{profile:SalonProfile;setProfile:React.Dispatch<React.SetStateAction<SalonProfile>>}){
 const items=headerSettings(profile);
 const move=(index:number,direction:number)=>setProfile(previous=>{const next=headerSettings(previous),target=index+direction;if(target<0||target>=next.length)return previous;[next[index],next[target]]=[next[target],next[index]];return {...previous,headerNavigation:next};});
 return <section className="header-menu-settings"><h3>Header navigation & mobile menu</h3><p>Enable links and arrange their order. Desktop and mobile menus use this same saved list; hidden website sections also hide their links.</p><ol>{items.map((item,index)=>{const label=HEADER_LINKS.find(([id])=>id===item.id)![1];return <li key={item.id}><label><input type="checkbox" checked={item.enabled} onChange={event=>{const enabled=event.target.checked;setProfile(previous=>({...previous,headerNavigation:headerSettings(previous).map(link=>link.id===item.id?{...link,enabled}:link)}));}}/>{label}</label><div><button type="button" aria-label={`Move ${label} up`} disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={17}/></button><button type="button" aria-label={`Move ${label} down`} disabled={index===items.length-1} onClick={()=>move(index,1)}><ArrowDown size={17}/></button></div></li>;})}</ol><button className="secondary-action" type="button" onClick={()=>setProfile(previous=>({...previous,headerNavigation:HEADER_LINKS.map(([id])=>({id,enabled:true}))}))}>Reset menu order</button></section>;
}

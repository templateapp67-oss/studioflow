import React,{useId,useState} from 'react';
import {serviceDescriptionSuggestions} from '../lib/serviceDescriptions';
export function ServiceDescriptionSuggestions({name,category,value,onSelect}:{name:string;category:string;value:string;onSelect:(text:string)=>void}){
 const [open,setOpen]=useState(false);const id=useId();
 const suggestions=serviceDescriptionSuggestions(name,category);
 return <div className="service-description-helper">
  <button type="button" className="secondary-action" disabled={!suggestions.length} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(previous=>!previous)}>{open?'Hide description templates':'Create 3 short descriptions'}</button>
  <small>{suggestions.length?'Based on your service name and category. Choose one, then edit it above.':'Enter a service name to prepare description templates.'}</small>
  {open&&suggestions.length>0&&<div id={id} className="service-description-options" role="group" aria-label="Short description templates">{suggestions.map((suggestion,index)=><article key={suggestion.label}>
   <strong>{index+1}. {suggestion.label}</strong><p>{suggestion.text}</p>
   <button type="button" className="secondary-action" aria-pressed={value===suggestion.text} onClick={()=>onSelect(suggestion.text)}>{value===suggestion.text?'Selected':`Use description ${index+1}`}</button>
  </article>)}</div>}
 </div>;
}

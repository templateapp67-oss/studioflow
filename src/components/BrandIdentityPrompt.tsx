import React,{useId,useRef,useState} from 'react';
import type {SalonProfile} from '../types';
import {brandIdentityContext,brandIdentityPrompt,type BrandAssetMode} from '../lib/brandIdentityPrompt';
export function BrandIdentityPrompt({profile}:{profile:SalonProfile}){
 const id=useId(),area=useRef<HTMLTextAreaElement>(null);
 const [mode,setMode]=useState<BrandAssetMode|''>(''),[override,setOverride]=useState<{key:string;colors:string[]}|null>(null),[notice,setNotice]=useState({prompt:'',text:''});
 const context=brandIdentityContext(profile),contextKey=`${profile.businessType}|${profile.themeAccentKey}|${context.primary}`;
 const colors=override?.key===contextKey?override.colors:context.colors;
 const prompt=mode?brandIdentityPrompt(profile,mode,colors):'';
 const validColors=new Set(colors).size===3;
 const copy=async()=>{try{await navigator.clipboard.writeText(prompt);setNotice({prompt,text:'Design prompt copied. Open ChatGPT Images and paste it.'});}catch{area.current?.focus();area.current?.select();setNotice({prompt,text:'Clipboard unavailable. Select and copy the prompt manually.'});}};
 return <section className="brand-identity-prompt" aria-label="Logo and favicon design prompt"><h3>Design your logo &amp; favicon with ChatGPT</h3><p>Use your salon’s first word and selected website theme to create three color variants.</p>
  <div className="brand-identity-context"><span>Brand word: <strong>{context.firstWord||'Add your salon name first'}</strong></span><span>Template: <strong>{context.template.shortName}</strong></span></div>
  <fieldset><legend>What would you like to create?</legend><div className="brand-identity-modes">{([{value:'logo',label:'Logo'},{value:'favicon',label:'Favicon'},{value:'both',label:'Both'}] as const).map(option=><label key={option.value}><input type="radio" name={`${id}-asset`} checked={mode===option.value} onChange={()=>setMode(option.value)}/>{option.label}</label>)}</div></fieldset>
  <div className="brand-identity-colors">{colors.map((color,index)=><label key={index}>Color {index+1}<input type="color" aria-label={`Design color ${index+1}`} value={color} onChange={event=>{const next=[...colors];next[index]=event.target.value.toLowerCase();setOverride({key:contextKey,colors:next});}}/><code>{color.toUpperCase()}</code></label>)}</div>
  <small>Colors start from your selected theme. These control the design prompt; use Brand accent below to change the website color.</small>
  {!context.firstWord&&<p role="status">Add your salon name in Business Details to prepare the prompt.</p>}
  {!validColors&&<p role="alert">Choose three different colors for three distinct variants.</p>}
  {!mode&&<p>Choose Logo, Favicon or Both to prepare the prompt.</p>}
  {prompt&&<><label className="brand-identity-prompt-label">Ready design prompt<textarea ref={area} aria-label="Logo and favicon prompt" readOnly rows={9} value={prompt} onFocus={event=>event.currentTarget.select()}/></label><div className="service-editor-actions"><button type="button" className="primary-action" onClick={()=>void copy()}>Copy design prompt</button><a className="secondary-action" href="https://chatgpt.com/images" target="_blank" rel="noopener noreferrer">Open ChatGPT Images ↗</a></div><p>Paste the prompt in ChatGPT, download your chosen PNG, then upload it using <strong>Brand logo</strong> or <strong>Website favicon</strong> below. For Both, upload the logo and its matching favicon separately. Files can be up to 5 MB each.</p><small>This copy-and-open flow uses your ChatGPT account and its limits; it does not use this website’s API credits.</small></>}
  {notice.prompt===prompt&&notice.text&&<p role="status">{notice.text}</p>}
 </section>;
}

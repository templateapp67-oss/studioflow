import React,{useRef,useState} from 'react';
import type {SalonProfile} from '../types';
import {brandIdentityContext} from '../lib/brandIdentityPrompt';
import {heroBackgroundPrompt} from '../lib/heroBackgroundPrompt';
export function HeroBackgroundPrompt({profile}:{profile:SalonProfile}){
 const area=useRef<HTMLTextAreaElement>(null),[notice,setNotice]=useState({prompt:'',text:''});
 const context=brandIdentityContext(profile),prompt=heroBackgroundPrompt(profile);
 const copy=async()=>{try{await navigator.clipboard.writeText(prompt);setNotice({prompt,text:'Background prompt copied. Open ChatGPT Images and paste it.'});}catch{area.current?.focus();area.current?.select();setNotice({prompt,text:'Clipboard unavailable. Select and copy the prompt manually.'});}};
 return <section className="brand-identity-prompt" aria-label="Hero background design prompt"><h3>Create your hero background with ChatGPT</h3><p>Prepare three background options using your salon name, selected template and theme color. No reference image or logo upload is needed in ChatGPT.</p>
 <div className="brand-identity-context"><span>Salon: <strong>{profile.businessName.trim()||'Add your salon name first'}</strong></span><span>Template: <strong>{context.template.shortName}</strong></span><span>Theme color: <strong>{context.primary.toUpperCase()}</strong></span></div>
 <p>Your existing website heading, text and booking buttons stay as they are. Every background prompt includes the exact branding “Powered by Nexora”.</p>
 {prompt?<><label className="brand-identity-prompt-label">Ready background prompt<textarea ref={area} aria-label="Hero background prompt" readOnly rows={9} value={prompt} onFocus={event=>event.currentTarget.select()}/></label><div className="service-editor-actions"><button type="button" className="primary-action" onClick={()=>void copy()}>Copy background prompt</button><a className="secondary-action" href="https://chatgpt.com/images" target="_blank" rel="noopener noreferrer">Open ChatGPT Images ↗</a></div><p>Paste the prompt in a new ChatGPT Images chat, download your preferred background, then upload it with <strong>Hero image</strong> below or paste its image URL. Choose a wide image that also looks good when cropped on mobile.</p><small>This copy-and-open flow uses your ChatGPT account and its limits; it does not use this website’s API credits.</small></>:<p role="status">Add your salon name in Business Details to prepare the prompt.</p>}
 {notice.prompt===prompt&&notice.text&&<p role="status">{notice.text}</p>}
 </section>;
}

import React,{useRef,useState} from 'react';
import {createServiceImageVariation,serviceImagePrompt} from '../lib/serviceImagePrompt';
export function ServiceImagePrompt({name,category,description,enabled}:{name:string;category:string;description:string;enabled:boolean}){
 const [variation,setVariation]=useState(createServiceImageVariation),[notice,setNotice]=useState({prompt:'',text:''}),area=useRef<HTMLTextAreaElement>(null);
 if(!enabled)return <p className="muted text-xs">Choose a service, category and description to prepare your ChatGPT image prompt.</p>;
 const prompt=serviceImagePrompt(name,category,description,variation);
 const copy=async()=>{
  try{await navigator.clipboard.writeText(prompt);setNotice({prompt,text:'Prompt copied. Open ChatGPT, paste it and ask to create the images.'});}
  catch{area.current?.focus();area.current?.select();setNotice({prompt,text:'Clipboard is unavailable. Select the prompt and copy it manually, then paste it in ChatGPT.'});}
 };
 return <section className="service-image-prompt" aria-label="Create images in ChatGPT"><h4>Create images with ChatGPT</h4><p>Your selected service stays the same. Each new brief varies camera angle, lighting, decor and composition, with mandatory Nexora branding.</p>
  <label>Image creation prompt<textarea ref={area} aria-label="AI image prompt" rows={8} readOnly value={prompt} onFocus={event=>event.currentTarget.select()}/></label>
  <div className="service-editor-actions"><button type="button" className="secondary-action" onClick={()=>setVariation(createServiceImageVariation())}>New variation</button><button type="button" className="primary-action" onClick={()=>void copy()}>Copy image prompt</button><a className="secondary-action" href="https://chatgpt.com/images" target="_blank" rel="noopener noreferrer">Open ChatGPT Images ↗</a></div>
  <ol><li>Copy the prompt and open ChatGPT in the new tab.</li><li>Paste it and ask ChatGPT to create the images.</li><li>Download the image you like, return here and use <strong>Upload photo</strong> below.</li><li>Adjust with <strong>Crop &amp; Adjust</strong>, then save your service.</li></ol>
  <p className="muted text-xs">Use New variation for a fresh creative brief. Copying keeps the current brief unchanged. Different prompts reduce repetition; AI image uniqueness cannot be guaranteed.</p>
  <small>This copy-and-open option does not use this website’s API credits. ChatGPT may require sign-in and has its own image-generation limits. Images are uploaded here only when you choose a file.</small>
  {notice.prompt===prompt&&notice.text&&<p role="status">{notice.text}</p>}
 </section>;
}

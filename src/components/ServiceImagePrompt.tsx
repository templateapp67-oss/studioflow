import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {createServiceImageVariation,serviceImagePrompt} from '../lib/serviceImagePrompt';
export function ServiceImagePrompt({name,category,description,enabled}:{name:string;category:string;description:string;enabled:boolean}){
 const [variation,setVariation]=useState(()=>({seed:createServiceImageVariation(),number:1}));
 const [notice,setNotice]=useState({prompt:'',text:'',kind:'',id:0}),[copying,setCopying]=useState(false);
 const area=useRef<HTMLTextAreaElement>(null),running=useRef(false),alive=useRef(true),action=useRef(0);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;action.current++;};},[]);
 useEffect(()=>{if(!notice.text)return;const timer=setTimeout(()=>setNotice(current=>current.id===notice.id?{...current,text:''}:current),5000);return()=>clearTimeout(timer);},[notice.id]);
 if(!enabled)return <p className="muted text-xs">Choose a service, category and description to prepare your ChatGPT image prompt.</p>;
 const prompt=serviceImagePrompt(name,category,description,variation.seed);
 const show=(forPrompt:string,text:string,kind:string)=>setNotice(current=>({prompt:forPrompt,text,kind,id:current.id+1}));
 const fresh=()=>{
  action.current++;const number=variation.number+1,seed=`${createServiceImageVariation()}-v${number}`;
  const next=serviceImagePrompt(name,category,description,seed);setVariation({seed,number});
  if(area.current)area.current.scrollTop=0;
  show(next,`New variation ${number} ready! Image creation prompt updated.`,'variation');
 };
 const copy=async()=>{
  if(running.current)return;running.current=true;setCopying(true);const version=++action.current;
  try{await navigator.clipboard.writeText(prompt);if(alive.current&&version===action.current)show(prompt,'Prompt copied! Open ChatGPT Images and paste it.','copied');}
  catch{if(alive.current&&version===action.current){area.current?.focus();area.current?.select();show(prompt,'Copy failed. Prompt selected — copy it manually, then paste it in ChatGPT.','error');}}
  finally{running.current=false;if(alive.current)setCopying(false);}
 };
 const currentNotice=notice.prompt===prompt?notice.text:'';
 const toast=currentNotice?<div key={notice.id} className={`service-prompt-toast ${notice.kind==='error'?'is-error':''}`} role="status" aria-live="polite">{currentNotice}</div>:null;
 return <section className="service-image-prompt" aria-label="Create images in ChatGPT"><h4>Create images with ChatGPT <span className="service-prompt-version">Variation {variation.number}</span></h4><p>Your selected service stays the same. Each new brief varies camera angle, lighting, decor and composition, with mandatory Nexora branding.</p>
  <label>Image creation prompt<textarea ref={area} aria-label="AI image prompt" rows={8} readOnly value={prompt} onFocus={event=>event.currentTarget.select()}/></label>
  <div className="service-editor-actions"><button type="button" className="secondary-action" disabled={copying} onClick={fresh}>New variation</button><button type="button" aria-label="Copy image prompt" aria-busy={copying} className="primary-action" disabled={copying} onClick={()=>void copy()}>{copying?'Copying…':currentNotice&&notice.kind==='copied'?'✓ Prompt copied!':'Copy image prompt'}</button><a className="secondary-action" href="https://chatgpt.com/images" target="_blank" rel="noopener noreferrer">Open ChatGPT Images ↗</a></div>
  {currentNotice&&<p className={`service-prompt-feedback ${notice.kind==='error'?'is-error':''}`} aria-hidden="true">{currentNotice}</p>}
  {toast&&(area.current?.ownerDocument?.body?createPortal(toast,area.current.ownerDocument.body):toast)}
  <ol><li>Copy the prompt and open ChatGPT in the new tab.</li><li>Paste it and ask ChatGPT to create the images.</li><li>Download the image you like, return here and use <strong>Upload photo</strong> below.</li><li>Adjust with <strong>Crop &amp; Adjust</strong>, then save your service.</li></ol>
  <p className="muted text-xs">New variation updates the prompt immediately and returns the text box to its beginning. Copying keeps the current brief unchanged. Different prompts reduce repetition; AI image uniqueness cannot be guaranteed.</p>
  <small>This copy-and-open option does not use this website’s API credits. ChatGPT may require sign-in and has its own image-generation limits. Images are uploaded here only when you choose a file.</small>
 </section>;
}

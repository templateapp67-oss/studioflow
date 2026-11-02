import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {syncPreviewStyles} from '../lib/previewStyleSync';

/**
 * Isolated device-sized iframe for website previews (owner "Client Preview
 * Mode" and the template customizers). Stylesheets are mirrored live from the
 * host document — template CSS is code-split and only reaches the host
 * `<head>` after its lazy chunk loads, so a one-time copy at iframe load
 * would leave the website unstyled.
 */
export function WebsiteDeviceFrame({mode,title,children}:{mode:'desktop'|'tablet'|'mobile';title:string;children:(doc:Document)=>React.ReactNode}) {
 const [doc,setDoc]=useState<Document|null>(null);
 const stopStyleSync=useRef<(()=>void)|null>(null);
 useEffect(()=>()=>{stopStyleSync.current?.();stopStyleSync.current=null;},[]);
 const root=doc?.getElementById('website-device-root');
 return <div className="h-full min-h-0 overflow-auto p-2 sm:p-4 bg-slate-100"><iframe title={title} srcDoc={'<!doctype html><html style="height:100%"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0; min-height:100%; overflow-y:auto;"><div id="website-device-root"></div></body></html>'} onLoad={e=>{const frame=e.currentTarget.contentDocument;if(!frame)return;stopStyleSync.current?.();stopStyleSync.current=syncPreviewStyles(frame);setDoc(frame);}} style={{width:mode==='mobile'?390:mode==='tablet'?768:'100%',maxWidth:mode==='desktop'?1280:'100%',height:'100%',minHeight:'600px'}} className="block mx-auto bg-white rounded-xl border shadow-lg"/>{root&&createPortal(children(doc!),root)}</div>;
}

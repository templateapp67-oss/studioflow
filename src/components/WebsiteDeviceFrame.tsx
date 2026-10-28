import React,{useState} from 'react';
import {createPortal} from 'react-dom';
export function WebsiteDeviceFrame({mode,title,children}:{mode:'desktop'|'tablet'|'mobile';title:string;children:(doc:Document)=>React.ReactNode}) {
 const [doc,setDoc]=useState<Document|null>(null);
 const root=doc?.getElementById('website-device-root');
 return <div className="h-full min-h-0 overflow-auto p-2 sm:p-4 bg-slate-100"><iframe title={title} srcDoc={'<!doctype html><html style="height:100%"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0; min-height:100%; overflow-y:auto;"><div id="website-device-root"></div></body></html>'} onLoad={e=>{const frame=e.currentTarget.contentDocument;if(!frame)return;document.querySelectorAll('link[rel="stylesheet"],style').forEach(style=>frame.head.appendChild(style.cloneNode(true)));setDoc(frame);}} style={{width:mode==='mobile'?390:mode==='tablet'?768:'100%',maxWidth:mode==='desktop'?1280:'100%',height:'100%',minHeight:'600px'}} className="block mx-auto bg-white rounded-xl border shadow-lg"/>{root&&createPortal(children(doc!),root)}</div>;
}

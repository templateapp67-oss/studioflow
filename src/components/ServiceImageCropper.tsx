import React,{useEffect,useRef,useState} from 'react';
import {serviceCropRect} from '../lib/serviceCrop';
export function ServiceImageCropper({src,onApply,onCancel}:{src:string;onApply:(file:File)=>Promise<boolean|undefined>;onCancel:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),image=useRef<HTMLImageElement|null>(null),mounted=useRef(true);
 const drag=useRef<{id:number;x:number;y:number}|null>(null);
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [crop,setCrop]=useState({zoom:1,x:50,y:50});
 useEffect(()=>{
  mounted.current=true;setReady(false);setError('');setCrop({zoom:1,x:50,y:50});
  const img=new Image();img.crossOrigin='anonymous';
  img.onload=()=>{if(mounted.current){image.current=img;setReady(true);}};
  img.onerror=()=>{if(mounted.current)setError('Could not load this photo for cropping. Try uploading the original image again.');};
  img.src=src;
  return()=>{mounted.current=false;img.onload=null;img.onerror=null;image.current=null;};
 },[src]);
 useEffect(()=>{
  if(!ready||!image.current||!canvas.current)return;
  const ctx=canvas.current.getContext('2d');if(!ctx){setError('Image editing is unavailable in this browser.');return;}
  const rect=serviceCropRect(image.current.naturalWidth,image.current.naturalHeight,crop.zoom,crop.x,crop.y);
  ctx.clearRect(0,0,1200,800);ctx.fillStyle='#fff';ctx.fillRect(0,0,1200,800);
  ctx.drawImage(image.current,rect.x,rect.y,rect.width,rect.height,0,0,1200,800);
 },[ready,crop]);
 const apply=async()=>{
  if(!canvas.current||!ready||busy||error)return;setBusy(true);setError('');
  try{
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.current!.toBlob(result=>result?resolve(result):reject(new Error('Could not crop this image. Please try again.')),'image/jpeg',.92));
   if(!mounted.current)return;
   const saved=await onApply(new File([blob],'service-crop.jpg',{type:'image/jpeg'}));
   if(saved&&mounted.current)onCancel();
  }catch(cause){if(mounted.current)setError(cause instanceof Error?cause.message:'Crop failed. Please try uploading your photo again.');}
  finally{if(mounted.current)setBusy(false);}
 };
 return <section className="service-cropper" aria-label="Crop service image" aria-busy={busy}>
  <strong>Crop &amp; Adjust · 3:2 card</strong><small>Drag the photo or use the sliders. Apply crop, then save your service.</small>
  {!ready&&!error&&<p role="status">Loading photo…</p>}
  <canvas ref={canvas} width={1200} height={800} role="img" aria-label="Service image crop preview" onPointerDown={event=>{if(!ready||busy||event.button!==0)return;event.currentTarget.setPointerCapture(event.pointerId);drag.current={id:event.pointerId,x:event.clientX,y:event.clientY};}} onPointerMove={event=>{
   const start=drag.current,img=image.current;if(!start||start.id!==event.pointerId||!img||busy)return;
   const bounds=event.currentTarget.getBoundingClientRect(),rect=serviceCropRect(img.naturalWidth,img.naturalHeight,crop.zoom,crop.x,crop.y);
   const dx=(event.clientX-start.x)*rect.width/Math.max(1,bounds.width),dy=(event.clientY-start.y)*rect.height/Math.max(1,bounds.height);
   drag.current={id:event.pointerId,x:event.clientX,y:event.clientY};
   setCrop(previous=>({...previous,x:Math.max(0,Math.min(100,previous.x-dx/Math.max(1,img.naturalWidth-rect.width)*100)),y:Math.max(0,Math.min(100,previous.y-dy/Math.max(1,img.naturalHeight-rect.height)*100))}));
  }} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}/>
  <label>Zoom · {crop.zoom.toFixed(1)}×<input type="range" min={1} max={3} step={.05} value={crop.zoom} disabled={!ready||busy} onChange={e=>setCrop(previous=>({...previous,zoom:Number(e.target.value)}))}/></label>
  {(['x','y'] as const).map(axis=><label key={axis}>{axis==='x'?'Horizontal position':'Vertical position'}<input type="range" min={0} max={100} step={1} value={crop[axis]} disabled={!ready||busy} onChange={e=>{const value=Number(e.target.value);setCrop(previous=>({...previous,[axis]:value}));}}/></label>)}
  {error&&<p role="alert" className="service-editor-error">{error}</p>}
  <div className="service-editor-actions"><button type="button" className="secondary-action" disabled={busy} onClick={()=>{setCrop({zoom:1,x:50,y:50});setError('');}}>Reset crop</button><button type="button" className="secondary-action" disabled={busy} onClick={onCancel}>Cancel crop</button><button type="button" className="primary-action" disabled={!ready||busy||!!error} onClick={()=>void apply()}>{busy?'Applying crop…':'Apply crop'}</button></div>
 </section>;
}

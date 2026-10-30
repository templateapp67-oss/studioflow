let pending:Promise<void>|undefined;
export function loadLeaflet():Promise<void>{
 if((window as any).L)return Promise.resolve();
 if(pending)return pending;
 pending=new Promise<void>((resolve,reject)=>{
  if(!document.getElementById('leaflet-css')){const css=document.createElement('link');css.id='leaflet-css';css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';css.integrity='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';css.crossOrigin='anonymous';document.head.appendChild(css)}
  const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.integrity='sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';script.crossOrigin='anonymous';
  const fail=()=>{script.remove();pending=undefined;reject(new Error('Map library could not load'))};
  const timeout=setTimeout(fail,15000);script.onload=()=>{clearTimeout(timeout);resolve()};script.onerror=()=>{clearTimeout(timeout);fail()};document.body.appendChild(script);
 });return pending;
}

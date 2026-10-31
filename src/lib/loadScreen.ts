// Each release gets one automatic recovery; manual recovery always fetches a fresh document.
const build=import.meta.env?.VITE_SCREEN_BUILD||'development';
export function isChunkLoadError(error:unknown){
 const message=error&&typeof error==='object'&&'message' in error?String(error.message):String(error);
 return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|ChunkLoadError|Unable to preload CSS/i.test(message);
}
export function recoverScreen(manual=false):boolean{
 if(typeof window==='undefined'||(!manual&&typeof navigator!=='undefined'&&navigator.onLine===false))return false;
 const key='studioflow_chunk_reload:'+build;
 try{
  if(!manual&&sessionStorage.getItem(key))return false;
  sessionStorage.setItem(key,'1');
  if(window.location.href&&typeof window.location.replace==='function'){
   const url=new URL(window.location.href);url.searchParams.set('__sf_update',build);url.searchParams.set('__sf_reload',String(Date.now()));window.location.replace(url.href);
  }else window.location.reload();
  return true;
 }catch{
  // No automatic loop when browser storage is unavailable. Manual recovery still works.
  if(manual){window.location.reload();return true;}return false;
 }
}
export function installScreenRecovery(){
 window.addEventListener('vite:preloadError',event=>{if(recoverScreen())event.preventDefault()});
}
export async function loadScreen<T>(loader:()=>Promise<T>):Promise<T>{
 try{return await loader()}catch(error){if(isChunkLoadError(error)&&recoverScreen())return await new Promise<T>(()=>{});throw error;}
}

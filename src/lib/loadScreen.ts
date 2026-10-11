// Old tabs can reference chunks removed by a newer deployment. Reload once,
// only for asset loading failures; never loop on application exceptions.
export function isChunkLoadError(error: unknown) {
 const message=error instanceof Error ? error.message : String(error);
 return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|ChunkLoadError|Unable to preload CSS/i.test(message);
}
export async function loadScreen<T>(loader:()=>Promise<T>):Promise<T> {
 try { return await loader(); }
 catch(error) {
  if(isChunkLoadError(error)&&typeof window!=='undefined') {
   try {
    const key='studioflow_chunk_reload';const last=Number(sessionStorage.getItem(key)||0);
    if(Date.now()-last>60000) {sessionStorage.setItem(key,String(Date.now()));window.location.reload();return await new Promise<T>(()=>{});}
   } catch { /* Restricted browser storage: show recoverable error instead. */ }
  }
  throw error;
 }
}

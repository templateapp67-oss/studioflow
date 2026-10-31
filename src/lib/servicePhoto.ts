import {compressAndResizeImage} from '../utils/imageUploadHelper';
import {supabase} from './supabase';
export async function uploadServicePhoto(file:File):Promise<{imageUrl:string;imagePath:string}>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG or WebP service photo.');
 if(file.size>20*1024*1024)throw new Error('Choose a service photo smaller than 20 MB.');
 const resized=await compressAndResizeImage(file,1200,2*1024*1024);
 if(!resized.isValid||!resized.dataUrl)throw new Error(resized.errorMessage||'Could not resize this service photo.');
 const blob=await (await fetch(resized.dataUrl)).blob();
 if(!blob.size||blob.size>2*1024*1024)throw new Error('This photo could not be optimized. Please choose a different image.');
 const {data,error}=await supabase.auth.getUser();if(error||!data.user)throw new Error('Sign in before uploading service photos.');
 const extension=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';
 const imagePath=`${data.user.id}/services/${crypto.randomUUID()}.${extension}`;
 const result=await supabase.storage.from('studioflow-media').upload(imagePath,blob,{contentType:blob.type,upsert:false});
 if(result.error)throw new Error(result.error.message||'Service photo upload failed. Please try again.');
 const imageUrl=supabase.storage.from('studioflow-media').getPublicUrl(imagePath).data.publicUrl;
 return {imageUrl,imagePath};
}
// Only used for new uploads abandoned before a service is saved. Saved media is
// retained when detached, so reuse in another service or website section is safe.
export async function discardServicePhoto(imagePath:string){
 try{
  const {data,error}=await supabase.auth.getUser();if(error||!data.user||!imagePath.startsWith(`${data.user.id}/services/`))return;
  await supabase.storage.from('studioflow-media').remove([imagePath]);
 }catch{/* Best-effort cleanup of abandoned uploads; saved service data is unaffected. */}
}

/** Import in the browser, then use the same owner-scoped upload and validation. */
export async function servicePhotoFromUrl(value:string):Promise<File>{
 let url:URL;
 try{url=new URL(value);}catch{throw new Error('Enter a valid HTTPS image URL.');}
 if(url.protocol!=='https:'||url.username||url.password)throw new Error('Enter a valid HTTPS image URL.');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch(url.href,{credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
  if(!response.ok)throw new Error('Image URL could not be loaded. Download the image and upload it instead.');
  const mime=(response.headers.get('content-type')||'').split(';')[0].toLowerCase();
  if(!['image/jpeg','image/png','image/webp'].includes(mime))throw new Error('The URL must point directly to a JPG, PNG or WebP image.');
  if(Number(response.headers.get('content-length'))>20*1024*1024)throw new Error('Choose an image smaller than 20 MB.');
  if(!response.body)throw new Error('The image is empty.');
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>20*1024*1024){await reader.cancel();throw new Error('Choose an image smaller than 20 MB.');}chunks.push(part.value);}
  if(!size)throw new Error('The image is empty.');
  return new File(chunks as BlobPart[],`service-import.${mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg'}`,{type:mime});
 }catch(error){if(error instanceof TypeError)throw new Error('This host blocks image import. Download the photo and use Upload photo instead.');throw error;}
 finally{clearTimeout(timer);}
}

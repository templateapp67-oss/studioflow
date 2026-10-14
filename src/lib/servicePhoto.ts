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

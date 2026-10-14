import {compressAndResizeImage} from '../utils/imageUploadHelper';
import {uploadSalonImage} from './supabase';
export async function uploadReviewPhoto(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG or WebP photo.');
 const resized=await compressAndResizeImage(file,1600,2*1024*1024);
 if(!resized.isValid||!resized.dataUrl)throw new Error(resized.errorMessage||'Could not resize this photo.');
 const blob=await (await fetch(resized.dataUrl)).blob();
 if(blob.size>5*1024*1024)throw new Error('This image could not be optimized. Please try a different photo.');
 return uploadSalonImage(new File([blob],`review.${blob.type==='image/png'?'png':'jpg'}`,{type:blob.type}));
}

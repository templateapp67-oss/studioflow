import { supabase, MEDIA_BUCKET } from './supabase';
import { compressAndResizeImage } from '../utils/imageUploadHelper';

/**
 * Compresses a service photo (long edge <= 1200px, <= 2 MB) and uploads it to
 * the signed-in owner's `services/` folder. Returns the storage path plus the
 * public URL so the workspace can save both.
 */
export async function uploadServicePhoto(file: File): Promise<{ imagePath: string; imageUrl: string }> {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP photo.');
  const resized = await compressAndResizeImage(file, 1200, 2 * 1024 * 1024);
  if (!resized.isValid || !resized.dataUrl) throw new Error(resized.errorMessage || 'Could not resize this photo.');
  const blob = await (await fetch(resized.dataUrl)).blob();
  if (blob.size > 2 * 1024 * 1024) throw new Error('This image could not be optimized. Please try a different photo.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (authError || !uid) throw new Error('Sign in to upload photos.');
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${uid}/services/${crypto.randomUUID()}.${ext}`;
  const bucket = supabase.storage.from(MEDIA_BUCKET);
  const { error } = await bucket.upload(path, blob, { contentType: blob.type || file.type, upsert: false });
  if (error) throw error;
  const { data: pub } = bucket.getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error('Upload succeeded but the public URL is unavailable.');
  return { imagePath: path, imageUrl: pub.publicUrl };
}

/** Deletes an uploaded service photo from storage (best effort). */
export async function discardServicePhoto(photoPath: string): Promise<void> {
  if (!photoPath) return;
  try {
    await supabase.storage.from(MEDIA_BUCKET).remove([photoPath]);
  } catch {
    // best effort cleanup of orphaned uploads
  }
}

/** Fetches a remote/bundled image URL as a File so it can be re-uploaded into owner storage. */
export async function servicePhotoFromUrl(url: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not load this image URL.');
  const blob = await response.blob();
  const name = (url.split('/').pop() || 'photo.jpg').split('?')[0] || 'photo.jpg';
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}

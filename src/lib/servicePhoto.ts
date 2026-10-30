export async function uploadServicePhoto(file: File): Promise<string> {
  return Promise.resolve(URL.createObjectURL(file));
}

export async function discardServicePhoto(photoUrl: string): Promise<void> {
  return Promise.resolve();
}

export function servicePhotoFromUrl(url?: string): string {
  return url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80';
}

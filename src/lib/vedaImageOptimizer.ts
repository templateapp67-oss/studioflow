/**
 * Template 14 — automatic image optimisation for the Veda Sanjeevani customizer.
 *
 * Every upload is cropped to the section's aspect ratio (focal-point aware,
 * never stretched), downscaled to the preset's target width, re-encoded to WebP
 * (JPEG when the browser cannot write WebP) and re-tried at lower quality until
 * it fits a sensible byte budget. The result is a real uploaded file — the
 * template then serves the same image from Supabase Storage.
 *
 * Honest limits: browsers can only *encode* JPEG/WebP/PNG here, so AVIF is
 * produced by the build pipeline (`scripts/build-template14-assets.mjs` targets
 * WebP for compatibility) rather than in the browser. Nothing claims otherwise.
 */
import { VEDA_IMAGE_PRESETS, vedaPresetFor, type VedaImagePreset } from './vedaSanjeevaniCustomizer';

export type VedaFocalPoint = { x: number; y: number };

export interface VedaOptimizedImage {
  blob: Blob;
  /** Object URL for the in-dashboard preview — revoke when replaced. */
  previewUrl: string;
  width: number;
  height: number;
  originalBytes: number;
  outputBytes: number;
  originalWidth: number;
  originalHeight: number;
  mimeType: string;
  fileName: string;
  presetId: string;
  /** Human-readable summary of what happened ("16:9 · 1600×900 · WebP 84% smaller"). */
  summary: string;
  /** True when the quality loop had to trade sharpness to fit the budget. */
  compressed: boolean;
}

export const VEDA_MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const VEDA_OUTPUT_BUDGET_BYTES = 420 * 1024;

export function vedaReadableBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function vedaUploadProblem(file?: File | null): string {
  if (!file) return 'Choose an image first.';
  if (!/^image\/(jpeg|png|webp|avif)$/i.test(file.type)) return 'Use a JPG, PNG, WebP or AVIF image.';
  if (file.size > VEDA_MAX_UPLOAD_BYTES) return `That file is ${vedaReadableBytes(file.size)}. Please keep uploads under ${vedaReadableBytes(VEDA_MAX_UPLOAD_BYTES)}.`;
  return '';
}

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close?.() };
    } catch {
      /* fall through to the <img> path (older Safari) */
    }
  }
  const url = URL.createObjectURL(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('That image could not be read. Try another file.'));
    element.src = url;
  });
  return {
    source: image,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    release: () => URL.revokeObjectURL(url),
  };
}

/** Crop rectangle for a target ratio, keeping the focal point inside the frame. */
export function vedaCropRect(width: number, height: number, ratio: number, focal: VedaFocalPoint) {
  const sourceRatio = width / height;
  if (!Number.isFinite(ratio) || ratio <= 0 || sourceRatio === ratio) return { x: 0, y: 0, width, height };
  if (sourceRatio > ratio) {
    const cropWidth = Math.round(height * ratio);
    const fx = Math.min(1, Math.max(0, focal.x));
    const x = Math.min(width - cropWidth, Math.max(0, Math.round(width * fx - cropWidth / 2)));
    return { x, y: 0, width: cropWidth, height };
  }
  const cropHeight = Math.round(width / ratio);
  const fy = Math.min(1, Math.max(0, focal.y));
  const y = Math.min(height - cropHeight, Math.max(0, Math.round(height * fy - cropHeight / 2)));
  return { x: 0, y, width, height: cropHeight };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (canvas.toBlob) canvas.toBlob((blob) => resolve(blob), type, quality);
    else resolve(null);
  });
}

export interface VedaOptimizeOptions {
  presetId?: string;
  focal?: VedaFocalPoint;
  /** Called with 10 → 100 while the work happens (for the progress bar). */
  onProgress?: (percent: number, label: string) => void;
}

export async function optimizeVedaImage(file: File, slotOrPreset: string = 'services', options: VedaOptimizeOptions = {}): Promise<VedaOptimizedImage> {
  const problem = vedaUploadProblem(file);
  if (problem) throw new Error(problem);
  const preset: VedaImagePreset =
    VEDA_IMAGE_PRESETS.find((item) => item.id === slotOrPreset) || vedaPresetFor(slotOrPreset);
  const progress = options.onProgress || (() => {});
  const focal = options.focal || { x: 0.5, y: 0.42 };

  progress(8, 'Reading image…');
  const decoded = await decode(file);
  try {
    progress(28, 'Cropping to the section shape…');
    const rect = vedaCropRect(decoded.width, decoded.height, preset.ratio, focal);
    const targetWidth = Math.max(240, Math.min(preset.targetWidth, rect.width));
    const targetHeight = Math.round(targetWidth / preset.ratio);
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not process the image. Try Chrome, Safari or Firefox.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(decoded.source, rect.x, rect.y, rect.width, rect.height, 0, 0, targetWidth, targetHeight);

    progress(58, 'Optimising file size…');
    const supportsWebp = await (async () => {
      try {
        const probe = document.createElement('canvas');
        probe.width = 1;
        probe.height = 1;
        const blob = await canvasToBlob(probe, 'image/webp', 0.8);
        return Boolean(blob && blob.type === 'image/webp');
      } catch {
        return false;
      }
    })();
    const mimeType = supportsWebp ? 'image/webp' : 'image/jpeg';
    let quality = 0.86;
    let blob = await canvasToBlob(canvas, mimeType, quality);
    while (blob && blob.size > VEDA_OUTPUT_BUDGET_BYTES && quality > 0.55) {
      quality -= 0.07;
      blob = await canvasToBlob(canvas, mimeType, quality);
    }
    if (!blob) throw new Error('The image could not be compressed. Try a smaller file.');
    progress(92, 'Finishing…');
    const extension = mimeType === 'image/webp' ? 'webp' : 'jpg';
    const baseName = (file.name || 'photo').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 40) || 'photo';
    const saved = file.size > 0 ? Math.max(0, Math.round((1 - blob.size / file.size) * 100)) : 0;
    progress(100, 'Ready');
    return {
      blob,
      previewUrl: URL.createObjectURL(blob),
      width: targetWidth,
      height: targetHeight,
      originalBytes: file.size,
      outputBytes: blob.size,
      originalWidth: decoded.width,
      originalHeight: decoded.height,
      mimeType,
      fileName: `${baseName}-${targetWidth}.${extension}`,
      presetId: preset.id,
      compressed: quality < 0.8,
      summary: `${preset.ratioLabel} · ${targetWidth}×${targetHeight} · ${mimeType === 'image/webp' ? 'WebP' : 'JPEG'}${
        saved > 4 ? ` · ${saved}% smaller` : ''
      }`,
    };
  } finally {
    decoded.release();
  }
}

/** Wraps the optimised blob as a File for the existing storage upload helper. */
export function vedaOptimizedFile(image: VedaOptimizedImage): File {
  return new File([image.blob], image.fileName, { type: image.mimeType, lastModified: Date.now() });
}

/**
 * Uploads an optimised image to the workspace bucket and returns its public
 * URL. Reuses `uploadSalonImage` so ownership, bucket policy and the 5 MB cap
 * stay in one place for every template.
 */
export async function uploadVedaImage(image: VedaOptimizedImage): Promise<string> {
  const { uploadSalonImage } = await import('./supabase');
  if (image.outputBytes > 5 * 1024 * 1024) throw new Error('The optimised image is still too large. Try a different source photo.');
  return uploadSalonImage(vedaOptimizedFile(image));
}

/** Notes shown under the uploader so owners know exactly what will happen. */
export function vedaOptimizerNote(preset: VedaImagePreset): string {
  return `${preset.ratioLabel} at ${preset.targetWidth}px wide, re-encoded to WebP where the browser supports it (JPEG otherwise), targeting under ${vedaReadableBytes(VEDA_OUTPUT_BUDGET_BYTES)}. ${preset.note}`;
}

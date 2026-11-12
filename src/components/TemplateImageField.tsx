import React, { useEffect, useId, useRef, useState } from 'react';
import { uploadSalonImage } from '../lib/supabase';
import '../styles/TemplateImageField.css';

export type TemplateImageFrame = 'hero' | 'interior' | 'guide' | 'reel' | 'service' | 'avatar';

const FRAMES: Record<TemplateImageFrame, { label: string; ratio: number; width: number }> = {
  hero: { label: 'Hero · 16:9', ratio: 16 / 9, width: 1920 },
  interior: { label: 'Studio interior · 3:2', ratio: 3 / 2, width: 1440 },
  guide: { label: 'Guide poster · 4:3', ratio: 4 / 3, width: 1200 },
  reel: { label: 'Reel poster · 9:16', ratio: 9 / 16, width: 900 },
  service: { label: 'Service image · 4:3', ratio: 4 / 3, width: 1000 },
  avatar: { label: 'Client photo · 1:1', ratio: 1, width: 640 },
};

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 4.5 * 1024 * 1024;
const INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Use the Image/object-URL fallback below.
    }
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('The selected image could not be opened.'));
      element.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Your browser could not prepare this image.')),
      'image/webp',
      quality,
    );
  });
}

/** Centre-crop and resize while preserving proportions; never upscale a small source image. */
export async function processTemplateImage(
  file: File,
  frame: TemplateImageFrame,
): Promise<{ file: File; width: number; height: number }> {
  const decoded = await decodeImage(file);
  try {
    const preset = FRAMES[frame];
    const { width: sourceWidth, height: sourceHeight } = decoded;
    if (!sourceWidth || !sourceHeight) throw new Error('The selected image has no readable dimensions.');

    const sourceRatio = sourceWidth / sourceHeight;
    const cropWidth = sourceRatio > preset.ratio ? sourceHeight * preset.ratio : sourceWidth;
    const cropHeight = sourceRatio < preset.ratio ? sourceWidth / preset.ratio : sourceHeight;
    const sx = (sourceWidth - cropWidth) / 2;
    const sy = (sourceHeight - cropHeight) / 2;
    const scale = Math.min(1, preset.width / cropWidth);
    let canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cropWidth * scale));
    canvas.height = Math.max(1, Math.round(cropHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is not available in this browser.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(decoded.source, sx, sy, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

    let blob: Blob | null = null;
    let quality = 0.88;
    for (let attempt = 0; attempt < 9; attempt += 1) {
      blob = await canvasBlob(canvas, quality);
      if (blob.size <= MAX_OUTPUT_BYTES) break;
      if (attempt < 3) quality = Math.max(0.58, quality - 0.1);
      else {
        const smaller = document.createElement('canvas');
        smaller.width = Math.max(1, Math.round(canvas.width * 0.82));
        smaller.height = Math.max(1, Math.round(canvas.height * 0.82));
        const smallerContext = smaller.getContext('2d');
        if (!smallerContext) throw new Error('Image processing is not available in this browser.');
        smallerContext.drawImage(canvas, 0, 0, smaller.width, smaller.height);
        canvas = smaller;
        quality = 0.82;
      }
    }
    if (!blob || blob.size > MAX_OUTPUT_BYTES) throw new Error('This photo is still too large after resizing. Choose another image.');
    if (!['image/webp', 'image/png', 'image/jpeg'].includes(blob.type)) {
      throw new Error('Your browser could not create a supported image. Please try JPG, PNG or WebP.');
    }
    const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp';
    return {
      file: new File([blob], `template-image.${extension}`, { type: blob.type, lastModified: Date.now() }),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    decoded.release();
  }
}

function isSafeImageUrl(value: string): boolean {
  const urlValue = value.trim();
  if (!urlValue) return true;
  if (urlValue.startsWith('/') && !urlValue.startsWith('//') && !urlValue.includes('\\')) {
    return !/[\u0000-\u001f]/.test(urlValue);
  }
  try {
    const url = new URL(urlValue);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export type TemplateImageFieldProps = {
  templateId: string;
  templateName: string;
  templateNumber: string;
  categoryName: string;
  sectionLabel: string;
  value?: string | null;
  onChange: (url: string) => void;
  frame: TemplateImageFrame;
  templateValue?: string;
  hint?: string;
  compact?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

/** Shared NEXORA image field: template identity, client-side crop/compression and authenticated Storage upload. */
export function TemplateImageField({
  templateId, templateName, templateNumber, categoryName, sectionLabel,
  value = '', onChange, frame, templateValue, hint, compact = false, onBusyChange,
}: TemplateImageFieldProps) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const busyRef = useRef(false);
  const fieldIdentity = useRef(`${templateId}:${sectionLabel}`);
  fieldIdentity.current = `${templateId}:${sectionLabel}`;
  const [busy, setBusy] = useState(false);
  const [urlInput, setUrlInput] = useState(value || '');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  const preset = FRAMES[frame];
  const previewUrl = (value || '').trim() || (templateValue || '').trim();

  useEffect(() => {
    setUrlInput(value || '');
    setPreviewFailed(false);
  }, [value]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const setBusyState = (next: boolean) => {
    busyRef.current = next;
    setBusy(next);
    onBusyChange?.(next);
  };

  const handleFile = async (file?: File) => {
    if (!file || busyRef.current) return;
    setError('');
    setNotice('');
    setPreviewFailed(false);
    if (!INPUT_TYPES.has(file.type)) {
      setError('Choose a JPG, PNG, WebP or AVIF image.');
      return;
    }
    if (!file.size || file.size > MAX_INPUT_BYTES) {
      setError('Choose an image up to 20 MB.');
      return;
    }
    const identityAtStart = fieldIdentity.current;
    setBusyState(true);
    try {
      const processed = await processTemplateImage(file, frame);
      // uploadSalonImage requires a signed-in user and stores under studioflow-media/{auth.uid()}.
      const uploadedUrl = await uploadSalonImage(processed.file);
      if (!mounted.current || fieldIdentity.current !== identityAtStart) return;
      onChange(uploadedUrl);
      setUrlInput(uploadedUrl);
      setNotice(`Uploaded and framed · ${processed.width} × ${processed.height}px · ${preset.label}.`);
    } catch (uploadError) {
      if (mounted.current && fieldIdentity.current === identityAtStart) {
        setError(uploadError instanceof Error ? uploadError.message : 'The image could not be uploaded. Please try again.');
      }
    } finally {
      if (mounted.current) setBusyState(false);
      else busyRef.current = false;
    }
  };

  const applyUrl = () => {
    if (busyRef.current) return;
    const next = urlInput.trim();
    if (!isSafeImageUrl(next)) {
      setError('Use an HTTPS image URL or a same-site image path such as /templates/13/image.webp.');
      setNotice('');
      return;
    }
    setError('');
    setNotice(next ? 'Image address applied. Save the customizer to publish this change.' : 'Template image restored.');
    setPreviewFailed(false);
    onChange(next);
  };

  const restoreTemplateImage = () => {
    if (busyRef.current) return;
    setUrlInput('');
    setError('');
    setPreviewFailed(false);
    setNotice('Template image restored. Save the customizer to publish this change.');
    onChange('');
  };

  return (
    <div className={`tif-field${compact ? ' tif-field--compact' : ''}`} aria-busy={busy}>
      <div className="tif-context" aria-label={`Editing ${templateName}, ${sectionLabel}`}>
        <span className="tif-context-number">TEMPLATE {templateNumber}</span>
        <div className="tif-context-copy">
          <strong>{templateName}</strong>
          <span>{categoryName} · {templateId}</span>
        </div>
        <span className="tif-context-section">{sectionLabel}</span>
      </div>

      <div className="tif-field-heading">
        <label htmlFor={`${id}-url`}>{sectionLabel} image</label>
        <span>{preset.label}</span>
      </div>
      <div className="tif-frame" data-frame={frame} style={{ aspectRatio: String(preset.ratio) }}>
        {previewUrl && !previewFailed ? (
          <img
            src={previewUrl}
            alt={`${sectionLabel} preview for ${templateName}`}
            loading="lazy"
            decoding="async"
            onError={() => setPreviewFailed(true)}
            onLoad={() => setPreviewFailed(false)}
          />
        ) : (
          <div className="tif-frame-empty" role="status">
            {previewFailed ? 'Image preview could not be loaded' : 'No image selected'}
          </div>
        )}
        {busy ? <div className="tif-upload-overlay" role="status"><span className="tif-spinner" aria-hidden="true" />Resizing and uploading…</div> : null}
      </div>

      <div className="tif-url-row">
        <input
          id={`${id}-url`}
          type="text"
          inputMode="url"
          value={urlInput}
          disabled={busy}
          placeholder="https://… or /templates/13/image.webp"
          aria-label={`${sectionLabel} image URL`}
          onChange={(event) => { setUrlInput(event.target.value); setError(''); setNotice(''); }}
        />
        <button type="button" onClick={applyUrl} disabled={busy}>Apply URL</button>
      </div>
      <div className="tif-actions">
        <button type="button" className="tif-upload-button" disabled={busy} onClick={() => fileInput.current?.click()}>
          {busy ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
        </button>
        {templateValue && value ? (
          <button type="button" className="tif-restore-button" disabled={busy} onClick={restoreTemplateImage}>Use template image</button>
        ) : null}
        <input
          ref={fileInput}
          id={`${id}-file`}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={busy}
          className="tif-sr-only"
          onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void handleFile(file); }}
        />
      </div>
      {hint ? <p className="tif-hint">{hint}</p> : null}
      {error ? <p className="tif-error" role="alert">{error}</p> : null}
      {notice ? <p className="tif-notice" role="status">{notice}</p> : null}
      <p className="tif-hint">JPG, PNG, WebP or AVIF · up to 20 MB before processing. Images are cropped and resized to this frame, then uploaded to Supabase.</p>
    </div>
  );
}

export default TemplateImageField;

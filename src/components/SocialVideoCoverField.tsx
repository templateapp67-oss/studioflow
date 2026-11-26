import React, { useEffect, useRef, useState } from 'react';
import { secureMediaUrl } from '../lib/socialVideoSource';

/**
 * Step 06 — cover image field for the Add Social Video modal.
 *
 * The owner can either paste an https image URL or upload a file. Uploads are
 * stored in the Supabase `studioflow-media` bucket by `uploadSalonImage()` at
 * save time (same JPG/PNG/WebP · 5 MB contract), while this component keeps a
 * local object URL so the thumbnail preview is instant and works offline.
 */
export type SocialVideoCoverMode = 'url' | 'upload';

export const COVER_ACCEPT = 'image/jpeg,image/png,image/webp';
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export interface SocialVideoCoverFieldProps {
  mode: SocialVideoCoverMode;
  onModeChange: (mode: SocialVideoCoverMode) => void;
  url: string;
  onUrlChange: (url: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Cover already saved on the video, previewed until a new one is picked. */
  fallbackUrl?: string;
  error?: string | null;
  disabled?: boolean;
}

export const SocialVideoCoverField: React.FC<SocialVideoCoverFieldProps> = ({
  mode,
  onModeChange,
  url,
  onUrlChange,
  file,
  onFileChange,
  fallbackUrl = '',
  error,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [objectUrl, setObjectUrl] = useState('');

  // Instant preview for the picked file; revoked when it changes or unmounts.
  useEffect(() => {
    if (!file || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      setObjectUrl('');
      return;
    }
    const next = URL.createObjectURL(file);
    setObjectUrl(next);
    return () => {
      if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(next);
    };
  }, [file]);

  const acceptFile = (next: File | null | undefined) => {
    if (!next) {
      setLocalError(null);
      onFileChange(null);
      return;
    }
    if (!COVER_TYPES.includes(next.type)) {
      setLocalError('Use a JPG, PNG or WebP image for the cover.');
      onFileChange(null);
      return;
    }
    if (next.size > COVER_MAX_BYTES) {
      setLocalError(`Cover images must be 5 MB or smaller (this one is ${formatBytes(next.size)}).`);
      onFileChange(null);
      return;
    }
    setLocalError(null);
    onFileChange(next);
  };

  const urlPreview = secureMediaUrl(url);
  const preview = mode === 'upload' ? objectUrl || secureMediaUrl(fallbackUrl) : urlPreview || secureMediaUrl(fallbackUrl);
  const shownError = error || localError;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/50 p-3.5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase font-mono-caps">
          Cover Image <span className="text-gray-400 dark:text-slate-500 font-medium normal-case">(Optional)</span>
        </span>
        <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
          9:16 preferred
        </span>
      </div>

      <div
        role="group"
        aria-label="Cover image source"
        className="grid grid-cols-2 gap-1.5 p-1 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
      >
        <button
          type="button"
          aria-pressed={mode === 'url'}
          disabled={disabled}
          onClick={() => { setLocalError(null); onModeChange('url'); }}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer disabled:opacity-60 ${
            mode === 'url'
              ? 'bg-[#b0004a] text-white shadow-xs'
              : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-sm">link</span>
          Paste URL
        </button>
        <button
          type="button"
          aria-pressed={mode === 'upload'}
          disabled={disabled}
          onClick={() => { setLocalError(null); onModeChange('upload'); }}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer disabled:opacity-60 ${
            mode === 'upload'
              ? 'bg-[#b0004a] text-white shadow-xs'
              : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-sm">upload</span>
          Upload File
        </button>
      </div>

      {mode === 'url' ? (
        <input
          type="url"
          value={url}
          disabled={disabled}
          onChange={(e) => { setLocalError(null); onUrlChange(e.target.value); }}
          placeholder="https://your-site.com/reel-cover.jpg"
          aria-label="Cover image URL"
          className="w-full text-xs font-mono p-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-[#b0004a] focus:outline-none"
        />
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (!disabled) acceptFile(e.dataTransfer?.files?.[0]);
          }}
          className={`flex items-center gap-3 rounded-xl border-2 border-dashed px-3 py-3 transition-colors ${
            isDragging
              ? 'border-[#b0004a] bg-rose-50 dark:bg-rose-950/20'
              : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={COVER_ACCEPT}
            disabled={disabled}
            aria-label="Choose cover image file"
            onChange={(e) => {
              acceptFile(e.target.files?.[0]);
              e.target.value = '';
            }}
            className="sr-only"
          />
          <span className="material-symbols-outlined text-[#b0004a] text-xl shrink-0">add_photo_alternate</span>
          <div className="min-w-0 flex-1 text-[11px] leading-relaxed text-gray-600 dark:text-slate-300">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="font-bold text-[#b0004a] hover:underline cursor-pointer disabled:opacity-60"
            >
              Choose file
            </button>
            <span> or drag &amp; drop — JPG, PNG or WebP up to 5 MB.</span>
            {file && (
              <div className="mt-1 font-mono text-[10px] text-gray-500 dark:text-slate-400 truncate">
                {file.name} · {formatBytes(file.size)}
              </div>
            )}
          </div>
          {file && (
            <button
              type="button"
              onClick={() => acceptFile(null)}
              className="text-[10px] font-bold text-gray-500 dark:text-slate-400 hover:text-rose-600 shrink-0 cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>
      )}

      {preview ? (
        <div className="flex items-center gap-3">
          <img
            src={preview}
            alt="Cover image preview"
            className="h-24 w-[54px] shrink-0 rounded-lg object-cover border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800"
          />
          <p className="text-[10.5px] leading-relaxed text-gray-500 dark:text-slate-400">
            <span className="block font-bold text-gray-700 dark:text-slate-200">Thumbnail preview</span>
            {mode === 'upload' && file
              ? 'Saved to your media library when you tap Save.'
              : 'Loaded from the image URL.'}
          </p>
        </div>
      ) : (
        <p className="text-[10.5px] leading-relaxed text-gray-500 dark:text-slate-400">
          No cover yet — without one we use the YouTube thumbnail (for Shorts) or your salon cover photo.
        </p>
      )}

      {shownError && (
        <p role="alert" className="text-[11px] font-medium text-rose-700 dark:text-rose-400 flex items-start gap-1.5">
          <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-sm leading-4">error</span>
          <span>{shownError}</span>
        </p>
      )}
    </div>
  );
};

export default SocialVideoCoverField;

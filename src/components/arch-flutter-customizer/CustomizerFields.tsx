import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, GripVertical, Image as ImageIcon, Link2, RotateCcw, Trash2, Upload, X } from 'lucide-react';

import { uploadSalonImage } from '../../lib/supabase';
import {
  CROP_PRESETS,
  SAMPLE_IMAGES,
  centerCrop,
  processImageFile,
  sampleImagesFor,
  validateImageFile,
  type ArchFlutterCropShape,
  type CropBox,
} from '../../lib/archFlutterCustomizer';

/* ------------------------------------------------------------------ *
 * Small field primitives — Indian English labels and hints throughout
 * ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  wide,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
  wide?: boolean;
}) {
  return (
    <label className="afc-field" style={wide ? { gridColumn: '1 / -1' } : undefined} htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
      {error ? (
        <span className="afc-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="afc-hint">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  maxLength,
  type = 'text',
  wide,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
  maxLength?: number;
  type?: 'text' | 'email' | 'tel' | 'url' | 'date' | 'time';
  wide?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} wide={wide}>
      <input
        id={id}
        className="afc-input"
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  hint,
  error,
  rows = 3,
  maxLength,
  wide,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  rows?: number;
  maxLength?: number;
  wide?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} wide={wide}>
      <textarea
        id={id}
        className="afc-textarea"
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  error,
  min = 0,
  max = 10_000_000,
  step = 1,
  prefix,
  wide,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  wide?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(String(Number.isFinite(value) ? value : ''));
  useEffect(() => {
    setText((current) => (Number(current) === value ? current : String(Number.isFinite(value) ? value : '')));
  }, [value]);
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} wide={wide}>
      <span className="afc-input-row">
        {prefix && <span className="afc-prefix">{prefix}</span>}
        <input
          id={id}
          className="afc-input"
          type="number"
          inputMode="decimal"
          value={text}
          min={min}
          max={max}
          step={step}
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            setText(event.target.value);
            const next = Number(event.target.value);
            if (event.target.value !== '' && Number.isFinite(next)) onChange(next);
          }}
          onBlur={() => {
            const next = Number(text);
            if (!Number.isFinite(next)) {
              setText(String(value));
              return;
            }
            const clamped = Math.min(max, Math.max(min, next));
            setText(String(clamped));
            onChange(clamped);
          }}
        />
      </span>
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  error,
  wide,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  hint?: string;
  error?: string;
  wide?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} wide={wide}>
      <select id={id} className="afc-select" value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="afc-toggle"
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      title={hint}
    >
      <span className="afc-toggle-dot" aria-hidden="true" />
      <span>
        <b style={{ display: 'block', fontSize: '0.84rem' }}>{label}</b>
        {hint && <span className="afc-hint">{hint}</span>}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Image field: upload → crop (arch / square / 9:16 / wide) → WebP
 * ------------------------------------------------------------------ */

export interface ImageFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** Which bundled artwork the "sample image" buttons offer. */
  sampleSlot?: keyof typeof SAMPLE_IMAGES | string;
  /** Default crop shape offered first. */
  shape?: ArchFlutterCropShape;
  hint?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export function ImageField({
  label,
  value,
  onChange,
  sampleSlot = 'gallery',
  shape = 'arch',
  hint,
  allowEmpty = true,
  emptyLabel = 'No image yet — the template artwork shows instead.',
}: ImageFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const samples = useMemo(() => sampleImagesFor(sampleSlot), [sampleSlot]);

  const runUpload = useCallback(
    async (file: File, crop: CropBox | null, ratio: number | null) => {
      setBusy(true);
      setError('');
      setMessage('');
      try {
        const processed = await processImageFile(file, { crop, ratio });
        const url = await uploadSalonImage(processed.file);
        onChange(url);
        setMessage(
          `Saved. ${processed.width}×${processed.height}px, ${processed.sizeKb} KB${processed.webp ? ', WebP' : ''}.`,
        );
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : 'That image could not be uploaded. Please try again.');
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  const pick = (file?: File | null) => {
    const problem = validateImageFile(file);
    if (problem || !file) {
      setError(problem || 'Please choose an image file.');
      return;
    }
    setError('');
    setMessage('');
    setPendingFile(file);
  };

  return (
    <div className="afc-image-field">
      <Field label={label} hint={hint} error={error} htmlFor={id}>
        <div className="afc-image-preview" data-shape={shape}>
          {value ? (
            <img src={value} alt={`${label} preview`} loading="lazy" decoding="async" />
          ) : (
            <span className="afc-hint" style={{ padding: 12, textAlign: 'center' }}>
              <ImageIcon size={18} aria-hidden="true" style={{ display: 'block', margin: '0 auto 6px' }} />
              {emptyLabel}
            </span>
          )}
        </div>
        <input
          id={id}
          className="afc-input"
          type="url"
          inputMode="url"
          value={value}
          placeholder="https://… or /templates/13/art/lash.svg"
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="afc-image-actions">
          <button type="button" className="afc-btn afc-btn-sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Upload size={13} aria-hidden="true" /> {busy ? 'Working…' : 'Upload photo'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={(event) => {
              pick(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
          {samples.length > 0 && (
            <details className="afc-btn afc-btn-sm afc-btn-ghost" style={{ cursor: 'pointer' }}>
              <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ImageIcon size={13} aria-hidden="true" /> Replace with sample image
              </summary>
              <div className="afc-sample-list" style={{ marginTop: 8 }}>
                {samples.map((sample) => (
                  <button
                    key={sample.url}
                    type="button"
                    className="afc-sample"
                    onClick={() => {
                      onChange(sample.url);
                      setMessage(`Sample artwork applied: ${sample.label}.`);
                    }}
                  >
                    <img src={sample.url} alt="" loading="lazy" decoding="async" />
                    <span>{sample.label}</span>
                  </button>
                ))}
              </div>
            </details>
          )}
          {allowEmpty && value && (
            <button
              type="button"
              className="afc-btn afc-btn-sm afc-btn-ghost"
              onClick={() => {
                onChange('');
                setMessage('Image removed. The template artwork will show instead.');
              }}
            >
              <X size={13} aria-hidden="true" /> Remove
            </button>
          )}
        </div>
        {message && (
          <p className="afc-hint" role="status" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Check size={13} aria-hidden="true" /> {message}
          </p>
        )}
      </Field>

      {pendingFile && (
        <CropDialog
          file={pendingFile}
          defaultShape={shape}
          onCancel={() => setPendingFile(null)}
          onApply={async (crop, ratio) => {
            setPendingFile(null);
            await runUpload(pendingFile, crop, ratio);
          }}
        />
      )}
    </div>
  );
}

/** Crop + compress dialog: shape presets, zoom, position and pointer drag. */
export function CropDialog({
  file,
  defaultShape,
  onCancel,
  onApply,
}: {
  file: File;
  defaultShape: ArchFlutterCropShape;
  onCancel: () => void;
  onApply: (crop: CropBox | null, ratio: number | null) => Promise<void> | void;
}) {
  const [shape, setShape] = useState<ArchFlutterCropShape>(defaultShape);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const preset = CROP_PRESETS.find((entry) => entry.id === shape) || CROP_PRESETS[0];

  useEffect(() => {
    let active = true;
    const url = URL.createObjectURL(file);
    const element = new Image();
    element.onload = () => {
      if (!active) return;
      setImage(element);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    element.onerror = () => active && setError('That image could not be opened. Please choose another file.');
    element.src = url;
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const box = useMemo<CropBox | null>(() => {
    if (!image) return null;
    const base = centerCrop(image.naturalWidth, image.naturalHeight, preset.ratio);
    const width = Math.max(1, Math.round(base.width / zoom));
    const height = Math.max(1, Math.round(base.height / zoom));
    const maxX = image.naturalWidth - width;
    const maxY = image.naturalHeight - height;
    const x = Math.min(maxX, Math.max(0, Math.round(base.x + (maxX / 2) * offset.x)));
    const y = Math.min(maxY, Math.max(0, Math.round(base.y + (maxY / 2) * offset.y)));
    return { x, y, width, height };
  }, [image, preset.ratio, zoom, offset]);

  /* Live preview of the crop on a canvas. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || !box) return;
    const scale = Math.min(1, 480 / box.width);
    canvas.width = Math.max(1, Math.round(box.width * scale));
    canvas.height = Math.max(1, Math.round(box.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, box.x, box.y, box.width, box.height, 0, 0, canvas.width, canvas.height);
  }, [image, box]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const nudge = (dx: number, dy: number) =>
    setOffset((current) => ({
      x: Math.min(1, Math.max(-1, current.x + dx)),
      y: Math.min(1, Math.max(-1, current.y + dy)),
    }));

  return (
    <div className="afc-crop-modal" role="dialog" aria-modal="true" aria-label="Crop and compress your photo">
      <div className="afc-crop-panel">
        <div className="afc-card-head">
          <strong className="afc-card-title">Crop your photo</strong>
          <span className="afc-chip">{preset.label}</span>
          <span className="afc-spacer" />
          <button type="button" className="afc-btn afc-btn-sm afc-icon-btn" onClick={onCancel} aria-label="Close crop dialog">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
        <p className="afc-hint">{preset.hint} The photo is compressed to WebP before it is uploaded.</p>
        <div className="afc-crop-strip" role="group" aria-label="Crop shape">
          {CROP_PRESETS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="afc-btn afc-btn-sm"
              aria-pressed={entry.id === shape}
              onClick={() => {
                setShape(entry.id);
                setOffset({ x: 0, y: 0 });
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <canvas
          ref={canvasRef}
          className="afc-crop-canvas"
          aria-label="Crop preview"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            const canvas = canvasRef.current;
            if (!drag || !canvas || !box) return;
            const dx = ((event.clientX - drag.x) / canvas.width) * -2;
            const dy = ((event.clientY - drag.y) / canvas.height) * -2;
            setOffset({
              x: Math.min(1, Math.max(-1, drag.ox + dx)),
              y: Math.min(1, Math.max(-1, drag.oy + dy)),
            });
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
        />
        <div className="afc-grid">
          <Field label="Zoom" hint="Drag the preview or use the slider to reposition the crop.">
            <input
              className="afc-input"
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </Field>
          <div className="afc-row-actions" style={{ alignSelf: 'end' }}>
            <button type="button" className="afc-btn afc-btn-sm" onClick={() => nudge(0, -0.2)} aria-label="Move crop up">
              ↑ Up
            </button>
            <button type="button" className="afc-btn afc-btn-sm" onClick={() => nudge(0, 0.2)} aria-label="Move crop down">
              ↓ Down
            </button>
            <button type="button" className="afc-btn afc-btn-sm" onClick={() => nudge(-0.2, 0)} aria-label="Move crop left">
              ← Left
            </button>
            <button type="button" className="afc-btn afc-btn-sm" onClick={() => nudge(0.2, 0)} aria-label="Move crop right">
              → Right
            </button>
            <button type="button" className="afc-btn afc-btn-sm afc-btn-ghost" onClick={() => { setOffset({ x: 0, y: 0 }); setZoom(1); }} aria-label="Reset crop">
              <RotateCcw size={13} aria-hidden="true" /> Reset
            </button>
          </div>
        </div>
        {box && (
          <p className="afc-hint" role="status">
            Crop: {box.width}×{box.height}px from a {image?.naturalWidth}×{image?.naturalHeight}px photo.
          </p>
        )}
        {error && <p className="afc-error" role="alert">{error}</p>}
        <div className="afc-row-actions">
          <button
            type="button"
            className="afc-btn afc-btn-primary"
            disabled={!box || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onApply(preset.ratio ? box : null, preset.ratio);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Cropping and uploading…' : 'Apply crop & upload'}
          </button>
          <button type="button" className="afc-btn afc-btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * List cards, row actions, notices
 * ------------------------------------------------------------------ */

export function Card({
  title,
  chips,
  actions,
  children,
  thumb,
}: {
  title?: React.ReactNode;
  chips?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  thumb?: string;
}) {
  return (
    <div className="afc-card">
      {(title || chips || actions || thumb) && (
        <div className="afc-card-head">
          {thumb && <img className="afc-thumb" src={thumb} alt="" loading="lazy" decoding="async" />}
          {title && <strong className="afc-card-title">{title}</strong>}
          {chips}
          <span className="afc-spacer" />
          {actions && <span className="afc-row-actions">{actions}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

export function MoveButtons({
  index,
  total,
  onMove,
  label,
}: {
  index: number;
  total: number;
  onMove: (to: number) => void;
  label: string;
}) {
  return (
    <>
      <button type="button" className="afc-btn afc-btn-sm afc-btn-ghost" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Move ${label} up`}>
        ↑
      </button>
      <button
        type="button"
        className="afc-btn afc-btn-sm afc-btn-ghost"
        disabled={index >= total - 1}
        onClick={() => onMove(index + 1)}
        aria-label={`Move ${label} down`}
      >
        ↓
      </button>
    </>
  );
}

export function DeleteButton({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <button type="button" className="afc-btn afc-btn-sm afc-btn-ghost" onClick={onDelete} aria-label={`Delete ${label}`}>
      <Trash2 size={13} aria-hidden="true" /> Delete
    </button>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="afc-btn afc-btn-gold" onClick={onClick}>
      {label}
    </button>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="afc-empty">{children}</p>;
}

export function Notice({
  tone = 'info',
  children,
  actions,
}: {
  tone?: 'info' | 'error' | 'success';
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="afc-notice" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {tone === 'error' ? <AlertTriangle size={15} aria-hidden="true" style={{ flex: '0 0 auto', marginTop: 2 }} /> : <Link2 size={15} aria-hidden="true" style={{ flex: '0 0 auto', marginTop: 2 }} />}
        <span>{children}</span>
      </span>
      {actions && <div className="afc-notice-actions">{actions}</div>}
    </div>
  );
}

export function Grip({ label }: { label: string }) {
  return (
    <span className="afc-section-grip" aria-hidden="true" title={`Drag to reorder ${label}`}>
      <GripVertical size={16} />
    </span>
  );
}

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Check, ImagePlus, Link2, Loader2, RotateCcw, Upload, X } from 'lucide-react';
import { vedaPresetFor, VEDA_IMAGE_PRESETS, type VedaImagePreset } from '../../lib/vedaSanjeevaniCustomizer';
import { vedaImage } from '../../lib/vedaSanjeevani';
import { optimizeVedaImage, uploadVedaImage, vedaOptimizerNote, vedaReadableBytes, vedaUploadProblem, type VedaFocalPoint, type VedaOptimizedImage } from '../../lib/vedaImageOptimizer';

export type VedaImageFieldProps = {
  label: string;
  /** Image slot used for the bundled template photo + alt text. */
  slot: string;
  value?: string;
  onChange: (url: string) => void;
  presetId?: string;
  hint?: string;
  /** Renders the file input with a smaller thumbnail (used inside long lists). */
  compact?: boolean;
  /** The template's own photo, offered as "use the template photo". */
  templateValue?: string;
  onBusyChange?: (busy: boolean) => void;
};

const FOCAL_POSITIONS: Array<{ id: string; x: number; y: number; label: string }> = [
  { id: 'tl', x: 0, y: 0, label: 'Top left' },
  { id: 'tc', x: 0.5, y: 0, label: 'Top centre' },
  { id: 'tr', x: 1, y: 0, label: 'Top right' },
  { id: 'ml', x: 0, y: 0.5, label: 'Middle left' },
  { id: 'mc', x: 0.5, y: 0.5, label: 'Centre' },
  { id: 'mr', x: 1, y: 0.5, label: 'Middle right' },
  { id: 'bl', x: 0, y: 1, label: 'Bottom left' },
  { id: 'bc', x: 0.5, y: 1, label: 'Bottom centre' },
  { id: 'br', x: 1, y: 1, label: 'Bottom right' },
];

/**
 * One image slot in the customizer.
 *
 * Uploads run through the shared optimiser (crop to the slot's ratio → resize to
 * the preset width → compress → store), so an owner never has to think about
 * pixels. Progress, the size before/after and every failure are shown inline —
 * no silent failures, no stretched photos.
 */
export function VedaImageField({
  label,
  slot,
  value,
  onChange,
  presetId,
  hint,
  compact = false,
  templateValue,
  onBusyChange,
}: VedaImageFieldProps) {
  const preset: VedaImagePreset = useMemo(() => {
    if (presetId) return VEDA_IMAGE_PRESETS.find((entry) => entry.id === presetId) || vedaPresetFor(slot);
    return vedaPresetFor(slot);
  }, [presetId, slot]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [focal, setFocal] = useState<VedaFocalPoint>({ x: 0.5, y: 0.5 });
  const [showFocal, setShowFocal] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [showUrl, setShowUrl] = useState(false);

  const markBusy = useCallback(
    (next: boolean) => {
      setBusy(next);
      onBusyChange?.(next);
    },
    [onBusyChange],
  );

  const preview = (value || '').trim() || templateValue || vedaImage(slot);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setDone('');
    const problem = vedaUploadProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    markBusy(true);
    try {
      setStage('Reading the photo');
      const optimized: VedaOptimizedImage = await optimizeVedaImage(file, preset.id, {
        focal,
        onProgress: (percent, label) => setStage(`${label} · ${percent}%`),
      });
      setStage('Uploading');
      const url = await uploadVedaImage(optimized);
      onChange(url);
      setDone(`${vedaReadableBytes(optimized.originalBytes)} in → ${vedaReadableBytes(optimized.outputBytes)} out · ${optimized.width}×${optimized.height}`);
      setStage('');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The photo could not be uploaded. Please try another file.');
    } finally {
      setStage('');
      markBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const applyManualUrl = () => {
    const url = manualUrl.trim();
    if (!/^https:\/\//i.test(url) && !url.startsWith('/templates/')) {
      setError('Paste a full https:// image address, or upload the file instead.');
      return;
    }
    setError('');
    setDone('Linked photo saved. Check it on the preview before publishing.');
    onChange(url);
    setManualUrl('');
    setShowUrl(false);
  };

  return (
    <div className={`vdc-imagefield${compact ? ' vdc-imagefield--compact' : ''}`}>
      <div className="vdc-imagefield__head">
        <span className="vdc-label">{label}</span>
        <span className="vdc-hint">{preset.ratioLabel} · {preset.label}</span>
      </div>

      <div className="vdc-imagefield__body">
        <div className="vdc-imagefield__thumb" style={{ aspectRatio: preset.ratio }}>
          <img src={preview} alt={`${label} preview`} loading="lazy" />
          {busy ? (
            <div className="vdc-imagefield__busy">
              <Loader2 size={18} className="vdc-spin" aria-hidden="true" />
              <span>{stage || 'Working'}</span>
            </div>
          ) : null}
        </div>

        <div className="vdc-imagefield__controls">
          <div className="vdc-row vdc-row--wrap">
            <label className="vdc-btn">
              <Upload size={14} aria-hidden="true" /> {value ? 'Replace photo' : 'Upload photo'}
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="vdc-sr"
                style={{ display: 'none' }}
                disabled={busy}
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
            </label>
            <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => setShowFocal((open) => !open)} aria-expanded={showFocal}>
              <ImagePlus size={14} aria-hidden="true" /> Crop focus
            </button>
            <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => setShowUrl((open) => !open)} aria-expanded={showUrl}>
              <Link2 size={14} aria-hidden="true" /> Use a link
            </button>
            {value ? (
              <button
                type="button"
                className="vdc-btn vdc-btn--quiet"
                onClick={() => {
                  onChange('');
                  setDone('Template photo restored.');
                  setError('');
                }}
              >
                <RotateCcw size={14} aria-hidden="true" /> Template photo
              </button>
            ) : null}
          </div>

          {showFocal ? (
            <div className="vdc-row vdc-row--wrap" style={{ gap: 10 }}>
              <div className="vdc-focal" role="group" aria-label={`${label} crop focus`}>
                {FOCAL_POSITIONS.map((position) => (
                  <button
                    key={position.id}
                    type="button"
                    title={position.label}
                    aria-label={position.label}
                    aria-pressed={focal.x === position.x && focal.y === position.y}
                    className={focal.x === position.x && focal.y === position.y ? 'is-active' : ''}
                    onClick={() => setFocal({ x: position.x, y: position.y })}
                  />
                ))}
              </div>
              <span className="vdc-hint">Pick what must stay in frame. Applies to the next upload.</span>
            </div>
          ) : null}

          {showUrl ? (
            <div className="vdc-row vdc-row--wrap">
              <input
                className="vdc-input"
                style={{ flex: '1 1 200px' }}
                value={manualUrl}
                onChange={(event) => setManualUrl(event.target.value)}
                placeholder="https://…/photo.jpg"
                aria-label={`${label} image address`}
                inputMode="url"
              />
              <button type="button" className="vdc-btn" onClick={applyManualUrl}>Use this address</button>
            </div>
          ) : null}

          {hint ? <span className="vdc-hint">{hint}</span> : null}
          {done ? <span className="vdc-hint vdc-hint--ok"><Check size={13} aria-hidden="true" /> {done}</span> : null}
          {error ? (
            <span className="vdc-error" role="alert">
              <AlertIcon /> {error}
              <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => setError('')} aria-label="Dismiss message"><X size={13} aria-hidden="true" /></button>
            </span>
          ) : null}
          <span className="vdc-hint vdc-hint--muted">{vedaOptimizerNote(preset)}</span>
        </div>
      </div>
    </div>
  );
}

function AlertIcon() {
  return <span aria-hidden="true" style={{ fontWeight: 800 }}>!</span>;
}

export default VedaImageField;

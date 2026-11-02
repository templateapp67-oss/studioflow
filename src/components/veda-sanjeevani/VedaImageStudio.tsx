import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, ImagePlus, Info, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { VEDA_IMAGE_PROMPTS, VEDA_IMAGE_TOOLS, vedaImage } from '../../lib/vedaSanjeevani';
import {
  requestVedaAiContent,
  requestVedaAiImage,
  vedaDataUrlFile,
  type VedaImageTarget,
} from '../../lib/vedaSanjeevaniCustomizer';
import type { VedaAiDetails } from '../../lib/vedaSanjeevaniAi';
import { optimizeVedaImage, uploadVedaImage, vedaReadableBytes, vedaUploadProblem } from '../../lib/vedaImageOptimizer';

/** Prompt category → the bundled photo used as its thumbnail. */
const PROMPT_SLOT: Record<string, string> = {
  hero: 'hero',
  abhyanga: 'abhyanga',
  shirodhara: 'shirodhara',
  herbal: 'potli',
  interior: 'sanctuary',
  therapist: 'ritual-hero',
  package: 'ritual',
  room: 'sanctuary-alt',
  oils: 'ingredients',
  banner: 'promo-banner',
  about: 'sanctuary-alt',
  panchakarma: 'consultation',
  potli: 'potli',
  kizhi: 'kizhi',
  udvartana: 'udvartana',
  pizhichil: 'pizhichil',
  head: 'head-massage',
  reflexology: 'reflexology',
  steam: 'steam',
  couple: 'couple-suite',
  'treatment-room': 'treatment-room',
  'gift-card': 'gift-voucher',
  testimonial: 'ingredients',
  gallery: 'treatment-room',
};

export type VedaImageStudioProps = {
  /** Jump to the Photos tab so a photo can be uploaded by hand. */
  onUsePhoto?: () => void;
  /** Every image on the public site, so a generated photo can be placed. */
  targets?: VedaImageTarget[];
  /** Stores an accepted image on the chosen target. */
  onApplyImage?: (url: string, targetId: string) => void;
  /** Told when an upload/generation is in flight so the customizer can block Save. */
  onBusyChange?: (busy: boolean) => void;
  /** Business details used to write prompts for the owner's own therapies. */
  aiDetails?: VedaAiDetails;
};

type Generated = { promptId: string; dataUrl: string; url?: string; note: string };

/**
 * AI Image Studio.
 *
 * Three real paths to a better photo, all ending in the same optimiser + storage
 * pipeline: generate on the server (existing Gemini endpoint), make it in an
 * external tool with a copied prompt, or upload your own file here. Whatever is
 * accepted is cropped to the destination's shape, compressed, stored, and
 * written straight into the website configuration.
 */
export function VedaImageStudio({ onUsePhoto, targets = [], onApplyImage, onBusyChange, aiDetails }: VedaImageStudioProps) {
  const [copied, setCopied] = useState('');
  const [copyError, setCopyError] = useState('');
  const [section, setSection] = useState('All');
  const [targetId, setTargetId] = useState(targets[0]?.id || '');
  const [busyId, setBusyId] = useState('');
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadFor, setUploadFor] = useState<string>('');
  const [customPrompts, setCustomPrompts] = useState<Array<{ id: string; label: string; prompt: string }>>([]);
  const [promptNote, setPromptNote] = useState('');

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(''), 2800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!targets.length) return;
    // Keep a valid destination selected when the catalogue changes.
    setTargetId((current) => (targets.some((target) => target.id === current) ? current : targets[0].id));
  }, [targets]);

  const groups = useMemo(() => ['All', ...Array.from(new Set(VEDA_IMAGE_PROMPTS.map((prompt) => prompt.section)))], []);
  const visiblePrompts = useMemo(
    () => (section === 'All' ? VEDA_IMAGE_PROMPTS : VEDA_IMAGE_PROMPTS.filter((prompt) => prompt.section === section)),
    [section],
  );
  const target = targets.find((item) => item.id === targetId);

  const markBusy = useCallback(
    (id: string) => {
      setBusyId(id);
      onBusyChange?.(Boolean(id));
    },
    [onBusyChange],
  );

  const copyPrompt = useCallback(async (id: string, prompt: string) => {
    setCopyError('');
    setNotice('');
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(id);
    } catch {
      setCopied('');
      setCopyError('Your browser blocked clipboard access. Select the prompt text below and copy it manually.');
    }
  }, []);

  /** Store a generated/uploaded image on the destination the owner picked. */
  const storeImage = useCallback(
    async (source: File, presetId: string, label: string, id: string) => {
      markBusy(id);
      setError('');
      setNotice('');
      try {
        const optimized = await optimizeVedaImage(source, presetId, {
          onProgress: (percent, stage) => setNotice(`${stage} · ${percent}%`),
        });
        const url = await uploadVedaImage(optimized);
        if (!onApplyImage) {
          setNotice('Photo optimised. Open the Photos tab to place it in a slot.');
          return;
        }
        if (!targetId) {
          setNotice('Choose where this photo should go, then press Use photo again.');
          return;
        }
        onApplyImage(url, targetId);
        setNotice(
          `${label} saved to ${target?.label || 'your website'} · ${vedaReadableBytes(optimized.outputBytes)} · ${optimized.width}×${optimized.height}. It shows in the preview immediately.`,
        );
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : 'The photo could not be stored. Please try another file.');
      } finally {
        markBusy('');
      }
    },
    [markBusy, onApplyImage, target?.label, targetId],
  );

  const generate = useCallback(
    async (promptId: string, promptText: string, ratio: string) => {
      markBusy(`gen:${promptId}`);
      setError('');
      setNotice('Asking the server for a new photograph…');
      try {
        const result = await requestVedaAiImage(promptText, ratio);
        if (!result.ok) {
          setNotice('');
          setGenerated(null);
          setError(result.reason);
          return;
        }
        setGenerated({ promptId, dataUrl: result.dataUrl, note: 'Generated on your server. Press “Use this photo” to crop, compress and place it.' });
        setNotice('Image ready. Preview it, then place it on the website.');
      } catch (generationError) {
        setError(generationError instanceof Error ? generationError.message : 'The image could not be generated.');
      } finally {
        markBusy('');
      }
    },
    [markBusy],
  );

  const acceptGenerated = useCallback(async () => {
    if (!generated) return;
    try {
      const file = vedaDataUrlFile(generated.dataUrl, `veda-${generated.promptId}`);
      const problem = vedaUploadProblem(file);
      if (problem) {
        setError(problem);
        return;
      }
      await storeImage(file, target?.preset || 'services', 'Generated photo', `save:${generated.promptId}`);
      setGenerated(null);
    } catch (conversionError) {
      setError(conversionError instanceof Error ? conversionError.message : 'The generated image could not be read.');
    }
  }, [generated, storeImage, target?.preset]);

  const pickUpload = (promptId: string) => {
    setUploadFor(promptId);
    setError('');
    fileRef.current?.click();
  };

  const onFileChosen = async (file: File | undefined) => {
    if (!file) return;
    const problem = vedaUploadProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    await storeImage(file, target?.preset || 'services', 'Your photo', `up:${uploadFor}`);
  };

  const writePrompts = useCallback(async () => {
    if (!aiDetails) {
      setError('Add your business details first, then generate prompts for your own therapies.');
      return;
    }
    markBusy('prompts');
    setError('');
    setPromptNote('Writing prompts for your therapies…');
    try {
      const result = await requestVedaAiContent('imagePrompts', aiDetails);
      const items = (result.content.imagePrompts || []).filter((item) => item.prompt);
      setCustomPrompts(
        items.map((item, index) => ({
          id: item.id || `custom-${index}`,
          label: item.label || `Prompt ${index + 1}`,
          prompt: item.prompt || '',
        })),
      );
      setPromptNote(items.length ? `${items.length} prompts ready. ${result.notice}` : 'No prompts came back. Try again or use the library below.');
    } catch {
      setError('Prompts could not be written just now. The library below already works.');
      setPromptNote('');
    } finally {
      markBusy('');
    }
  }, [aiDetails, markBusy]);

  const busy = Boolean(busyId);

  return (
    <div className="vdc-panel">
      <header className="vdc-panel__head">
        <h3>AI Image Studio</h3>
        <p>
          Generate a photo, make one in ChatGPT with a ready prompt, or upload your own. Everything is cropped to the
          section’s shape, compressed and stored for you — then written straight into the website.
        </p>
      </header>

      <section className="vdc-card vdc-card--tip">
        <h4><Info size={15} aria-hidden="true" /> Where should this photo go?</h4>
        <div className="vdc-row vdc-row--wrap">
          <select
            className="vdc-input"
            style={{ flex: '1 1 240px' }}
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            aria-label="Image destination"
            disabled={!targets.length}
          >
            {targets.length ? null : <option value="">No image slots available</option>}
            {Array.from(new Set(targets.map((item) => item.group))).map((group) => (
              <optgroup label={group} key={group}>
                {targets
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
              </optgroup>
            ))}
          </select>
          <label className="vdc-btn">
            <Upload size={14} aria-hidden="true" /> Upload for this slot
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="vdc-sr"
              style={{ display: 'none' }}
              onChange={(event) => void onFileChosen(event.target.files?.[0])}
            />
          </label>
        </div>
        <p className="vdc-hint">
          {target
            ? `This photo will be cropped to the ${target.label} shape and used everywhere that image appears.`
            : 'Choose an image slot above to place a photo on the website.'}
        </p>
        {notice ? <p className="vdc-hint vdc-hint--ok" role="status"><Check size={13} aria-hidden="true" /> {notice}</p> : null}
        {error ? (
          <p className="vdc-error" role="alert">
            <span aria-hidden="true" style={{ fontWeight: 800 }}>!</span> {error}
            <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => setError('')} aria-label="Dismiss image message"><X size={13} aria-hidden="true" /></button>
          </p>
        ) : null}
        {onUsePhoto ? (
          <button type="button" className="vdc-btn vdc-btn--quiet" onClick={onUsePhoto}>
            <ImagePlus size={14} aria-hidden="true" /> Open the photo slots instead
          </button>
        ) : null}
      </section>

      <section className="vdc-card">
        <h4>Prompts written for your own therapies</h4>
        <p className="vdc-hint">
          Uses your business name, city and therapy menu. Each prompt is yours to copy, edit and reuse.
        </p>
        <div className="vdc-row vdc-row--wrap">
          <button type="button" className="vdc-btn vdc-btn--primary" onClick={() => void writePrompts()} disabled={busy}>
            {busyId === 'prompts' ? <Loader2 size={14} className="vdc-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
            {customPrompts.length ? 'Regenerate my prompts' : 'Write prompts for my therapies'}
          </button>
          {customPrompts.length ? (
            <button
              type="button"
              className="vdc-btn vdc-btn--quiet"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(customPrompts.map((item) => `${item.label}\n${item.prompt}`).join('\n\n'));
                  setCopied('custom-all');
                } catch {
                  setCopyError('Your browser blocked clipboard access. Copy each prompt below instead.');
                }
              }}
            >
              <Copy size={14} aria-hidden="true" /> {copied === 'custom-all' ? 'All copied' : 'Copy all'}
            </button>
          ) : null}
        </div>
        {promptNote ? <p className="vdc-hint vdc-hint--ok" role="status"><Check size={13} aria-hidden="true" /> {promptNote}</p> : null}
        {customPrompts.length ? (
          <ul className="vdc-tools">
            {customPrompts.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{item.label}</strong>
                  <br />
                  <span className="vdc-hint">{item.prompt}</span>
                </span>
                <span className="vdc-row">
                  <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => void copyPrompt(item.id, item.prompt)}>
                    <Copy size={13} aria-hidden="true" /> {copied === item.id ? 'Copied' : 'Copy'}
                  </button>
                  <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => void generate(item.id, item.prompt, '4:3')} disabled={busy}>
                    <Sparkles size={13} aria-hidden="true" /> Generate
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {generated ? (
        <section className="vdc-card">
          <h4>Preview before publishing</h4>
          <div className="vdc-studio-preview">
            <img src={generated.dataUrl} alt="AI generated preview" />
            <div className="vdc-row vdc-row--wrap">
              <button type="button" className="vdc-btn vdc-btn--primary" onClick={() => void acceptGenerated()} disabled={busy || !targetId}>
                {busyId.startsWith('save:') ? <Loader2 size={14} className="vdc-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                Use this photo
              </button>
              <button type="button" className="vdc-btn" onClick={() => setGenerated(null)} disabled={busy}>Discard</button>
            </div>
            <p className="vdc-hint">{generated.note}</p>
          </div>
        </section>
      ) : null}

      <section className="vdc-card">
        <h4>Image tools you can use</h4>
        <ul className="vdc-tools">
          {VEDA_IMAGE_TOOLS.map((tool) => (
            <li key={tool.id}>
              <span>
                <strong>{tool.label}</strong>
                <span className={`vdc-pill ${tool.paid ? 'vdc-pill--paid' : 'vdc-pill--free'}`}>{tool.paid ? 'Has a paid tier' : 'Free tier available'}</span>
                <br />
                <span className="vdc-hint">{tool.note}</span>
              </span>
              <a className="vdc-btn" href={tool.url} target="_blank" rel="noopener noreferrer">
                Open <ExternalLink size={13} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <p className="vdc-hint">
          “Free tier available” means you can try it at no cost today — not a promise of unlimited free use. Paid tools are
          marked so you are never surprised by a bill.
        </p>
      </section>

      <section className="vdc-card">
        <h4>Prompt library · cinematic 4K photography</h4>
        <p className="vdc-hint">Every prompt asks for photorealistic, natural light, no text and no watermarks, in the ratio this template needs.</p>
        <div className="vdc-row vdc-row--wrap" role="group" aria-label="Prompt categories">
          {groups.map((group) => (
            <button
              key={group}
              type="button"
              className={`vdc-chip${section === group ? ' is-active' : ''}`}
              aria-pressed={section === group}
              onClick={() => setSection(group)}
            >
              {group}
            </button>
          ))}
        </div>
        {copyError ? <p className="vdc-error" role="alert">{copyError}</p> : null}
        <div className="vdc-prompts">
          {visiblePrompts.map((prompt) => (
            <article className="vdc-prompt" key={prompt.id}>
              <div className="vdc-prompt__media">
                <img src={vedaImage(PROMPT_SLOT[prompt.id] || 'ritual')} alt="" loading="lazy" />
                <span className="vdc-prompt__ratio">{prompt.ratio}</span>
              </div>
              <div className="vdc-prompt__body">
                <div className="vdc-prompt__title">
                  <strong>{prompt.label}</strong>
                  <span className="vdc-hint">{prompt.section}</span>
                </div>
                <p className="vdc-prompt__text">{prompt.prompt}</p>
                <div className="vdc-row vdc-row--wrap">
                  <button
                    type="button"
                    className="vdc-btn vdc-btn--primary"
                    onClick={() => void generate(prompt.id, prompt.prompt, prompt.ratio)}
                    disabled={busy}
                  >
                    {busyId === `gen:${prompt.id}` ? <Loader2 size={14} className="vdc-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
                    {busyId === `gen:${prompt.id}` ? 'Generating…' : 'Generate with AI'}
                  </button>
                  <button type="button" className="vdc-btn" onClick={() => void copyPrompt(prompt.id, prompt.prompt)}>
                    {copied === prompt.id ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    {copied === prompt.id ? 'Prompt copied' : 'Copy prompt'}
                  </button>
                  <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => pickUpload(prompt.id)} disabled={busy}>
                    <Upload size={14} aria-hidden="true" /> Upload mine
                  </button>
                  <a className="vdc-btn vdc-btn--quiet" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">
                    Open ChatGPT <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default VedaImageStudio;

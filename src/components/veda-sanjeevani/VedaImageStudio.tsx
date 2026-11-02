import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Info, Upload } from 'lucide-react';
import { VEDA_IMAGE_PROMPTS, VEDA_IMAGE_TOOLS, vedaImage } from '../../lib/vedaSanjeevani';

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
  banner: 'oil-ritual',
};

export type VedaImageStudioProps = {
  /** Jump to the Photos tab so the generated image can be uploaded. */
  onUsePhoto?: () => void;
};

/**
 * AI Image Studio.
 *
 * A prompt library plus honest instructions: the images are made in a tool the
 * owner already has (ChatGPT and others), then uploaded here so the optimiser
 * crops and compresses them. Nothing here pretends a third-party service is
 * free, unlimited, or connected to this account.
 */
export function VedaImageStudio({ onUsePhoto }: VedaImageStudioProps) {
  const [copied, setCopied] = useState('');
  const [copyError, setCopyError] = useState('');

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(''), 2800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyPrompt = useCallback(async (id: string, prompt: string) => {
    setCopyError('');
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(id);
    } catch {
      setCopied('');
      setCopyError('Your browser blocked clipboard access. Select the prompt text below and copy it manually.');
    }
  }, []);

  return (
    <div className="vdc-panel">
      <header className="vdc-panel__head">
        <h3>AI Image Studio</h3>
        <p>
          Ready prompts written for this template. Copy one, make the image in ChatGPT or another tool you already use, then
          upload it here — it is cropped, resized and compressed automatically.
        </p>
      </header>

      <section className="vdc-card vdc-card--tip">
        <h4><Info size={15} aria-hidden="true" /> How this works</h4>
        <ol className="vdc-numbered">
          <li>Copy a prompt below.</li>
          <li>Paste it into the image tool and generate the photo.</li>
          <li>Download the image, then press <b>Upload photos</b> and drop it into the matching slot.</li>
        </ol>
        <p className="vdc-hint">
          We cannot generate images inside StudioFlow, and no third-party tool is included with your website. These tools
          change their plans often — check what your own account allows before relying on it.
        </p>
        {onUsePhoto ? (
          <button type="button" className="vdc-btn" onClick={onUsePhoto}>
            <Upload size={14} aria-hidden="true" /> Go to photos and upload
          </button>
        ) : null}
      </section>

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
        {copyError ? <p className="vdc-error" role="alert">{copyError}</p> : null}
        <div className="vdc-prompts">
          {VEDA_IMAGE_PROMPTS.map((prompt) => (
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
                  <button type="button" className="vdc-btn" onClick={() => void copyPrompt(prompt.id, prompt.prompt)}>
                    {copied === prompt.id ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    {copied === prompt.id ? 'Prompt copied' : 'Copy prompt'}
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

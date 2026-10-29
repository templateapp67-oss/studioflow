import React, {useEffect, useId, useRef, useState} from 'react';
import {uploadSalonImage} from '../lib/supabase';

/** Saves a storage URL, never a file or a data URL, into the existing profile. */
export function BrandImageField({label, value, onChange, logo = false, uploadName, hint, onBusyChange}: {
  label: string; value: string; onChange: (url: string) => void; logo?: boolean;
  uploadName?: string; hint?: string; onBusyChange?: (busy: boolean) => void;
}) {
  const id = useId();
  const [url, setUrl] = useState(value);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const uploading = useRef(false);
  const latestValue = useRef(value);
  latestValue.current = value;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setUrl(value); }, [value]);

  const upload = async (file?: File) => {
    if (!file || uploading.current) return;
    setMessage(''); setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPG, PNG or WebP image up to 5 MB.'); return;
    }
    const previousValue = latestValue.current;
    uploading.current = true; setBusy(true); onBusyChange?.(true);
    try {
      const uploaded = await uploadSalonImage(file);
      if (mounted.current && latestValue.current === previousValue) {
        onChange(uploaded); setMessage('Image uploaded. Changes save with your workspace.');
      }
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      uploading.current = false;
      if (mounted.current) { setBusy(false); onBusyChange?.(false); }
    }
  };
  const applyUrl = () => {
    if (uploading.current) return;
    const next = url.trim();
    if (next && !/^https:\/\//i.test(next) && !/^\/(template-assets|templates|assets)\//.test(next)) {
      setError('Use an HTTPS image URL or a template asset path.'); return;
    }
    setError(''); setMessage('Image URL applied. Changes save with your workspace.'); onChange(next);
  };
  return <div className="sf-brand-image-field" aria-busy={busy}>
    <label className="field-label" htmlFor={`${id}-url`}>{label} URL</label>
    {value && <img className={logo ? 'sf-brand-logo-preview' : 'sf-brand-cover-preview'} src={value} alt={`${label} preview`}/>}
    <div className="sf-brand-url-row">
      <input id={`${id}-url`} className="workspace-input" value={url} disabled={busy} onChange={e => {setUrl(e.target.value); setError(''); setMessage('');}} placeholder="https://…"/>
      <button type="button" className="secondary-action" disabled={busy} onClick={applyUrl}>Apply URL</button>
    </div>
    <label className="primary-action sf-brand-upload" htmlFor={`${id}-file`} aria-disabled={busy}>
      {busy ? 'Uploading…' : `Upload ${uploadName || (logo ? 'Logo' : 'Hero Banner')} (Max 5 MB)`}
    </label>
    <input id={`${id}-file`} className="sf-brand-file-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} aria-describedby={`${id}-help`} onChange={e => {const file = e.target.files?.[0]; e.target.value = ''; void upload(file);}}/>
    <p id={`${id}-help`} className="muted text-xs">JPG, PNG or WebP · up to 5 MB.{hint ? ` ${hint}` : logo ? ' Transparent PNG supported; proportions preserved.' : ''}</p>
    {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
    {message && <p role="status" className="muted text-sm">{message}</p>}
  </div>;
}

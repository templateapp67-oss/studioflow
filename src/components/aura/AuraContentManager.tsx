import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SalonProfile } from '../../types';
import {
  AURA_SECTIONS_EVENT as AURA_SECTION_EVENT,
  AURA_SECTION_KEYS,
  AURA_SECTION_LABELS,
  AURA_SECTION_SCHEMAS,
  AURA_TEMPLATE_ID,
  auraSafeMediaUrl,
  defaultAuraSectionDrafts,
  fetchOwnerAuraSections,
  getAuraEditableSalonId,
  getAuraValue,
  setAuraValue,
  upsertAuraSections,
  uploadAuraMedia,
  validateAuraDrafts,
  type AuraFieldSchema,
  type AuraMediaAsset,
  type AuraSectionDraft,
  type AuraSectionKey,
} from '../../lib/auraTemplateSections';
import { supabase } from '../../lib/supabase';
import './auraContentManager.css';
import { AuraImage } from './AuraImage';
import { AURA_UNISEX_IMAGES } from '../../lib/auraUnisex';

export interface AuraContentManagerProps {
  profile: SalonProfile;
  onSaved?: () => void;
  /** Test seam; the production dashboard always uses the configured browser client. */
  client?: any;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value ?? null)) as T;
const labelFor = (field: AuraFieldSchema, prefix = '') => `${prefix}${field.label}`;

function newId(prefix = 'item'): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

function defaultFieldValue(field: AuraFieldSchema): any {
  if (field.kind === 'toggle') return true;
  if (field.kind === 'number') return field.min ?? 0;
  if (field.kind === 'list') return [];
  if (field.kind === 'image' || field.kind === 'video') return {};
  if (field.kind === 'select') {
    if (field.options?.length) return field.options[0] === 'All Videos' || field.options[0] === 'All Services' ? field.options[1] || field.options[0] : field.options[0];
    return '';
  }
  if (field.path === 'id' || field.path.endsWith('Id')) return newId('aura');
  return '';
}

function defaultItem(field: AuraFieldSchema): Record<string, any> {
  const item: Record<string, any> = {};
  for (const itemField of field.itemFields || []) item[itemField.path] = defaultFieldValue(itemField);
  return item;
}

function collectPreviewMedia(value: unknown, output: AuraMediaAsset[] = []): AuraMediaAsset[] {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectPreviewMedia(entry, output));
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, any>;
    if (typeof record.url === 'string' || typeof record.path === 'string') output.push(record as AuraMediaAsset);
    Object.values(record).forEach((entry) => {
      if (entry && typeof entry === 'object') collectPreviewMedia(entry, output);
    });
  }
  return output;
}

interface MediaFieldProps {
  field: AuraFieldSchema;
  value: any;
  label: string;
  onChange: (value: any) => void;
  onUpload: (file: File, kind: 'image' | 'video', current: any, onChange: (value: any) => void) => void;
  onRemove: (asset: AuraMediaAsset | undefined, onChange: (value: any) => void) => void;
  disabled?: boolean;
}

function MediaField({ field, value, label, onChange, onUpload, onRemove, disabled }: MediaFieldProps) {
  const kind = field.kind === 'video' ? 'video' : 'image';
  const asset = (value && typeof value === 'object' ? value : {}) as AuraMediaAsset;
  const url = auraSafeMediaUrl(asset.url || '');
  const isVideoFile = kind === 'video' && (String(asset.mimeType || '').startsWith('video/') || /\.(mp4|webm|mov)(\?|$)/i.test(url));
  const accept = kind === 'image' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';
  return (
    <div className="aura-cm-media" data-field={field.path} data-media-kind={kind}>
      <div className="aura-cm-media-head">
        <strong>{label}</strong>
        <small>{kind === 'image' ? 'JPG / PNG / WebP · up to 5 MB' : 'MP4 / WebM / MOV · up to 50 MB, or an approved link'}</small>
      </div>
      {url && (
        <div className="aura-cm-media-preview" aria-label={`Preview ${label}`}>
          {isVideoFile ? (
            <video src={url} controls muted playsInline preload="metadata" />
          ) : kind === 'video' ? (
            <a href={url} target="_blank" rel="noopener noreferrer">Open video link ↗</a>
          ) : (
            <AuraImage src={url} alt={asset.alt || label} fallbackSrc={AURA_UNISEX_IMAGES.aboutInterior.src} />
          )}
        </div>
      )}
      <label className="aura-cm-upload">
        <span>{url ? `Replace ${kind}` : `Upload ${kind}`}</span>
        <input
          type="file"
          accept={accept}
          aria-label={`${url ? 'Replace' : 'Upload'} ${label}`}
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file, kind, asset, onChange);
            event.target.value = '';
          }}
        />
      </label>
      <label className="aura-cm-field">
        <span>{kind === 'video' ? 'Video or supported link URL' : 'Image URL'}</span>
        <input
          type="text"
          value={String(asset.url || '')}
          aria-label={`${label} URL`}
          disabled={disabled}
          placeholder={kind === 'video' ? 'https://www.youtube.com/shorts/… or https://…/video.mp4' : 'https://… or /templates/aura-unisex/…'}
          onChange={(event) => onChange({ ...asset, url: event.target.value, path: '', mimeType: '', srcSet: '', width: 0, height: 0, kind: kind === 'video' ? 'link' : undefined })}
        />
      </label>
      {kind === 'image' && (
        <label className="aura-cm-field">
          <span>Alt text</span>
          <input
            type="text"
            value={String(asset.alt || '')}
            aria-label={`${label} alt text`}
            disabled={disabled}
            onChange={(event) => onChange({ ...asset, alt: event.target.value })}
          />
        </label>
      )}
      {(url || asset.path) && (
        <button
          type="button"
          className="aura-cm-danger aura-cm-remove-media"
          aria-label={`Remove ${label}`}
          disabled={disabled}
          onClick={() => onRemove(asset, onChange)}
        >
          Remove media
        </button>
      )}
      {asset.path && <small className="aura-cm-path">Saved path: {asset.path}</small>}
    </div>
  );
}

export const AuraContentManager: React.FC<AuraContentManagerProps> = ({ profile, onSaved, client = supabase }) => {
  const [drafts, setDraftsState] = useState<AuraSectionDraft[]>(() => defaultAuraSectionDrafts());
  const draftsRef = useRef<AuraSectionDraft[]>(drafts);
  const savedRef = useRef<AuraSectionDraft[]>(clone(drafts));
  const [activeKey, setActiveKey] = useState<AuraSectionKey>('hero');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [salonId, setSalonId] = useState('');

  const commit = (next: AuraSectionDraft[]) => {
    draftsRef.current = next;
    setDraftsState(next);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [id, loaded] = await Promise.all([getAuraEditableSalonId(client), fetchOwnerAuraSections(client)]);
      setSalonId(id);
      setReady(true);
      commit(clone(loaded));
      savedRef.current = clone(loaded);
      setDirty(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load Template 03 content.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const active = drafts.find((draft) => draft.sectionKey === activeKey) || drafts[0];
  const activeSchema = AURA_SECTION_SCHEMAS[activeKey];

  const patch = (next: AuraSectionDraft[]) => {
    commit(next);
    savedRef.current = clone(savedRef.current);
    setDirty(true);
    setSuccess('');
    setValidationErrors([]);
  };

  const patchContent = (path: string, value: any) => {
    const next = draftsRef.current.map((draft) =>
      draft.sectionKey === activeKey
        ? { ...draft, sectionContent: setAuraValue(draft.sectionContent, path, value) }
        : draft,
    );
    patch(next);
  };

  const patchActive = (changes: Partial<AuraSectionDraft>) => {
    const next = draftsRef.current.map((draft) => (draft.sectionKey === activeKey ? { ...draft, ...changes } : draft));
    patch(next);
  };

  const patchItem = (listPath: string, index: number, itemPath: string, value: any) => {
    const list = getAuraValue(active.sectionContent, listPath);
    const items = Array.isArray(list) ? [...list] : [];
    items[index] = setAuraValue(items[index] || {}, itemPath, value);
    patchContent(listPath, items);
  };

  const addItem = (field: AuraFieldSchema) => {
    const list = getAuraValue(active.sectionContent, field.path);
    const items = Array.isArray(list) ? [...list] : [];
    if (field.maxItems && items.length >= field.maxItems) {
      setError(`${field.label} can contain at most ${field.maxItems} items.`);
      return;
    }
    patchContent(field.path, [...items, defaultItem(field)]);
  };

  const moveItem = (field: AuraFieldSchema, index: number, delta: number) => {
    const list = getAuraValue(active.sectionContent, field.path);
    const items = Array.isArray(list) ? [...list] : [];
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    patchContent(field.path, items);
  };

  const removeItem = async (field: AuraFieldSchema, index: number) => {
    const list = getAuraValue(active.sectionContent, field.path);
    const items = Array.isArray(list) ? [...list] : [];
    if (typeof window !== 'undefined' && !window.confirm(`Remove ${field.itemLabel || 'item'} ${index + 1}? Uploaded files will be kept in storage.`)) return;
    items.splice(index, 1);
    const next = draftsRef.current.map((draft) =>
      draft.sectionKey === activeKey
        ? { ...draft, sectionContent: setAuraValue(draft.sectionContent, field.path, items) }
        : draft,
    );
    patch(next);

  };

  const handleUpload = async (file: File, kind: 'image' | 'video', current: any, onChange: (value: any) => void) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const id = salonId || await getAuraEditableSalonId(client);
      setSalonId(id);
      const uploaded = await uploadAuraMedia(file, kind, id, client);
      onChange({ ...(current || {}), ...uploaded });
      setSuccess(`${kind === 'image' ? 'Image' : 'Video'} uploaded and previewed. Save changes to publish it to Template 03.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMedia = async (_asset: AuraMediaAsset | undefined, onChange: (value: any) => void) => {
    if (typeof window !== 'undefined' && !window.confirm('Remove this media from the section? The uploaded file will remain in storage.')) return;
    onChange({});
    setSuccess('Media removed from this field. The original file was kept. Save changes to update Template 03.');
  };

  const save = async () => {
    const errors = validateAuraDrafts(draftsRef.current);
    if (errors.length) {
      setValidationErrors(errors);
      setError('Please fix the highlighted form errors before saving.');
      return;
    }
    setBusy(true);
    setLoading(false);
    setError('');
    setSuccess('');
    try {
      const saved = await upsertAuraSections(draftsRef.current, client, savedRef.current);
      commit(clone(saved));
      savedRef.current = clone(saved);
      setDirty(false);
      setEditing(false);
      setValidationErrors([]);
      setSuccess(`Saved ${AURA_SECTION_LABELS[activeKey]} changes to Supabase. Refresh the website to see the changes.`);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event(AURA_SECTION_EVENT));
      onSaved?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save Template 03 content.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    commit(clone(savedRef.current));
    setEditing(false);
    setDirty(false);
    setError('');
    setSuccess('');
    setValidationErrors([]);
  };

  const openSavedWebsite = () => {
    const slug = String(profile.subdomain || '').trim();
    if (!slug || typeof window === 'undefined') return;
    window.open(`/?site=${encodeURIComponent(slug)}`, '_blank', 'noopener,noreferrer');
  };

  const previewTitle = useMemo(() => {
    const titleField = activeSchema.fields.find((field) => /title|heading|name/i.test(field.path) && field.kind !== 'list');
    if (!titleField) return AURA_SECTION_LABELS[activeKey];
    return getAuraValue(active.sectionContent, titleField.path) || AURA_SECTION_LABELS[activeKey];
  }, [active, activeKey, activeSchema]);
  const previewDescription = useMemo(() => {
    const field = activeSchema.fields.find((entry) => /description|text|sublabel/i.test(entry.path) && entry.kind !== 'list');
    return field ? getAuraValue(active.sectionContent, field.path) : activeSchema.summary;
  }, [active, activeSchema]);
  const previewMedia = useMemo(() => collectPreviewMedia(active.sectionContent).filter((asset) => auraSafeMediaUrl(asset.url)), [active]);

  const hasError = (label: string) => validationErrors.some((message) => message.includes(label));

  const renderField = (
    field: AuraFieldSchema,
    value: any,
    onChange: (next: any) => void,
    keyPath: string,
    prefix = '',
  ): React.ReactNode => {
    const label = labelFor(field, prefix);
    if (field.kind === 'list') {
      const items: any[] = Array.isArray(value) ? value : [];
      return (
        <fieldset className="aura-cm-list" key={keyPath} data-field={keyPath}>
          <legend>{label}</legend>
          {field.help && <p className="aura-cm-help">{field.help}</p>}
          {items.map((item, index) => (
            <article className="aura-cm-list-item" key={`${keyPath}-${index}`} data-aura-item={index}>
              <header>
                <strong>{field.itemLabel || field.label} {index + 1}</strong>
                <div className="aura-cm-item-actions">
                  <button type="button" aria-label={`Move ${label} ${index + 1} up`} disabled={!editing || busy || index === 0} onClick={() => moveItem(field, index, -1)}>↑</button>
                  <button type="button" aria-label={`Move ${label} ${index + 1} down`} disabled={!editing || busy || index === items.length - 1} onClick={() => moveItem(field, index, 1)}>↓</button>
                  <button type="button" className="aura-cm-danger" aria-label={`Remove ${label} ${index + 1}`} disabled={!editing || busy} onClick={() => void removeItem(field, index)}>Remove</button>
                </div>
              </header>
              <div className="aura-cm-item-fields">
                {(field.itemFields || []).map((itemField) =>
                  renderField(
                    itemField,
                    getAuraValue(item, itemField.path),
                    (next) => {
                      const currentList = getAuraValue(draftsRef.current.find((draft) => draft.sectionKey === activeKey)?.sectionContent || {}, field.path);
                      const nextItems = Array.isArray(currentList) ? [...currentList] : [];
                      nextItems[index] = setAuraValue(nextItems[index] || {}, itemField.path, next);
                      patchContent(field.path, nextItems);
                    },
                    `${keyPath}.${index}.${itemField.path}`,
                    `${label} ${index + 1} · `,
                  ),
                )}
              </div>
            </article>
          ))}
          <button
            type="button"
            className="aura-cm-add"
            data-add={field.path}
            disabled={!editing || busy || Boolean(field.maxItems && items.length >= field.maxItems)}
            onClick={() => addItem(field)}
          >
            {field.addLabel || `Add ${field.label}`}
          </button>
        </fieldset>
      );
    }
    if (field.kind === 'image' || field.kind === 'video') {
      return (
        <MediaField
          key={keyPath}
          field={field}
          value={value}
          label={label}
          onChange={onChange}
          onUpload={(file, kind, current, next) => void handleUpload(file, kind, current, next)}
          onRemove={(asset, next) => void handleRemoveMedia(asset, next)}
          disabled={!editing || busy}
        />
      );
    }
    const common = {
      id: `aura-cm-${keyPath.replace(/[^a-z0-9]+/gi, '-')}`,
      'aria-label': label,
      'data-field': keyPath,
      disabled: !editing || busy,
      'aria-invalid': hasError(label) || undefined,
    } as any;
    return (
      <label className="aura-cm-field" key={keyPath} data-field={keyPath}>
        <span>{label}{field.required ? ' *' : ''}</span>
        {field.kind === 'textarea' ? (
          <textarea {...common} rows={3} maxLength={field.maxLength} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} />
        ) : field.kind === 'select' ? (
          <select {...common} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)}>
            {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : field.kind === 'toggle' ? (
          <input {...common} type="checkbox" checked={value !== false} onChange={(event) => onChange(event.target.checked)} />
        ) : (
          <input
            {...common}
            type={field.kind === 'number' ? 'number' : field.kind === 'url' ? 'text' : 'text'}
            min={field.min}
            max={field.max}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            value={String(value ?? '')}
            onChange={(event) => onChange(field.kind === 'number' ? Number(event.target.value) : event.target.value)}
          />
        )}
        {field.help && <small className="aura-cm-help">{field.help}</small>}
      </label>
    );
  };

  const orderedSections = useMemo(
    () => [...AURA_SECTION_KEYS].sort((a, b) => {
      const left = drafts.find((draft) => draft.sectionKey === a)?.displayOrder ?? 0;
      const right = drafts.find((draft) => draft.sectionKey === b)?.displayOrder ?? 0;
      return left - right || AURA_SECTION_KEYS.indexOf(a) - AURA_SECTION_KEYS.indexOf(b);
    }),
    [drafts],
  );

  return (
    <section className="workspace-card aura-cm" aria-labelledby="aura-cm-title" data-template={AURA_TEMPLATE_ID}>
      <header className="aura-cm-header">
        <div>
          <p className="eyebrow">Template 03 · Supabase content</p>
          <h2 id="aura-cm-title">Aura Unisex Salon · Content Management</h2>
          <p className="muted">Edit the 19 Template 03 sections only. Changes are saved to the salon's own Supabase section rows; services, staff records, bookings, customer reviews, payments and loyalty ledgers are not edited here.</p>
        </div>
        <div className="aura-cm-header-actions">
          <button type="button" className="secondary-action" disabled={!profile.subdomain} onClick={openSavedWebsite}>Open saved website ↗</button>
          <button type="button" className="secondary-action" disabled={loading || busy || dirty} onClick={() => void load()}>Reload from Supabase</button>
        </div>
      </header>

      {profile.subdomain && <p className="aura-cm-error" role="note"><strong>Publication caution:</strong> Existing server configuration can make saved section changes visible on an already-published website immediately. Do not save unapproved changes until the publication workflow has been reviewed.</p>}
      {loading && <p role="status" className="aura-cm-status">Loading Template 03 content from Supabase…</p>}
      {busy && <p role="status" className="aura-cm-status">{editing ? 'Saving / uploading…' : 'Working…'}</p>}
      {success && <p role="status" className="aura-cm-success">{success}</p>}
      {error && <p role="alert" className="aura-cm-error">{error}</p>}
      {validationErrors.length > 0 && (
        <div role="alert" className="aura-cm-error aura-cm-validation">
          <strong>Form validation</strong>
          <ul>{validationErrors.slice(0, 8).map((message) => <li key={message}>{message}</li>)}</ul>
        </div>
      )}

      <div className="aura-cm-layout">
        <nav className="aura-cm-nav" aria-label="Template 03 content sections">
          {orderedSections.map((key, index) => {
            const draft = drafts.find((entry) => entry.sectionKey === key);
            return (
              <button
                type="button"
                key={key}
                className={key === activeKey ? 'is-active' : ''}
                aria-current={key === activeKey ? 'true' : undefined}
                aria-label={`Edit ${AURA_SECTION_LABELS[key]}`}
                data-section={key}
                disabled={busy || (dirty && key !== activeKey)}
                onClick={() => { setActiveKey(key); setEditing(false); setError(''); setValidationErrors([]); }}
              >
                <span className="aura-cm-nav-order">{index + 1}</span>
                <span>{AURA_SECTION_LABELS[key]}</span>
                <small>{draft?.isVisible === false ? 'Hidden' : 'Visible'}</small>
              </button>
            );
          })}
        </nav>

        <div className="aura-cm-editor" aria-live="polite">
          <header className="aura-cm-editor-head">
            <div>
              <h3>{AURA_SECTION_LABELS[activeKey]}</h3>
              <p>{activeSchema.summary}</p>
            </div>
            <div className="aura-cm-actions">
              {!editing ? (
                <button type="button" className="primary-action" disabled={loading || busy || !ready} onClick={() => setEditing(true)}>Edit</button>
              ) : (
                <>
                  <button type="button" className="primary-action aura-cm-save" disabled={busy || !dirty} onClick={() => void save()}>Save changes</button>
                  <button type="button" className="secondary-action aura-cm-cancel" disabled={busy} onClick={cancel}>Cancel</button>
                </>
              )}
              <button type="button" className="secondary-action aura-cm-preview" disabled={loading} onClick={() => setPreviewOpen(true)}>Preview changes</button>
            </div>
          </header>

          <div className="aura-cm-section-controls">
            <label className="aura-cm-field aura-cm-inline">
              <span>Show this section</span>
              <input
                type="checkbox"
                aria-label="Show this section"
                data-field="isVisible"
                checked={active.isVisible !== false}
                disabled={!editing || busy}
                onChange={(event) => patchActive({ isVisible: event.target.checked })}
              />
            </label>
            <label className="aura-cm-field aura-cm-inline">
              <span>Display order</span>
              <input
                type="number"
                min={-1000}
                max={10000}
                step={1}
                aria-label="Display order"
                data-field="displayOrder"
                value={active.displayOrder}
                disabled={!editing || busy || ['header', 'branding', 'hero_media', 'buttons', 'footer'].includes(activeKey)}
                onChange={(event) => patchActive({ displayOrder: Number(event.target.value) })}
              />
            </label>
            <small>Lower numbers appear first. Header and footer are fixed; branding, hero media and buttons stay with their related section.</small>
          </div>

          <form className="aura-cm-form" onSubmit={(event) => { event.preventDefault(); if (editing && dirty) void save(); }}>
            {activeSchema.fields.map((field) =>
              renderField(
                field,
                getAuraValue(active.sectionContent, field.path),
                (next) => patchContent(field.path, next),
                field.path,
              ),
            )}
            <footer className="aura-cm-form-foot">
              {editing ? (
                <>
                  <button type="submit" className="primary-action aura-cm-save" disabled={busy || !dirty}>Save changes</button>
                  <button type="button" className="secondary-action aura-cm-cancel" disabled={busy} onClick={cancel}>Cancel</button>
                </>
              ) : (
                <button type="button" className="primary-action" disabled={loading || busy || !ready} onClick={() => setEditing(true)}>Edit</button>
              )}
              <button type="button" className="secondary-action aura-cm-preview" onClick={() => setPreviewOpen(true)}>Preview changes</button>
              {dirty && <span className="aura-cm-dirty">Unsaved changes</span>}
            </footer>
          </form>
        </div>
      </div>

      {previewOpen && (
        <div className="aura-cm-modal-backdrop" role="presentation" onClick={() => setPreviewOpen(false)}>
          <section
            className="aura-cm-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Preview changes"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div><p className="eyebrow">Unsaved draft preview</p><h3>Preview changes</h3></div>
              <button type="button" aria-label="Close preview" onClick={() => setPreviewOpen(false)}>Close</button>
            </header>
            <article className="aura-cm-preview-card" data-aura-preview-section={activeKey}>
              <small>{AURA_SECTION_LABELS[activeKey]}</small>
              <h4 data-aura-preview-heading>{String(previewTitle)}</h4>
              <p>{String(previewDescription || activeSchema.summary)}</p>
              {previewMedia.slice(0, 6).map((asset, index) => {
                const url = auraSafeMediaUrl(asset.url);
                return String(asset.mimeType || '').startsWith('video/')
                  ? <video key={`${url}-${index}`} src={url} controls muted playsInline />
                  : <AuraImage key={`${url}-${index}`} src={url} alt={asset.alt || `Media preview ${index + 1}`} fallbackSrc={AURA_UNISEX_IMAGES.aboutInterior.src} />;
              })}
              {activeSchema.fields.filter((field) => field.kind === 'list').map((field) => {
                const items = getAuraValue(active.sectionContent, field.path);
                return Array.isArray(items) && items.length > 0
                  ? <p key={field.path} className="aura-cm-preview-list"><strong>{field.label}:</strong> {items.length} item{items.length === 1 ? '' : 's'}</p>
                  : null;
              })}
            </article>
            <p className="aura-cm-help">This preview uses the current form draft. Saved website content is read from Supabase after a refresh; use “Open saved website” to review the published page in a new tab.</p>
            <footer>
              <button type="button" className="secondary-action" onClick={() => setPreviewOpen(false)}>Close preview</button>
              <button type="button" className="primary-action" disabled={!editing || !dirty || busy} onClick={() => { setPreviewOpen(false); void save(); }}>Save these changes</button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
};

export default AuraContentManager;

import React, { useRef, useState } from 'react';
import { websiteLink } from '../lib/supabase';
import { formatPublishingError, isPublishingReady } from '../lib/publishing';
import { SalonProfile, SalonService } from '../types';
import { PublishingStatusIndicator } from './PublishingStatusIndicator';

export type PublishedWebsite = { slug: string; published_at: string };

export function WebsitePublishPanel({ published, onPublish, onPublished, profile, services }: {
  published: PublishedWebsite | null;
  onPublish?: () => Promise<void>;
  onPublished?: () => void;
  profile?: SalonProfile;
  services?: SalonService[];
}) {
  const busy = useRef(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const url = published ? websiteLink(published.slug) : '';
  // Readiness is only enforced when the panel is given the salon data. Callers
  // that omit profile/services (e.g. the publish-link contract) still get a
  // working button, so a click never silently does nothing.
  const isReady = Boolean(profile && services && isPublishingReady(profile, services));

  async function publish() {
    if (!onPublish || busy.current || !isReady) return;
    busy.current = true;
    setPublishing(true); setError(''); setStatus('');
    try {
      await onPublish();
      setStatus('Website published. Your live link is ready to share.');
      onPublished?.();
    } catch (e) {
      console.error('[StudioFlow] Website publish action failed', e);
      setError(formatPublishingError(e));
    } finally {
      busy.current = false; setPublishing(false);
    }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setStatus('Live website link copied.'); }
    catch { setStatus('Copy the live website address shown above.'); }
  }
  return <section className="workspace-card" aria-label="Publish and share website">
    {profile && services && <PublishingStatusIndicator profile={profile} services={services} />}
    <p className="eyebrow">{published ? 'Published website' : 'Publish your salon'}</p>
    <h2>{published ? 'Your salon is live' : 'Ready to go live?'}</h2>
    <p className="muted">{published ? 'Saved edits update this same live address. Open it to check the customer experience.' : 'Finish editing, then publish to create your customer-facing website link.'}</p>
    {url && <a data-testid="published-live-url" className="block break-all my-4 underline" href={url} target="_blank" rel="noopener noreferrer">{url}</a>}
    <div className="action-buttons flex flex-wrap gap-3 mt-4">
      {url && <><a className="primary-action" href={url} target="_blank" rel="noopener noreferrer">Open live website</a><button className="secondary-action" onClick={()=>void copy()}>Copy live link</button></>}
        {onPublish && <button data-testid="publish-panel-btn" className={url ? 'secondary-action' : 'primary-action'} disabled={publishing || !isReady} onClick={()=>void publish()}>{publishing ? 'Publishing…' : url ? 'Publish latest changes' : 'Publish website'}</button>}
    </div>
    {status && <p data-testid="publish-panel-status" role="status" className="mt-3 text-sm text-emerald-700">{status}</p>}
    {error && <p data-testid="publish-panel-error" role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>;
}

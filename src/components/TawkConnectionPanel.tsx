import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Website = { slug: string; published_at: string };
type Connection = { website_slug: string; tawk_property_id: string; tawk_widget_id: string | null; status: string };

export const TawkConnectionPanel: React.FC = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [slug, setSlug] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [widgetId, setWidgetId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async (preferredSlug?: string) => {
    const { data, error: invokeError } = await supabase.functions.invoke('studioflow-tawk-connect', { body: { action: 'status' } });
    if (invokeError) throw new Error(invokeError.message || 'Could not load Tawk connection.');
    const nextWebsites = Array.isArray(data?.websites) ? data.websites as Website[] : [];
    const nextConnections = Array.isArray(data?.connections) ? data.connections as Connection[] : [];
    setWebsites(nextWebsites);
    setConnections(nextConnections);
    const nextSlug = preferredSlug || slug || nextWebsites[0]?.slug || '';
    setSlug(nextSlug);
    const existing = nextConnections.find(item => item.website_slug === nextSlug && item.status === 'active');
    setPropertyId(existing?.tawk_property_id || '');
    setWidgetId(existing?.tawk_widget_id || '');
  }, [slug]);

  useEffect(() => { void refresh().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load Tawk connection.')); }, []);

  const selected = connections.find(item => item.website_slug === slug && item.status === 'active');
  const run = async (action: 'connect' | 'disconnect') => {
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('studioflow-tawk-connect', {
        body: { action, slug, propertyId, widgetId },
      });
      if (invokeError) throw new Error(invokeError.message || 'Tawk request failed.');
      if (data?.error) throw new Error(data.error);
      await refresh(slug);
      setNotice(action === 'connect' ? 'Tawk.to chat connected to this salon website.' : 'Tawk.to chat disconnected.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Tawk request failed. Please try again.');
    } finally { setBusy(false); }
  };

  return <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="font-display font-bold text-base text-gray-900">Tawk.to Live Chat</h2>
        <p className="text-xs text-gray-500 mt-1">Connect your salon's own Tawk.to account. Each website has its own chat widget.</p></div>
      <span className="text-[11px] font-bold rounded-full px-3 py-1 bg-slate-100 text-slate-700">{selected ? 'Connected' : 'Not connected'}</span>
    </div>
    {websites.length === 0 ? <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3">Publish your salon website first. Then you can connect its Tawk.to widget here.</p> : <>
      <label className="text-xs font-bold text-gray-700">Salon website</label>
      <select value={slug} onChange={e => { const next=e.target.value; setSlug(next); const found=connections.find(item=>item.website_slug===next&&item.status==='active'); setPropertyId(found?.tawk_property_id||''); setWidgetId(found?.tawk_widget_id||''); }} className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-white">
        {websites.map(site => <option key={site.slug} value={site.slug}>{site.slug}</option>)}
      </select>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-bold text-gray-700">Tawk Property ID
          <input value={propertyId} onChange={e=>setPropertyId(e.target.value.trim())} placeholder="Paste Property ID" autoComplete="off" className="mt-1 w-full border border-gray-300 rounded-xl p-3 text-sm font-mono"/>
        </label>
        <label className="text-xs font-bold text-gray-700">Tawk Widget ID
          <input value={widgetId} onChange={e=>setWidgetId(e.target.value.trim())} placeholder="Paste Widget ID" autoComplete="off" className="mt-1 w-full border border-gray-300 rounded-xl p-3 text-sm font-mono"/>
        </label>
      </div>
      <p className="text-xs text-gray-500">Find both IDs in Tawk.to: Administration → Channels → Chat Widget → Widget Code. Copy the Property ID and Widget ID from the embed address. These are public widget identifiers, not passwords or API keys.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy||!slug||!propertyId||!widgetId} onClick={()=>void run('connect')} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50">{busy?'Saving…':selected?'Update connection':'Connect Tawk.to'}</button>
        {selected && <button type="button" disabled={busy} onClick={()=>void run('disconnect')} className="px-5 py-2.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 text-xs font-bold disabled:opacity-50">Disconnect</button>}
        <a href="https://dashboard.tawk.to/" target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700">Open Tawk.to dashboard ↗</a>
      </div>
    </>}
    {error&&<p role="alert" className="text-sm text-rose-700 bg-rose-50 rounded-xl p-3">{error}</p>}
    {notice&&<p role="status" className="text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3">{notice}</p>}
  </section>;
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Download, Loader2, Mail, MessageCircle, Phone, Plus, RefreshCw, Star, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { loadPrismOwnerInbox, prismErrorMessage, type PrismOffer } from '../../lib/prismSite';

/**
 * Template 10 owner inbox: enquiries, review moderation, dated offers and
 * newsletter subscribers. Every query is scoped by RLS to the signed-in
 * salon; public visitors never see these rows.
 */

type EnquiryRow = {
  id: string;
  service_name: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  preferred_date: string | null;
  status: 'new' | 'read' | 'replied' | 'closed';
  created_at: string;
};

type SubscriberRow = { id: string; email: string; name: string; source: string; consent: boolean; created_at: string };

type ReviewRow = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  service_name: string;
  status: 'pending' | 'approved' | 'rejected';
  salon_reply: string | null;
  created_at: string;
  updated_at: string;
};

type OfferRow = {
  id: string;
  title: string;
  description: string;
  code: string;
  discount_percent: number | null;
  flat_discount_inr: number | null;
  price_note: string;
  service_id: string;
  image_url: string | null;
  starts_on: string | null;
  ends_on: string | null;
  active: boolean;
  sort_order: number;
};

type Inbox = { enquiries: EnquiryRow[]; subscribers: SubscriberRow[]; offers: OfferRow[]; reviews: ReviewRow[] };

type TabKey = 'enquiries' | 'reviews' | 'offers' | 'newsletter';

const TABS: Array<{ id: TabKey; label: string }> = [
  { id: 'enquiries', label: 'Enquiries' },
  { id: 'reviews', label: 'Review approvals' },
  { id: 'offers', label: 'Offers' },
  { id: 'newsletter', label: 'Newsletter' },
];

const dateTime = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const downloadCsv = (name: string, rows: Array<Record<string, unknown>>) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const emptyOffer = {
  title: '',
  description: '',
  code: '',
  discountPercent: '',
  flatDiscountInr: '',
  priceNote: '',
  startsOn: '',
  endsOn: '',
  active: true,
};

export function PrismChromaOwnerPanel({ slug }: { slug?: string }) {
  const [ownerId, setOwnerId] = useState('');
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<TabKey>('enquiries');
  const [busy, setBusy] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ ...emptyOffer });
  const [editingId, setEditingId] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) throw new Error('Sign in to open the colour studio inbox.');
      setOwnerId(data.user.id);
      const next = await loadPrismOwnerInbox(data.user.id);
      setInbox(next as Inbox);
    } catch (loadError) {
      setError(prismErrorMessage(loadError, 'Could not load the colour studio inbox.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel('prism-owner-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studioflow_enquiries' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studioflow_offers' }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const pendingReviews = useMemo(() => (inbox?.reviews || []).filter((review) => review.status === 'pending'), [inbox]);
  const filteredReviews = useMemo(() => {
    const rows = inbox?.reviews || [];
    return reviewFilter === 'all' ? rows : rows.filter((review) => review.status === reviewFilter);
  }, [inbox, reviewFilter]);

  const setEnquiryStatus = async (id: string, status: EnquiryRow['status']) => {
    setBusy(id);
    setError('');
    const { error: updateError } = await supabase.from('studioflow_enquiries').update({ status }).eq('id', id);
    setBusy('');
    if (updateError) {
      setError(prismErrorMessage(updateError, 'Could not update this enquiry.'));
      return;
    }
    setNotice('Enquiry marked ' + status + '.');
    void load();
  };

  const moderate = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    setBusy(id);
    setError('');
    const { error: moderateError } = await supabase.rpc('studioflow_prism_moderate_review', {
      p_review_id: id,
      p_status: status,
      p_reply: (replyDraft[id] || '').trim() || null,
    });
    setBusy('');
    if (moderateError) {
      setError(prismErrorMessage(moderateError, 'Could not update this review.'));
      return;
    }
    setNotice(status === 'approved' ? 'Review approved and published.' : status === 'rejected' ? 'Review rejected.' : 'Review moved back to pending.');
    setReplyDraft((current) => ({ ...current, [id]: '' }));
    void load();
  };

  const deleteSubscriber = async (id: string) => {
    setBusy(id);
    setError('');
    const { error: deleteError } = await supabase.from('studioflow_newsletter_subscribers').delete().eq('id', id);
    setBusy('');
    if (deleteError) {
      setError(prismErrorMessage(deleteError, 'Could not remove this subscriber.'));
      return;
    }
    setNotice('Subscriber removed.');
    void load();
  };

  const startEdit = (offer: OfferRow) => {
    setEditingId(offer.id);
    setForm({
      title: offer.title,
      description: offer.description,
      code: offer.code,
      discountPercent: offer.discount_percent != null ? String(offer.discount_percent) : '',
      flatDiscountInr: offer.flat_discount_inr != null ? String(offer.flat_discount_inr) : '',
      priceNote: offer.price_note,
      startsOn: offer.starts_on || '',
      endsOn: offer.ends_on || '',
      active: offer.active,
    });
    setFormError('');
  };

  const resetForm = () => {
    setEditingId('');
    setForm({ ...emptyOffer });
    setFormError('');
  };

  const saveOffer = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!ownerId) {
      setFormError('Sign in again to save offers.');
      return;
    }
    if (form.title.trim().length < 2) {
      setFormError('Give the offer a title.');
      return;
    }
    if (form.startsOn && form.endsOn && form.endsOn < form.startsOn) {
      setFormError('The end date must be after the start date.');
      return;
    }
    const discount = form.discountPercent.trim() ? Number(form.discountPercent) : null;
    const flat = form.flatDiscountInr.trim() ? Number(form.flatDiscountInr) : null;
    if (discount !== null && (!Number.isFinite(discount) || discount < 1 || discount > 100)) {
      setFormError('Discount percent must be between 1 and 100.');
      return;
    }
    if (flat !== null && (!Number.isFinite(flat) || flat < 1)) {
      setFormError('Flat discount must be a positive rupee amount.');
      return;
    }
    const payload = {
      salon_id: ownerId,
      title: form.title.trim(),
      description: form.description.trim(),
      code: form.code.trim().toUpperCase(),
      discount_percent: discount,
      flat_discount_inr: flat,
      price_note: form.priceNote.trim(),
      starts_on: form.startsOn || null,
      ends_on: form.endsOn || null,
      active: form.active,
    };
    setBusy('offer');
    const result = editingId
      ? await supabase.from('studioflow_offers').update(payload).eq('id', editingId)
      : await supabase.from('studioflow_offers').insert(payload);
    setBusy('');
    if (result.error) {
      setFormError(prismErrorMessage(result.error, 'Could not save this offer.'));
      return;
    }
    setNotice(editingId ? 'Offer updated. It is live on the website now.' : 'Offer published. It appears on the website immediately.');
    resetForm();
    void load();
  };

  const toggleOffer = async (offer: OfferRow) => {
    setBusy(offer.id);
    setError('');
    const { error: toggleError } = await supabase.from('studioflow_offers').update({ active: !offer.active }).eq('id', offer.id);
    setBusy('');
    if (toggleError) {
      setError(prismErrorMessage(toggleError, 'Could not change this offer.'));
      return;
    }
    void load();
  };

  const deleteOffer = async (id: string) => {
    setBusy(id);
    setError('');
    const { error: deleteError } = await supabase.from('studioflow_offers').delete().eq('id', id);
    setBusy('');
    if (deleteError) {
      setError(prismErrorMessage(deleteError, 'Could not delete this offer.'));
      return;
    }
    if (editingId === id) resetForm();
    setNotice('Offer removed from the website.');
    void load();
  };

  return (
    <section className="workspace-card space-y-4" aria-label="Prism and Chroma colour studio inbox">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Template 10</p>
          <h2>Colour studio inbox</h2>
          <p className="text-sm text-slate-600">
            Enquiries, review approvals, dated offers and newsletter subscribers for {slug ? <code>{slug}</code> : 'this salon'}.
            Everything here is live on the public website.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="secondary-action" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} aria-hidden="true" /> {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Colour studio inbox sections">
        {TABS.map((item) => {
          const count = item.id === 'enquiries' ? inbox?.enquiries.filter((row) => row.status === 'new').length : item.id === 'reviews' ? pendingReviews.length : 0;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${tab === item.id ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            >
              {item.label}
              {count > 0 && <span className={`rounded-full px-1.5 text-[10px] ${tab === item.id ? 'bg-white/25' : 'bg-amber-100 text-amber-900'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {loading && !inbox && <p role="status" className="flex items-center gap-2 text-sm text-slate-600"><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Loading colour studio inbox…</p>}

      {tab === 'enquiries' && inbox && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              {inbox.enquiries.length ? `${inbox.enquiries.length} enquir${inbox.enquiries.length === 1 ? 'y' : 'ies'} · ${inbox.enquiries.filter((row) => row.status === 'new').length} new` : 'No enquiries yet.'}
            </p>
            <button
              type="button"
              className="secondary-action"
              disabled={!inbox.enquiries.length}
              onClick={() => downloadCsv('template-10-enquiries.csv', inbox.enquiries as unknown as Array<Record<string, unknown>>)}
            >
              <Download size={14} aria-hidden="true" /> Export CSV
            </button>
          </div>
          {!inbox.enquiries.length && (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              Enquiries sent from the website contact form land here instantly. They are not appointments.
            </p>
          )}
          {inbox.enquiries.map((enquiry) => (
            <article key={enquiry.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{enquiry.name}</p>
                  <p className="text-xs text-slate-600">
                    {[enquiry.service_name || 'General enquiry', dateTime(enquiry.created_at), enquiry.preferred_date ? `prefers ${enquiry.preferred_date}` : ''].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <select
                  aria-label={`Status for ${enquiry.name}'s enquiry`}
                  value={enquiry.status}
                  disabled={busy === enquiry.id}
                  onChange={(event) => void setEnquiryStatus(enquiry.id, event.target.value as EnquiryRow['status'])}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold"
                >
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              {enquiry.message && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{enquiry.message}</p>}
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                <a href={`tel:${enquiry.phone.replace(/[^+\d]/g, '')}`} className="inline-flex items-center gap-1 text-violet-700"><Phone size={13} aria-hidden="true" /> {enquiry.phone}</a>
                <a href={`https://wa.me/${enquiry.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700"><MessageCircle size={13} aria-hidden="true" /> WhatsApp</a>
                {enquiry.email && <a href={`mailto:${enquiry.email}`} className="inline-flex items-center gap-1 text-slate-700"><Mail size={13} aria-hidden="true" /> {enquiry.email}</a>}
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === 'reviews' && inbox && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter reviews by approval status">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={reviewFilter === value}
                onClick={() => setReviewFilter(value)}
                className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${reviewFilter === value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'}`}
              >
                {value} ({value === 'all' ? inbox.reviews.length : inbox.reviews.filter((review) => review.status === value).length})
              </button>
            ))}
          </div>
          {!filteredReviews.length && (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              No {reviewFilter === 'all' ? '' : reviewFilter + ' '}reviews right now. New customer reviews wait here until you approve them.
            </p>
          )}
          {filteredReviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{review.name}</p>
                  <p className="text-xs text-slate-600">{[review.service_name, dateTime(review.updated_at || review.created_at)].filter(Boolean).join(' · ')}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600"><Star size={14} fill="currentColor" aria-hidden="true" /> {review.rating}/5</span>
              </div>
              <blockquote className="mt-2 whitespace-pre-wrap text-sm text-slate-700">“{review.comment}”</blockquote>
              <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${review.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : review.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'}`}>
                {review.status}
              </span>
              <label className="mt-3 block text-xs font-bold text-slate-700">
                Public reply (optional)
                <textarea
                  rows={2}
                  maxLength={1000}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                  value={replyDraft[review.id] ?? review.salon_reply ?? ''}
                  onChange={(event) => setReplyDraft((current) => ({ ...current, [review.id]: event.target.value }))}
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="primary-action" disabled={busy === review.id} onClick={() => void moderate(review.id, 'approved')}>
                  <Check size={14} aria-hidden="true" /> Approve &amp; publish
                </button>
                <button type="button" className="secondary-action" disabled={busy === review.id} onClick={() => void moderate(review.id, 'rejected')}>
                  <X size={14} aria-hidden="true" /> Reject
                </button>
                {review.status !== 'pending' && (
                  <button type="button" className="secondary-action" disabled={busy === review.id} onClick={() => void moderate(review.id, 'pending')}>
                    Move to pending
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === 'offers' && inbox && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <form className="space-y-2" onSubmit={saveOffer} aria-label={editingId ? 'Edit colour offer' : 'Create colour offer'}>
            <h3 className="font-bold text-slate-900">{editingId ? 'Edit offer' : 'New offer'}</h3>
            <label className="block text-xs font-bold text-slate-700">
              Title
              <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required maxLength={120} />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Short description
              <textarea rows={3} maxLength={600} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-bold text-slate-700">
                Code
                <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal uppercase" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} maxLength={40} placeholder="PRISM20" />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Value note
                <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" value={form.priceNote} onChange={(event) => setForm((current) => ({ ...current, priceNote: event.target.value }))} maxLength={120} placeholder="Mon–Thu only" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-bold text-slate-700">
                Discount %
                <input inputMode="numeric" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" value={form.discountPercent} onChange={(event) => setForm((current) => ({ ...current, discountPercent: event.target.value.replace(/[^0-9]/g, '') }))} placeholder="20" />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Flat ₹ off
                <input inputMode="numeric" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" value={form.flatDiscountInr} onChange={(event) => setForm((current) => ({ ...current, flatDiscountInr: event.target.value.replace(/[^0-9]/g, '') }))} placeholder="500" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-bold text-slate-700">
                Starts on
                <input type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" value={form.startsOn} onChange={(event) => setForm((current) => ({ ...current, startsOn: event.target.value }))} />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Ends on
                <input type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" value={form.endsOn} onChange={(event) => setForm((current) => ({ ...current, endsOn: event.target.value }))} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /> Active on the website
            </label>
            {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="primary-action" disabled={busy === 'offer'}>
                <Plus size={14} aria-hidden="true" /> {busy === 'offer' ? 'Saving…' : editingId ? 'Save changes' : 'Publish offer'}
              </button>
              {editingId && <button type="button" className="secondary-action" onClick={resetForm}>Cancel edit</button>}
            </div>
          </form>

          <div className="space-y-3">
            {!inbox.offers.length && <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">No offers yet. Publish one and it appears on the website instantly.</p>}
            {inbox.offers.map((offer: OfferRow & Partial<PrismOffer>) => (
              <article key={offer.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{offer.title}</p>
                    <p className="text-xs text-slate-600">
                      {[offer.code, offer.starts_on && `from ${offer.starts_on}`, offer.ends_on && `till ${offer.ends_on}`].filter(Boolean).join(' · ') || 'No date window'}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${offer.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{offer.active ? 'Active' : 'Paused'}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                  <button type="button" className="secondary-action" onClick={() => startEdit(offer)}>Edit</button>
                  <button type="button" className="secondary-action" disabled={busy === offer.id} onClick={() => void toggleOffer(offer)}>{offer.active ? 'Pause' : 'Activate'}</button>
                  <button type="button" className="secondary-action" disabled={busy === offer.id} onClick={() => void deleteOffer(offer.id)}><Trash2 size={13} aria-hidden="true" /> Delete</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === 'newsletter' && inbox && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">{inbox.subscribers.length ? `${inbox.subscribers.length} subscriber${inbox.subscribers.length === 1 ? '' : 's'}` : 'No subscribers yet.'}</p>
            <button
              type="button"
              className="secondary-action"
              disabled={!inbox.subscribers.length}
              onClick={() => downloadCsv('template-10-newsletter.csv', inbox.subscribers as unknown as Array<Record<string, unknown>>)}
            >
              <Download size={14} aria-hidden="true" /> Export CSV
            </button>
          </div>
          {!inbox.subscribers.length && (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              Visitors who join the colour list from the website footer appear here.
            </p>
          )}
          {inbox.subscribers.map((subscriber) => (
            <article key={subscriber.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
              <div>
                <p className="font-bold text-slate-900">{subscriber.email}</p>
                <p className="text-xs text-slate-600">{subscriber.name || 'No name'} · {dateTime(subscriber.created_at)} · {subscriber.source}</p>
              </div>
              <button type="button" className="secondary-action" disabled={busy === subscriber.id} onClick={() => void deleteSubscriber(subscriber.id)}>
                <Trash2 size={13} aria-hidden="true" /> Remove
              </button>
            </article>
          ))}
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <CalendarDays size={13} aria-hidden="true" /> Bookings themselves stay in Appointments &amp; Calendar — the same booking rows the customer website and the Nexora app use.
      </p>
    </section>
  );
}

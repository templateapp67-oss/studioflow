import React, { useEffect, useState } from 'react';
import { GraduationCap, Mail, MessageCircle, Phone, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AcademyEnquiryRecord, AcademyEnquiryStatus } from '../../types';

const STATUS_OPTIONS: Array<{ value: AcademyEnquiryStatus; label: string; badgeClass: string }> = [
  { value: 'new', label: 'New', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' },
  { value: 'contacted', label: 'Contacted', badgeClass: 'bg-sky-100 text-sky-900 border-sky-300' },
  { value: 'enrolled', label: 'Enrolled', badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
];

export function AcademyEnquiriesPanel() {
  const [items, setItems] = useState<AcademyEnquiryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | AcademyEnquiryStatus>('all');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void (async () => {
      try {
        const user = await supabase.auth.getUser();
        if (user.error || !user.data.user) {
          throw new Error('Sign in as the studio owner to view Makeup Academy enquiries.');
        }
        const result = await supabase
          .from('studioflow_academy_enquiries')
          .select(
            'id,website_slug,owner_id,customer_id,name,phone,email,city,course,batch,message,status,created_at,updated_at',
          )
          .eq('owner_id', user.data.user.id)
          .order('created_at', { ascending: false })
          .limit(200);
        if (result.error) throw result.error;
        if (active) setItems(((result.data as unknown) as AcademyEnquiryRecord[]) || []);
      } catch (err) {
        if (active) {
          setError(
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message?: unknown }).message || 'Academy enquiries could not load.')
              : 'Academy enquiries could not load.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [retry]);

  const handleStatusChange = async (enquiryId: string, nextStatus: AcademyEnquiryStatus) => {
    setStatusError('');
    setUpdatingId(enquiryId);
    try {
      const res = await supabase.rpc('studioflow_academy_enquiry_set_status', {
        p_enquiry_id: enquiryId,
        p_status: nextStatus,
      });
      if (res.error) throw res.error;
      setItems((prev) =>
        prev.map((row) =>
          row.id === enquiryId
            ? { ...row, status: nextStatus, updated_at: new Date().toISOString() }
            : row,
        ),
      );
    } catch (err) {
      setStatusError(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message || 'Failed to update status.')
          : 'Failed to update status.',
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const visibleItems =
    filter === 'all' ? items : items.filter((item) => item.status === filter);

  const counts = {
    all: items.length,
    new: items.filter((i) => i.status === 'new').length,
    contacted: items.filter((i) => i.status === 'contacted').length,
    enrolled: items.filter((i) => i.status === 'enrolled').length,
  };

  return (
    <section className="workspace-card" aria-labelledby="vn-academy-enquiries-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 id="vn-academy-enquiries-heading" className="flex items-center gap-2">
            <GraduationCap size={20} /> Makeup Academy Enquiries
          </h2>
          <p className="muted">
            Prospective students who submitted the Academy Enquire / Enroll form on your Vogue Noir website.
          </p>
        </div>
        <button
          type="button"
          className="secondary-action inline-flex items-center gap-1.5"
          onClick={() => setRetry((n) => n + 1)}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Filter academy enquiries by status">
        {(
          [
            ['all', `All (${counts.all})`],
            ['new', `New (${counts.new})`],
            ['contacted', `Contacted (${counts.contacted})`],
            ['enrolled', `Enrolled (${counts.enrolled})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              filter === key
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {statusError && (
        <p role="alert" className="text-red-700 text-sm mb-3">
          {statusError}
        </p>
      )}

      {loading && <p role="status">Loading academy enquiries…</p>}
      {error && (
        <p role="alert" className="text-amber-800 text-sm">
          {error}
        </p>
      )}
      {!loading && !error && visibleItems.length === 0 && (
        <p className="muted">
          No academy enquiries {filter === 'all' ? 'received yet' : `with status "${filter}"`}.
        </p>
      )}

      {!loading && !error && visibleItems.length > 0 && (
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const statusMeta =
              STATUS_OPTIONS.find((s) => s.value === item.status) || STATUS_OPTIONS[0];
            const cleanDigits = (item.phone || '').replace(/[^0-9]/g, '');
            const waDigits = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
            return (
              <article
                key={item.id}
                className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-base text-slate-900">
                        {item.name}
                      </strong>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 mt-1">
                      Course: <span className="font-semibold">{item.course}</span>
                      {item.city ? ` · City: ${item.city}` : ''}{item.batch ? ` · Batch: ${item.batch}` : ''}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Received{' '}
                      {new Date(item.created_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })}{' '}
                      IST
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs text-slate-600 flex items-center gap-1.5">
                      <span>Status:</span>
                      <select
                        aria-label={`Status for ${item.name}`}
                        disabled={updatingId === item.id}
                        value={item.status}
                        onChange={(e) =>
                          void handleStatusChange(
                            item.id,
                            e.target.value as AcademyEnquiryStatus,
                          )
                        }
                        className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white text-slate-900"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <a
                      href={`tel:${item.phone}`}
                      className="secondary-action text-xs inline-flex items-center gap-1"
                    >
                      <Phone size={13} /> {item.phone}
                    </a>
                    {item.email && (
                      <a
                        href={`mailto:${item.email}`}
                        className="secondary-action text-xs inline-flex items-center gap-1"
                      >
                        <Mail size={13} /> Email
                      </a>
                    )}
                    {waDigits && (
                      <a
                        href={`https://wa.me/${waDigits}?text=${encodeURIComponent(
                          `Hello ${item.name}, thank you for enquiring about ${item.course}. Here is your batch & syllabus information:`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="secondary-action text-xs inline-flex items-center gap-1"
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                {item.message && (
                  <p className="text-sm text-slate-700 mt-3 pt-2.5 border-t border-slate-100">
                    {item.message}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

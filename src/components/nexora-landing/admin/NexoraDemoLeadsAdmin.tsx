import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { NEXORA_PUBLIC_ORIGIN } from '../../../lib/publicSeo';
import '../nexoraLanding.css';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed' | 'spam';

interface DemoLead {
  id: string;
  created_at: string;
  status: LeadStatus;
  full_name: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  preferred_contact: string | null;
  interested_plan_key: string | null;
  page_path: string | null;
  consent_given: boolean;
  consent_at: string | null;
  privacy_notice_version: string | null;
  crm_delivery_state: string | null;
  crm_attempts: number | null;
  crm_last_error_code: string | null;
  last_contacted_at: string | null;
  retention_expires_at: string | null;
  admin_notes?: string | null;
}

interface AuditEntry {
  id: string;
  lead_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
}

const STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'closed', 'spam'];

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

/**
 * Manager view of the demo-request register.
 *
 * The list, the audit trail and the status changes are read and written with
 * the signed-in manager's own session, so the database policies decide what
 * is visible. Erasure and the CSV export go through the server route, which
 * verifies the same session and holds the privileged credential.
 */
export function NexoraDemoLeadsAdmin() {
  const [session, setSession] = useState<any>(null);
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const role = session?.user?.app_metadata?.site_role;
  const isManager = role === 'site_admin' || role === 'sales';

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadLeads = useCallback(async () => {
    if (!isManager) return;
    setBusy(true);
    try {
      const response = await fetch('/api/nexora-demo-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', status: statusFilter || undefined, limit: 100 }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        setMessage(result.error || 'The demo-request register could not be read.');
        return;
      }
      setLeads(Array.isArray(result.leads) ? result.leads : []);
      setMessage('');
    } catch {
      setMessage('The demo-request register could not be reached.');
    } finally {
      setBusy(false);
    }
  }, [isManager, statusFilter]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const selected = useMemo(() => leads.find((lead) => lead.id === selectedId) ?? null, [leads, selectedId]);

  const loadAudit = useCallback(async (leadId: string) => {
    const { data, error } = await supabase
      .from('landing_lead_audit')
      .select('id, lead_id, action, from_status, to_status, note, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) {
      setAudit([]);
      return;
    }
    setAudit((data ?? []) as AuditEntry[]);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setAudit([]);
      return;
    }
    void loadAudit(selectedId);
  }, [selectedId, loadAudit]);

  const saveLead = async (status: LeadStatus) => {
    if (!selected) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('landing_leads')
        .update({ status, admin_notes: note.trim() || null, last_contacted_at: new Date().toISOString() })
        .eq('id', selected.id);
      if (error) {
        setMessage('This request could not be updated.');
        return;
      }
      setMessage(`Request marked as ${status}.`);
      setNote('');
      await loadLeads();
      await loadAudit(selected.id);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/nexora-demo-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok || typeof result.csv !== 'string') {
        setMessage(result.error || 'The register could not be exported.');
        return;
      }
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nexora-demo-leads.csv';
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`Exported ${result.count} request(s).`);
    } catch {
      setMessage('The register could not be exported.');
    } finally {
      setBusy(false);
    }
  };

  const eraseLead = async () => {
    if (!selected) return;
    if (!window.confirm('Delete this demo request permanently? The stored details and its history are removed.')) return;
    setBusy(true);
    try {
      const response = await fetch('/api/nexora-demo-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'erase', id: selected.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        setMessage(result.error || 'This request could not be deleted.');
        return;
      }
      setMessage('The request was deleted.');
      setSelectedId(null);
      await loadLeads();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sl-page">
      <a className="sl-skip" href="#sl-main">
        Skip to main content
      </a>
      <header className="sl-header">
        <div className="sl-container sl-header__inner">
          <a className="sl-brand" href="/">
            <span className="sl-brand__mark" aria-hidden="true">
              N
            </span>
            <span className="sl-brand__text">
              <strong>NEXORA</strong>
              <span>SALONOS</span>
            </span>
          </a>
          <nav className="sl-header__nav" aria-label="Primary">
            <a className="sl-header__link" href="/pricing">
              Pricing
            </a>
            <a className="sl-header__link" href="/salon-os">
              Product
            </a>
            <a className="sl-header__link" href="/">
              Home
            </a>
          </nav>
        </div>
      </header>

      <main id="sl-main" className="sl-main">
        <section className="sl-section">
          <div className="sl-container">
            <span className="sl-section-kicker">DEMO REQUESTS</span>
            <h1 className="sl-section__title">Demo-request register</h1>

            {loading ? <p role="status">Checking your session…</p> : null}

            {!loading && !session ? (
              <p>
                Sign in with a manager account to work with the demo requests.{' '}
                <a href="/login">Sign in</a>
              </p>
            ) : null}

            {!loading && session && !isManager ? (
              <p role="status">
                This account is not registered as a manager of the demo-request register, so no request is shown.
              </p>
            ) : null}

            {isManager ? (
              <>
                <div className="nx-admin__toolbar">
                  <label htmlFor="nx-lead-status">
                    Status
                    <select
                      id="nx-lead-status"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      <option value="">All</option>
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="sl-btn sl-btn--ghost" onClick={() => void loadLeads()} disabled={busy}>
                    Refresh
                  </button>
                  <button type="button" className="sl-btn sl-btn--ghost" onClick={() => void exportCsv()} disabled={busy}>
                    Export CSV
                  </button>
                </div>

                {message ? <p role="status" className="nx-admin__message">{message}</p> : null}

                <div className="nx-admin__grid">
                  <div className="nx-admin__list">
                    <h2>Requests ({leads.length})</h2>
                    {leads.length === 0 ? (
                      <p>No demo request matches this filter yet.</p>
                    ) : (
                      <table className="nx-admin__table">
                        <caption className="sl-visually-hidden">Demo requests, newest first</caption>
                        <thead>
                          <tr>
                            <th scope="col">Received</th>
                            <th scope="col">Name</th>
                            <th scope="col">Business</th>
                            <th scope="col">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leads.map((lead) => (
                            <tr key={lead.id} className={lead.id === selectedId ? 'is-selected' : undefined}>
                              <td>
                                <button type="button" className="nx-admin__row-button" onClick={() => setSelectedId(lead.id)}>
                                  {formatDate(lead.created_at)}
                                </button>
                              </td>
                              <td>{lead.full_name}</td>
                              <td>{lead.business_name || '—'}</td>
                              <td>{lead.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="nx-admin__detail">
                    {selected ? (
                      <>
                        <h2>Request detail</h2>
                        <dl className="nx-admin__fields">
                          <dt>Name</dt>
                          <dd>{selected.full_name}</dd>
                          <dt>Business</dt>
                          <dd>{selected.business_name || '—'}</dd>
                          <dt>Email</dt>
                          <dd>{selected.email || '—'}</dd>
                          <dt>Phone</dt>
                          <dd>{selected.phone || '—'}</dd>
                          <dt>City</dt>
                          <dd>{selected.city || '—'}</dd>
                          <dt>Plan</dt>
                          <dd>{selected.interested_plan_key || '—'}</dd>
                          <dt>Page</dt>
                          <dd>{selected.page_path || '—'}</dd>
                          <dt>Consent</dt>
                          <dd>
                            {selected.consent_given ? `Given ${formatDate(selected.consent_at)}` : '—'} ({selected.privacy_notice_version || 'no version'})
                          </dd>
                          <dt>CRM delivery</dt>
                          <dd>
                            {selected.crm_delivery_state || 'not_attempted'}
                            {selected.crm_last_error_code ? ` (${selected.crm_last_error_code})` : ''}
                          </dd>
                          <dt>Retained until</dt>
                          <dd>{formatDate(selected.retention_expires_at)}</dd>
                        </dl>

                        <label className="nx-admin__note" htmlFor="nx-lead-note">
                          Internal note
                          <textarea
                            id="nx-lead-note"
                            value={note}
                            maxLength={2000}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="Only managers can read this note."
                          />
                        </label>

                        <div className="nx-admin__actions">
                          {STATUSES.map((status) => (
                            <button
                              key={status}
                              type="button"
                              className="sl-btn sl-btn--ghost"
                              disabled={busy || selected.status === status}
                              onClick={() => void saveLead(status)}
                            >
                              Mark {status}
                            </button>
                          ))}
                          <button type="button" className="sl-btn sl-btn--ghost" disabled={busy} onClick={() => void eraseLead()}>
                            Delete request
                          </button>
                        </div>

                        <h3>History</h3>
                        {audit.length === 0 ? (
                          <p>No recorded change yet.</p>
                        ) : (
                          <ul className="nx-admin__audit">
                            {audit.map((entry) => (
                              <li key={entry.id}>
                                {formatDate(entry.created_at)} — {entry.action}
                                {entry.from_status || entry.to_status ? ` (${entry.from_status || '—'} → ${entry.to_status || '—'})` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <p>Select a request to see its details, notes and history.</p>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="sl-footer">
        <div className="sl-container">
          <p className="sl-footer__copy">© {new Date().getFullYear()} Nexora SalonOS.</p>
          <nav className="sl-footer__nav" aria-label="Footer">
            <a href="/pricing">Pricing</a>
            <a href="/salon-os">Product</a>
            <a href="/privacy">Privacy notice</a>
            <a href={`${NEXORA_PUBLIC_ORIGIN}/`}>Home</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

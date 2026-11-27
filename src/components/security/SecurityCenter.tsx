import { useCallback, useEffect, useState, type FormEvent } from 'react';

export type Credentials = { getAccessToken: () => Promise<string | undefined> };
type Domain = { id: string; hostname: string; state: string; verified_until?: string; running?: number };
type Scope = { id: string; domain_id: string; valid_until: string; revoked_at?: string };
type Job = { id: string; scope_id: string; state: string };
type Snapshot = { domains: Domain[]; scopes: Scope[]; jobs: Job[] };
type Challenge = { id: string; record: string; value: string; expires_at: string };
const emptySnapshot: Snapshot = { domains: [], scopes: [], jobs: [] };
const messages: Record<string, string> = {
  not_found: 'This action is unavailable for your account or its current scope.',
  forbidden: 'This action needs an authorized role and two-step verification.',
  authentication_required: 'Sign in again to continue.',
  rate_limited: 'The request limit has been reached. Wait before retrying.',
  proof_missing: 'The requested DNS TXT record was not found.',
  hostname_unavailable: 'This hostname cannot be verified with this claim.',
  revoke_before_renewal: 'Revoke the current verification before requesting a new record.',
  unavailable: 'The Security Center is temporarily unavailable.',
  case_changed: 'The case changed. Reload before updating.',
  case_exists: 'That case reference is already in use.',
  invalid_transition: 'The case cannot move to that state with this account.',

};

export function useSecurityApi(getAccessToken: Credentials['getAccessToken']) {
  return useCallback(async <T,>(action: string, fields = {}, download = false): Promise<T> => {
    const token = await getAccessToken();
    if (!token) throw new Error(messages.authentication_required);
    const response = await fetch('/api/security-center', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      cache: 'no-store',
      body: JSON.stringify({ action, ...fields }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(messages[data.error] ?? messages.unavailable);
    }
    if (download) {
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      const attachment = response.headers.get('Content-Disposition')?.match(/filename="([a-z0-9.-]+)"/i);
      link.download = attachment?.[1] ?? 'nexora-report.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return undefined as T;
    }
    return response.json();
  }, [getAccessToken]);
}

export function useAction() {
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (task: () => Promise<void>, success = '') => {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await task();
      setStatus(success);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : messages.unavailable);
    } finally {
      setBusy(false);
    }
  }, []);
  return { run, error, status, busy };
}

export function OwnerSecurityCenter({ getAccessToken }: Credentials) {
  const api = useSecurityApi(getAccessToken);
  const { run, error, status, busy } = useAction();
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [host, setHost] = useState('');
  const [challenge, setChallenge] = useState<Challenge>();
  const [alerts, setAlerts] = useState<DnsAlert[]>([]);
  const refresh = useCallback(async () => {
    const [owned, inbox] = await Promise.all([api<Snapshot>('list'), api<DnsAlert[]>('dns_alerts')]);
    setSnapshot(owned);
    setAlerts(inbox);
  }, [api]);

  useEffect(() => { void run(refresh); }, [refresh, run]);

  function claim(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      setChallenge(await api<Challenge>('claim', { hostname: host }));
      await refresh();
    });
  }

  async function domainAction(action: string, id: string) {
    await api(action, { id });
    if (challenge?.id === id) setChallenge(undefined);
    await refresh();
  }

  return <section aria-label="Salon Security Center">
    <h2>Salon Security Center</h2>
    <p role="status">{busy ? 'Working…' : status}</p>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={busy}>
      <legend>Domains and DNS posture</legend>
      <form onSubmit={claim}>
        <label>Hostname <input required value={host} maxLength={253} onChange={event => setHost(event.target.value)} /></label>
        <button>Add domain</button>
      </form>
      {challenge && <section aria-label="DNS proof instructions">
        <p>Add a TXT record for <code>{challenge.record}</code>.</p>
        <p>TXT value <code>{challenge.value}</code></p>
        <p>Expires <time dateTime={challenge.expires_at}>{new Date(challenge.expires_at).toLocaleString()}</time></p>
      </section>}
      <button type="button" onClick={() => void run(refresh)}>Refresh</button>
      <ul>{snapshot.domains.map(domain => <li key={domain.id}>
        <strong>{domain.hostname}</strong> · {domain.state}
        {domain.state === 'pending' && <button type="button"
          onClick={() => void run(() => domainAction('verify', domain.id), 'Domain verified.')}>Verify TXT</button>}
        {domain.state !== 'revoked' && <button type="button"
          onClick={() => void run(() => domainAction('revoke', domain.id), 'Domain revoked.')}>Revoke domain</button>}
        {domain.state === 'verified' && snapshot.scopes.filter(scope => scope.domain_id === domain.id &&
          !scope.revoked_at && Date.parse(scope.valid_until) > Date.now()).slice(0, 1).map(scope =>
          <button key={scope.id} type="button" onClick={() => void run(async () => {
            await api('request', { id: scope.id, request_key: crypto.randomUUID() });
            await refresh();
          }, 'DNS posture request recorded.')}>Request DNS check</button>)}
      </li>)}</ul>
    </fieldset>
    <fieldset disabled={busy}>
      <legend>DNS re-verification alerts</legend>
      <DnsAlertList rows={alerts} onAcknowledge={row => void run(async () => {
        await api('dns_ack', { id: row.domain_id, kind: row.kind });
        await refresh();
      })} />
    </fieldset>
    <fieldset disabled={busy}>
      <legend>Check history</legend>
      <ul>{snapshot.jobs.map(job => <li key={job.id}>
        <code>{job.id}</code> · {job.state}
        {job.state === 'running' && <button type="button" onClick={() => void run(async () => {
          const result = await api<Job>('cancel', { id: job.id });
          await refresh();
          if (result.state !== 'cancelled') throw new Error('The check already ended: ' + result.state);
        }, 'Cancellation recorded.')}>Cancel</button>}
        {job.state === 'completed' && <ReportButtons onDownload={format => void run(async () => {
          await api('report', { id: job.id, format }, true);
        })} />}
      </li>)}</ul>
    </fieldset>
  </section>;
}

export function AdminSecurityCenter({ getAccessToken }: Credentials) {
  const api = useSecurityApi(getAccessToken);
  const { run, error, status, busy } = useAction();
  const [ticket, setTicket] = useState('');
  const [id, setId] = useState('');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [audit, setAudit] = useState<{ id: number; action: string; created_at: string }[]>([]);
  const [confirmStop, setConfirmStop] = useState(false);
  const [alerts, setAlerts] = useState<DnsAlert[]>([]);

  return <section aria-label="Admin Security Center">
    <h2>NEXORA Security Center</h2>
    <p role="status">{busy ? 'Working…' : status}</p>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={busy}>
      <legend>Admin operations</legend>
      <label>Case reference <input value={ticket} maxLength={64} onChange={event => setTicket(event.target.value)} /></label>
      <button type="button" onClick={() => void run(async () => setDomains(await api<Domain[]>('inventory', { ticket })))}>
        Load domain inventory
      </button>
      <button type="button" onClick={() => void run(async () => setAudit(await api<typeof audit>('audit', { ticket })))}>
        Load audit activity
      </button>
      <button type="button" onClick={() => void run(async () => setAlerts(await api<DnsAlert[]>('dns_admin_alerts', { ticket })))}>
        Load DNS alerts
      </button>
      <DnsAlertList rows={alerts} />
      <ul>{domains.map(domain => <li key={domain.id}>
        {domain.hostname} · {domain.state} · {domain.running ?? 0} active tenant checks
        {domain.state === 'verified' && <button type="button" onClick={() => void run(async () => {
          await api('approve', { id: domain.id, ticket });
        }, 'DNS posture scope approved.')}>Approve DNS scope</button>}
      </li>)}</ul>
      <label>Job ID <input value={id} onChange={event => setId(event.target.value)} /></label>
      <button type="button" onClick={() => void run(async () => { const result = await api<Job>('admin_cancel', { id, ticket });
        if (result.state !== 'cancelled') throw new Error('The check already ended: ' + result.state); },
        'Cancellation recorded.')}>Cancel job</button>
      <ReportButtons onDownload={format => void run(async () => { await api('admin_report', { id, ticket, format }, true); })} />
      <label><input type="checkbox" checked={confirmStop} onChange={event => setConfirmStop(event.target.checked)} />
        Confirm emergency stop</label>
      <button type="button" disabled={!confirmStop} onClick={() => void run(async () => {
        await api('stop', { ticket, stopped: true });
        setConfirmStop(false);
      }, 'New DNS checks are paused.')}>Stop checks</button>
      <ul>{audit.map(event => <li key={event.id}>{event.action} · {new Date(event.created_at).toLocaleString()}</li>)}</ul>
    </fieldset>
  </section>;
}


export type ReportFormat = 'json' | 'pdf';

export function ReportButtons({ onDownload }: { onDownload: (format: ReportFormat) => void }) {
  return <>
    <button type="button" onClick={() => onDownload('pdf')}>Download PDF</button>
    <button type="button" onClick={() => onDownload('json')}>Download JSON</button>
  </>;
}

type DnsAlert = { domain_id: string; kind: 'renew_soon' | 'proof_missing' | 'delegation_changed' |
  'resolver_unavailable' | 'expired'; hostname: string; created_at: string; acknowledged_at?: string };
const alertText: Record<DnsAlert['kind'],string> = {
  renew_soon: 'Verification expires within seven days. Plan a fresh TXT verification.',
  proof_missing: 'The verification record is missing. Re-verify to request a new approval.',
  delegation_changed: 'The approved zone name servers changed. Re-verify the domain.',
  resolver_unavailable: 'The DNS resolver did not return a usable answer. The monitor will retry.',
  expired: 'Verification expired. Create a new TXT challenge.',
};

function DnsAlertList({ rows, onAcknowledge }: { rows: DnsAlert[]; onAcknowledge?: (row: DnsAlert) => void }) {
  if (!rows.length) return <p>No DNS alerts loaded.</p>;
  return <ul>{rows.map(row => <li key={row.domain_id + row.kind}>
    <strong>{row.hostname}</strong> · {alertText[row.kind]}
    {' '}<time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString()}</time>
    {row.acknowledged_at ? ' · Acknowledged' : onAcknowledge && <button type="button"
      onClick={() => onAcknowledge(row)}>Acknowledge</button>}
  </li>)}</ul>;
}

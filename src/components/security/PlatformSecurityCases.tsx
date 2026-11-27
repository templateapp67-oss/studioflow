import { useState, type FormEvent } from 'react';
import { ReportButtons, useAction, useSecurityApi, type Credentials } from './SecurityCenter';

type State = 'open' | 'triaged' | 'remediating' | 'review' | 'closed' | 'cancelled';
type Case = { id: string; ticket: string; title: string; category: string; severity: string; state: State; version: number };
const transitions: Record<State,State[]> = {
  open: ['triaged','cancelled'], triaged: ['remediating','cancelled'],
  remediating: ['review','cancelled'], review: ['remediating','closed','cancelled'],
  closed: [], cancelled: [],
};

export function PlatformSecurityCases({ getAccessToken, canRead, canWrite, canApprove }:
    Credentials & { canRead: boolean; canWrite: boolean; canApprove: boolean }) {
  const api = useSecurityApi(getAccessToken);
  const { run, busy, error, status } = useAction();
  const [ticket, setTicket] = useState('');
  const [rows, setRows] = useState<Case[]>([]);
  const [more, setMore] = useState(false);
  const [audit, setAudit] = useState<{ id: number; action: string; created_at: string }[]>([]);

  async function refresh(beforeId?: string) {
    const page = await api<Case[]>(beforeId ? 'platform_next' : 'platform_list',
      beforeId ? { ticket, before_id: beforeId } : { ticket });
    setRows(previous => beforeId ? previous.concat(page) : page);
    setMore(page.length === 50);
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    void run(async () => {
      await api('platform_create',data);
      if (canRead && ticket) await refresh();
    },'Platform case created.');
  }

  return <section aria-label="Platform security cases">
    <h2>Platform security cases</h2>
    <p role="status">{busy ? 'Working…' : status}</p>
    {error && <p role="alert">{error}</p>}
    {canWrite && <form onSubmit={create}><fieldset disabled={busy}>
      <legend>New case</legend>
      <label>Case reference <input name="ticket" required pattern="[A-Za-z0-9_\-]{3,64}" /></label>
      <label>Title <input name="title" required minLength={5} maxLength={120} /></label>
      <label>Reviewed summary <input name="summary" required minLength={5} maxLength={1500} /></label>
      <label>Category <select name="category">{['website','api','infrastructure','privacy','other']
        .map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Severity <select name="severity">{['info','low','medium','high','critical']
        .map(item => <option key={item}>{item}</option>)}</select></label>
      <button>Create case</button>
    </fieldset></form>}
    {canRead && <fieldset disabled={busy}>
      <legend>Case queue</legend>
      <label>Access reason reference <input value={ticket} maxLength={64}
        onChange={event => setTicket(event.target.value)} /></label>
      <button type="button" onClick={() => void run(() => refresh())}>Load cases</button>
      <button type="button" onClick={() => void run(async () => {
        setAudit(await api<typeof audit>('platform_audit',{ ticket }));
      })}>Load platform audit</button>
      <ul>{audit.map(event => <li key={event.id}>{event.action} · {new Date(event.created_at).toLocaleString()}</li>)}</ul>
      <ul>{rows.map(item => <li key={item.id}>
        <strong>{item.ticket} · {item.title}</strong> · {item.severity} · {item.state}
        <ReportButtons onDownload={format => void run(async () => {
          await api('platform_report',{ ticket, id: item.id, format },true);
        })} />
        {transitions[item.state].filter(state =>
          ['closed','cancelled'].includes(state) ? canApprove : canWrite
        ).map(state => <button type="button" key={state} onClick={() => void run(async () => {
          const revised = await api<Pick<Case,'id'|'state'|'version'>>('platform_transition',
            { ticket, id: item.id, state, version: item.version });
          setRows(previous => previous.map(current => current.id === revised.id ? { ...current,...revised } : current));
        },'Case updated.')}>Move to {state}</button>)}
      </li>)}</ul>
      {more && <button type="button" onClick={() => void run(() => refresh(rows.at(-1)?.id))}>Load more</button>}
    </fieldset>}
  </section>;
}

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';

type DemoContextValue = { openDemo: () => void };
const DemoContext = createContext<DemoContextValue | null>(null);

type DemoLead = { name: string; email: string; salonName: string; phone: string; city: string; consent: boolean; website: string };
const initialLead: DemoLead = { name: '', email: '', salonName: '', phone: '', city: '', consent: false, website: '' };

export function useDemoDialog() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('useDemoDialog must be used inside DemoProvider');
  return context;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState(initialLead);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const nameId = useId();
  const emailId = useId();
  const salonId = useId();
  const phoneId = useId();
  const cityId = useId();
  const consentId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const openDemo = useCallback(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setLead(initialLead);
    setMessage('');
    setSubmitted(false);
    setOpen(true);
  }, []);
  const closeDemo = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    nameRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDemo();
      if (event.key !== 'Tab') return;
      const dialog = document.getElementById('nexora-demo-dialog');
      const focusable = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, closeDemo]);

  const submitLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch('/api/nexora-demo-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'We could not send your request. Please try again later.');
      setSubmitted(true);
      setMessage('Your demo request has been received. Nexora will contact you using the details you provided.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not send your request. No request was confirmed. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return <DemoContext.Provider value={{ openDemo }}>
    {children}
    {open && <div className="np-demo-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !submitting) closeDemo(); }}>
      <section id="nexora-demo-dialog" className="np-demo-dialog" role="dialog" aria-modal="true" aria-labelledby="nexora-demo-title" aria-describedby="nexora-demo-description">
        <button className="np-demo-close" type="button" aria-label="Close demo request" disabled={submitting} onClick={closeDemo}><X size={20}/></button>
        {!submitted ? <>
          <span className="np-section-kicker">NEXORA SALONOS</span>
          <h2 id="nexora-demo-title">Request a product demo</h2>
          <p id="nexora-demo-description">Tell us how to reach you. Your request will only be confirmed after it is accepted by Nexora’s configured demo-request system.</p>
          <form className="np-demo-form" onSubmit={submitLead}>
            <label htmlFor={nameId}>Your name<input ref={nameRef} id={nameId} autoComplete="name" maxLength={100} required value={lead.name} onChange={event => setLead({ ...lead, name: event.target.value })}/></label>
            <label htmlFor={emailId}>Work email<input id={emailId} type="email" autoComplete="email" maxLength={254} required value={lead.email} onChange={event => setLead({ ...lead, email: event.target.value })}/></label>
            <label htmlFor={salonId}>Salon or business name<input id={salonId} autoComplete="organization" maxLength={120} required value={lead.salonName} onChange={event => setLead({ ...lead, salonName: event.target.value })}/></label>
            <div className="np-demo-form-row"><label htmlFor={phoneId}>Phone <span>(optional)</span><input id={phoneId} type="tel" autoComplete="tel" inputMode="tel" maxLength={20} value={lead.phone} onChange={event => setLead({ ...lead, phone: event.target.value })}/></label><label htmlFor={cityId}>City <span>(optional)</span><input id={cityId} autoComplete="address-level2" maxLength={80} value={lead.city} onChange={event => setLead({ ...lead, city: event.target.value })}/></label></div>
            <label className="np-demo-honeypot" aria-hidden="true">Leave this field empty<input tabIndex={-1} autoComplete="off" value={lead.website} onChange={event => setLead({ ...lead, website: event.target.value })}/></label>
            <label className="np-demo-consent" htmlFor={consentId}><input id={consentId} type="checkbox" required checked={lead.consent} onChange={event => setLead({ ...lead, consent: event.target.checked })}/><span>I agree that Nexora may use these details to respond to my demo request.</span></label>
            {message && <p className="np-demo-message" role="status">{message}</p>}
            <button className="np-demo-submit" type="submit" disabled={submitting}>{submitting ? 'Sending request…' : 'Request a demo'}</button>
            <small className="np-demo-privacy">Your details are sent only through the server-side demo integration. No API keys or CRM credentials are exposed in the browser.</small>
          </form>
        </> : <div className="np-demo-success"><span aria-hidden="true">✓</span><h2 id="nexora-demo-title">Request received</h2><p id="nexora-demo-description" role="status">{message}</p><button className="np-demo-submit" type="button" onClick={closeDemo}>Done</button></div>}
      </section>
    </div>}
  </DemoContext.Provider>;
}

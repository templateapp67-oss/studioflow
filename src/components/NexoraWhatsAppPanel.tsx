import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

type Connection = {
  connection_status: string;
  display_phone_number: string;
  verified_name: string | null;
  webhook_subscribed: boolean;
  connected_at: string | null;
  disconnected_at: string | null;
  connection_mode?: string;
  is_on_biz_app?: boolean;
};
type Metrics = {
  whatsappBookings: number;
  confirmedBookings: number;
  bookingRequests: number;
  cancellations: number;
  inboundMessages: number;
  outboundMessages: number;
  deliveredMessages: number;
  paymentLinks: number;
  paidPayments: number;
  pendingPayments: number;
  whatsappAdvanceCollectedINR: number;
};
type PanelStatus = {
  configured: boolean;
  connection: Connection | null;
  metrics: Metrics;
};
type SignupConfig = {
  configured: boolean;
  appId: string | null;
  configId: string | null;
  graphVersion: string;
};
type MetaLoginResponse = {
  authResponse?: { code?: string; accessToken?: string };
  status?: string;
};
type MetaSdk = {
  init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
  login: (callback: (response: MetaLoginResponse) => void, options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    FB?: MetaSdk;
  }
}

const EMPTY_METRICS: Metrics = {
  whatsappBookings: 0,
  confirmedBookings: 0,
  bookingRequests: 0,
  cancellations: 0,
  inboundMessages: 0,
  outboundMessages: 0,
  deliveredMessages: 0,
  paymentLinks: 0,
  paidPayments: 0,
  pendingPayments: 0,
  whatsappAdvanceCollectedINR: 0,
};

function money(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

function loadFacebookSdk() {
  return new Promise<MetaSdk>((resolve, reject) => {
    if (window.FB) {
      resolve(window.FB);
      return;
    }
    const existing = document.getElementById('facebook-jssdk') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => window.FB ? resolve(window.FB) : reject(new Error('Meta login could not load.')));
      existing.addEventListener('error', () => reject(new Error('Meta login could not load.')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.onload = () => window.FB ? resolve(window.FB) : reject(new Error('Meta login did not initialise.'));
    script.onerror = () => reject(new Error('Meta login could not load. Check your internet connection and try again.'));
    document.head.appendChild(script);
  });
}

async function runEmbeddedSignup(config: SignupConfig, state: string) {
  if (!config.appId || !config.configId) throw new Error('Meta Embedded Signup v4 is not configured.');
  const FB = await loadFacebookSdk();
  FB.init({ appId: config.appId, cookie: true, xfbml: false, version: config.graphVersion });

  return new Promise<{ code: string; wabaId: string; phoneNumberId: string }>((resolve, reject) => {
    let code = '';
    let wabaId = '';
    let phoneNumberId = '';
    let finished = false;
    let timer: number | undefined;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      if (timer) window.clearTimeout(timer);
    };
    const finish = () => {
      if (finished || !code || !wabaId || !phoneNumberId) return;
      finished = true;
      cleanup();
      resolve({ code, wabaId, phoneNumberId });
    };
    const fail = (message: string) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error(message));
    };
    const onMessage = (event: MessageEvent) => {
      const allowed = event.origin === 'https://www.facebook.com' || event.origin === 'https://web.facebook.com';
      if (!allowed) return;
      let data: Record<string, unknown>;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) as Record<string, unknown> : event.data as Record<string, unknown>;
      } catch {
        return;
      }
      if (!data || data.type !== 'WA_EMBEDDED_SIGNUP') return;
      const eventName = String(data.event || '').toUpperCase();
      const payload = data.data && typeof data.data === 'object' ? data.data as Record<string, unknown> : {};
      if (eventName === 'FINISH' || eventName === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
        wabaId = typeof payload.waba_id === 'string' ? payload.waba_id : '';
        phoneNumberId = typeof payload.phone_number_id === 'string' ? payload.phone_number_id : '';
        finish();
      } else if (eventName === 'CANCEL') {
        fail('WhatsApp setup was cancelled in Meta. Your existing salon settings are unchanged.');
      } else if (eventName === 'ERROR') {
        fail(typeof payload.error_message === 'string' ? payload.error_message : 'Meta reported a WhatsApp setup error.');
      }
    };

    window.addEventListener('message', onMessage);
    timer = window.setTimeout(() => fail('Meta setup did not finish. Please try connecting again.'), 180000);

    FB.login((response) => {
      const returnedCode = response.authResponse?.code;
      if (typeof returnedCode === 'string' && returnedCode) {
        code = returnedCode;
        finish();
      } else if (response.status === 'unknown' || !response.authResponse) {
        fail('Meta login was closed before the WhatsApp number was connected.');
      } else {
        fail('Meta did not return a short-lived connection code. Please start again.');
      }
    }, {
      config_id: config.configId,
      auth_type: 'rerequest',
      response_type: 'code',
      override_default_response_type: true,
      extras: {},
    });
  }).then((result) => ({ ...result, state }));
}

export const NexoraWhatsAppPanel: React.FC<{ onBookingsChanged?: () => Promise<void> | void }> = ({ onBookingsChanged }) => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<PanelStatus | null>(null);
  const [config, setConfig] = useState<SignupConfig | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [configResult, statusResult] = await Promise.all([
      supabase.functions.invoke('nexora-whatsapp-connect', { body: { action: 'config' } }),
      supabase.functions.invoke('nexora-whatsapp-connect', { body: { action: 'status' } }),
    ]);
    if (!mounted.current) return;
    if (configResult.data) setConfig(configResult.data as SignupConfig);
    else setConfig({ configured: false, appId: null, configId: null, graphVersion: 'v27.0' });
    if (statusResult.data) {
      const result = statusResult.data as Partial<PanelStatus>;
      setStatus({
        configured: Boolean(result.configured),
        connection: result.connection || null,
        metrics: { ...EMPTY_METRICS, ...(result.metrics || {}) },
      });
    } else {
      setStatus({ configured: Boolean(configResult.data?.configured), connection: null, metrics: EMPTY_METRICS });
      if (statusResult.error) setNotice({ kind: 'error', text: statusResult.error.message || 'WhatsApp status is not available yet. Deploy the connection function and try again.' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; };
  }, [refresh]);

  const connect = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const begin = await supabase.functions.invoke('nexora-whatsapp-connect', { body: { action: 'begin' } });
      if (begin.error || !begin.data?.state) throw new Error(begin.data?.error || begin.error?.message || 'Could not begin WhatsApp setup.');
      const activeConfig: SignupConfig = {
        configured: true,
        appId: begin.data.appId,
        configId: begin.data.configId,
        graphVersion: begin.data.graphVersion || 'v27.0',
      };
      const result = await runEmbeddedSignup(activeConfig, begin.data.state);
      const completed = await supabase.functions.invoke('nexora-whatsapp-connect', {
        body: { action: 'complete', state: result.state, code: result.code, wabaId: result.wabaId, phoneNumberId: result.phoneNumberId },
      });
      if (completed.error || !completed.data?.ok) throw new Error(completed.data?.error || completed.error?.message || 'WhatsApp connection could not be saved.');
      setNotice({ kind: 'success', text: `WhatsApp ${completed.data.connection?.display_phone_number || ''} is connected to this salon.` });
      await onBookingsChanged?.();
      await refresh();
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'WhatsApp could not be connected.' });
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect this salon’s WhatsApp number? New WhatsApp messages will no longer reach this dashboard.')) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await supabase.functions.invoke('nexora-whatsapp-connect', { body: { action: 'disconnect' } });
      if (result.error || !result.data?.ok) throw new Error(result.data?.error || result.error?.message || 'Could not disconnect WhatsApp.');
      setNotice({ kind: 'success', text: 'WhatsApp has been disconnected from this salon.' });
      await onBookingsChanged?.();
      await refresh();
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not disconnect WhatsApp.' });
    } finally {
      setBusy(false);
    }
  };

  const connection = status?.connection;
  const metrics = status?.metrics || EMPTY_METRICS;
  const connected = connection?.connection_status === 'connected';

  return (
    <div className="space-y-5">
      <section className="workspace-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">NEXORA WhatsApp Booking</p>
            <h2>Connect your salon’s WhatsApp</h2>
            <p className="muted mt-2 max-w-2xl">
              Customer replies will come from your salon’s own WhatsApp Business number. Each salon has its own connection and private message history.
            </p>
          </div>
          <span className={connected ? 'status confirmed' : 'status pending'}>{connected ? 'Connected' : 'Not connected'}</span>
        </div>

        {notice && (
          <div className={`mt-4 rounded-xl border p-3 text-sm ${notice.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : notice.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-sky-200 bg-sky-50 text-sky-800'}`} role="status">
            {notice.text}
          </div>
        )}

        {loading ? (
          <p className="muted mt-5" role="status">Checking WhatsApp connection…</p>
        ) : connected ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Your connected WhatsApp Business</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{connection?.verified_name || 'Salon WhatsApp'}</p>
                <p className="text-sm text-slate-700">{connection?.display_phone_number}</p>
                <p className="mt-1 text-xs text-slate-500">{connection?.webhook_subscribed ? 'Meta webhook subscribed' : 'Webhook subscription needs attention'}</p>
              </div>
              <button type="button" className="secondary-action" disabled={busy} onClick={disconnect}>{busy ? 'Please wait…' : 'Disconnect number'}</button>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-bold text-slate-900">Connect your own number</h3>
            <p className="muted mt-1">Meta will ask you to choose your Business Portfolio, WhatsApp Business Account and phone number. NEXORA will not use its support number for your customers.</p>
            <button type="button" className="primary-action mt-4" disabled={busy || !config?.configured} onClick={connect}>
              {busy ? 'Connecting…' : 'Connect with Meta'}
            </button>
            {!config?.configured && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <strong>Meta setup is not configured yet.</strong>
                <p className="mt-1">The server needs your Meta App ID, App Secret, Embedded Signup v4 Configuration ID, webhook verify token and a 32-byte encryption key in Supabase Function Secrets. These are platform-level settings, not a salon owner’s WhatsApp password.</p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="workspace-card">
        <p className="eyebrow">WhatsApp activity</p>
        <h2>Bookings & payments from WhatsApp</h2>
        <p className="muted mt-1">These counts come from the salon’s stored booking, payment and message records.</p>
        <div className="metric-grid mt-4">
          <article className="metric-card"><span className="material-symbols-outlined">event_available</span><small>WhatsApp bookings</small><strong>{metrics.whatsappBookings}</strong></article>
          <article className="metric-card"><span className="material-symbols-outlined">check_circle</span><small>Confirmed</small><strong>{metrics.confirmedBookings}</strong></article>
          <article className="metric-card"><span className="material-symbols-outlined">pending_actions</span><small>Requests pending</small><strong>{metrics.bookingRequests}</strong></article>
          <article className="metric-card"><span className="material-symbols-outlined">payments</span><small>Advance collected</small><strong>{money(metrics.whatsappAdvanceCollectedINR)}</strong></article>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3"><small className="block text-slate-500">Messages received</small><strong>{metrics.inboundMessages}</strong></div>
          <div className="rounded-xl bg-slate-50 p-3"><small className="block text-slate-500">Messages sent</small><strong>{metrics.outboundMessages}</strong></div>
          <div className="rounded-xl bg-slate-50 p-3"><small className="block text-slate-500">Payment links</small><strong>{metrics.paymentLinks}</strong></div>
          <div className="rounded-xl bg-slate-50 p-3"><small className="block text-slate-500">Payments pending</small><strong>{metrics.pendingPayments}</strong></div>
        </div>
        <button type="button" className="secondary-action mt-4" disabled={loading || busy} onClick={() => void refresh()}>Refresh WhatsApp activity</button>
      </section>

      <section className="workspace-card">
        <p className="eyebrow">How it works</p>
        <div className="grid gap-3 md:grid-cols-3">
          <div><strong className="block text-slate-900">1. Your salon number</strong><p className="muted mt-1 text-sm">Customer sees replies from the WhatsApp number your salon connected.</p></div>
          <div><strong className="block text-slate-900">2. Your salon calendar</strong><p className="muted mt-1 text-sm">Booking requests are checked against this salon’s services, team and available times.</p></div>
          <div><strong className="block text-slate-900">3. Verified payment</strong><p className="muted mt-1 text-sm">Payment confirmation is sent only after Razorpay verifies the payment on the server.</p></div>
        </div>
      </section>
    </div>
  );
};

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
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
type ConversationPreview = {
  customer_wa_id: string;
  customer_name: string | null;
  conversation_status: string;
  optedOut: boolean;
  needsReply: boolean;
  updated_at: string;
  lastMessage: {
    direction: string;
    metadata: Record<string, unknown>;
    created_at: string;
  } | null;
};
type ChatMessage = {
  direction: string;
  message_kind: string;
  delivery_status: string;
  metadata: Record<string, unknown>;
  created_at: string;
};
type ConversationThread = {
  conversation: {
    customer_wa_id: string;
    customer_name: string | null;
    conversation_status: string;
    optedOut: boolean;
    needsReply: boolean;
  };
  messages: ChatMessage[];
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
  embeddedSignupVersion?: string;
};
type MetaLoginResponse = {
  authResponse?: { code?: string };
  status?: string;
};
type MetaSdk = {
  init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
  login: (callback: (response: MetaLoginResponse) => void, options: Record<string, unknown>) => void;
};

type PreparedSignup = { sdk: MetaSdk; configId: string; state: string };
type SignupResult = {
  state: string;
  code: string;
  wabaId: string;
  phoneNumberId: string;
  businessId: string;
  messagingAccountIds: string[];
  isOnBizApp: boolean;
  primaryWaacIds: string[];
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
    const fail = (message: string) => {
      script.remove();
      reject(new Error(message));
    };
    script.onload = () => window.FB ? resolve(window.FB) : fail('Meta login did not initialise.');
    script.onerror = () => fail('Meta login could not load. Check your internet connection and try again.');
    document.head.appendChild(script);
  });
}

// The caller prepares the SDK and the server-side state on the previous step.
// FB.login must run synchronously on the owner's click to open its popup.
function runEmbeddedSignup({ sdk: FB, configId, state }: PreparedSignup) {
  return new Promise<SignupResult>((resolve, reject) => {
    let code = '';
    let wabaId = '';
    let phoneNumberId = '';
    let businessId = '';
    let messagingAccountIds: string[] = [];
    let isOnBizApp = false;
    let primaryWaacIds: string[] = [];
    let finished = false;
    let timer: number | undefined;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      if (timer) window.clearTimeout(timer);
    };
    const finish = () => {
      if (finished || !code || !phoneNumberId) return;
      finished = true;
      cleanup();
      resolve({ state, code, wabaId, phoneNumberId, businessId, messagingAccountIds, isOnBizApp, primaryWaacIds });
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
        messagingAccountIds = Array.isArray(payload.messaging_account_ids)
          ? payload.messaging_account_ids.filter((value): value is string => typeof value === 'string')
          : [];
        wabaId = typeof payload.waba_id === 'string' ? payload.waba_id : '';
        if (typeof payload.phone_number_id !== 'string' || !/^\d{5,40}$/.test(payload.phone_number_id)) {
          fail('Meta did not share a business phone number. Start again and select a number, not an account-only connection.');
          return;
        }
        phoneNumberId = payload.phone_number_id;
        businessId = typeof payload.business_id === 'string' ? payload.business_id : '';
        isOnBizApp = eventName === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' || payload.is_on_biz_app === true;
        primaryWaacIds = Array.isArray(payload.primary_waac_ids)
          ? payload.primary_waac_ids.filter((value): value is string => typeof value === 'string')
          : [];
        finish();
      } else if (eventName === 'FINISH_ONLY_WABA') {
        fail('Meta shared an account without a business phone number. Start again and select a number.');
      } else if (eventName === 'CANCEL') {
        fail('WhatsApp setup was cancelled in Meta. Your existing salon settings are unchanged.');
      } else if (eventName === 'ERROR') {
        const code = typeof payload.error_code === 'number' && Number.isInteger(payload.error_code) ? ` (code ${payload.error_code})` : '';
        fail(`Meta reported a WhatsApp setup error${code}. Review the settings in Meta and try again.`);
      }
    };

    window.addEventListener('message', onMessage);
    timer = window.setTimeout(() => fail('Meta setup did not finish. Please try connecting again.'), 180000);

    try {
      FB.login((response) => {
        const returnedCode = response?.authResponse?.code;
        if (typeof returnedCode === 'string' && returnedCode) {
          code = returnedCode;
          finish();
        } else if (!response?.authResponse) {
          fail('Meta login was closed before the WhatsApp number was connected.');
        } else {
          fail('Meta did not return a short-lived connection code. Please start again.');
        }
      }, {
        config_id: configId,
        auth_type: 'rerequest',
        response_type: 'code',
        override_default_response_type: true,
        extras: { version: 'v5' },
      });
    } catch {
      fail('Meta login could not open. Allow pop-ups and try again.');
    }
  });
}

async function functionError(error: unknown, fallback: string) {
  const body = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
  return new Error(typeof body?.error === 'string' ? body.error : fallback);
}

export const NexoraWhatsAppPanel: React.FC<{ onBookingsChanged?: () => Promise<void> | void }> = ({ onBookingsChanged }) => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preparedSignup, setPreparedSignup] = useState<PreparedSignup | null>(null);
  const [registrationPin, setRegistrationPin] = useState('');
  const [status, setStatus] = useState<PanelStatus | null>(null);
  const [config, setConfig] = useState<SignupConfig | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [activeWaId, setActiveWaId] = useState('');
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [configResult, statusResult, inboxResult] = await Promise.all([
      supabase.functions.invoke('nexora-whatsapp-connect', { body: { action: 'config' } }),
      supabase.functions.invoke('nexora-whatsapp-connect', { body: { action: 'status' } }),
      supabase.functions.invoke('nexora-whatsapp-connect', { body: { action: 'inbox' } }),
    ]);
    if (!mounted.current) return;
    if (configResult.data) setConfig(configResult.data as SignupConfig);
    else setConfig({ configured: false, appId: null, configId: null, graphVersion: 'v27.0' });
    if (inboxResult.data && Array.isArray(inboxResult.data.conversations)) {
      setConversations(inboxResult.data.conversations as ConversationPreview[]);
    } else if (inboxResult.error) {
      setNotice({ kind: 'error', text: inboxResult.error.message || 'WhatsApp inbox is not available yet. Deploy the inbox functions and try again.' });
    }
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

  const openConversation = async (customerWaId: string) => {
    setActiveWaId(customerWaId);
    setThreadLoading(true);
    setThread(null);
    try {
      const result = await supabase.functions.invoke('nexora-whatsapp-connect', {
        body: { action: 'conversation', customerWaId },
      });
      if (result.error || !result.data?.conversation) {
        throw new Error(result.data?.error || result.error?.message || 'Could not load this conversation.');
      }
      setThread(result.data as ConversationThread);
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not load this conversation.' });
    } finally {
      setThreadLoading(false);
    }
  };

  const sendReply = async () => {
    const message = replyText.trim();
    if (!activeWaId || !message || thread?.conversation.optedOut) return;
    setReplyBusy(true);
    setNotice(null);
    try {
      const result = await supabase.functions.invoke('nexora-whatsapp-connect', {
        body: { action: 'sendReply', customerWaId: activeWaId, message },
      });
      if (result.error || !result.data?.sent) {
        throw await functionError(result.error, 'WhatsApp reply could not be sent.');
      }
      setReplyText('');
      await openConversation(activeWaId);
      await refresh();
      setNotice({ kind: 'success', text: 'Reply sent from your salon WhatsApp number.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'WhatsApp reply could not be sent.' });
    } finally {
      setReplyBusy(false);
    }
  };

  const saveSignup = async (result: SignupResult, pin = '') => {
    const completed = await supabase.functions.invoke('nexora-whatsapp-connect', {
      body: { action: 'complete', ...result, ...(pin ? { registrationPin: pin } : {}) },
    });
    if (completed.error || !completed.data?.ok) {
      throw await functionError(completed.error, 'WhatsApp connection could not be saved. Start setup again.');
    }
    setNotice({ kind: 'info', text: `WhatsApp ${completed.data.connection?.display_phone_number || ''} is linked. Send HI from another phone to verify messages before accepting bookings.` });
    await onBookingsChanged?.();
    await refresh();
  };

  const connect = async () => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      if (preparedSignup) {
        const pin = registrationPin;
        if (pin && !/^\d{6}$/.test(pin)) throw new Error('Enter a six-digit Cloud API registration PIN.');
        setPreparedSignup(null);
        setRegistrationPin('');
        const result = await runEmbeddedSignup(preparedSignup);
        if (!mounted.current) return;
        // The Meta code is short-lived. Finish immediately after the login
        // callback and session event; do not wait for any more owner input.
        await saveSignup(result, result.isOnBizApp ? '' : pin);
      } else {
        const sdk = await loadFacebookSdk();
        if (!mounted.current) return;
        const begin = await supabase.functions.invoke('nexora-whatsapp-connect', { body: { action: 'begin' } });
        if (begin.error || !begin.data?.state || !begin.data.appId || !begin.data.configId) {
          throw await functionError(begin.error, 'Could not begin WhatsApp setup.');
        }
        if (!mounted.current) return;
        sdk.init({ appId: begin.data.appId, cookie: true, xfbml: false, version: begin.data.graphVersion || 'v27.0' });
        setPreparedSignup({ sdk, configId: begin.data.configId, state: begin.data.state });
      }
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
  const pending = connection?.connection_status === 'pending';

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
          <span className={connected ? 'status confirmed' : 'status pending'}>{connected ? 'Connected' : pending ? 'Verification pending' : 'Not connected'}</span>
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
                <p className="mt-1 text-xs text-slate-600">{connection?.is_on_biz_app ? 'WhatsApp Business app + Cloud API coexistence is enabled.' : 'Cloud API sender is active.'}</p>
              </div>
              <button type="button" className="secondary-action" disabled={busy} onClick={disconnect}>{busy ? 'Please wait…' : 'Disconnect number'}</button>
            </div>
          </div>
        ) : pending ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-bold text-slate-900">Verify your salon number</h3>
            <p className="mt-1 font-semibold">{connection?.display_phone_number}</p>
            <p className="muted mt-2">Send HI to this number from another WhatsApp phone. After the salon number replies, refresh activity to check that it is connected.</p>
            <p className="muted mt-2">If no reply arrives, ask platform support to check Meta phone registration and webhook setup.</p>
            <button type="button" className="secondary-action mt-4" disabled={busy} onClick={disconnect}>Disconnect number</button>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-bold text-slate-900">Connect your own number</h3>
            <p className="muted mt-1">Meta will ask you to connect your WhatsApp Business number. Eligible numbers can keep the WhatsApp Business app working alongside the salon inbox. Choose a number that is not linked to another provider; this setup does not migrate numbers.</p>
            {preparedSignup ? (
              <form className="mt-4 space-y-2" onSubmit={(event) => { event.preventDefault(); void connect(); }}>
                <label className="block text-sm font-semibold" htmlFor="whatsapp-registration-pin">Two-step PIN (new Cloud API numbers only)</label>
                <p className="muted text-sm" id="whatsapp-registration-pin-help">
                  To register a new Cloud API number, enter its six-digit two-step verification PIN, or choose one if none is set. This is not the SMS code. Leave this blank if the number is already on Cloud API or you are keeping it in the WhatsApp Business app.
                </p>
                <input id="whatsapp-registration-pin" aria-describedby="whatsapp-registration-pin-help" type="password" inputMode="numeric" autoComplete="off" maxLength={6} pattern="[0-9]{6}" value={registrationPin} onChange={(event) => setRegistrationPin(event.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="primary-action" disabled={busy || !config?.configured}>Continue in Meta</button>
                  <button type="button" className="secondary-action" onClick={() => { setPreparedSignup(null); setRegistrationPin(''); }}>Cancel setup</button>
                </div>
              </form>
            ) : (
              <button type="button" className="primary-action mt-4" disabled={busy || !config?.configured} onClick={connect}>
                {busy ? 'Connecting…' : 'Connect with Meta'}
              </button>
            )}
            {!config?.configured && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <strong>Meta setup is not configured yet.</strong>
                <p className="mt-1">The server needs your Meta App ID, App Secret, Embedded Signup v5 Configuration ID, webhook verify token and a 32-byte encryption key in Supabase settings. These are platform-level settings, not a salon owner’s WhatsApp password.</p>
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Salon customer inbox</p>
            <h2>WhatsApp conversations</h2>
            <p className="muted mt-1">Read customer messages and reply using your connected salon number.</p>
          </div>
          <button type="button" className="secondary-action" disabled={loading || busy} onClick={() => void refresh()}>
            Refresh inbox
          </button>
        </div>
        <div className="mt-4 grid min-h-[24rem] gap-4 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.2fr)]">
          <div className="max-h-[34rem] overflow-y-auto rounded-xl border border-slate-200">
            {conversations.length === 0 ? (
              <div className="p-5 text-center">
                <strong className="block text-slate-900">No WhatsApp conversations yet</strong>
                <p className="muted mt-1 text-sm">Once a customer messages your connected salon number, the chat appears here.</p>
              </div>
            ) : conversations.map((item) => (
              <button
                key={item.customer_wa_id}
                type="button"
                onClick={() => void openConversation(item.customer_wa_id)}
                className={`block w-full border-b border-slate-100 p-3 text-left transition-colors ${activeWaId === item.customer_wa_id ? 'bg-pink-50' : 'bg-white hover:bg-slate-50'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="truncate text-sm text-slate-900">{item.customer_name || item.customer_wa_id}</strong>
                  {item.needsReply && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Needs reply</span>}
                  {item.optedOut && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">STOP</span>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{item.customer_wa_id}</p>
                <p className="mt-1 truncate text-xs text-slate-600">
                  {String(item.lastMessage?.metadata?.text || item.lastMessage?.metadata?.message || item.conversation_status.replaceAll('_', ' '))}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">{new Date(item.updated_at).toLocaleString('en-IN')}</p>
              </button>
            ))}
          </div>
          <div className="flex min-h-[24rem] flex-col rounded-xl border border-slate-200 bg-slate-50">
            {!activeWaId ? (
              <div className="m-auto max-w-sm p-5 text-center">
                <strong className="block text-slate-900">Open a conversation</strong>
                <p className="muted mt-1 text-sm">Choose a customer from the left to read messages and reply.</p>
              </div>
            ) : threadLoading ? (
              <p className="m-auto text-sm text-slate-500">Loading conversation…</p>
            ) : thread ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white p-3">
                  <div>
                    <strong className="block text-sm text-slate-900">{thread.conversation.customer_name || thread.conversation.customer_wa_id}</strong>
                    <small className="text-slate-500">{thread.conversation.customer_wa_id}</small>
                  </div>
                  <span className={thread.conversation.needsReply ? 'status pending' : 'status confirmed'}>
                    {thread.conversation.needsReply ? 'Needs reply' : thread.conversation.conversation_status.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                  {thread.messages.length === 0 ? (
                    <p className="text-center text-sm text-slate-500">No messages in this conversation yet.</p>
                  ) : thread.messages.map((message, index) => (
                    <div key={`${message.created_at}-${index}`} className={message.direction === 'outbound' ? 'flex justify-end' : 'flex justify-start'}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${message.direction === 'outbound' ? 'bg-emerald-100 text-slate-900' : 'bg-white text-slate-900'}`}>
                        <p className="whitespace-pre-wrap break-words">{String(message.metadata?.text || message.metadata?.message || message.message_kind.replaceAll('_', ' '))}</p>
                        <p className="mt-1 text-right text-[10px] text-slate-500">{new Date(message.created_at).toLocaleString('en-IN')} · {message.delivery_status}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {thread.conversation.optedOut ? (
                  <div className="border-t border-slate-200 bg-white p-3 text-sm text-slate-600">
                    Customer opted out. They must send START to this salon number before further messages can be sent.
                  </div>
                ) : (
                  <form className="flex gap-2 border-t border-slate-200 bg-white p-3" onSubmit={(event) => { event.preventDefault(); void sendReply(); }}>
                    <input
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Write a reply…"
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      maxLength={3500}
                    />
                    <button type="submit" className="primary-action" disabled={replyBusy || !replyText.trim()}>
                      {replyBusy ? 'Sending…' : 'Send'}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <p className="m-auto p-4 text-sm text-slate-500">Conversation could not be loaded. Refresh and try again.</p>
            )}
          </div>
        </div>
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

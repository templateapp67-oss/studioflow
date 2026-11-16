import React, { useCallback, useEffect, useState } from 'react';
import type { SalonProfile } from '../types';
import { supabase } from '../lib/supabase';

type Props = { profile: SalonProfile };
type WhatsAppStatus = {
  ok?: boolean;
  connection?: {
    connection_status?: string;
    display_phone_number?: string;
    verified_name?: string;
    connection_mode?: string;
    is_on_biz_app?: boolean;
    platform_type?: string | null;
    webhook_subscribed?: boolean;
    connected_at?: string | null;
  } | null;
  salon?: { slug?: string | null; name?: string };
  metrics?: {
    bookings_total?: number;
    bookings_confirmed?: number;
    bookings_pending?: number;
    payment_links_sent?: number;
    payments_paid?: number;
    payments_pending?: number;
    revenue_paise?: number;
    messages_total?: number;
    messages_failed?: number;
    messages_inbound?: number;
    messages_outbound?: number;
  };
  setup?: {
    meta_app_configured?: boolean;
    embedded_signup_configured?: boolean;
    meta_webhook_verify_configured?: boolean;
    token_encryption_ready?: boolean;
    razorpay_keys_configured?: boolean;
    razorpay_webhook_configured?: boolean;
  };
  error?: string;
};
type MetaSdk = {
  init: (options: Record<string, unknown>) => void;
  login: (callback: (response: any) => void, options: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    FB?: MetaSdk;
    fbAsyncInit?: () => void;
  }
}

const platformEndpoint = 'nexora-whatsapp-platform';
const money = (paise = 0) => '₹' + (Number(paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function loadFacebookSdk(appId: string, version: string): Promise<MetaSdk> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      window.FB.init({ appId, cookie: true, xfbml: false, version });
      resolve(window.FB);
      return;
    }
    const previous = document.getElementById('facebook-jssdk');
    if (previous) previous.remove();
    let ready = false;
    const timeout = window.setTimeout(() => {
      if (!ready) reject(new Error('Meta login SDK load nahi hua. Page refresh karke retry karein.'));
    }, 15000);
    window.fbAsyncInit = () => {
      if (!window.FB) return;
      window.FB.init({ appId, cookie: true, xfbml: false, version });
      ready = true;
      window.clearTimeout(timeout);
      resolve(window.FB);
    };
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('Meta login SDK load nahi ho paaya.'));
    };
    document.head.appendChild(script);
  });
}

function runEmbeddedSignup(fb: MetaSdk, configId: string): Promise<{ code: string; sessionInfo: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    let code = '';
    let sessionInfo: Record<string, unknown> | null = null;
    let finished = false;
    let settled = false;
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timeout);
    };
    const finish = () => {
      if (settled || !code || !sessionInfo || !finished) return;
      settled = true;
      cleanup();
      resolve({ code, sessionInfo });
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return;
      let data: any = event.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return; }
      }
      if (!data || data.type !== 'WA_EMBEDDED_SIGNUP') return;
      const eventName = String(data.event || '').toUpperCase();
      if (eventName === 'CANCEL' || eventName === 'ERROR') {
        fail('WhatsApp connect process cancel ya fail ho gaya. Dobara Connect WhatsApp dabayein.');
        return;
      }
      if (['FINISH', 'FINISH_ONLY_WABA', 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'].includes(eventName)) {
        sessionInfo = { ...(data.data || {}), event: eventName, version: data.version || 'v5' };
        finished = true;
        finish();
      }
    };
    const timeout = window.setTimeout(() => {
      fail('Meta connect process complete nahi hua. Page par dobara Connect WhatsApp dabayein.');
    }, 90000);
    window.addEventListener('message', onMessage);
    fb.login((response) => {
      const authCode = response?.authResponse?.code || response?.code;
      if (!authCode) {
        fail('Meta se authorization code nahi mila. Signup cancel hua ho sakta hai.');
        return;
      }
      code = String(authCode);
      finish();
    }, {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      extras: { version: 'v5' },
    });
  });
}

async function invokePlatform(body: Record<string, unknown>): Promise<any> {
  const result = await supabase.functions.invoke(platformEndpoint, { body });
  if (result.error) {
    const context = (result.error as any).context;
    const message = context?.error || result.error.message || 'WhatsApp service is not responding';
    throw new Error(String(message));
  }
  if (result.data?.ok === false) throw new Error(result.data.error || 'WhatsApp request failed');
  return result.data;
}

export const SalonWhatsAppIntegration: React.FC<Props> = ({ profile }) => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await invokePlatform({ action: 'status' });
      setStatus(result as WhatsAppStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'WhatsApp status load nahi hua');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const connect = async () => {
    setConnecting(true);
    setError('');
    setNotice('');
    try {
      const setup = await invokePlatform({ action: 'start_signup' });
      if (!setup.app_id || !setup.config_id || !setup.state) {
        throw new Error('Meta Embedded Signup v5 settings abhi configure nahi hain');
      }
      const fb = await loadFacebookSdk(setup.app_id, setup.graph_version || 'v27.0');
      const authorization = await runEmbeddedSignup(fb, setup.config_id);
      const result = await invokePlatform({
        action: 'complete_signup',
        state: setup.state,
        code: authorization.code,
        sessionInfo: authorization.sessionInfo,
      });
      setNotice(
        (result.connection_mode === 'coexistence'
          ? 'WhatsApp Business App aur API dono connect ho gaye.'
          : 'Salon ka WhatsApp Business number connect ho gaya.') +
        ' Ab customer messages isi number se aayenge.',
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'WhatsApp connect nahi ho paaya');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Kya aap is salon ka WhatsApp connection disconnect karna chahte hain?')) return;
    setDisconnecting(true);
    setError('');
    setNotice('');
    try {
      await invokePlatform({ action: 'disconnect' });
      setNotice('WhatsApp number disconnect ho gaya.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect nahi ho paaya');
    } finally {
      setDisconnecting(false);
    }
  };

  const connected = status?.connection?.connection_status === 'connected';
  const metrics = status?.metrics || {};
  const salonName = status?.salon?.name || profile.businessName || 'Your salon';

  return (
    <section className="space-y-5" aria-labelledby="salon-whatsapp-heading">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">NEXORA • Salon ka apna WhatsApp</p>
            <h2 id="salon-whatsapp-heading" className="mt-1 text-xl font-extrabold text-slate-900">WhatsApp Booking & Payments</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              {salonName} ka apna WhatsApp Business number connect karein. Customer isi number par service, time aur booking confirm karega. Booking isi salon ke dashboard mein save hogi.
            </p>
          </div>
          <span className={connected
            ? 'inline-flex w-fit items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800'
            : 'inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800'}>
            {loading ? 'Checking…' : connected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        {connected ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-800">Connected business number</p>
                <p className="mt-1 text-lg font-extrabold text-slate-900">{status?.connection?.display_phone_number}</p>
                <p className="text-sm text-slate-700">{status?.connection?.verified_name || salonName}</p>
                <p className="mt-2 text-xs text-slate-600">
                  {status?.connection?.connection_mode === 'coexistence' || status?.connection?.is_on_biz_app
                    ? 'Coexistence: WhatsApp Business App aur API dono connected hain.'
                    : 'Cloud API connection active hai.'}
                  {' '} • Webhook {status?.connection?.webhook_subscribed ? 'connected' : 'not confirmed'}
                </p>
              </div>
              <button type="button" onClick={disconnect} disabled={disconnecting}
                className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                {disconnecting ? 'Disconnecting…' : 'Disconnect WhatsApp'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Connect karne par kya hoga?</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>Aap Meta ke secure login mein apna salon number choose karenge.</li>
              <li>Business App number eligible hua to Coexistence option available rahega.</li>
              <li>Customer ka message verify hoga, booking slot check hoga aur YES ke baad booking request save hogi.</li>
              <li>25% advance ka Razorpay payment link isi salon WhatsApp number se jayega.</li>
            </ul>
            <button type="button" onClick={connect} disabled={connecting || loading}
              className="mt-4 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
              {connecting ? 'Meta se connect ho raha hai…' : 'Connect salon WhatsApp'}
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Meta business permissions aur NEXORA Meta app approval zaroori hain. Aapka number NEXORA ke shared number ke through use nahi hoga.
            </p>
          </div>
        )}

        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{notice}</p>}
        <button type="button" onClick={refresh} disabled={loading}
          className="mt-4 text-xs font-bold text-slate-600 underline underline-offset-2 disabled:opacity-50">
          {loading ? 'Refreshing…' : 'Refresh WhatsApp status'}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-900">Connection setup checks</h3>
        <p className="mt-1 text-xs text-slate-500">Secrets ke actual values yahan kabhi show nahi hote—sirf configuration status dikhata hai.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            ['Meta app ID & secret', status?.setup?.meta_app_configured],
            ['Embedded Signup v5 config', status?.setup?.embedded_signup_configured],
            ['Meta webhook verify token', status?.setup?.meta_webhook_verify_configured],
            ['Encrypted token key (Vault)', status?.setup?.token_encryption_ready],
            ['Razorpay API keys', status?.setup?.razorpay_keys_configured],
            ['Razorpay webhook secret', status?.setup?.razorpay_webhook_configured],
          ].map(([label, ready]) => (
            <div key={String(label)} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <span className="font-medium text-slate-700">{label}</span>
              <span className={ready ? 'font-bold text-emerald-700' : 'font-bold text-amber-700'}>{ready ? 'Ready' : 'Needed'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['WhatsApp bookings', metrics.bookings_total ?? 0],
          ['Confirmed bookings', metrics.bookings_confirmed ?? 0],
          ['Pending bookings', metrics.bookings_pending ?? 0],
          ['Payment links sent', metrics.payment_links_sent ?? 0],
          ['Payments received', metrics.payments_paid ?? 0],
          ['Payments pending', metrics.payments_pending ?? 0],
          ['WhatsApp revenue', money(metrics.revenue_paise ?? 0)],
          ['Messages failed', metrics.messages_failed ?? 0],
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-900">Important security checks</h3>
        <p className="mt-2 text-sm text-slate-600">
          WhatsApp par YES milne ke baad hi booking request save hoti hai. Slot save se just pehle dobara check hota hai. Booking 25% advance payment tak pending rahegi; Razorpay ke verified webhook ke baad hi confirmed hogi. Expired slot par late payment aaye to system refund process karega.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Payment success ke liye Razorpay webhook aur WhatsApp message ke liye Meta approved templates (jab 24-hour customer window close ho) bhi configured hone chahiye.
        </p>
      </div>
    </section>
  );
};

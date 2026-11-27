import React, { useState, useId } from 'react';
import {captureCustomerReferral,rememberCustomerReferral,clearCustomerReferral} from '../lib/customerReferral';
import { cleanCustomerAppReturnPath, clearOAuthIntent, isSafeRelativePath, readAuthUrlError, saveOAuthIntent } from '../lib/authEntry';
import { isPlatformRootHost, isStorefrontRootHost } from '../lib/resolveSite';
import {whatsappNational,validCustomerWhatsApp,customerWhatsApp} from '../lib/customerWhatsApp';
import {customerToday,validCustomerBirthDate} from '../lib/customerBirthDate';
import { requestedTemplate } from '../lib/templateEntry';
import { saveGoogleOAuthIntent, clearGoogleOAuthIntent } from '../lib/googleOAuth';
import { isBillingInterval, isPricingPlanId, pricingResumePath } from '../lib/nexoraPricing';
import { authCallbackPath, authModeForPath, isAuthEntryPath, isPlainOwnerAuthLocation } from '../lib/authRoutes';
import { Eye, EyeOff } from 'lucide-react';
import { supabase, captureReferral } from '../lib/supabase';

export function AuthPage({ compact = false, recovery = false, onRecovered, customerMode, initialMode, returnSlug, invitationMode=false, redirectPathOverride }: { key?:React.Key; compact?: boolean; recovery?: boolean; onRecovered?: () => void; customerMode?:boolean; initialMode?:'signin'|'signup'; returnSlug?:string; invitationMode?:boolean; redirectPathOverride?:string }) {
  const passwordId = useId(); const confirmId = useId();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const search = typeof location === 'undefined' ? '' : (location.search || '');
  const hash = typeof location === 'undefined' ? '' : (location.hash || '');
  const origin = typeof location === 'undefined' ? '' : (location.origin || '');
  const loginParams=new URLSearchParams(search);
  const customer = customerMode ?? loginParams.has('customer');
  const customerReturn=returnSlug||loginParams.get('return');
  const selectedTemplate=requestedTemplate(search);
  const pricingPlanId=loginParams.get('pricing_plan');
  const pricingBilling=loginParams.get('billing_interval');
  const pricingReturnPath=isPricingPlanId(pricingPlanId)?pricingResumePath({planId:pricingPlanId,billingInterval:isBillingInterval(pricingBilling)?pricingBilling:'annual'}):'';
  const pathname = typeof location === 'undefined' ? '' : (location.pathname || '');
  const safePathname = isSafeRelativePath(pathname) ? pathname : '/login';
  // `/sign-in` and `/sign-up` are first-class aliases of the same document;
  // their path selects the mode when no explicit `?auth=` override is present.
  const pathAuthMode = authModeForPath(safePathname);
  const safeRedirectPathOverride = isSafeRelativePath(redirectPathOverride) ? redirectPathOverride : '';
  const cleanCustomerReturn = customerReturn && (/^[a-z0-9-]+$/i.test(customerReturn) || isSafeRelativePath(customerReturn)) ? customerReturn : '';
  const pendingCustomerRef=customer?captureCustomerReferral():'';
  const customerAppReturn=loginParams.has('app')?cleanCustomerAppReturnPath(search,''):'';
  const baseRedirectPath=loginParams.has('app')?customerAppReturn:safeRedirectPathOverride?safeRedirectPathOverride:customer?`/?customer=1${cleanCustomerReturn?'&return='+encodeURIComponent(cleanCustomerReturn):''}`:selectedTemplate?`/?template=${encodeURIComponent(selectedTemplate.id)}&create=1`:pricingReturnPath||'/';
  const redirectPath=baseRedirectPath+(pendingCustomerRef?(baseRedirectPath.includes('?')?'&':'?')+'customer_ref='+encodeURIComponent(pendingCustomerRef):'');
  const [mode, setMode] = useState<'signin'|'signup'|'forgot'>((loginParams.get('auth') === 'forgot' ? 'forgot' : loginParams.get('auth')==='signin'?'signin':pathAuthMode||initialMode) || (loginParams.get('auth')==='signup' || (customer?pendingCustomerRef:captureReferral()) ? 'signup' : 'signin'));
  const signup = mode === 'signup';
  const [welcomeWhatsApp,setWelcomeWhatsApp]=useState(false);
  const [birthDate,setBirthDate]=useState('');const [whatsapp,setWhatsapp]=useState('');
  const [name, setName] = useState(''); const [salon, setSalon] = useState('');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(''); const [visible, setVisible] = useState(false);
  const [ref, setRef] = useState(()=>customer?captureCustomerReferral():captureReferral()); const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [message, setMessage] = useState(() => readAuthUrlError(search, hash) || (loginParams.has('recovery') && !recovery ? 'Reset link expired or could not be verified. Request a new link using Forgot password.' : '')); const [confirmationPending, setConfirmationPending] = useState(false); const [otpPending,setOtpPending]=useState(false); const [otpToken,setOtpToken]=useState('');

  const normalizedRef = ref.trim().toUpperCase();
  const cleanOwnerAuthSearch = (() => {
    const q = new URLSearchParams(search);
    for (const k of ['ref', 'auth', 'code', 'state', 'error', 'error_code', 'error_description', 'type']) q.delete(k);
    const s = q.toString();
    return s ? '?' + s : '';
  })();
  const preserveOwnerAuthEntry = !customer && !loginParams.has('app') && (isAuthEntryPath(safePathname) || loginParams.has('auth') || loginParams.has('owner') || loginParams.has('panel'));
  const oauthFallbackPath = customer && signup ? baseRedirectPath : redirectPath;
  const authReturnPath = pricingReturnPath || (selectedTemplate ? redirectPath : preserveOwnerAuthEntry ? authCallbackPath(safePathname, cleanOwnerAuthSearch) : oauthFallbackPath);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      if (otpPending) {
        if (!/^\\d{6}$/.test(otpToken)) throw new Error('Enter the six-digit verification code.');
        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otpToken,
          type: 'signup',
        });
        if (error) throw error;
        if (!data.session) throw new Error('Email verification did not create a session. Request a new code and try again.');
        setOtpPending(false); setConfirmationPending(false); setOtpToken('');
        if (invitationMode) { clearCustomerReferral(); location.assign('/?app=1&tab=rewards'); return; }
        if (pricingReturnPath) { location.assign(pricingReturnPath); return; }
        if (!compact && !customer && selectedTemplate && loginParams.get('create') !== '1') {
          location.assign(redirectPath); return;
        }
        location.assign(redirectPath);
        return;
      }
      if ((signup || recovery) && password.length < 12) throw new Error('Use at least 12 characters for your password.');
      if ((signup || recovery) && new TextEncoder().encode(password).length > 72) throw new Error('Use a password of at most 72 bytes.');
      if (recovery) {
        if (password !== confirm) throw new Error('Passwords do not match.');
        const { error } = await supabase.auth.updateUser({ password }); if (error) throw error;
        sessionStorage.removeItem('studioflow_recovery');
        await supabase.auth.signOut({ scope: 'local' });
        location.assign(`${redirectPath}${redirectPath.includes('?') ? '&' : '?'}passwordUpdated=1`); return;
      }
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${origin}${redirectPath}${redirectPath.includes('?') ? '&' : '?'}recovery=1` });
        if (error) throw error;
        setResetSent(true);
        setMessage('If an account exists for this email, a password reset link will be sent. Open that link to choose a new password.'); return;
      }
      if(signup&&customer&&(!whatsapp||!validCustomerWhatsApp(whatsapp)))throw new Error('Enter a valid 10-digit WhatsApp number. +91 is already added.');
      if(signup&&customer&&(!birthDate||!validCustomerBirthDate(birthDate)))throw new Error('Enter a valid date of birth from 1900 through today.');
      if (signup && normalizedRef) {
        const { data, error } = await supabase.rpc(customer?'studioflow_customer_validate_ref':'studioflow_validate_ref', { p_code: normalizedRef });
        if (error) throw new Error(error.message); if (!data) throw new Error('Referral code is invalid or inactive. Check it or leave it empty.');
      }
      if(signup&&customer)rememberCustomerReferral(ref);
      if (signup && !customer) {
        localStorage.removeItem('studioflow_pending_ref');
        const url = new URL(location.href); url.searchParams.delete('ref'); history.replaceState(null, '', url);
        if (normalizedRef) localStorage.setItem('studioflow_pending_ref', normalizedRef);
      }
      if(invitationMode&&signup){const current=await supabase.auth.getSession();if(current.error)throw new Error(current.error.message);if(current.data.session){const out=await supabase.auth.signOut({scope:'local'});if(out.error)throw new Error(out.error.message);}}
      clearGoogleOAuthIntent();
      clearOAuthIntent();
      const result = signup ? await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${origin}${invitationMode?'/?app=1&tab=rewards':customer?baseRedirectPath+(normalizedRef?(baseRedirectPath.includes('?')?'&':'?')+'customer_ref='+encodeURIComponent(normalizedRef):''):redirectPath}`, data: { full_name: name.trim(), salon_name: salon.trim(), ...(customer?{customer_referral_code:normalizedRef,date_of_birth:birthDate||null,whatsapp_number:customerWhatsApp(whatsapp),whatsapp_welcome_opt_in:welcomeWhatsApp}:{referral_code:normalizedRef}), source: 'studioflow' } } }) : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw new Error(result.error.message);
      const replaceLocation = (target: string) => {
        if (typeof location.replace === 'function') location.replace(target);
        else location.assign(target);
      };
      if(invitationMode&&result.data.session){clearCustomerReferral();location.assign('/?app=1&tab=rewards');return;}
      if(result.data.session&&pricingReturnPath){location.assign(pricingReturnPath);return;}
      // Auto-confirmed owner sign-up with a chosen template but without ?create=1
      // normalises onto the template creation entry so OnboardingWizard seeds it.
      if(signup&&result.data.session&&!compact&&!customer&&!invitationMode&&selectedTemplate&&loginParams.get('create')!=='1'){replaceLocation(redirectPath);return;}
      // Owner sign-in from the plain /login, /sign-in or /sign-up entry on a platform host
      // replaces history with the home page (no Back-button loop). Storefront subdomains,
      // customer, invitation, template, pricing, workspace deep-link and ?app flows keep their targets.
      const currentLocation = typeof location === 'undefined' ? undefined : location;
      const storefrontHost = isStorefrontRootHost(currentLocation);
      const platformHost = isPlatformRootHost(currentLocation);
      if (!signup && result.data.session && !compact && !customer && !invitationMode && !selectedTemplate
        && !returnSlug && !safeRedirectPathOverride && platformHost && !storefrontHost
        && isPlainOwnerAuthLocation(safePathname, search)) {
        const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(result.data.session.access_token);
        if (!assurance.error && (assurance.data.nextLevel !== 'aal2' || assurance.data.currentLevel === 'aal2')) {
          replaceLocation('/');
        }
        return;
      }
      if (signup && !result.data.session) { setConfirmationPending(true); setOtpPending(true); setOtpToken(''); setMessage('A six-digit verification code has been sent. Enter it below to verify your email and finish creating your account.'); }
    } catch (error) { setMessage(error instanceof Error ? error.message : (typeof (error as { message?: unknown })?.message === 'string' && (error as { message: string }).message) || 'Could not complete this request. Please try again.'); }
    finally { setBusy(false); }
  };
  const signInWithGoogle = async () => {
    setBusy(true); setMessage('');
    try {
      if (signup) {
        if (!name.trim()) throw new Error('Enter your full name before continuing with Google.');
        if (!customer && !salon.trim()) throw new Error('Enter your salon name before continuing with Google.');
        if (customer && (!whatsapp || !validCustomerWhatsApp(whatsapp))) throw new Error('Enter a valid 10-digit WhatsApp number. +91 is already added.');
        if (customer && (!birthDate || !validCustomerBirthDate(birthDate))) throw new Error('Enter a valid date of birth from 1900 through today.');
        if (customer && welcomeWhatsApp) throw new Error('To request the automatic WhatsApp welcome message, use email sign-up. Turn off that option to continue with Google.');
        if (normalizedRef) {
          const { data, error } = await supabase.rpc(customer ? 'studioflow_customer_validate_ref' : 'studioflow_validate_ref', { p_code: normalizedRef });
          if (error) throw new Error(error.message);
          if (!data) throw new Error('Referral code is invalid or inactive. Check it or leave it empty.');
        }
        if (customer) {
          // Keep Google signup referrals only in the short-lived OAuth intent.
          // CustomerReferralBridge must not claim it before we know this is a new user.
          clearCustomerReferral();
        } else {
          try { localStorage.removeItem('studioflow_pending_ref'); } catch {}
          if (typeof location !== 'undefined' && location.href && typeof history !== 'undefined') {
            const url = new URL(location.href);
            url.searchParams.delete('ref');
            history.replaceState(null, '', url);
          }
          if (normalizedRef) {
            try { localStorage.setItem('studioflow_pending_ref', normalizedRef); } catch {}
          }
        }
      }
      if (invitationMode) {
        const current = await supabase.auth.getSession();
        if (current.error) throw new Error(current.error.message);
        if (current.data.session) {
          const out = await supabase.auth.signOut({ scope: 'local' });
          if (out.error) throw new Error(out.error.message);
        }
      }
      saveGoogleOAuthIntent({
        role: customer ? 'customer' : 'owner',
        mode: signup ? 'signup' : 'signin',
        fullName: signup ? name.trim() : '',
        salonName: signup && !customer ? salon.trim() : '',
        dateOfBirth: signup && customer ? birthDate : '',
        whatsappNumber: signup && customer ? customerWhatsApp(whatsapp) || '' : '',
        referralCode: signup && customer ? normalizedRef : '',
        welcomeWhatsApp: false,
      });
      const targetPath = invitationMode ? '/?app=1&tab=rewards' : authReturnPath;
      saveOAuthIntent({
        path: targetPath,
        flow: invitationMode ? 'invite' : loginParams.has('app') ? 'app' : customer ? 'customer' : 'owner',
      });
      const redirectTo = location.origin + (invitationMode ? '/?app=1&tab=rewards' : authReturnPath);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account' } },
      });
      if (error) throw new Error(error.message);
      if (!data?.url) setBusy(false);
    } catch (error) {
      clearGoogleOAuthIntent();
      clearOAuthIntent();
      setMessage(error instanceof Error ? error.message : (typeof (error as { message?: unknown })?.message === 'string' && (error as { message: string }).message) || 'Google sign-in could not start. Please try again.');
      setBusy(false);
    }
  };
  const resend = async () => {
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${origin}${invitationMode?'/?app=1&tab=rewards':redirectPath}` } });
    setMessage(error ? error.message : 'Confirmation email requested. Check your inbox and spam folder.'); setBusy(false);
  };
  const standardSignIn = !compact && !recovery && mode === 'signin' && !customer;
  const pageHeading = otpPending ? 'Verify your email address' : recovery ? 'Choose a new password' : mode === 'forgot' ? 'Reset your password' : signup ? customer ? 'Create your customer account' : 'Create your salon account' : standardSignIn ? 'Sign in to NEXORA Salon OS.' : 'Welcome back';
  const pageDescription = recovery ? 'Enter and confirm your new password to securely update your account.' : mode === 'forgot' ? 'Enter your registered email. We will send you a link to choose a new password. Check your inbox and spam folder.' : customer ? 'Sign in to book appointments and manage your bookings.' : standardSignIn ? 'Sign in to access your existing salon website, team and business information, with your account data available across devices.' : 'Your website, team and business data stay with your account across devices.';
  return <main className={compact ? '' : 'min-h-screen bg-[#f9f9ff] px-4 py-12 flex items-center justify-center'}>
    <section className="workspace-card w-full max-w-lg">
      <p className="eyebrow">NEXORA · Salon OS</p><h1 className="text-3xl font-bold mb-2">{pageHeading}</h1>
      <p className="muted mb-5">{pageDescription}</p>
      {!recovery && mode !== 'forgot' && <div className="flex gap-3 mb-5"><button data-testid="auth-mode-signin" disabled={busy} type="button" className={signup ? 'secondary-action' : 'primary-action'} onClick={() => { setMode('signin'); setOtpPending(false); setOtpToken(''); setConfirmationPending(false); setMessage(''); }}>Sign in</button><button data-testid="auth-mode-signup" disabled={busy} type="button" className={signup ? 'primary-action' : 'secondary-action'} onClick={() => { setMode('signup'); setOtpPending(false); setOtpToken(''); setConfirmationPending(false); setMessage(''); }}>Sign up</button></div>}
      {!recovery && loginParams.has('passwordUpdated') && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-green-900">Password updated successfully. Sign in with your new password.</p>}
      {!recovery && mode !== 'forgot' && !signup && <>
        <button type="button" disabled={busy} onClick={() => void signInWithGoogle()} className="secondary-action w-full justify-center mb-3">
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.46 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.38 38.05 46.98 31.95 46.98 24.55Z"/><path fill="#FBBC05" d="M10.54 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.98-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.17 2.3-6.26 0-11.54-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
          Continue with Google
        </button>
        <p className="text-center text-xs text-slate-500 mb-4">or use email</p>
      </>}
      <form onSubmit={submit} className="space-y-4">
        {otpPending ? <>
          <p className="text-sm text-slate-700">Enter the six-digit code sent to <strong>{email}</strong>. It expires in 10 minutes.</p>
          <label className="block">Email verification code
            <input
              data-testid="auth-email-otp"
              className="workspace-input text-center tracking-[0.45em] text-xl font-semibold"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={otpToken}
              onChange={e=>setOtpToken(e.target.value.replace(/\\D/g,'').slice(0,6))}
              aria-label="Six-digit email verification code"
            />
          </label>
          {message && <p data-testid="auth-message" role="status" className="text-sm p-3 rounded-lg bg-amber-50 text-amber-900">{message}</p>}
          <button data-testid="auth-submit" type="submit" disabled={busy || !/^\\d{6}$/.test(otpToken)} className="primary-action w-full justify-center disabled:opacity-60">{busy ? 'Verifying…' : 'Verify email'}</button>
          <button type="button" disabled={busy} className="secondary-action w-full justify-center" onClick={() => void resend()}>Resend verification code</button>
          <button type="button" disabled={busy} className="text-sm text-violet-700 underline" onClick={() => { setOtpPending(false); setOtpToken(''); setConfirmationPending(false); setMessage(''); }}>Change email address</button>
        </> : <>
        {signup && !recovery && <><label className="block">Full name<input data-testid="auth-full-name" className="workspace-input" autoComplete="name" maxLength={150} value={name} onChange={e => setName(e.target.value)} required /></label>{!customer && <label className="block">Salon name<input data-testid="auth-salon-name" className="workspace-input" maxLength={150} value={salon} onChange={e => setSalon(e.target.value)} required /></label>}</>}
        {signup&&customer&&!recovery&&<label className="block">Date of Birth<input data-testid="auth-dob" className="workspace-input" type="date" required autoComplete="bday" min="1900-01-01" max={customerToday()} value={birthDate} onChange={e=>setBirthDate(e.target.value)}/><small>Your date of birth stays private and is not shared with your inviter.</small></label>}
        {signup&&customer&&!recovery&&<label className="block">WhatsApp number<div className="flex items-center gap-2"><span aria-label="India country code" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-semibold">+91</span><input data-testid="auth-whatsapp" className="workspace-input flex-1 min-w-0" type="tel" required minLength={10} pattern="[1-9][0-9]{9}" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit WhatsApp number" aria-label="WhatsApp number" maxLength={16} value={whatsapp} onChange={e=>setWhatsapp(whatsappNational(e.target.value))}/></div><small>Your number stays private and is not shared with your inviter.</small></label>}
        {!recovery && <label className="block">Email<input data-testid="auth-email" className="workspace-input" type="email" autoComplete="email" required value={email} onChange={e => { setEmail(e.target.value); setResetSent(false); }} /></label>}
        {(recovery || mode !== 'forgot') && <div>
          <div className="flex items-center justify-between gap-3"><label htmlFor={passwordId}>{recovery ? 'New password' : 'Password'}</label>{!recovery && mode === 'signin' && <button type="button" disabled={busy} className="text-sm font-semibold text-violet-700 underline underline-offset-4 py-2" onClick={() => { setMode('forgot'); setMessage(''); setResetSent(false); }}>Forgot password?</button>}</div>
          <div className="relative"><input data-testid="auth-password" id={passwordId} className="workspace-input" style={{paddingRight:52}} type={visible ? 'text' : 'password'} minLength={signup || recovery ? 12 : undefined} autoComplete={signup || recovery ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} aria-controls={passwordId} title={visible ? 'Hide password' : 'Show password'} className="absolute right-1 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-violet-600" onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={20} aria-hidden="true"/> : <Eye size={20} aria-hidden="true"/>}</button></div>
        </div>}
        {recovery && <div><label htmlFor={confirmId}>Confirm new password</label><div className="relative"><input id={confirmId} className="workspace-input" style={{paddingRight:52}} type={confirmVisible ? 'text' : 'password'} minLength={12} autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} /><button type="button" aria-label={confirmVisible ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={confirmVisible} aria-controls={confirmId} title={confirmVisible ? 'Hide confirm password' : 'Show confirm password'} className="absolute right-1 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-violet-600" onClick={() => setConfirmVisible(v => !v)}>{confirmVisible ? <EyeOff size={20} aria-hidden="true"/> : <Eye size={20} aria-hidden="true"/>}</button></div></div>}
        {signup && !recovery && <label className="block">Referral code <span className="text-gray-400">(optional)</span><input className="workspace-input" maxLength={32} value={ref} onChange={e => setRef(e.target.value.toUpperCase())} /><small>{customer?'Your name, join date and referral progress will be visible to your inviter. Email, phone and photos stay private.':'Referral attribution is saved after you sign in.'}</small></label>}
        {signup&&customer&&!recovery&&<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={welcomeWhatsApp} onChange={e=>setWelcomeWhatsApp(e.target.checked)} className="mt-1"/><span>Request my Nexora welcome message on WhatsApp after email confirmation, with my User ID, login link and referral link. My password will not be sent.</span></label>}
      {!recovery && mode !== 'forgot' && signup && <>
        <button type="button" disabled={busy} onClick={() => void signInWithGoogle()} className="secondary-action w-full justify-center mb-3">
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.46 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.38 38.05 46.98 31.95 46.98 24.55Z"/><path fill="#FBBC05" d="M10.54 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.98-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.17 2.3-6.26 0-11.54-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
          Continue with Google
        </button>
        <p className="text-center text-xs text-slate-500 mb-4">or use email</p>
      </>}
        {message && <p data-testid="auth-message" role="status" className="text-sm p-3 rounded-lg bg-amber-50 text-amber-900">{message}</p>}
        <button data-testid="auth-submit" disabled={busy || (mode === 'forgot' && resetSent)} className="primary-action w-full justify-center disabled:opacity-60">{busy ? 'Please wait…' : recovery ? 'Save new password' : mode === 'forgot' ? resetSent ? 'Reset link requested — check email' : 'Send reset link' : signup ? 'Create account' : 'Sign in'}</button>
        {!recovery && mode === 'forgot' && <button type="button" disabled={busy} className="secondary-action w-full justify-center" onClick={() => { setMode('signin'); setMessage(''); setResetSent(false); }}>Back to sign in</button>}
        {confirmationPending && signup && <button type="button" disabled={busy} className="secondary-action" onClick={() => void resend()}>Resend confirmation email</button>}
        </>}
      </form>
    </section>
  </main>;
}

import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Eye, EyeOff, Leaf, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Brand } from '../components/UI';
import { useSite } from '../hooks/useSite';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { firstOwnerSetupAvailable, createFirstOwner } from '../lib/adminApi';
import { resetPassword } from '../lib/adminApi';
import { envResult } from '../lib/env';
import { useQuery } from '@tanstack/react-query';

const loginSchema = z.object({ email: z.string().trim().email('Enter a valid email address.').max(254), password: z.string().min(8, 'Use at least 8 characters.').max(128) });
const signupSchema = loginSchema.extend({ fullName: z.string().trim().min(2, 'Enter your name.').max(200), confirm: z.string().min(8) }).refine((value) => value.password === value.confirm, { path: ['confirm'], message: 'The passwords do not match.' });
const emailOnlySchema = z.object({ email: z.string().trim().email('Enter a valid email address.').max(254) });
type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;
export default function AdminLogin() {
  const { site } = useSite(); const auth = useAdminAuth(); const [params] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(params.get('reset') === '1' ? 'forgot' : 'login');
  const [message, setMessage] = useState(''); const [actionError, setActionError] = useState(''); const [pending, setPending] = useState(false); const [showPassword, setShowPassword] = useState(false);
  const firstOwner = useQuery({ queryKey: ['first-owner-setup'], queryFn: firstOwnerSetupAvailable, enabled: !auth.user, retry: false });
  const login = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const signup = useForm<SignupValues>({ resolver: zodResolver(signupSchema), defaultValues: { email: '', password: '', confirm: '', fullName: '' } });
  const forgot = useForm<z.infer<typeof emailOnlySchema>>({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: '' } });
  useEffect(() => { if (firstOwner.data && mode === 'login' && !auth.user) setMode('signup'); }, [firstOwner.data, mode, auth.user]);
  if (auth.user && !auth.profileLoading && auth.profile) return <Navigate to={auth.profile.role === 'owner' ? '/admin' : '/admin/bookings'} replace />;
  const redirect = envResult.ok ? `${envResult.value.VITE_SITE_URL.replace(/\/$/, '')}/admin/login` : `${window.location.origin}/admin/login`;
  const submitLogin = login.handleSubmit(async (values) => {
    setPending(true); setActionError(''); setMessage('');
    try { await auth.signIn(values.email, values.password); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'We could not sign in. Please retry.'); }
    finally { setPending(false); }
  });
  const submitSignup = signup.handleSubmit(async (values) => {
    setPending(true); setActionError(''); setMessage('');
    try {
      if (!firstOwner.data) throw new Error('Owner setup is closed. Ask the owner to invite your staff account.');
      const result = await createFirstOwner(values.email, values.password, values.fullName, redirect);
      if (result.requiresEmail) { setMessage('Check your email for a confirmation link. Your owner account will be ready after you confirm it.'); setMode('login'); }
      else { await auth.refreshProfile(); setMessage('Your owner account is ready. You can now continue setup.'); }
      void firstOwner.refetch();
    } catch (error) { setActionError(error instanceof Error ? error.message : 'We could not create the account. Please try again.'); }
    finally { setPending(false); }
  });
  const submitForgot = forgot.handleSubmit(async ({ email }) => {
    setPending(true); setActionError(''); setMessage('');
    try { await resetPassword(email, redirect); setMessage('If an account exists for that address, a password reset link is on its way.'); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'We could not send a reset link. Please retry.'); }
    finally { setPending(false); }
  });
  return <main className="admin-auth-page"><div className="admin-auth-art"><div className="admin-auth-brand"><Brand name={site.settings.business_name} tagline="A little space for your studio" logoUrl={site.settings.logo_url} /></div><div className="admin-auth-image" /><div className="admin-auth-art-copy"><span className="font-hindi">आपका स्वागत है</span><h1>Good care<br />starts here.</h1><p>A thoughtful home for your studio, your team, and the care you share.</p><span className="admin-auth-promise"><ShieldCheck size={17} />Private studio access · Your account stays yours</span></div></div><div className="admin-auth-form-panel"><Link to="/" className="admin-back-link"><ArrowLeft size={16} />Back to the public website</Link><div className="admin-auth-form-wrap"><div className="admin-auth-mark"><Leaf size={25} /></div>{mode === 'login' && <><p className="admin-kicker">YOUR STUDIO, IN GOOD HANDS</p><h2>Welcome<br />back.</h2><p className="admin-auth-copy">Sign in to take care of the little things.</p>{message && <div className="admin-alert success" role="status">{message}</div>}{actionError && <div className="admin-alert error" role="alert">{actionError}</div>}{auth.expired && <div className="admin-alert error" role="alert">Session expired, please log in again. Your unsaved drafts are still available until you leave this page.</div>}{auth.error && <div className="admin-alert error" role="alert">{auth.error}</div>}<form onSubmit={(event) => void submitLogin(event)} noValidate><AdminField id="login-email" label="Email address" type="email" icon={<Mail size={17} />} register={login.register('email')} error={login.formState.errors.email?.message} autoComplete="email" /><div className="admin-auth-password"><AdminField id="login-password" label="Password" type={showPassword ? 'text' : 'password'} icon={<LockKeyhole size={17} />} register={login.register('password')} error={login.formState.errors.password?.message} autoComplete="current-password" /><button type="button" className="password-visibility" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><button className="admin-auth-submit" type="submit" disabled={pending || auth.loading}>{pending ? 'Checking your details…' : 'Sign in to your studio'}<ArrowLeft className="arrow-right" size={17} /></button></form><button className="admin-text-button" onClick={() => { setMode('forgot'); setActionError(''); setMessage(''); }}>Forgot password?</button>{firstOwner.data && <div className="admin-first-owner"><span>New to Veda Sanjeevani?</span><button className="admin-text-button" onClick={() => { setMode('signup'); setMessage(''); setActionError(''); }}>Create the owner account <span className="font-hindi">· पहला कदम</span></button></div>}{firstOwner.isError && <p className="admin-muted">Owner setup status could not be checked. <button className="admin-text-button" onClick={() => void firstOwner.refetch()}>Retry</button></p>}</>}
      {mode === 'signup' && <><p className="admin-kicker">THE FIRST STEP, TOGETHER</p><h2>Create your<br />owner account.</h2><p className="admin-auth-copy">Your studio’s first account becomes its owner. Use an email you can verify.</p>{actionError && <div className="admin-alert error" role="alert">{actionError}</div>}{message && <div className="admin-alert success" role="status">{message}</div>}<form onSubmit={(event) => void submitSignup(event)} noValidate><AdminField id="signup-name" label="Your name" type="text" icon={<Leaf size={17} />} register={signup.register('fullName')} error={signup.formState.errors.fullName?.message} autoComplete="name" /><AdminField id="signup-email" label="Email address" type="email" icon={<Mail size={17} />} register={signup.register('email')} error={signup.formState.errors.email?.message} autoComplete="email" /><AdminField id="signup-password" label="Create a password" type={showPassword ? 'text' : 'password'} icon={<LockKeyhole size={17} />} register={signup.register('password')} error={signup.formState.errors.password?.message} autoComplete="new-password" /><AdminField id="signup-confirm" label="Confirm password" type={showPassword ? 'text' : 'password'} icon={<LockKeyhole size={17} />} register={signup.register('confirm')} error={signup.formState.errors.confirm?.message} autoComplete="new-password" /><button type="button" className="admin-text-button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide passwords' : 'Show passwords'}</button><button className="admin-auth-submit" type="submit" disabled={pending || !firstOwner.data}>{pending ? 'Creating your account…' : 'Create owner account'}<ArrowLeft className="arrow-right" size={17} /></button></form><button className="admin-text-button" onClick={() => setMode('login')}>Already have an account? Sign in</button></>}
      {mode === 'forgot' && <><p className="admin-kicker">A FRESH START</p><h2>Reset your<br />password.</h2><p className="admin-auth-copy">We’ll send a secure reset link if there’s an account for this email.</p>{actionError && <div className="admin-alert error" role="alert">{actionError}</div>}{message && <div className="admin-alert success" role="status">{message}</div>}<form onSubmit={(event) => void submitForgot(event)} noValidate><AdminField id="reset-email" label="Email address" type="email" icon={<Mail size={17} />} register={forgot.register('email')} error={forgot.formState.errors.email?.message} autoComplete="email" /><button className="admin-auth-submit" type="submit" disabled={pending}>{pending ? 'Sending a secure link…' : 'Send reset link'}<ArrowLeft className="arrow-right" size={17} /></button></form><button className="admin-text-button" onClick={() => { setMode('login'); setMessage(''); setActionError(''); }}>Return to sign in</button></>}
      <p className="admin-auth-privacy"><ShieldCheck size={14} />Your studio account is protected by Supabase Auth and role-based database access.</p></div><p className="admin-auth-footer">A quieter rhythm, rooted in Ayurveda.<br /><span>Take a breath. You’re in the right place.</span></p></div></main>;
}
function AdminField({ id, label, type, icon, register, error, autoComplete }: { id: string; label: string; type: string; icon: ReactNode; register: UseFormRegisterReturn; error?: string | undefined; autoComplete: string }) {
  return <div className="admin-form-field"><label htmlFor={id}>{label}</label><div className="admin-input-wrap">{icon}<input id={id} type={type} autoComplete={autoComplete} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...register} /></div>{error && <p id={`${id}-error`} className="admin-field-error">{error}</p>}</div>;
}

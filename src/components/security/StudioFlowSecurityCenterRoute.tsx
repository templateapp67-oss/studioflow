import { useAuthSession } from '../../lib/useAuthSession';
import { SecurityCenterEntry } from './SecurityCenterEntry';

export function StudioFlowSecurityCenterRoute({ mode }: { mode: 'admin' | 'owner' }) {
  const { session, ready, mfa, error } = useAuthSession();
  if (mfa) return <p role="alert">Complete two-step verification in your account before continuing.</p>;
  if (error) return <p role="alert">Your session could not be verified. Sign in again.</p>;
  if (!ready) return <p role="status">Checking session…</p>;
  if (!session) return <a href="/login">Sign in to continue</a>;
  return <SecurityCenterEntry key={session.user.id} mode={mode} userId={session.user.id}
    accessToken={session.access_token} />;
}

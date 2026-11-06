import React, { lazy, Suspense, useEffect, useState } from 'react';
import { PublicHomepage } from './components/PublicHomepage';
import { loadScreen } from './lib/loadScreen';
import { capturePublicReferral } from './lib/publicReferral';

const FullApplication = lazy(() =>
  loadScreen(() => import('./App').then((module) => ({ default: module.default }))),
);

const APP_QUERY_KEYS = [
  'site', 's', 'subdomain', 'app', 'customer', 'customer_ref', 'auth', 'create',
  'owner', 'panel', 'template', 'recovery', 'invite', 'module', 'code',
  'access_token', 'error', 'error_description',
];

export function requiresFullApplication(location: Pick<Location, 'pathname' | 'search' | 'hash'>): boolean {
  if (location.pathname !== '/' && location.pathname !== '/index.html') return true;

  const query = new URLSearchParams(location.search);
  if (APP_QUERY_KEYS.some((key) => query.has(key))) return true;

  const fragment = new URLSearchParams(location.hash.replace(/^#/, ''));
  return ['type', 'access_token', 'refresh_token', 'code', 'error', 'error_description']
    .some((key) => fragment.has(key));
}

function hasPersistedOwnerSession(): boolean {
  try {
    return Boolean(window.localStorage.getItem('studioflow_supabase_session'));
  } catch {
    return false;
  }
}

/**
 * Keep the signed-out homepage independent from the auth/Supabase workspace.
 * Query/path-based salon sites and every auth, invite, customer, and owner entry
 * continue through the existing application unchanged.
 */
export function AppRouter() {
  const [showApplication, setShowApplication] = useState(() =>
    typeof window !== 'undefined' && requiresFullApplication(window.location),
  );

  useEffect(() => {
    if (!showApplication && typeof window !== 'undefined') {
      if (requiresFullApplication(window.location) || hasPersistedOwnerSession()) {
        setShowApplication(true);
      }
    }
  }, [showApplication]);

  if (!showApplication) return <PublicHomepage />;

  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-white px-6 text-center text-sm font-semibold text-slate-700" role="status">Loading NEXORA…</main>}>
      <FullApplication />
    </Suspense>
  );
}

// Preserve business-referral signup behavior before a visitor follows a link to /login.
if (typeof window !== 'undefined') capturePublicReferral(window.location.search);

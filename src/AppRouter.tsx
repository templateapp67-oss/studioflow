import React, { lazy, Suspense, useEffect, useState } from 'react';
import { PublicHomepage } from './components/PublicHomepage';
import { NexoraSalonLandingPage } from './components/nexora-landing/NexoraSalonLandingPage';
import { NexoraPricingLandingPage } from './components/nexora-landing/NexoraPricingLandingPage';
import { NexoraPrivacyNoticePage } from './components/nexora-landing/NexoraPrivacyNoticePage';
import { NexoraEcosystemPage } from './components/nexora-landing/NexoraEcosystemPage';
import { NexoraDemoLeadsAdmin } from './components/nexora-landing/admin/NexoraDemoLeadsAdmin';
import { loadScreen } from './lib/loadScreen';
import { capturePublicReferral } from './lib/publicReferral';
import { AUTH_CALLBACK_QUERY_KEYS, hasAuthCallbackFragment } from './lib/authEntry';
import { resolveSiteSlug } from './lib/resolveSite';

const FullApplication = lazy(() =>
  loadScreen(() => import('./App').then((module) => ({ default: module.default }))),
);

const APP_QUERY_KEYS = [
  'site', 's', 'subdomain', 'app', 'customer', 'customer_ref', 'create',
  'owner', 'panel', 'template', 'category', 'module',
  ...AUTH_CALLBACK_QUERY_KEYS,
];

/**
 * Public marketing routes that ship their own prerendered document. They stay
 * outside the owner application so the landing page can be indexed and
 * hydrated without booting the workspace bundle.
 */
const PUBLIC_MARKETING_ROUTES = new Set(['/salon-os', '/pricing', '/privacy', '/salon-onboarding', '/salon-growth', '/growth-partner-rewards']);

export function requiresFullApplication(location: Pick<Location, 'pathname' | 'search' | 'hash' | 'hostname'>): boolean {
  if (resolveSiteSlug(location)) return true;

  const query = new URLSearchParams(location.search);
  if (APP_QUERY_KEYS.some((key) => query.has(key))) return true;
  if (hasAuthCallbackFragment(location.hash)) return true;

  const normalisedPath = location.pathname.replace(/\/+$/, '') || '/';
  if (PUBLIC_MARKETING_ROUTES.has(normalisedPath)) return false;
  if (location.pathname !== '/' && location.pathname !== '/index.html') return true;

  return false;
}

function hasPersistedOwnerSession(): boolean {
  try {
    return Boolean(window.localStorage.getItem('studioflow_supabase_session'));
  } catch {
    return false;
  }
}

/**
 * Keep the public homepage independent from auth/bootstrap for signed-in and
 * signed-out visitors. Query/path-based salon sites and every auth, invite,
 * customer, and owner entry continue through the existing application unchanged.
 */
export function AppRouter() {
  const [showApplication] = useState(() =>
    typeof window !== 'undefined' && requiresFullApplication(window.location),
  );
  const [authenticated, setAuthenticated] = useState(() =>
    typeof window !== 'undefined' && hasPersistedOwnerSession(),
  );

  useEffect(() => {
    const refreshAuthentication = () => setAuthenticated(hasPersistedOwnerSession());
    window.addEventListener('storage', refreshAuthentication);
    return () => window.removeEventListener('storage', refreshAuthentication);
  }, []);

  const publicPath = typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') : '';
  if (publicPath === '/salon-os') return <NexoraSalonLandingPage />;
  if (publicPath === '/pricing') return <NexoraPricingLandingPage />;
  if (publicPath === '/privacy') return <NexoraPrivacyNoticePage />;
  if (publicPath === '/salon-onboarding' || publicPath === '/salon-growth' || publicPath === '/growth-partner-rewards') {
    return <NexoraEcosystemPage path={publicPath} />;
  }
  if (publicPath === '/admin/demo-leads') return <NexoraDemoLeadsAdmin />;
  if (!showApplication) return <PublicHomepage authenticated={authenticated} />;

  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-white px-6 text-center text-sm font-semibold text-slate-700" role="status">Loading NEXORA…</main>}>
      <FullApplication />
    </Suspense>
  );
}

// Preserve business-referral signup behavior before a visitor follows a link to /login.
if (typeof window !== 'undefined') capturePublicReferral(window.location.search);

import React, { lazy, Suspense, useEffect, useState } from 'react';
import { PublicHomepage } from './components/PublicHomepage';
import { NexoraTawkWidget } from './components/NexoraTawkWidget';
import { NexoraSalonLandingPage } from './components/nexora-landing/NexoraSalonLandingPage';
import { NexoraPricingLandingPage } from './components/nexora-landing/NexoraPricingLandingPage';
import { NexoraPrivacyNoticePage } from './components/nexora-landing/NexoraPrivacyNoticePage';
import { NexoraEcosystemPage } from './components/nexora-landing/NexoraEcosystemPage';
import { NexoraPartnerRewardsPage } from './components/nexora-landing/NexoraPartnerRewardsPage';
import { NexoraDemoLeadsAdmin } from './components/nexora-landing/admin/NexoraDemoLeadsAdmin';
import { loadScreen } from './lib/loadScreen';
import { capturePublicReferral } from './lib/publicReferral';
import { AUTH_CALLBACK_QUERY_KEYS, hasAuthCallbackFragment } from './lib/authEntry';
import { isAuthEntryPath } from './lib/authRoutes';
import { inviteTokenFrom, isStaffRoute } from './lib/staffRoutes';
import { StaffInviteAcceptPage } from './components/staff/StaffInviteAcceptPage';
import { StaffLoginPage } from './components/staff/StaffLoginPage';
import { StaffWorkspacePage } from './components/staff/StaffWorkspacePage';
import { resolveSiteSlug } from './lib/resolveSite';
import { hasPersistedAuthSession } from './lib/authStorage';

const AccountSecurityPage = lazy(() => import('./components/AccountSecurityPage').then(module => ({ default: module.AccountSecurityPage })));

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
const PUBLIC_MARKETING_ROUTES = new Set(['/about', '/salon-os', '/pricing', '/privacy', '/salon-onboarding', '/salon-growth', '/growth-partner-rewards', '/partner-rewards']);

export function requiresFullApplication(location: Pick<Location, 'pathname' | 'search' | 'hash' | 'hostname'>): boolean {
  // Staff routes own their own screens: /staff/accept works signed out (invite
  // validation only), /staff/login and /staff need a session.
  if (isStaffRoute(location.pathname)) return true;
  if (resolveSiteSlug(location)) return true;

  // `/login`, `/sign-in` and `/sign-up` must always boot the auth bundle even
  // though only `/login` has a prerendered marketing document.
  if (isAuthEntryPath(location.pathname)) return true;

  const query = new URLSearchParams(location.search);
  if (APP_QUERY_KEYS.some((key) => query.has(key))) return true;
  if (hasAuthCallbackFragment(location.hash)) return true;

  const normalisedPath = location.pathname.replace(/\/+$/, '') || '/';
  if (PUBLIC_MARKETING_ROUTES.has(normalisedPath)) return false;
  if (location.pathname !== '/' && location.pathname !== '/index.html') return true;

  return false;
}

// Session tokens live in sessionStorage now; the helper migrates any legacy
// localStorage copy before reporting, and never throws.
function hasPersistedOwnerSession(): boolean {
  return hasPersistedAuthSession('studioflow_supabase_session');
}

/**
 * Keep the public homepage independent from auth/bootstrap for signed-in and
 * signed-out visitors. Query/path-based salon sites and every auth, invite,
 * customer, and owner entry continue through the existing application unchanged.
 */
function withNexoraPublicSupport(content: React.ReactNode) {
  return <>{content}<NexoraTawkWidget /></>;
}

export function AppRouter() {
  const [, setLocationTick] = useState(0);
  // Keep the first client render identical to the prerendered public homepage.
  // A stored owner session is reflected immediately after hydration, not during
  // hydrateRoot, so the owner-specific CTA cannot cause a server/client mismatch.
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const refreshAuthentication = () => setAuthenticated(hasPersistedOwnerSession());
    const handlePopState = () => setLocationTick((tick) => tick + 1);
    refreshAuthentication();
    window.addEventListener('storage', refreshAuthentication);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('storage', refreshAuthentication);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const showApplication = typeof window !== 'undefined' && requiresFullApplication(window.location);
  const publicPath = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') : '';

  if (publicPath === '/login' && new URLSearchParams(window.location.search).get('security') === '1') {
    return <Suspense fallback={<p role="status">Loading account security…</p>}><AccountSecurityPage /></Suspense>;
  }

  // Staff entry points are rendered here, read-only and independent from the
  // owner bootstrap: no account load, no workspace fetch, no draft save.
  if (publicPath === '/staff/accept') {
    return <StaffInviteAcceptPage token={inviteTokenFrom(window.location.search)} />;
  }
  if (publicPath === '/staff/login') return <StaffLoginPage />;
  if (publicPath === '/staff') return <StaffWorkspacePage />;

  if (publicPath === '/salon-os') return withNexoraPublicSupport(<NexoraSalonLandingPage />);
  if (publicPath === '/pricing') return withNexoraPublicSupport(<NexoraPricingLandingPage />);
  if (publicPath === '/privacy') return withNexoraPublicSupport(<NexoraPrivacyNoticePage />);
  if (publicPath === '/partner-rewards') return withNexoraPublicSupport(<NexoraPartnerRewardsPage />);
  if (publicPath === '/about' || publicPath === '/salon-onboarding' || publicPath === '/salon-growth' || publicPath === '/growth-partner-rewards') {
    return withNexoraPublicSupport(<NexoraEcosystemPage path={publicPath} />);
  }
  if (publicPath === '/admin/demo-leads') return <NexoraDemoLeadsAdmin />;
  if (!showApplication) return withNexoraPublicSupport(<PublicHomepage authenticated={authenticated} />);

  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-white px-6 text-center text-sm font-semibold text-slate-700" role="status">Loading NEXORA…</main>}>
      <FullApplication />
    </Suspense>
  );
}

// Preserve business-referral signup behavior before a visitor follows a link to /login.
if (typeof window !== 'undefined') capturePublicReferral(window.location.search);

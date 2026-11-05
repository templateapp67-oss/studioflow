// Ensure window.fetch has both getter and setter in iframe environments
try {
  const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
  if (!desc || !desc.set) {
    let currentFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      get() {
        return currentFetch;
      },
      set(fn) {
        currentFetch = fn;
      },
      configurable: true,
      enumerable: true,
    });
  }
} catch {
  // Ignore descriptor errors
}

import React, { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import { PublicHomePage } from './components/PublicHomePage';
import { supabase } from './lib/supabase';
import { AppUpdateManager } from './components/AppUpdateManager';
import { DebugBoundary } from './components/DebugBoundary';
import { installScreenRecovery } from './lib/loadScreen';
import { registerCustomerPwa } from './lib/customerPwa';
import './index.css';
import './components/dermacure.css';
import './components/vogueNoir.css';
import './components/bodhiTree.css';
import './components/prismChroma.css';
import './components/shringaarRoyal.css';
import './components/archFlutter.css';

installScreenRecovery();
registerCustomerPwa();

const rootElement = document.getElementById('root');

function mountApplication() {
  if (!rootElement) return;
  createRoot(rootElement).render(
    <StrictMode>
      {/* DebugBoundary sits above App so a render failure can never leave a blank page. */}
      <DebugBoundary>
        <App />
      </DebugBoundary>
      <AppUpdateManager />
    </StrictMode>,
  );
}

const appEntryQueryKeys = [
  'app',
  'customer',
  'site',
  's',
  'subdomain',
  'template',
  'category',
  'create',
  'owner',
  'panel',
  'auth',
  'recovery',
  'ref',
  'customer_ref',
  'return',
  'passwordUpdated',
  'code',
  'error',
  'error_description',
  'tab',
  'type',
  'token_hash',
  'access_token',
  'refresh_token',
  'provider_token',
  'provider_refresh_token',
  'expires_in',
  'expires_at',
  'scope',
];

const query = new URLSearchParams(window.location.search);
const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
const hasAppEntryQuery = appEntryQueryKeys.some((key) => query.has(key));
const hasAuthCallback = [
  'type',
  'access_token',
  'refresh_token',
  'error',
  'error_description',
].some((key) => hash.has(key));

if (
  rootElement?.dataset.prerendered === 'true' &&
  window.location.pathname === '/' &&
  !hasAppEntryQuery &&
  !hasAuthCallback
) {
  // Hydrate the same public homepage markup sent in the initial HTML response.
  const hydratedRoot = hydrateRoot(
    rootElement,
    <StrictMode>
      <PublicHomePage />
    </StrictMode>,
  );

  let applicationMounted = false;
  let authSubscription: { unsubscribe: () => void } | undefined;

  const switchToAuthenticatedApplication = () => {
    if (applicationMounted) return;
    applicationMounted = true;
    authSubscription?.unsubscribe();
    hydratedRoot.unmount();
    mountApplication();
  };

  const authListener = supabase.auth.onAuthStateChange(
    (_event, session) => {
      if (session) switchToAuthenticatedApplication();
    },
  );
  authSubscription = authListener.data.subscription;
  // Supabase may emit an initial signed-in session before the assignment above.
  if (applicationMounted) authSubscription.unsubscribe();

  // Signed-in owners still reach their existing workspace from the root URL.
  void supabase.auth.getSession().then(({ data, error }) => {
    if (!error && data.session) {
      switchToAuthenticatedApplication();
    }
  }).catch((error) => {
    console.error('[NEXORA] Could not check the existing session:', error);
  });
} else {
  // All app/query routes keep the existing React application entry point.
  mountApplication();
}

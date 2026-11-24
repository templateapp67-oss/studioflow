import React, { StrictMode, Suspense, lazy, useEffect, useState } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { AppRouter, requiresFullApplication } from './AppRouter';
import { DebugBoundary } from './components/DebugBoundary';
import { installScreenRecovery } from './lib/loadScreen';
import { registerCustomerPwa } from './lib/customerPwa';
import './index.css';

const AppUpdateManager = lazy(() =>
  import('./components/AppUpdateManager').then((module) => ({ default: module.AppUpdateManager })),
);

/** Mount client-only update polling after hydration, without dropping it on public routes. */
function AppUpdateManagerAfterHydration() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return ready ? (
    <Suspense fallback={null}>
      <AppUpdateManager />
    </Suspense>
  ) : null;
}

installScreenRecovery();
registerCustomerPwa();

const rootElement = document.getElementById('root');
if (rootElement) {
  const hasPublishedSalonSsr = Boolean(document.getElementById('nexora-published-site-data'));
  const canHydrate = rootElement.hasChildNodes()
    && (!requiresFullApplication(window.location) || hasPublishedSalonSsr);

  const content = (
    <StrictMode>
      <DebugBoundary>
        <AppRouter />
      </DebugBoundary>
      <AppUpdateManagerAfterHydration />
    </StrictMode>
  );

  if (hasPublishedSalonSsr) {
    // The server rendered PublishedWebsite's storefront subtree. Hydrating
    // AppRouter first would hit its lazy FullApplication boundary and replace
    // that HTML with the Suspense loader on a cold load. Load App directly,
    // then hydrate the matching PublishedWebsite tree without clearing SSR.
    void import('./App')
      .then(({ default: PublishedSalonApp }) => {
        if (!rootElement.isConnected || document.getElementById('root') !== rootElement) return;
        hydrateRoot(
          rootElement,
          <StrictMode>
            <DebugBoundary>
              <PublishedSalonApp />
            </DebugBoundary>
            <AppUpdateManagerAfterHydration />
          </StrictMode>,
        );
      })
      .catch((error) => {
        console.error('[NEXORA] Published salon hydration failed; mounting the client app.', error);
        if (rootElement.isConnected && document.getElementById('root') === rootElement) {
          rootElement.replaceChildren();
          createRoot(rootElement).render(content);
        }
      });
  } else if (canHydrate) {
    hydrateRoot(rootElement, content);
  } else {
    if (rootElement.hasChildNodes()) rootElement.replaceChildren();
    createRoot(rootElement).render(content);
  }
}

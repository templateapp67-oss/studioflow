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
    // Hydrate only the storefront component tree emitted by the server.
    // The default App adds global Suspense/referral wrappers that do not exist
    // in the SSR document and cause React to recover from a root mismatch.
    void import('./App')
      .then(({ PublishedSalonHydrationApp }) => {
        if (!rootElement.isConnected || document.getElementById('root') !== rootElement) return;
        hydrateRoot(
          rootElement,
          <StrictMode>
            <DebugBoundary>
              <PublishedSalonHydrationApp />
            </DebugBoundary>
            <AppUpdateManagerAfterHydration />
          </StrictMode>,
          {
            onRecoverableError(error, errorInfo) {
              // Preserve the component tree in CI logs so a future SSR mismatch
              // can be fixed at its source rather than hidden or ignored.
              console.error('[NEXORA] Recoverable SSR hydration error', {
                message: error instanceof Error ? error.message : String(error),
                componentStack: errorInfo.componentStack || '',
                cause: error instanceof Error ? error.cause : undefined,
              });
            },
          },
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

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
  // Public marketing documents are server-rendered; delay client-only update
  // polling until after the first commit so its lazy boundary cannot mismatch
  // the static HTML during hydration.
  const canHydrate = rootElement.hasChildNodes()
    && !requiresFullApplication(window.location);

  const content = (
    <StrictMode>
      <DebugBoundary>
        <AppRouter />
      </DebugBoundary>
      <AppUpdateManagerAfterHydration />
    </StrictMode>
  );

  // Published sites and auth routes keep their existing client app.
  if (canHydrate) {
    hydrateRoot(rootElement, content);
  } else {
    if (rootElement.hasChildNodes()) rootElement.replaceChildren();
    createRoot(rootElement).render(content);
  }
}

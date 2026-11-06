import React, { StrictMode, Suspense, lazy } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { AppRouter, requiresFullApplication } from './AppRouter';
import { DebugBoundary } from './components/DebugBoundary';
import { installScreenRecovery } from './lib/loadScreen';
import { registerCustomerPwa } from './lib/customerPwa';
import './index.css';

const AppUpdateManager = lazy(() =>
  import('./components/AppUpdateManager').then((module) => ({ default: module.AppUpdateManager })),
);

installScreenRecovery();
registerCustomerPwa();

const rootElement = document.getElementById('root');
if (rootElement) {
  const content = (
    <StrictMode>
      <DebugBoundary>
        <AppRouter />
      </DebugBoundary>
      <Suspense fallback={null}>
        <AppUpdateManager />
      </Suspense>
    </StrictMode>
  );

  // The production homepage is server-rendered. Hydrate it only on the matching
  // public route; published sites and auth routes keep their existing client app.
  const canHydrate = rootElement.hasChildNodes()
    && !requiresFullApplication(window.location);

  if (canHydrate) {
    hydrateRoot(rootElement, content);
  } else {
    if (rootElement.hasChildNodes()) rootElement.replaceChildren();
    createRoot(rootElement).render(content);
  }
}

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
import { createRoot } from 'react-dom/client';
import App from './App';
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
if (rootElement) {
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

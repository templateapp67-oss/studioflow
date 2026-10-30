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

installScreenRecovery();
registerCustomerPwa();

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <DebugBoundary>
        <App />
        <AppUpdateManager />
      </DebugBoundary>
    </StrictMode>
  );
}

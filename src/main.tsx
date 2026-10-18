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

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {installScreenRecovery} from './lib/loadScreen';
installScreenRecovery();
import {registerCustomerPwa} from './lib/customerPwa';
registerCustomerPwa();
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

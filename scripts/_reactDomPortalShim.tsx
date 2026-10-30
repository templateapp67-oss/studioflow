/**
 * Test harness shim: `react-test-renderer` cannot render React portals, so the
 * customizer verify script aliases `react-dom` to this module and lets portals
 * render their children inline. Nothing in `src/` imports this file.
 */
import type { ReactNode } from 'react';

export * from 'react-dom';
export const createPortal = (children: ReactNode) => children;

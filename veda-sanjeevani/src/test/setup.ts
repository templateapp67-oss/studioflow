import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });
class TestIntersectionObserver implements IntersectionObserver { root = null; rootMargin = '0px'; thresholds = [0]; takeRecords() { return []; } observe(target: Element) { this.callback([{ target, isIntersecting: true, intersectionRatio: 1, boundingClientRect: target.getBoundingClientRect(), intersectionRect: target.getBoundingClientRect(), rootBounds: null, time: 0 }], this); } unobserve() {} disconnect() {} constructor(private callback: IntersectionObserverCallback) {} }
vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) });
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

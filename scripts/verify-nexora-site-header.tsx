import React from 'react';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import TestRenderer, { act } from 'react-test-renderer';
import { SiteHeader } from '../src/components/nexora-landing/sections/SiteHeader';
import type { LandingNavLink } from '../src/lib/nexoraLandingContent';

const NAV_LINKS: LandingNavLink[] = [
  { label: 'Salon Onboarding', href: '/salon-onboarding' },
  { label: 'Salon Growth', href: '/salon-growth' },
  { label: 'Pricing', href: '/pricing' },
];
const SECONDARY_ACTION = {
  label: 'WhatsApp',
  compactLabel: 'Chat with NEXORA on WhatsApp',
  href: 'https://wa.me/917852877721',
  target: '_blank',
  rel: 'noopener noreferrer',
  ariaLabel: 'Chat with NEXORA on WhatsApp',
  dataAttribute: {
    name: 'data-nexora-whatsapp-cta',
    desktopValue: 'desktop-header',
    compactValue: 'mobile-menu',
  },
};
const PRIMARY_ACTION = { label: 'Get Started', href: '/login?auth=signup' };

const previousWindow = (globalThis as any).window;
const previousDocument = (globalThis as any).document;
const previousResizeObserver = (globalThis as any).ResizeObserver;
const previousIntersectionObserver = (globalThis as any).IntersectionObserver;
const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let availableWidth = 1440;
let measuringRowWidth = 980;
let focusOnFirstMenuLink = 0;
let focusOnMenuToggle = 0;
let nextFrameId = 1;
const frameCallbacks = new Map<number, FrameRequestCallback>();
const windowListeners = new Map<string, Set<(event: any) => void>>();
let activeResizeObserver: MockResizeObserver | null = null;

const innerNode = { get clientWidth() { return availableWidth; } };
const brandNode = { getBoundingClientRect: () => ({ width: 212 }) };
const measuringRowNode = { getBoundingClientRect: () => ({ width: measuringRowWidth }) };
const compactActionNode = { getBoundingClientRect: () => ({ width: 120 }) };
const toggleNode = {
  getBoundingClientRect: () => ({ width: 44 }),
  focus: () => { focusOnMenuToggle += 1; },
};
const navigationNode = {
  querySelector: () => ({ focus: () => { focusOnFirstMenuLink += 1; } }),
};
let measurementNodeCount = 0;

class MockResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {
    activeResizeObserver = this;
  }
  observe() {}
  disconnect() {}
  refresh() { this.callback([], this as unknown as ResizeObserver); }
}

const windowStub = {
  location: { pathname: '/salon-onboarding', origin: 'https://nexora.test', hash: '' },
  requestAnimationFrame(callback: FrameRequestCallback) {
    const id = nextFrameId++;
    frameCallbacks.set(id, callback);
    return id;
  },
  cancelAnimationFrame(id: number) { frameCallbacks.delete(id); },
  addEventListener(type: string, callback: (event: any) => void) {
    const listeners = windowListeners.get(type) ?? new Set();
    listeners.add(callback);
    windowListeners.set(type, listeners);
  },
  removeEventListener(type: string, callback: (event: any) => void) {
    windowListeners.get(type)?.delete(callback);
  },
  getComputedStyle(node: unknown) {
    if (node === innerNode) {
      return {
        columnGap: '20px',
        getPropertyValue: (name: string) => name === '--nsh-row-gap' ? '20px' : name === '--nsh-compact-gap' ? '12px' : '',
      };
    }
    if (node === toggleNode) return { width: '44px', getPropertyValue: () => '' };
    return { width: '', columnGap: '', getPropertyValue: () => '' };
  },
};

(globalThis as any).window = windowStub;
(globalThis as any).document = {};
(globalThis as any).ResizeObserver = MockResizeObserver;
(globalThis as any).IntersectionObserver = undefined;

function flushAnimationFrames() {
  const pending = [...frameCallbacks.values()];
  frameCallbacks.clear();
  for (const callback of pending) callback(0);
}

function emitWindowEvent(type: string, event: any = {}) {
  for (const callback of windowListeners.get(type) ?? []) callback(event);
}

function headerProps(currentPath = '/salon-onboarding') {
  return {
    links: NAV_LINKS,
    mobileLinks: NAV_LINKS,
    currentPath,
    showHelpCentre: false,
    secondaryAction: SECONDARY_ACTION,
    primaryAction: PRIMARY_ACTION,
    appearance: 'homepage' as const,
  };
}

let renderer: TestRenderer.ReactTestRenderer | undefined;
try {
  await act(async () => {
    renderer = TestRenderer.create(<SiteHeader {...headerProps()} />, {
      createNodeMock(element) {
        const className = String(element.props.className ?? '');
        if (element.type === 'div' && className === 'nexora-site-header__inner') return innerNode;
        if (element.type === 'a' && className === 'nexora-site-header__brand') return brandNode;
        if (element.type === 'div' && className === 'nexora-site-header__measure') {
          measurementNodeCount += 1;
          return measurementNodeCount === 1 ? measuringRowNode : compactActionNode;
        }
        if (element.type === 'span' && className.includes('nexora-site-header__compact-primary')) return compactActionNode;
        if (element.type === 'nav' && className === 'nexora-site-header__nav') return navigationNode;
        if (element.type === 'button' && className === 'nexora-site-header__toggle') return toggleNode;
        return null;
      },
    });
  });

  const tree = () => renderer!.root;
  const header = () => tree().findByType('header');
  const menu = () => tree().findByProps({ className: 'nexora-site-header__menu' });
  const menuToggle = () => tree().findAllByType('button').find((node) =>
    String(node.props.className ?? '').includes('nexora-site-header__toggle'))!;
  const trackedWhatsApp = () => tree().findAllByType('a').find((node) =>
    node.props['data-nexora-whatsapp-cta'] !== undefined)!;
  const resize = async (width: number) => {
    availableWidth = width;
    await act(async () => { activeResizeObserver?.refresh(); });
  };
  const openMenu = async () => {
    await act(async () => { menuToggle().props.onClick(); });
    await act(async () => { flushAnimationFrames(); });
  };
  const closeAndRestoreFocus = async (close: () => void) => {
    await act(async () => { close(); });
    await act(async () => { flushAnimationFrames(); });
    assert.equal(menuToggle().props['aria-expanded'], false, 'the mobile menu closes');
    assert.ok(focusOnMenuToggle > 0, 'closing restores focus to the menu toggle');
  };

  assert.equal(header().props.role, 'banner', 'the shared site header always exposes one page banner landmark');
  assert.ok(!header().props.className.includes('nexora-site-header--compact'), 'the full navigation fits at a wide size');
  assert.equal(trackedWhatsApp().props['data-nexora-whatsapp-cta'], 'desktop-header');

  await resize(430);
  assert.ok(header().props.className.includes('nexora-site-header--compact'), 'the measured layout collapses before the desktop row overflows');
  assert.ok(header().props.className.includes('has-compact-action'), 'the compact primary action remains in the top row when it fits');
  assert.equal(menuToggle().props['aria-expanded'], false);
  assert.equal(menu().props['aria-hidden'], true, 'closed compact navigation is hidden from assistive technology');
  assert.equal(menu().props.inert, true, 'closed compact navigation is removed from keyboard interaction');
  assert.equal(trackedWhatsApp().props['data-nexora-whatsapp-cta'], 'mobile-menu', 'WhatsApp tracking changes to the compact-menu placement');
  assert.equal(trackedWhatsApp().props.target, '_blank', 'mobile WhatsApp opens a new tab');
  assert.equal(trackedWhatsApp().props.rel, 'noopener noreferrer', 'mobile WhatsApp has safe new-tab rel attributes');

  await openMenu();
  assert.equal(menuToggle().props['aria-expanded'], true);
  assert.equal(menu().props['aria-hidden'], undefined);
  assert.equal(menu().props.inert, undefined);
  assert.ok(focusOnFirstMenuLink > 0, 'opening moves focus into the compact navigation');

  let escapePrevented = false;
  await closeAndRestoreFocus(() => emitWindowEvent('keydown', {
    key: 'Escape',
    preventDefault() { escapePrevented = true; },
  }));
  assert.equal(escapePrevented, true, 'Escape is consumed when it closes the compact menu');

  await openMenu();
  const previousFocusCount = focusOnMenuToggle;
  await act(async () => { trackedWhatsApp().props.onClick(); });
  await act(async () => { flushAnimationFrames(); });
  assert.equal(menuToggle().props['aria-expanded'], false, 'following the mobile WhatsApp action closes the menu');
  assert.ok(focusOnMenuToggle > previousFocusCount, 'following the mobile action restores focus to the toggle');

  await openMenu();
  const beforeNavigationLinkFocus = focusOnMenuToggle;
  const routeLink = tree().findAllByType('a').find((node) =>
    node.props.href === '/salon-growth' && node.props.className === 'nexora-site-header__nav-link')!;
  await act(async () => { routeLink.props.onClick(); });
  await act(async () => { flushAnimationFrames(); });
  assert.equal(menuToggle().props['aria-expanded'], false, 'following a navigation link closes the compact menu');
  assert.ok(focusOnMenuToggle > beforeNavigationLinkFocus, 'following a navigation link restores focus to the toggle');

  await openMenu();
  const beforeRouteFocus = focusOnMenuToggle;
  await act(async () => { renderer!.update(<SiteHeader {...headerProps('/salon-growth')} />); });
  await act(async () => { flushAnimationFrames(); });
  assert.equal(menuToggle().props['aria-expanded'], false, 'changing the rendered route closes an open menu');
  assert.ok(focusOnMenuToggle > beforeRouteFocus, 'route changes restore focus when the header remains mounted');

  await openMenu();
  const beforePopstateFocus = focusOnMenuToggle;
  await closeAndRestoreFocus(() => emitWindowEvent('popstate'));
  assert.ok(focusOnMenuToggle > beforePopstateFocus, 'browser history navigation restores focus after closing');

  await openMenu();
  const focusBeforeResize = focusOnMenuToggle;
  await resize(1440);
  assert.ok(!header().props.className.includes('nexora-site-header--compact'), 'widening restores the full navigation');
  assert.equal(menuToggle().props['aria-expanded'], false, 'widening closes a menu that was open in the compact layout');
  assert.equal(focusOnMenuToggle, focusBeforeResize, 'restoring desktop layout does not focus a now-hidden menu toggle');

  await resize(320);
  assert.ok(header().props.className.includes('nexora-site-header--compact'));
  assert.ok(!header().props.className.includes('has-compact-action'), 'the top-row action moves into the menu when the brand, CTA and toggle do not fit');
  await openMenu();
  assert.ok(
    tree().findAllByType('a').some((node) => node.props.className === 'nexora-site-header__primary' && node.props.href === PRIMARY_ACTION.href),
    'the compact menu retains the primary action when there is not enough room in the top row',
  );

  const css = readFileSync('src/components/nexora-landing/sections/siteHeader.css', 'utf8');
  assert.match(css, /\.nexora-site-header--compact \.nexora-site-header__inner\s*\{[^}]*flex-wrap:\s*nowrap/s);
  assert.match(css, /\.nexora-site-header--compact \.nexora-site-header__menu\s*\{[^}]*display:\s*none;[^}]*max-height:\s*min\(72vh,\s*34rem\);[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.nexora-site-header--compact\.is-menu-open \.nexora-site-header__menu\s*\{[^}]*display:\s*flex/s);

  console.log('PASS: responsive header collapses/restores from measured width; compact action placement and WhatsApp tracking/new-tab safety; menu inertness, focus-on-open, Escape/history/route/link close, focus return and scrollable panel CSS.');
} finally {
  if (renderer) {
    await act(async () => { renderer?.unmount(); });
  }
  if (previousWindow === undefined) delete (globalThis as any).window;
  else (globalThis as any).window = previousWindow;
  if (previousDocument === undefined) delete (globalThis as any).document;
  else (globalThis as any).document = previousDocument;
  if (previousResizeObserver === undefined) delete (globalThis as any).ResizeObserver;
  else (globalThis as any).ResizeObserver = previousResizeObserver;
  if (previousIntersectionObserver === undefined) delete (globalThis as any).IntersectionObserver;
  else (globalThis as any).IntersectionObserver = previousIntersectionObserver;
  if (previousActEnvironment === undefined) delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  else (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
}

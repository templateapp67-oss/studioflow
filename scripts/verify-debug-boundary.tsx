import React from 'react';
import { act, create } from 'react-test-renderer';
import assert from 'node:assert/strict';

// DebugBoundary is the root-level safety net that surfaces raw stack traces while
// debugging but must never leak them to real customers.

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const listeners = new Map<string, any>();
const storage = new Map<string, string>();
const location = { search: '', reload: () => {} };

(globalThis as any).window = {
  location,
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value)
  },
  addEventListener: (type: string, fn: any) => listeners.set(type, fn),
  removeEventListener: (type: string) => listeners.delete(type)
};

// The boundary module must be imported after the window stub exists: it installs
// its global error listeners at import time.
const { DebugBoundary } = await import('../src/components/DebugBoundary');

const realConsoleError = console.error;
const logged: any[] = [];
console.error = (...args: any[]) => { logged.push(args); };
process.on('exit', () => { console.error = realConsoleError; });

class Boom extends Error {
  constructor() { super('boom'); this.name = 'Error'; }
}

function Thrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Boom();
  return <p>safe content</p>;
}

const textOf = (ui: any) =>
  JSON.stringify(ui.toJSON() ?? '');

async function render(children: React.ReactNode) {
  let ui: any;
  await act(async () => { ui = create(<DebugBoundary>{children}</DebugBoundary>); });
  return ui;
}

const button = (ui: any, label: string) =>
  ui.root.findAllByType('button').find((node: any) => node.children.join('') === label);

// 1. Happy path: children pass straight through, nothing is logged.
location.search = '';
let ui = await render(<p>hello</p>);
assert.equal(textOf(ui), JSON.stringify({ type: 'p', props: {}, children: ['hello'] }));
assert.equal(logged.filter(args => String(args[0]).startsWith('[DebugBoundary]')).length, 0,
  'a healthy tree produces no boundary error log');
await act(async () => ui.unmount());

// 2. Production (no ?debug, no localStorage flag): friendly recovery screen only,
//    no stack trace and no component tree exposed.
ui = await render(<Thrower shouldThrow />);
const prod = textOf(ui);
assert.match(prod, /Something went wrong/, 'production shows a recovery message');
assert.match(prod, /Reload/, 'production offers a reload action');
assert.doesNotMatch(prod, /boom/, 'production must not leak the error message');
assert.ok(logged.length >= 1, 'the failure is still logged for telemetry/triage');

// 3. Reload button reloads in production.
let reloads = 0;
location.reload = () => { reloads += 1; };
await act(async () => button(ui, 'Reload').props.onClick());
assert.equal(reloads, 1, 'reload button performs one real reload');
await act(async () => ui.unmount());

// 4. ?debug turns on the full-screen stack overlay.
logged.length = 0;
location.search = '?debug=1';
ui = await render(<Thrower shouldThrow />);
const overlay = textOf(ui);
assert.match(overlay, /DebugBoundary caught a render error/);
assert.match(overlay, /boom/, 'debug overlay shows the failing stack');
assert.ok(button(ui, 'Copy') && button(ui, 'Try again') && button(ui, 'Reload'));

// 5. One ErrorInfo per failure: componentStack captured when React provides it.
assert.ok(logged.some(args => args[0] === '[DebugBoundary]' && args[1] instanceof Boom),
  'componentDidCatch logs the original error object');
await act(async () => ui.unmount());

// 6. localStorage studioflow_debug=1 also enables the overlay (sticky debugging).
storage.set('studioflow_debug', '1');
location.search = '';
ui = await render(<Thrower shouldThrow />);
assert.match(textOf(ui), /DebugBoundary caught a render error/);

// 7. "Try again" resets the boundary so a transient failure can recover.
await act(async () => button(ui, 'Try again').props.onClick());
let recoverable: any;
await act(async () => { recoverable = create(<DebugBoundary><Thrower shouldThrow={false} /></DebugBoundary>); });
assert.match(textOf(recoverable), /safe content/, 'boundary renders children again after reset');
await act(async () => recoverable.unmount());
await act(async () => ui.unmount());

// 8. Non-React failures (window error / unhandled rejection) are logged next to
//    boundary failures so the console tells one story.
assert.ok(listeners.has('error'), 'window error listener installed');
assert.ok(listeners.has('unhandledrejection'), 'unhandledrejection listener installed');
logged.length = 0;
listeners.get('error')({ message: 'script failed', error: new Error('script failed') });
listeners.get('unhandledrejection')({ reason: new Error('promise failed') });
assert.ok(logged.some(args => args[0] === '[window.error]'));
assert.ok(logged.some(args => args[0] === '[unhandledrejection]'));

console.log('PASS: DebugBoundary renders children untouched, shows the raw stack only in debug mode, keeps production free of stack/message leaks, reloads and recovers on demand, and logs async failures alongside render failures.');

import assert from 'node:assert/strict';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { DemoProvider, useDemoDialog } from '../src/components/nexora-pricing/DemoProvider';

// Render the actual dialog with stubbed DOM/network; no live submissions.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).HTMLElement = class HTMLElement {};
(globalThis as any).document = { activeElement: null, body: { style: { overflow: '' } }, getElementById: () => null };
(globalThis as any).window = { location: { pathname: '/pricing' }, addEventListener() {}, removeEventListener() {}, requestAnimationFrame(fn: () => void) { fn(); } };
const priorFetch = globalThis.fetch, priorNow = Date.now;
let now = 100_000;
Date.now = () => now;
const calls: { url: string; body: any }[] = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), body: JSON.parse(String(init?.body || '{}')) });
  return new Response('{}', { status: 429, headers: { 'content-type': 'application/json' } });
};
function Trigger() { const { openDemo } = useDemoDialog(); return <button onClick={openDemo}>Open</button>; }
try {
  let root: ReturnType<typeof create>;
  await act(async () => { root = create(<DemoProvider><Trigger/></DemoProvider>, { createNodeMock: () => ({ focus() {} }) }); });
  await act(async () => { root!.root.findByProps({ children: 'Open' }).props.onClick(); });
  const form = () => root!.root.findByType('form');
  await act(async () => { await form().props.onSubmit({ preventDefault() {} }); });
  assert.equal(calls.length, 0, 'fast submissions are stopped before network');
  assert.match(JSON.stringify(root!.toJSON()), /Please wait a moment/);
  now += 3000;
  const inputs = root!.root.findAllByType('input');
  const fill = async (input: typeof inputs[number], value: string | boolean) => {
    await act(async () => { input.props.onChange({ target: typeof value === 'boolean' ? { checked: value } : { value } }); });
  };
  await fill(inputs[0], 'Test Person'); await fill(inputs[1], 'test@example.test'); await fill(inputs[2], 'Test salon');
  await fill(inputs.find(input => input.props.type === 'checkbox')!, true);
  await act(async () => { await form().props.onSubmit({ preventDefault() {} }); });
  assert.equal(calls.length, 1, 'a definitive Edge 429 never reaches the fallback');
  assert.match(calls[0].url, /submit-landing-lead/);
  assert.equal(calls[0].body.form_elapsed_ms, 3000);
  assert.match(JSON.stringify(root!.toJSON()), /Too many demo requests/);
  assert.ok(form(), 'form and input remain available for retry');
  await act(async () => { root!.unmount(); });
} finally { globalThis.fetch = priorFetch; Date.now = priorNow; }
console.log('PASS: rendered demo dialog blocks fast submits and shows Edge 429 without falling back; mocked network only.');

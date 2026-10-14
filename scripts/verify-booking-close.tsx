import React, { useState } from 'react';
import { act, create } from 'react-test-renderer';
import assert from 'node:assert/strict';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
// Keep this component check offline; no booking/payment requests reach a backend.
globalThis.fetch = async () => new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
const { BookingModal } = await import('../src/components/BookingModal');
let setOpen: React.Dispatch<React.SetStateAction<boolean>>;
function Harness() {
  const [open, updateOpen] = useState(false);
  setOpen = updateOpen;
  return <BookingModal isOpen={open} onClose={() => updateOpen(false)} />;
}
let renderer: any;
await act(async () => { renderer = create(<Harness />); });
assert.equal(renderer.toJSON(), null, 'A closed booking must not cover the preview');
await act(async () => { setOpen(true); });
assert.ok(renderer.toJSON(), 'Book action opens the popup');
await act(async () => { renderer.root.findByProps({ 'aria-label': 'Close booking dialog' }).props.onClick(); });
assert.equal(renderer.toJSON(), null, 'The X button removes the popup');
await act(async () => { setOpen(true); });
assert.ok(renderer.toJSON(), 'Booking can reopen after closing');
await act(async () => { setOpen(false); });
assert.equal(renderer.toJSON(), null, 'Parent close also removes the overlay');
await act(async () => { renderer.unmount(); });
console.log('PASS: initially closed, open, X close, reopen, parent close.');

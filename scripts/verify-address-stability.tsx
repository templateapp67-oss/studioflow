import React, { StrictMode, useState } from 'react';
import { act, create } from 'react-test-renderer';
import assert from 'node:assert/strict';
import { InteractiveMapSetup } from '../src/components/InteractiveMapSetup';


// A component unit test, not a browser/map integration test.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).window = { L: {} };
(globalThis as any).requestAnimationFrame = (fn: Function) => setTimeout(fn, 0);
(globalThis as any).cancelAnimationFrame = clearTimeout;
let writes = 0;
let profile: any;
let externalUpdate: any;
function Harness() {
  const [value, setValue] = useState<any>({businessName:'QA Salon',businessType:'hair_salon', address:'', shopFlatNo:'', areaLocality:'', landmark:'', city:'', state:'', postalCode:''});
  profile = value; externalUpdate = setValue;
  const setProfile = (update: any) => { if (++writes > 20) throw new Error('Address update loop'); setValue(update); };
  return <><InteractiveMapSetup profile={value} setProfile={setProfile}/><InteractiveMapSetup profile={value} setProfile={setProfile}/></>;
}
let renderer: any;
await act(async () => { renderer = create(<StrictMode><Harness /></StrictMode>); });
assert.equal(writes, 0, 'Mounting two editors must not mutate the profile');
assert.equal(profile.address, '', 'Empty addresses must not become sample Mumbai addresses');
const editors = () => renderer.root.findAllByType(InteractiveMapSetup);
await act(async () => { editors()[0].findByType('textarea').props.onChange({target:{value:'My own salon address'}}); });
assert.equal(writes, 1);
for (const editor of editors()) assert.equal(editor.findByType('textarea').props.value, 'My own salon address');
await act(async () => { editors()[1].findAllByType('input')[2].props.onChange({target:{value:'Jaipur'}}); });
assert.equal(profile.city, 'Jaipur');
for (const editor of editors()) assert.equal(editor.findAllByType('input')[2].props.value, 'Jaipur');
const afterTyping = writes;
await act(async () => { externalUpdate((p: any) => ({...p, businessType:'barber', address:'Another saved address', city:'Delhi', state:'Delhi', postalCode:'110001'})); });
assert.equal(writes, afterTyping, 'External/template changes must not trigger writes back to the parent');
for (const editor of editors()) { assert.equal(editor.findByType('textarea').props.value, 'Another saved address'); assert.equal(editor.findAllByType('input')[2].props.value, 'Delhi'); }
await act(async () => { externalUpdate((p: any) => ({...p, businessName:'New name'})); });
assert.equal(writes, afterTyping, 'Unrelated parent renders must not trigger profile writes');
await act(async () => { renderer.unmount(); });
console.log('PASS: empty profile, two simultaneous editors, typing sync, external template/profile updates, and unrelated rerenders stay stable.');

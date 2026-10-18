import React,{useState} from 'react';import {act,create} from 'react-test-renderer';import assert from 'node:assert/strict';
import {ContactTagNotesFields,CONTACT_TAGS,CONTACT_NOTE_TEMPLATES,toggleContactTag,appendContactNote} from '../src/components/ContactTagNotesFields';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
assert.equal(toggleContactTag('Custom, vip','VIP'),'Custom');assert.equal(toggleContactTag('Custom','Nails'),'Custom, Nails');assert.equal(appendContactNote('Existing note','Ready note'),'Existing note\nReady note');assert.equal(appendContactNote('Existing note\nReady note','Ready note'),'Existing note\nReady note');
let fields={tags:'Custom',notes:'Existing note'};function Harness(){const [value,setValue]=useState(fields);fields=value;return <ContactTagNotesFields {...value} onChange={setValue}/>;}
let editor:any;await act(async()=>{editor=create(<Harness/>)});const tag=(name:string)=>editor.root.findAllByType('button').find((n:any)=>n.children.join('').endsWith(name));
assert.equal(CONTACT_TAGS.length,16);assert.equal(CONTACT_NOTE_TEMPLATES.length,12);
await act(async()=>tag('VIP').props.onClick());assert.equal(fields.tags,'Custom, VIP');assert.equal(tag('VIP').props['aria-pressed'],true);
await act(async()=>tag('VIP').props.onClick());assert.equal(fields.tags,'Custom');
await act(async()=>editor.root.findByType('select').props.onChange({target:{value:CONTACT_NOTE_TEMPLATES[0].label}}));
const add=()=>editor.root.findAllByType('button').find((n:any)=>n.children.join('')==='Add selected note');await act(async()=>add().props.onClick());assert.equal(fields.notes,'Existing note\n'+CONTACT_NOTE_TEMPLATES[0].text,'Appending must preserve original notes');
await act(async()=>editor.root.findByType('select').props.onChange({target:{value:CONTACT_NOTE_TEMPLATES[0].label}}));assert.equal(add().props.disabled,true,'Do not append duplicate notes');
await act(async()=>editor.root.findByType('textarea').props.onChange({target:{value:'x'.repeat(1999)}}));assert.equal(add().props.disabled,true,'Never silently truncate existing notes');
await act(async()=>editor.root.findByType('input').props.onChange({target:{value:'x'.repeat(200)}}));assert.equal(tag('Nails').props.disabled,true,'Respect tag limit');
assert.ok(editor.root.findByType('textarea').props['aria-describedby']);assert.ok(editor.root.findAllByType('button').every((n:any)=>n.props.type==='button'),'Suggestions must not submit the contact form');
await act(async()=>editor.unmount());console.log('PASS: custom tags preserved, tag toggles and limits, 12 note options, append without overwrite, duplicate protection, accessible hints and no accidental save.');

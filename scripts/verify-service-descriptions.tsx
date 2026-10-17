import React,{useState} from 'react';
import {create,act} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {serviceDescriptionSuggestions} from '../src/lib/serviceDescriptions';
import {ServiceDescriptionSuggestions} from '../src/components/ServiceDescriptionSuggestions';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const cuts=serviceDescriptionSuggestions('hair cut','Hair Styling & Blowdry');
assert.equal(cuts.length,3);assert.equal(new Set(cuts.map(s=>s.text)).size,3);assert.match(cuts[0].text,/tailored cut/);
assert.equal(serviceDescriptionSuggestions('','Hair').length,0);
assert.match(serviceDescriptionSuggestions('Special care','Nails')[0].text,/Nail care/);
for(const [name,category] of [['Facial','Skin'],['Bridal makeup','Beauty'],['Classic shave','Men'],['Wellness massage','Spa'],['Gold facial combo','Packages'],['New offering','Custom']]){
 const options=serviceDescriptionSuggestions(name,category);assert.equal(options.length,3);assert.ok(options.every(s=>s.text.startsWith(name+': ')&&s.text.length<400));
}
let chosen='My existing description';let updateName:((name:string)=>void)|undefined;
function Harness(){const [value,setValue]=useState(chosen),[name,setName]=useState('hair cut');updateName=setName;chosen=value;return <><textarea value={value} onChange={e=>setValue(e.target.value)}/><ServiceDescriptionSuggestions name={name} category="Hair Styling & Blowdry" value={value} onSelect={setValue}/></>}
let editor:any;await act(async()=>{editor=create(<Harness/>)});
const button=(text:string)=>editor.root.findAllByType('button').find((b:any)=>b.children.join('')===text);
await act(async()=>button('Create 3 short descriptions').props.onClick());assert.equal(chosen,'My existing description','Opening suggestions cannot overwrite saved copy');
assert.equal(editor.root.findAllByType('article').length,3);
await act(async()=>button('Use description 2').props.onClick());assert.equal(chosen,cuts[1].text);assert.equal(button('Selected').props['aria-pressed'],true);
await act(async()=>editor.root.findByType('textarea').props.onChange({target:{value:'My edited suggestion'}}));assert.equal(chosen,'My edited suggestion');
await act(async()=>updateName?.('Gold facial'));assert.equal(chosen,'My edited suggestion');assert.match(editor.root.findAllByType('p')[0].children.join(''),/skin-care/);
await act(async()=>button('Hide description templates').props.onClick());assert.equal(chosen,'My edited suggestion');
await act(async()=>updateName?.(''));assert.equal(button('Create 3 short descriptions').props.disabled,true);
await act(async()=>editor.unmount());
console.log('PASS: three distinct short templates, name-first matching, category fallback, no automatic overwrite, selection, manual editing, live input changes and empty-name guard.');

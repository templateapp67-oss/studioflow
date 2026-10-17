import React from 'react';import {act,create} from 'react-test-renderer';import assert from 'node:assert/strict';
import {BrandIdentityPrompt} from '../src/components/BrandIdentityPrompt';import {brandIdentityContext,brandIdentityPrompt,type BrandAssetMode} from '../src/lib/brandIdentityPrompt';import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';import {INITIAL_SALON_PROFILE} from '../src/mockData';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
for(const template of Object.values(CATEGORY_TEMPLATES)){
 const profile={...INITIAL_SALON_PROFILE,businessType:template.id,businessName:'Nexora Jaipur Wellness',themeAccentKey:undefined,customAccentColor:''};const context=brandIdentityContext(profile);assert.equal(context.firstWord,'Nexora');assert.equal(context.colors.length,3);assert.equal(new Set(context.colors).size,3);
 for(const mode of ['logo','favicon','both'] as BrandAssetMode[]){const prompt=brandIdentityPrompt(profile,mode,context.colors);assert.ok(prompt.includes(template.shortName));assert.ok(prompt.includes('"Nexora" (the FIRST WORD'));assert.ok(prompt.includes(mode==='both'?'6 separate downloadable PNG':'3 separate downloadable PNG'));assert.equal(prompt.includes('LOGO: Create 3'),mode!=='favicon');assert.equal(prompt.includes('FAVICON: Create 3'),mode!=='logo');for(const color of context.colors)assert.ok(prompt.includes(color.toUpperCase()));}
}
assert.equal(brandIdentityContext({...INITIAL_SALON_PROFILE,businessName:'  रूप सैलून  '}).firstWord,'रूप');
assert.equal(brandIdentityPrompt({...INITIAL_SALON_PROFILE,businessName:''},'logo',['#111111','#222222','#333333']),'');
assert.equal(brandIdentityPrompt(INITIAL_SALON_PROFILE,'logo',['#111111','#111111','#333333']),'');
let copied='',fail=false;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async(text:string)=>{if(fail)throw new Error('Blocked');copied=text;}}}});
const profile={...INITIAL_SALON_PROFILE,businessName:'Royal Jaipur Salon',customAccentColor:'#123456'};
let editor:any;await act(async()=>{editor=create(<BrandIdentityPrompt profile={profile}/>)});assert.equal(editor.root.findAllByType('textarea').length,0,'Must ask logo/favicon/both first');
const radios=()=>editor.root.findAllByType('input').filter((n:any)=>n.props.type==='radio');
await act(async()=>radios()[2].props.onChange());assert.ok(editor.root.findByType('textarea').props.value.includes('6 separate downloadable PNG'));assert.ok(editor.root.findByType('textarea').props.value.includes('"Royal" (the FIRST WORD'));
await act(async()=>editor.root.findByType('button').props.onClick());assert.equal(copied,editor.root.findByType('textarea').props.value);
assert.equal(editor.root.findByType('a').props.href,'https://chatgpt.com/images');assert.equal(editor.root.findByType('a').props.target,'_blank');
await act(async()=>editor.root.findByProps({'aria-label':'Design color 2'}).props.onChange({target:{value:'#456789'}}));assert.ok(editor.root.findByType('textarea').props.value.includes('#456789'));assert.equal(editor.root.findAllByProps({role:'status'}).length,0,'Old copied message must not survive prompt changes');
fail=true;await act(async()=>editor.root.findByType('button').props.onClick());assert.match(editor.root.findByProps({role:'status'}).children.join(''),/manually/);
await act(async()=>radios()[1].props.onChange());assert.ok(!editor.root.findByType('textarea').props.value.includes('LOGO: Create 3'));
await act(async()=>editor.update(<BrandIdentityPrompt profile={{...profile,businessType:'nail_studio',customAccentColor:'#abcdef'}}/>));assert.equal(editor.root.findByProps({'aria-label':'Design color 1'}).props.value,'#abcdef');
await act(async()=>editor.unmount());console.log('PASS: 14 themes × logo/favicon/both; exact first salon word, three distinct colors, 3/6 file outputs, empty-name guard, editable colors, theme changes, copy success/failure and verified ChatGPT Images link.');

import React from 'react';
import {create,act} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {buildAboutDraft,emptyAboutAnswers} from '../src/lib/aboutBuilder';
import {AboutDraftBuilder} from '../src/components/AboutDraftBuilder';
import type {SalonProfile} from '../src/types';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No network allowed');};
const templates=Object.values(CATEGORY_TEMPLATES);assert.equal(templates.length,14);
for(const template of templates){
 const p={businessType:template.id,businessName:'Owner Brand',ownerName:'Owner Person',city:'Test City',about:'Keep this text'} as SalonProfile;
 for(const language of ['English','Hindi','Hinglish'] as const)for(const tone of ['Warm','Elegant','Simple'] as const){
  const text=buildAboutDraft(p,{...emptyAboutAnswers,specialties:'Real selected service',experience:'Since 2019',difference:'My custom designs',atmosphere:'Calm space',language,tone});
  for(const value of ['Owner Brand','Owner Person','Test City',template.shortName,'Real selected service','Since 2019','My custom designs','Calm space'])assert.ok(text.includes(value));
  assert.ok(!text.includes(template.defaultCity));assert.ok(!text.includes(template.ownerName));assert.ok(text.length<5000);
 }
 assert.equal(buildAboutDraft(p,emptyAboutAnswers),'');
 const minimal=buildAboutDraft({...p,ownerName:'',city:''},{...emptyAboutAnswers,specialties:'My service'});assert.ok(!minimal.includes('undefined'));assert.ok(!minimal.includes('2019'));
}
let applied='';let profile={businessType:'nail_studio',businessName:'Art by Owner',ownerName:'Uma',city:'Jaipur',about:'Existing custom About'} as SalonProfile;
let ui:any;await act(async()=>{ui=create(<AboutDraftBuilder profile={profile} onApply={s=>{applied=s;}}/>);});
const button=(text:string)=>ui.root.findAllByType('button').find((n:any)=>n.children.join('')===text);
await act(async()=>button('Generate About draft').props.onClick());assert.equal(applied,'');assert.equal(ui.root.findAllByType('textarea').length,2);
let questions=ui.root.findAllByType('textarea');await act(async()=>questions[0].props.onChange({target:{value:'Custom nail art'}}));
await act(async()=>button('Generate About draft').props.onClick());assert.equal(applied,'');assert.equal(button('Apply reviewed About').props.disabled,true,'Must explicitly approve replacement');
const check=ui.root.findByProps({type:'checkbox'});await act(async()=>check.props.onChange({target:{checked:true}}));assert.equal(button('Apply reviewed About').props.disabled,false);
await act(async()=>button('Apply reviewed About').props.onClick());assert.ok(applied.includes('Art by Owner'));assert.ok(applied.includes('Uma'));assert.ok(applied.includes('Custom nail art'));assert.ok(!applied.includes('Existing custom About'));
await act(async()=>button('Generate About draft').props.onClick());
profile={...profile,businessName:'Changed Brand'};await act(async()=>ui.update(<AboutDraftBuilder profile={profile} onApply={s=>{applied=s;}}/>));assert.equal(button('Apply reviewed About').props.disabled,true,'Stale salon context must not apply');
await act(async()=>button('Discard draft').props.onClick());assert.equal(ui.root.findAllByType('textarea').length,2);
await act(async()=>ui.unmount());assert.equal(calls,0);console.log('PASS: 14 templates × 3 languages × 3 tones, supplied facts only, no network, explicit application/replacement, stale-draft protection and discard.');

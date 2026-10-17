import React from 'react';import {act,create} from 'react-test-renderer';import assert from 'node:assert/strict';
import {HeroBackgroundPrompt} from '../src/components/HeroBackgroundPrompt';import {heroBackgroundPrompt} from '../src/lib/heroBackgroundPrompt';import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';import {INITIAL_SALON_PROFILE} from '../src/mockData';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
for(const template of Object.values(CATEGORY_TEMPLATES)){
 const profile={...INITIAL_SALON_PROFILE,businessType:template.id,businessName:'Royal Jaipur Wellness',customAccentColor:'#123456',tagline:'Our original tagline',about:'Our original description'};const before=JSON.stringify(profile);const prompt=heroBackgroundPrompt(profile);
 for(const part of [template.title,template.shortName,'Royal Jaipur Wellness','#123456','Our original tagline','Our original description','3 separate downloadable','1920 × 1080','The only permitted lettering', '"Powered by Nexora"', 'in EACH of the 3 images', 'at least 15% margin','background','mobile','TEXT-ONLY BRIEF, NO REFERENCE UPLOAD NEEDED','Do not ask me to upload reference materials','descriptive art direction only','start with option 1 immediately'])assert.ok(prompt.includes(part),part);
 assert.equal(JSON.stringify(profile),before,'Prompt must never change live website content');
}
assert.equal(heroBackgroundPrompt({...INITIAL_SALON_PROFILE,businessName:'  '}),'');
let copied='',fail=false;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async(text:string)=>{if(fail)throw new Error('Blocked');copied=text;}}}});
let editor:any;const profile={...INITIAL_SALON_PROFILE,businessName:'Royal Jaipur Salon'};
await act(async()=>{editor=create(<HeroBackgroundPrompt profile={profile}/>)});
await act(async()=>editor.root.findByType('button').props.onClick());assert.equal(copied,editor.root.findByType('textarea').props.value);assert.equal(editor.root.findByType('textarea').props.readOnly,true);
assert.equal(editor.root.findByType('a').props.href,'https://chatgpt.com/images');assert.equal(editor.root.findByType('a').props.rel,'noopener noreferrer');
await act(async()=>editor.update(<HeroBackgroundPrompt profile={{...profile,businessType:'nail_studio',customAccentColor:'#abcdef'}}/>));assert.ok(editor.root.findByType('textarea').props.value.includes('#ABCDEF'));assert.ok(editor.root.findByType('textarea').props.value.includes(CATEGORY_TEMPLATES.nail_studio.title));assert.equal(editor.root.findAllByProps({role:'status'}).length,0);
fail=true;await act(async()=>editor.root.findByType('button').props.onClick());assert.match(editor.root.findByProps({role:'status'}).children.join(''),/manually/);
await act(async()=>editor.update(<HeroBackgroundPrompt profile={{...profile,businessName:''}}/>));assert.equal(editor.root.findAllByType('textarea').length,0);assert.equal(editor.root.findAllByType('button').length,0);
await act(async()=>editor.unmount());console.log('PASS: hero background prompt for all 14 templates; existing content preserved, correct theme/name, three wide backgrounds, copy fallback, current notices and empty-name guard.');

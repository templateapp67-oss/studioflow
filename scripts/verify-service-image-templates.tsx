import React,{useState} from 'react';import {act,create} from 'react-test-renderer';import assert from 'node:assert/strict';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';import {ServiceManagement} from '../src/components/ServiceManagement';import {INITIAL_SALON_PROFILE} from '../src/mockData';import {supabase} from '../src/lib/supabase';import type {SalonService} from '../src/types';import {imageRequest,providerError,imageInput} from '../backend/functions/studioflow-service-ai-images/core';
for(const template of Object.values(CATEGORY_TEMPLATES))for(const s of template.services){const input=imageInput({name:s.name,category:s.category,description:s.description,businessType:template.id});assert.ok(input);const body=imageRequest(input!);assert.equal(body.n,3);assert.equal(body.output_format,'jpeg');assert.ok(body.prompt.includes(s.name));assert.ok(body.prompt.includes(template.id));}
assert.match(providerError('credit_balance_exhausted'),/no credits/);assert.equal(imageInput({name:'x'}),null);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;(globalThis as any).document={activeElement:null,addEventListener(){},removeEventListener(){}};
const images=Array.from({length:3},(_,i)=>({imageUrl:`https://zilwgiuiygqqardzutxi.supabase.co/storage/v1/object/public/studioflow-media/owner/services/ai-${i}.jpg`,imagePath:`owner/services/ai-${i}.jpg`}));
let mode='credit',calls:any[]=[];
Object.defineProperty(supabase,'functions',{configurable:true,value:{invoke:async(name:string,options:any)=>{assert.equal(name,'studioflow-service-ai-images');calls.push(options.body);return mode==='network'?{error:new Error('Connection lost')}:mode==='credit'?{data:{status:'failed',error:providerError('credit_balance_exhausted')}}:{data:{status:'complete',images}}}}});
let saved:SalonService[]=[];function Fixture(){const [menu,setMenu]=useState<SalonService[]>([]);saved=menu;return <ServiceManagement profile={INITIAL_SALON_PROFILE} services={menu} setServices={setMenu} primaryAccentColor="#d90072"/>}
let editor:any;await act(async()=>{editor=create(<Fixture/>)});
const button=(label:string)=>editor.root.findAllByType('button').find((b:any)=>b.children.includes(label));
await act(async()=>button('Add service').props.onClick());
const dialog=()=>editor.root.findByProps({role:'dialog'}),choices=()=>dialog().findAllByType('button').filter((b:any)=>/^Select AI image/.test(b.props['aria-label']||''));
assert.equal(choices().length,0);assert.equal(calls.length,0);
await act(async()=>dialog().findByProps({'aria-label':'Service name'}).props.onChange({target:{value:CATEGORY_TEMPLATES.hair_salon.services[0].name}}));assert.ok(!button('Generate 3 AI images'));
await act(async()=>dialog().findAllByType('input').find((n:any)=>n.props.type==='radio').props.onChange());assert.equal(calls.length,0);
await act(async()=>{button('Generate 3 AI images').props.onClick();await new Promise(r=>setTimeout(r,5));});assert.equal(choices().length,0);assert.ok(JSON.stringify(editor.toJSON()).includes('no credits'),'Must show billing error, never stock substitutes');
mode='network';await act(async()=>{button('Generate 3 AI images').props.onClick();await new Promise(r=>setTimeout(r,5));});const id=calls.at(-1).requestId;
mode='success';await act(async()=>{button('Check generation result').props.onClick();await new Promise(r=>setTimeout(r,5));});assert.equal(calls.at(-1).requestId,id,'Network retry must reuse the same request ID');assert.equal(choices().length,3);
await act(async()=>choices()[1].props.onClick());assert.equal(choices()[1].props['aria-pressed'],true);
await act(async()=>dialog().findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(saved[0].imageUrl,images[1].imageUrl);assert.equal(saved[0].imagePath,images[1].imagePath);assert.equal(JSON.parse(JSON.stringify(saved))[0].imageUrl,images[1].imageUrl);
await act(async()=>editor.unmount());console.log('PASS: all template service prompts request three original AI images; no automatic charges; billing failure shows no stock photos; request ID reused after network failure; three exclusive images and exact owned URL/path saved.');

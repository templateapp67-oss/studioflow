import React,{useState} from 'react';import {act,create} from 'react-test-renderer';import assert from 'node:assert/strict';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';import {INITIAL_SALON_PROFILE} from '../src/mockData';import {ServiceManagement} from '../src/components/ServiceManagement';import type {SalonService} from '../src/types';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;(globalThis as any).document={activeElement:null,addEventListener(){},removeEventListener(){}};
for(const template of Object.values(CATEGORY_TEMPLATES)){
 let saved:SalonService[]=[];function Fixture(){const [menu,setMenu]=useState<SalonService[]>([]);saved=menu;return <ServiceManagement services={menu} setServices={setMenu} profile={{...INITIAL_SALON_PROFILE,businessType:template.id}} primaryAccentColor="#b70064"/>}
 let editor:any;await act(async()=>{editor=create(<Fixture/>)});
 await act(async()=>editor.root.findAllByType('button').find((b:any)=>b.children.includes('Add service')).props.onClick());
 const dialog=()=>editor.root.findByProps({role:'dialog'}),name=()=>dialog().findByProps({'aria-label':'Service name'}),category=()=>dialog().findByProps({'aria-label':'Service category'}),radios=()=>dialog().findAllByType('input').filter((n:any)=>n.props.type==='radio');
 assert.equal(name().type,'select');assert.equal(category().props.disabled,true);assert.equal(dialog().findAllByType('textarea').length,0);
 assert.deepEqual(name().findAllByType('option').map((o:any)=>o.props.value).filter(Boolean),Array.from(new Set(template.services.map(s=>s.name))));
 const first=template.services[0],second=template.services[1];
 await act(async()=>name().props.onChange({target:{value:first.name}}));assert.equal(category().props.value,first.category);assert.equal(radios().length,3);assert.ok(radios().every((r:any)=>!r.props.checked));
 assert.deepEqual(category().findAllByType('option').map((o:any)=>o.props.value).filter(Boolean),Array.from(new Set([first.category,...template.subCategories,...template.services.map(s=>s.category)])));
 const alternate=category().findAllByType('option').map((o:any)=>o.props.value).find((value:string)=>value&&value!==first.category);assert.ok(alternate);
 await act(async()=>radios()[0].props.onChange());
 const originalPrice=dialog().findAllByType('input').find((n:any)=>n.props.type==='number').props.value;
 await act(async()=>category().props.onChange({target:{value:alternate}}));assert.equal(category().props.value,alternate);assert.ok(radios().every((r:any)=>!r.props.checked));assert.equal(dialog().findAllByType('input').find((n:any)=>n.props.type==='number').props.value,originalPrice);
 await act(async()=>name().props.onChange({target:{value:second.name}}));assert.ok(radios().every((r:any)=>!r.props.checked),'Service change must clear old description');
 await act(async()=>dialog().findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(saved.length,0,'Cannot save without choosing description');
 const saveCategory=Array.from(new Set(template.subCategories)).find(value=>value!==second.category)!;await act(async()=>category().props.onChange({target:{value:saveCategory}}));
 const selected=radios()[1].props.value;await act(async()=>radios()[1].props.onChange());
 await act(async()=>dialog().findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(saved.length,1);assert.equal(saved[0].name,second.name);assert.equal(saved[0].category,saveCategory);assert.equal(saved[0].description,selected);assert.equal(saved[0].price,template.id==='skincare_clinic'?null:second.price);assert.equal(JSON.parse(JSON.stringify(saved))[0].description,selected);
 await act(async()=>editor.unmount());
}
console.log('PASS: all 14 templates: service-only dropdowns, recommended + selectable template categories, category changes preserve price (clinic fee starts unset), three exclusive descriptions, reset on service change, required choice and exact saved/reloaded fields.');

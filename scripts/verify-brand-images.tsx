import React,{useState} from 'react';
import {act,create} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {BrandImageField} from '../src/components/BrandImageField';
import {HeroBannerEditor} from '../src/components/HeroBannerEditor';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {supabase} from '../src/lib/supabase';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
let uploads=0,fail=false,finish:any,hold=false;
(supabase.auth as any).getUser=async()=>({data:{user:{id:'brand-owner'}},error:null});
(supabase.storage as any).from=(bucket:string)=>({upload:async(path:string,file:File,options:any)=>{assert.equal(bucket,'studioflow-media');assert.match(path,/^brand-owner\//);assert.equal(options.upsert,false);assert.equal(file.type,'image/png');uploads++;if(hold)await new Promise(r=>finish=r);return {error:fail?new Error('Network upload failed'):null}},getPublicUrl:()=>({data:{publicUrl:'https://example.com/uploaded.png'}})});
for(const kind of ['logo','hero','favicon']) {
 const logo=kind!=='hero';
 let value='https://example.com/old.png';
 function Harness(){const [current,setCurrent]=useState(value);value=current;return <BrandImageField label={kind==='favicon'?'Website favicon':logo?'Brand logo':'Hero image'} uploadName={kind==='favicon'?'Favicon':undefined} logo={logo} value={current} onChange={setCurrent}/>}
 let editor:any;await act(async()=>{editor=create(<Harness/>)});
 if(kind==='favicon')assert.ok(JSON.stringify(editor.toJSON()).includes('Upload Favicon (Max 5 MB)'));
 const fileInput=()=>editor.root.findAllByType('input').find((i:any)=>i.props.type==='file');
 const select=async(file:File)=>{const target={files:[file],value:'selected'};await act(async()=>{fileInput().props.onChange({target})});assert.equal(target.value,'');};
 const before=uploads;
 await select(new File([new Uint8Array(5*1024*1024+1)],'large.png',{type:'image/png'}));assert.equal(uploads,before);assert.equal(value,'https://example.com/old.png');assert.ok(editor.root.findByProps({role:'alert'}));
 await select(new File(['svg'],'unsafe.svg',{type:'image/svg+xml'}));assert.equal(uploads,before);
 fail=true;await select(new File(['png'],'small.png',{type:'image/png'}));assert.equal(value,'https://example.com/old.png');assert.match(editor.root.findByProps({role:'alert'}).children.join(''),/Network/);
 fail=false;await select(new File([new Uint8Array(5*1024*1024)],'exact.png',{type:'image/png'}));assert.equal(value,'https://example.com/uploaded.png');assert.equal(editor.root.findByType('img').props.src,value);
 const url=()=>editor.root.findAllByType('input').find((i:any)=>i.props.type!=='file');
 await act(async()=>url().props.onChange({target:{value:'javascript:alert(1)'}}));await act(async()=>editor.root.findByType('button').props.onClick());assert.equal(value,'https://example.com/uploaded.png');
 await act(async()=>url().props.onChange({target:{value:'https://example.com/from-url.png'}}));await act(async()=>editor.root.findByType('button').props.onClick());assert.equal(value,'https://example.com/from-url.png');
 hold=true;await select(new File(['png'],'pending.png',{type:'image/png'}));assert.equal(fileInput().props.disabled,true);assert.equal(editor.root.findByType('button').props.disabled,true);await act(async()=>{finish();});hold=false;assert.equal(value,'https://example.com/uploaded.png');
 await act(async()=>editor.unmount());
}
let profile:any;
function HeroHarness(){const [p,setP]=useState(INITIAL_SALON_PROFILE);profile=p;return <HeroBannerEditor profile={p} setProfile={setP}/>}
let hero:any;await act(async()=>{hero=create(<HeroHarness/>)});await act(async()=>hero.root.findByType(BrandImageField).props.onChange('https://example.com/hero.png'));assert.equal(profile.coverImageUrl,'https://example.com/hero.png');assert.equal(profile.businessName,INITIAL_SALON_PROFILE.businessName);await act(async()=>hero.unmount());
console.log('PASS: logo + hero + favicon: 5 MB accepted, oversize/unsupported rejected, owned storage, failure preserves previous image, retry, URL validation, previews, busy guard and existing profile wiring.');

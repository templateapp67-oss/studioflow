import React,{useState} from 'react';import {act,create} from 'react-test-renderer';import assert from 'node:assert/strict';
import {CustomerReelCard} from '../src/components/customer/CustomerReelCard';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const salon:any={slug:'salon',content:{profile:{businessName:'Salon',coverImageUrl:'https://example.test/cover.jpg'}}};
const youtube={id:'one',title:'Cut',youtubeUrl:'https://www.youtube.com/shorts/abcdefghijk',thumbnailUrl:'https://example.test/poster.jpg'};
function Harness({direct=false}:{direct?:boolean}){const [active,setActive]=useState('');return <>{[1,2].map(n=><CustomerReelCard key={n} video={{...youtube,id:String(n),...(direct?{previewVideoUrl:'https://example.test/preview.mp4'}:{})}} salon={salon} active={active===String(n)} activate={()=>setActive(String(n))} stop={()=>setActive(current=>current===String(n)?'':current)} open={()=>setActive('')}/>)}</>}
let tree:any;await act(async()=>{tree=create(<Harness/>)});assert.equal(tree.root.findAllByType('iframe').length,0);
await act(async()=>tree.root.findAllByType('button')[0].props.onMouseEnter());let frame=tree.root.findByType('iframe');assert.match(frame.props.src,/autoplay=1&mute=1&playsinline=1/);assert.equal(frame.props.tabIndex,-1);
await act(async()=>tree.root.findAllByType('button')[1].props.onMouseEnter());assert.equal(tree.root.findAllByType('iframe').length,1,'only one reel preview plays');
await act(async()=>tree.root.findAllByType('button')[0].props.onMouseLeave());assert.equal(tree.root.findAllByType('iframe').length,1,'old reel leave must not stop new reel');
await act(async()=>tree.root.findAllByType('button')[1].props.onMouseLeave());assert.equal(tree.root.findAllByType('iframe').length,0);
await act(async()=>tree.unmount());await act(async()=>{tree=create(<Harness direct/>)});
await act(async()=>tree.root.findAllByType('button')[0].props.onFocus());const video=tree.root.findByType('video');assert.equal(video.props.autoPlay,true);assert.equal(video.props.muted,true);assert.equal(video.props.playsInline,true);assert.equal(video.props.loop,true);
await act(async()=>video.props.onError());assert.equal(tree.root.findAllByType('video').length,0);assert.equal(tree.root.findAllByType('iframe').length,1,'failed direct preview falls back to its YouTube source');
await act(async()=>tree.root.findAllByType('button')[0].props.onBlur());assert.equal(tree.root.findAllByType('iframe').length,0);await act(async()=>tree.unmount());
console.log('PASS: hover/focus starts muted inline previews; exactly one player; leave/blur unload; direct-video failure uses source fallback.');

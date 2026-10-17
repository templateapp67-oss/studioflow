import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const manifest=JSON.parse(fs.readFileSync('dist/customer.webmanifest','utf8'));
assert.equal(manifest.start_url,'/?app=1');assert.equal(manifest.display,'standalone');assert.equal(manifest.prefer_related_applications,false);
for(const size of [192,512]){const icon=manifest.icons.find(x=>x.sizes===`${size}x${size}`&&x.purpose==='any');assert.ok(icon);const bytes=fs.readFileSync(`dist${icon.src}`);assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
assert.match(fs.readFileSync('dist/index.html','utf8'),/rel="manifest"/);
const events={};let calls=0;const offline={offline:true};
const context={self:{location:{origin:'https://salon.test'},addEventListener:(n,f)=>events[n]=f,skipWaiting(){},clients:{claim(){}}},URL,fetch:async()=>{calls++;throw new Error('offline')},caches:{match:async path=>{assert.equal(path,'/customer-offline.html');return offline}}};
vm.runInNewContext(fs.readFileSync('dist/customer-sw.js','utf8'),context);
for(const request of [{method:'POST',mode:'navigate',url:'https://salon.test/?app=1'},{method:'GET',mode:'cors',url:'https://salon.test/api/account'},{method:'GET',mode:'navigate',url:'https://database.test/profile'}]){events.fetch({request,respondWith:()=>assert.fail('Must not intercept API, mutations or cross-origin requests')});}
let response;events.fetch({request:{method:'GET',mode:'navigate',url:'https://salon.test/?app=1'},respondWith:p=>response=p});assert.equal(await response,offline);assert.equal(calls,1);
context.fetch=async()=>({online:true});events.fetch({request:{method:'GET',mode:'navigate',url:'https://salon.test/?app=1'},respondWith:p=>response=p});assert.equal((await response).online,true);
console.log('PASS: manifest launch route, standalone mode, PNG icon sizes; online-first navigation; offline fallback; no API/mutation interception.');

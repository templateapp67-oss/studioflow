import assert from 'node:assert/strict';
import {applyWebsiteFavicon, websiteFavicon} from '../src/lib/websiteFavicon';
const logo='https://example.com/logo.png', custom='https://example.com/favicon.png';
assert.equal(websiteFavicon({faviconUrl:''},{logoUrl:logo}),logo);
assert.equal(websiteFavicon({faviconUrl:custom},{logoUrl:logo}),custom);
assert.equal(websiteFavicon({faviconUrl:'javascript:alert(1)'},{logoUrl:logo}),logo);
assert.equal(websiteFavicon(),'/customer-icon-192.png');
assert.equal(websiteFavicon({},{businessType:'massage_wellness'}),'/templates/bodhi-tree/favicon.svg','Bodhi Tree sites fall back to the bodhi leaf tab icon');
assert.equal(websiteFavicon({},{businessType:'makeup_studio'}),'/templates/vogue-noir/favicon.svg');
assert.equal(websiteFavicon({faviconUrl:'/assets/custom.png'}),'/assets/custom.png');
let current:any=null;
function node(){const attrs:any={};const events:any={};return {rel:'',get href(){return attrs.href},set href(v:string){attrs.href=v},setAttribute(k:string,v:string){attrs[k]=v},getAttribute(k:string){return attrs[k]??null},removeAttribute(k:string){delete attrs[k]},addEventListener(k:string,v:any){events[k]=v},removeEventListener(k:string){delete events[k]},remove(){current=null},fail(){events.error?.()}};}
const doc:any={querySelector:()=>current,createElement:()=>node(),head:{appendChild(n:any){current=n}}};
let restore=applyWebsiteFavicon(doc,logo);assert.equal(current.href,logo);restore();assert.equal(current,null);
current=node();current.href='/old.png';current.setAttribute('type','image/svg+xml');restore=applyWebsiteFavicon(doc,custom);assert.equal(current.href,custom);assert.equal(current.getAttribute('type'),null);current.fail();assert.equal(current.href,'/customer-icon-192.png');restore();assert.equal(current.href,'/old.png');assert.equal(current.getAttribute('type'),'image/svg+xml');
restore=applyWebsiteFavicon(doc,logo);assert.equal(current.href,logo);restore();assert.equal(current.href,'/old.png');
console.log('PASS: custom favicon priority, empty setting uses salon logo, safe URL validation, default icon, load failure and route cleanup.');

// Optional real-browser acceptance check. Browser tools live outside app dependencies.
// BROWSER_TOOLS_ROOT=/tmp/dermacure-browser LD_LIBRARY_PATH=... node scripts/check-dermacure-browser.mjs
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import path from 'node:path';
const root=process.env.BROWSER_TOOLS_ROOT;
if(!root)throw new Error('Set BROWSER_TOOLS_ROOT to an installation of playwright-core and @sparticuz/chromium');
const require=createRequire(path.join(root,'package.json'));
const {chromium:pw}=require('playwright-core');const c=require('@sparticuz/chromium').default;
const browser=await pw.launch({args:c.args,executablePath:await c.executablePath(),headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:3000')+'/?template=skincare_clinic',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 const order=['home','treatments','about','directory','technology','results','journey','booking','contact'];
 assert.deepEqual(await page.locator('.dc section[id]').evaluateAll((nodes,ids)=>nodes.map(n=>n.id).filter(id=>ids.includes(id)),order),order);
 for(const width of [320,375,430,768,1024,1440]){
  await page.setViewportSize({width,height:950});await page.waitForTimeout(200);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px horizontal overflow`);
 }
 for(let y=0;y<await page.evaluate(()=>document.body.scrollHeight);y+=600){await page.evaluate(y=>window.scrollTo(0,y),y);await page.waitForTimeout(90)}
 await page.waitForTimeout(500);
 assert.deepEqual(await page.locator('.dc img').evaluateAll(nodes=>nodes.filter(n=>n.complete&&!n.naturalWidth).map(n=>n.src)),[],'No broken rendered image after fallbacks');
 await page.setViewportSize({width:375,height:900});await page.evaluate(()=>window.scrollTo(0,0));
 await page.getByRole('button',{name:'Open menu',exact:true}).click();
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('button',{name:'Open menu',exact:true}).getAttribute('aria-expanded'),'false');
 await page.locator('#directory').scrollIntoViewIfNeeded();await page.waitForTimeout(200);
 await page.getByRole('button',{name:'Open menu',exact:true}).click();
 await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'About',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Open menu',exact:true}).getAttribute('aria-expanded'),'false');
 const failures=await page.locator('.dc button:visible,.dc a:visible').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().height<43.5).map(n=>n.textContent));
 assert.deepEqual(failures,[],'375px rendered link/button height');
 const filters=page.locator('.dc-directory .dc-filters button');
 if(await filters.count()>1){await filters.nth(1).click();assert.equal(await filters.nth(1).getAttribute('aria-pressed'),'true');assert.ok(await page.locator('.dc-directory-item').count()>0)}
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(250);
 const transform=await page.locator('.dc-hero-parallax').evaluate(n=>getComputedStyle(n).transform);
 assert.ok(transform==='none'||transform==='matrix(1, 0, 0, 1, 0, 0)',transform);
 assert.deepEqual(errors,[],'No uncaught browser errors');
 console.log('PASS: real Chromium preview — six viewport widths without overflow; loaded image fallbacks; section order; mobile menu/Escape/link close; 44px visible controls; filters; reduced-motion parallax; zero uncaught page errors. No live booking submitted.');
}finally{await browser.close()}

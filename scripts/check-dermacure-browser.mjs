// Optional real-browser acceptance check. Browser tools live outside app dependencies.
// BROWSER_TOOLS_ROOT=/tmp/dermacure-browser CHROMIUM_EXECUTABLE=/path/to/chromium LD_LIBRARY_PATH=... node scripts/check-dermacure-browser.mjs
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import path from 'node:path';
const root=process.env.BROWSER_TOOLS_ROOT;
if(!root)throw new Error('Set BROWSER_TOOLS_ROOT to an installation of playwright-core and @sparticuz/chromium');
const require=createRequire(path.join(root,'package.json'));
const {chromium:pw}=require('playwright-core');const c=require('@sparticuz/chromium').default;
// CHROMIUM_EXECUTABLE lets a CI image reuse a browser it already extracted.
const browser=await pw.launch({args:c.args,executablePath:process.env.CHROMIUM_EXECUTABLE||await c.executablePath(),headless:true});
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
 // Header navigation contract: every item lands on its own section below the
 // sticky header, updates aria-current and the URL, and the mobile drawer
 // closes cleanly without leaving an overlay behind.
 await page.setViewportSize({width:1440,height:950});
 await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(300);
 const navItems=await page.locator('nav.dc-desktop-nav a[href^="#"]').evaluateAll(nodes=>nodes.map(n=>({label:n.textContent.trim(),href:n.getAttribute('href')})));
 assert.ok(navItems.length>=6,'the menu lists the clinic sections');
 for(const item of navItems){
  await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(200);
  await page.locator('nav.dc-desktop-nav a',{hasText:item.label}).first().click();
  await page.waitForTimeout(1200);
  const id=item.href.slice(1);
  const landed=await page.evaluate(id=>{const el=document.getElementById(id);if(!el)return null;const heading=el.querySelector('h1,h2');const h=document.querySelector('.dc-header').getBoundingClientRect();return{section:Math.round(el.getBoundingClientRect().top),heading:heading?Math.round(heading.getBoundingClientRect().top):null,headerBottom:Math.round(h.bottom),scrollY:Math.round(scrollY),hash:location.hash,current:[...document.querySelectorAll('nav.dc-desktop-nav a[aria-current="location"]')].map(a=>a.textContent.trim())}},id);
  assert.ok(landed,`#${id} exists`);
  assert.ok(landed.heading===null||landed.heading>=landed.headerBottom-1,`${item.label} heading is not hidden under the sticky header`);
  assert.equal(landed.hash,`#${id}`,`${item.label} updates the URL`);
  assert.deepEqual(landed.current,[item.label],`${item.label} is marked as the current section`);
 }
 await page.locator('.dc-logo').click();await page.waitForTimeout(1200);
 assert.equal(await page.evaluate(()=>Math.round(scrollY)),0,'the logo returns to the hero');
 await page.setViewportSize({width:375,height:900});
 await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(300);
 await page.getByRole('button',{name:'Open menu',exact:true}).click();
 assert.ok(await page.locator('.dc-nav-backdrop').isVisible(),'the drawer renders a backdrop');
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden','the drawer locks the page');
 await page.mouse.click(180,860);await page.waitForTimeout(80);
 const blocked=await page.evaluate(()=>{const el=document.elementFromPoint(innerWidth/2,400);return Boolean(el&&el.closest('#dc-mobile-nav,.dc-nav-backdrop'))});
 assert.equal(blocked,false,'closing the drawer leaves no invisible overlay');
 await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'','the scroll lock is released');
 for(const item of navItems){
  await page.getByRole('button',{name:'Open menu',exact:true}).click();
  await page.waitForTimeout(250);
  await page.locator('#dc-mobile-nav a',{hasText:item.label}).first().click();
  await page.waitForTimeout(1200);
  const state=await page.evaluate(id=>{const el=document.getElementById(id);const heading=el.querySelector('h1,h2');return{top:Math.round(el.getBoundingClientRect().top),heading:heading?Math.round(heading.getBoundingClientRect().top):null,hb:Math.round(document.querySelector('.dc-header').getBoundingClientRect().bottom),scrollY:Math.round(scrollY),open:Boolean(document.getElementById('dc-mobile-nav')),lock:document.body.style.overflow}},item.href.slice(1));
  assert.ok(state.heading===null||state.heading>=state.hb-1,`${item.label} heading stays visible under the drawer`);
  assert.equal(state.open,false,`${item.label} closes the drawer`);
  assert.equal(state.lock,'','the drawer releases the scroll lock');
 }
 const transform=await page.locator('.dc-hero-parallax').evaluate(n=>getComputedStyle(n).transform);
 assert.ok(transform==='none'||transform==='matrix(1, 0, 0, 1, 0, 0)',transform);
 assert.deepEqual(errors,[],'No uncaught browser errors');
 console.log('PASS: real Chromium preview — six viewport widths without overflow; every desktop menu item lands on its own section with a visible heading, aria-current and a URL hash; the logo returns to the hero; the mobile drawer opens with a backdrop, closes by link/backdrop/Escape and leaves no overlay or scroll lock; loaded image fallbacks; section order; 44px visible controls; filters; reduced-motion parallax; zero uncaught page errors. No live booking submitted.');
}finally{await browser.close()}

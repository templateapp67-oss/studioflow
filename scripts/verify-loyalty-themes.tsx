import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import assert from 'node:assert/strict';
import {loyaltyTheme,LOYALTY_THEMES} from '../src/lib/loyaltyTheme';import {getLuminance} from '../src/themeAccents';import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';import {INITIAL_SALON_PROFILE} from '../src/mockData';import {DEFAULT_LOYALTY_CONFIG} from '../src/loyaltyData';import {WebsiteSections} from '../src/components/WebsiteSections';import {CustomerSalonWebsite} from '../src/components/CustomerSalonWebsite';
const contrast=(a:string,b:string)=>{const l=[getLuminance(a),getLuminance(b)].sort((a,b)=>b-a);return (l[0]+.05)/(l[1]+.05)};
assert.equal(Object.keys(LOYALTY_THEMES).length,14);
for(const template of Object.values(CATEGORY_TEMPLATES)){
 const profile={...INITIAL_SALON_PROFILE,businessType:template.id};const theme=loyaltyTheme(profile),v=theme.style;
 assert.ok(contrast(v['--loyalty-card'],v['--loyalty-text'])>=4.5,template.id+' title contrast');assert.ok(contrast(v['--loyalty-card'],v['--loyalty-muted'])>=4.5,template.id+' description contrast');assert.ok(contrast(v['--loyalty-accent'],v['--loyalty-accent-text'])>=4.5,template.id+' points badge contrast');
 const html=renderToStaticMarkup(<CustomerSalonWebsite profile={profile} services={[]} stylists={[]} loyaltyConfig={DEFAULT_LOYALTY_CONFIG} readOnly onAddAppointment={async a=>a}/>);
 assert.ok(html.includes(`data-loyalty-template="${template.id}"`));assert.ok(html.includes('sf-loyalty-card'));for(const reward of DEFAULT_LOYALTY_CONFIG.rewards.filter(r=>r.isActive)){assert.ok(html.includes(reward.title.replaceAll('&','&amp;')));assert.ok(html.includes(`${reward.requiredPoints} points required`));}assert.ok(!html.includes('couponCodePrefix'));
 const custom=loyaltyTheme({...profile,customAccentColor:'#ffe099'});assert.equal(custom.accent,'#ffe099');assert.equal(custom.style['--loyalty-accent-text'],'#000000');
 const empty=renderToStaticMarkup(<WebsiteSections profile={profile} services={[]} onBook={()=>{}} readOnly sections={['loyalty']} loyaltyConfig={{...DEFAULT_LOYALTY_CONFIG,programEnabled:false}}/>);assert.ok(empty.includes('Ask the salon'));assert.ok(!empty.includes('sf-loyalty-card"'));
 const hidden=renderToStaticMarkup(<WebsiteSections profile={{...profile,websiteSections:{loyalty:false}}} services={[]} onBook={()=>{}} readOnly sections={['loyalty']} loyaltyConfig={DEFAULT_LOYALTY_CONFIG}/>);assert.ok(!hidden.includes('id="salon-loyalty"'));
}
assert.equal(loyaltyTheme({...INITIAL_SALON_PROFILE,businessType:'barber',darkCanvas:false}).dark,true,'Barber storefront is always its dark reference theme');
assert.equal(loyaltyTheme({...INITIAL_SALON_PROFILE,businessType:'hair_salon',darkCanvas:true}).dark,true);
assert.equal(loyaltyTheme({...INITIAL_SALON_PROFILE,businessType:'makeup_studio',darkCanvas:false}).dark,false);
console.log('PASS: all 14 loyalty themes, readable card/badge contrast, custom accent, dark/light settings, saved reward content, disabled and hidden states.');

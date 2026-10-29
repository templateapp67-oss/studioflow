import {FeaturedReels} from '../src/components/FeaturedReels';
import {socialVideoSource,shortVideoSource,reelSource} from '../src/lib/socialVideoSource';
import {CustomerBookings} from '../src/components/CustomerBookings';
import {SalonBookingsDialog} from '../src/components/SalonBookingsDialog';
import {headerLinks,headerSettings,HEADER_LINKS} from '../src/lib/headerNavigation';
import {CustomerWebsiteHeader} from '../src/components/CustomerWebsiteHeader';
import {HeaderNavigationManager} from '../src/components/HeaderNavigationManager';
import {uploadServicePhoto} from '../src/lib/servicePhoto';
import {ServiceManagement} from '../src/components/ServiceManagement';
import {OnboardingWizard} from '../src/components/OnboardingWizard';
import {servicesForTemplate,serviceValidation,serviceOrigin} from '../src/lib/serviceCatalogue';
import type {SalonService} from '../src/types';
import {ReviewCarousel,reviewMarqueeItems} from '../src/components/ReviewCarousel';
import {reviewTemplates} from '../src/lib/reviewTemplates';
import {CustomerReviewPanel} from '../src/components/CustomerReviewPanel';
import {TestimonialModal} from '../src/components/ClientTestimonials';
import {clientExperiences,lookbookPhotos,tenDemoTestimonials,tenClientExperiences} from '../src/lib/demoWebsiteContent';
import {CustomerSalonWebsite} from '../src/components/CustomerSalonWebsite';
import {BookingModal} from '../src/components/BookingModal';
import {supabase} from '../src/lib/supabase';
import React, {useState} from 'react';
import {act,create} from 'react-test-renderer';
import {showcaseVideos} from '../src/lib/showcaseVideos';
import {AuthPage} from '../src/components/AuthPage';
import {PromoStudio} from '../src/components/PromoStudio';
import {SocialConnectivityStep} from '../src/components/SocialConnectivityStep';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
import {CATEGORY_STANDARDIZED_DATA} from '../src/templateData';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {SalonWebsitePreview} from '../src/components/SalonWebsitePreview';
import {Header} from '../src/components/Header';
import {socialUrl, WEBSITE_SECTIONS} from '../src/lib/websiteContent';
import { applyTemplateDesign } from '../src/lib/templateSelection';
import { normalizeWorkspace } from '../src/lib/normalizeWorkspace';
import { WebsiteSections } from '../src/components/WebsiteSections';
import { InlineEditable } from '../src/components/InlineEditable';
import { DEFAULT_LOYALTY_CONFIG } from '../src/loyaltyData';
(globalThis as any).location={origin:'https://studioflow.test',search:'',hash:''};
const campaign={enabled:true,selectedServiceId:'s1',campaignTheme:'flash_discount',discountPercent:20,customOfferText:'Owner Special',promoCode:'OWN20',headline:'Saved owner campaign',subtext:'Updated dashboard copy',aspectRatio:'1:1',aesthetic:'luxury_gold',imageUrl:'https://example.com/promo.jpg',customPrompt:''};
for(const template of Object.values(CATEGORY_TEMPLATES)) {
 const profile={...INITIAL_SALON_PROFILE,businessType:template.id,businessName:'Actual Salon',promoCampaign:campaign,socialVideos:[{id:'vid',youtubeUrl:'https://www.youtube.com/shorts/abcdefghijk',videoId:'abcdefghijk',title:'Saved owner reel',thumbnailUrl:'',categoryTag:'SHORT' as const,isOwnerVideo:true}],instagramHandle:'https://instagram.com/actualsalon',websiteTestimonials:[],sectionHeadings:{videosTitle:'My updated reels'}};
 const props={profile,services:[],stylists:[],gallery:[],readOnly:true,policies:{cancellation:'Updated cancellation terms'}};
 const publishedProfile={...profile,customAccentColor:'#123456',darkCanvas:false,sectionHeadings:{videosTitle:'Saved video heading',videosSubtitle:'Saved video introduction',socialTitle:'Saved social heading',loyaltyTitle:'Saved loyalty heading',policiesTitle:'Saved policies heading'}};
 const loyaltyConfig={...DEFAULT_LOYALTY_CONFIG,programEnabled:true,rewards:[{id:'qa-reward',isActive:true,title:'Saved customer reward',description:'Reward description',requiredPoints:100}]};
 const publishedProps={...props,profile:publishedProfile,loyaltyConfig};
 const html=renderToStaticMarkup(<SalonWebsitePreview {...publishedProps}/>);
 for(const text of [...(template.id==='skincare_clinic'?[]:['Saved video heading','Saved video introduction']),'Saved social heading','Saved policies heading','Saved customer reward','#123456'])assert.ok(html.includes(text),`${template.id}: ${text} missing`);
 for(const key of ['videos','promo','social','loyalty','policies']) {
   const off=renderToStaticMarkup(<SalonWebsitePreview {...publishedProps} profile={{...publishedProfile,websiteSections:{[key]:false}}}/>);
   assert.ok(!off.includes(`data-section="${key}"`),`${template.id}: ${key} toggle failed`);
 }
 const switched=applyTemplateDesign(publishedProfile,template);
 const restored=normalizeWorkspace(JSON.parse(JSON.stringify({profile:switched,services:[],stylists:[]}))).profile;
 assert.equal(restored.customAccentColor,'#123456');assert.equal(restored.darkCanvas,false);
 assert.deepEqual(restored.socialVideos,publishedProfile.socialVideos);assert.deepEqual(restored.sectionHeadings,publishedProfile.sectionHeadings);
 for(const text of [...(template.id==='skincare_clinic'?[]:['Saved owner campaign','Saved owner reel','Saved video heading']),'Updated cancellation terms','https://instagram.com/actualsalon']) assert.ok(html.includes(text),`${template.id}: ${text} missing`);
 if(template.id==='skincare_clinic') assert.ok(!html.includes('Saved owner campaign'),'unverified campaign service must not appear');
 assert.ok(!html.includes('Infinity'),`${template.id}: empty service price`);
 const hidden=renderToStaticMarkup(<SalonWebsitePreview {...props} profile={{...profile,websiteSections:{promo:false,videos:false,social:false}}}/>);
 assert.ok(!hidden.includes('Saved owner campaign')&&!hidden.includes('Saved owner reel'),`${template.id}: hidden sections still visible`);
}
assert.equal(socialUrl('javascript:alert(1)','instagram'),'');
assert.equal(socialUrl('@mysalon','instagram'),'https://instagram.com/mysalon');
const header=renderToStaticMarkup(<Header currentView="dashboard" setCurrentView={()=>{}} salonName="Actual Salon"/>);
assert.ok(!header.includes('SaaS Dashboard'));
assert.equal((header.match(/\bDashboard\b/g)||[]).length,2,'One desktop and one mobile navigation dashboard');
console.log('PASS: templates render saved promo, social links and policies; videos remain in other templates; toggles hide content; empty services are safe; duplicate dashboard action removed.');

(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
(globalThis as any).document={hidden:false,addEventListener(){},removeEventListener(){},querySelector(){return null;}};
let savedProfile:any, externalProfileUpdate:any;
function DashboardHarness(){const [profile,setProfile]=useState({...INITIAL_SALON_PROFILE,promoCampaign:campaign,socialVideos:[{id:'v1',videoId:'abcdefghijk',youtubeUrl:'https://www.youtube.com/shorts/abcdefghijk',title:'Owner reel',categoryTag:'SHORT' as const,isOwnerVideo:true}],instagramHandle:'@oldhandle'});savedProfile=profile;externalProfileUpdate=setProfile;return <><PromoStudio profile={profile} setProfile={setProfile} services={[]}/><SocialConnectivityStep profile={profile} setProfile={setProfile}/></>;}
let editor:any;
await act(async()=>{editor=create(<DashboardHarness/>);});
assert.equal(savedProfile.promoCampaign.headline,'Saved owner campaign','Existing promo copy must survive editor mount');
await act(async()=>{editor.root.findAll(node=>['input','textarea'].includes(node.type)&&node.props.value==='Saved owner campaign')[0].props.onChange({target:{value:'New saved dashboard campaign'}});});
assert.equal(savedProfile.promoCampaign.headline,'New saved dashboard campaign');
await act(async()=>{editor.root.findAll(node=>node.type==='input'&&node.props.value==='@oldhandle')[0].props.onChange({target:{value:'https://instagram.com/newhandle'}});});
assert.equal(savedProfile.instagramHandle,'https://instagram.com/newhandle');assert.equal(savedProfile.socialVideos[0].title,'Owner reel','Social edits must preserve saved videos');
await act(async()=>{externalProfileUpdate(p=>({...p,socialVideos:[],demoVideosInitialized:true}));});
assert.equal(editor.root.findByType(SocialConnectivityStep).props.profile.socialVideos.length,0);
const persisted=savedProfile;
await act(async()=>{editor.unmount();editor=create(<PromoStudio profile={persisted} setProfile={update=>{savedProfile=typeof update==='function'?update(savedProfile):update;}} services={[]}/>);});
assert.equal(savedProfile.promoCampaign.headline,'New saved dashboard campaign','Promo edits must survive remount');
await act(async()=>{editor.unmount();});
console.log('PASS: promo edits persist, remount preserves custom copy, social links preserve videos, and empty video feeds remain empty.');

// Inline content editing updates the same profile rendered by every template.
let inlineProfile:any, updateInline:any;
function InlineHarness(){const [profile,setProfile]=useState({...INITIAL_SALON_PROFILE,promoCampaign:campaign,socialVideos:[{id:'inline-video',videoId:'abcdefghijk',youtubeUrl:'https://www.youtube.com/shorts/abcdefghijk',title:'Before edit',categoryTag:'SHORT' as const,isOwnerVideo:true,thumbnailUrl:''}]});inlineProfile=profile;updateInline=setProfile;return <WebsiteSections profile={profile} setProfile={setProfile} isEditingActive services={[]} onBook={()=>{}} onManage={()=>{}}/>;}
let inline:any;
await act(async()=>{inline=create(<InlineHarness/>);});
await act(async()=>{inline.root.findAllByType(InlineEditable).find(node=>node.props.value==='Before edit').props.onSave('After inline edit');});
assert.equal(inlineProfile.socialVideos[0].title,'After inline edit');
await act(async()=>{inline.root.findAllByType(InlineEditable).find(node=>node.props.value==='Featured Videos & Reels').props.onSave('Inline video heading');});
assert.equal(inlineProfile.sectionHeadings.videosTitle,'Inline video heading');
await act(async()=>{inline.root.findAllByType(InlineEditable).find(node=>node.props.value===campaign.headline).props.onSave('Inline campaign');});
assert.equal(inlineProfile.promoCampaign.headline,'Inline campaign');
await act(async()=>{updateInline(p=>({...p,websiteSections:{...WEBSITE_SECTIONS,videos:false}}));});
assert.equal(inline.root.findAll(node=>node.props['data-section']==='videos').length,0);
await act(async()=>inline.unmount());
console.log('PASS: inline video title, video heading and promotion edits share the saved profile; videos hide immediately.');
// Enabled sections remain discoverable before owners add content; guests never receive edit actions.
for(const template of Object.values(CATEGORY_TEMPLATES)) {
 const profile={...INITIAL_SALON_PROFILE,businessType:template.id,subdomain:'test-salon',promoCampaign:undefined,socialVideos:[],instagramHandle:'',facebookPage:'',youtubeChannel:'',tiktokProfile:'',websiteTestimonials:[],bookingRules:{leadHours:4,cancellationWindow:24}};
 const props={profile,services:[],readOnly:true,policies:{cancellation:'Saved cancellation policy'},onBook:()=>{}};
 const guest=renderToStaticMarkup(<WebsiteSections {...props}/>);
 for(const key of ['promo','videos','social','policies','bookings','share'])assert.ok(guest.includes(`data-section="${key}"`),`${template.id}: empty ${key} must be visible`);
 assert.ok(!guest.includes('owner-content'));assert.ok(!guest.includes('Edit this section'));assert.ok(guest.includes('Book at least 4 hours ahead'));
 const owner=renderToStaticMarkup(<WebsiteSections {...props} readOnly={false} onManage={()=>{}}/>);
 assert.ok(owner.includes('owner-content'));assert.ok(owner.includes('Promotional Banner &amp; Social Campaign Studio'));
 const hidden=renderToStaticMarkup(<WebsiteSections {...props} profile={{...profile,websiteSections:{bookings:false,share:false}}}/>);
 assert.ok(!hidden.includes('data-section="bookings"'));assert.ok(!hidden.includes('data-section="share"'));
}
console.log('PASS: all 14 templates show enabled empty customer sections and saved booking rules; edit actions are owner-only; bookings/share toggles hide sections.');

const signupMarkup=renderToStaticMarkup(<AuthPage compact customerMode initialMode="signup" returnSlug="test-salon"/>);
assert.ok(signupMarkup.includes('Create your customer account'));assert.ok(!signupMarkup.includes('Salon name'));assert.ok(signupMarkup.includes('Full name'));
const loginMarkup=renderToStaticMarkup(<AuthPage compact customerMode initialMode="signin" returnSlug="test-salon"/>);assert.ok(loginMarkup.includes('Welcome back'));assert.ok(loginMarkup.includes('Forgot password?'));
console.log('PASS: live customer signup uses customer fields; login includes password recovery.');

// Demo seeding covers new and already-published empty profiles without replacing owner videos.
for(const template of Object.values(CATEGORY_TEMPLATES)) {
 const raw={...INITIAL_SALON_PROFILE,businessType:template.id,socialVideos:[],demoVideosInitialized:undefined};
 const initialized=normalizeWorkspace({profile:raw});assert.equal(initialized.profile.socialVideos.length,5);assert.ok(initialized.profile.socialVideos.every(v=>v.isDemo&&!v.isOwnerVideo));assert.equal(new Set(initialized.profile.socialVideos.map(v=>v.videoId)).size,5);
 const html=renderToStaticMarkup(<WebsiteSections profile={initialized.profile} services={[]} onBook={()=>{}} readOnly/>);assert.equal((html.match(/class="sf-reel-media"/g)||[]).length,5);assert.equal((html.match(/<iframe/g)||[]).length,0);assert.ok(html.includes('DEMO / REFERENCE'));
 const removed=normalizeWorkspace({profile:{...initialized.profile,socialVideos:[]}});assert.equal(showcaseVideos(removed.profile).length,0,'Deleted demos must not return');
}
let demoProfile:any,demoEditor:any;
function DemoHarness(){const [profile,setProfile]=useState({...INITIAL_SALON_PROFILE,socialVideos:showcaseVideos({...INITIAL_SALON_PROFILE,socialVideos:[]}),demoVideosInitialized:true});demoProfile=profile;return <SocialConnectivityStep profile={profile} setProfile={setProfile}/>;}
await act(async()=>{demoEditor=create(<DemoHarness/>);});
const demoText=(node:any):string=>typeof node==='string'?node:Array.isArray(node)?node.map(demoText).join(' '):(node?.children||[]).map(demoText).join(' ');
const demoButton=(label:string)=>demoEditor.root.findAll((node:any)=>node.type==='button'&&demoText(node).includes(label))[0];
const originalDemoId=demoProfile.socialVideos[0].id;
await act(async()=>demoButton('MANAGE / REPLACE').props.onClick());
await act(async()=>demoButton('Replace video / Edit URL & title').props.onClick());
await act(async()=>demoEditor.root.findByProps({placeholder:'https://youtube.com/shorts/... or https://instagram.com/reel/...'}).props.onChange({target:{value:'https://www.youtube.com/shorts/abcdefghijk'}}));
await act(async()=>demoEditor.root.findByProps({placeholder:'e.g. Keratin Smooth Transformation Reel'}).props.onChange({target:{value:'My actual salon reel'}}));
await act(async()=>demoEditor.root.findAll((node:any)=>node.type==='form'&&node.props.onSubmit)[0].props.onSubmit({preventDefault(){}}));
assert.equal(demoProfile.socialVideos.length,5);assert.equal(demoProfile.socialVideos[0].id,originalDemoId);assert.equal(demoProfile.socialVideos[0].videoId,'abcdefghijk');assert.equal(demoProfile.socialVideos[0].isDemo,false);
assert.equal(normalizeWorkspace({profile:demoProfile}).profile.socialVideos[0].title,'My actual salon reel');
await act(async()=>demoButton('MANAGE / REPLACE').props.onClick());await act(async()=>demoButton('Delete Video').props.onClick());assert.equal(demoProfile.socialVideos.length,4);assert.equal(normalizeWorkspace({profile:demoProfile}).profile.socialVideos.length,4);
await act(async()=>demoEditor.unmount());
console.log('PASS: five distinct demo reel posters in all 14 templates; replacement keeps position and persists owner URL/title; deletion stays removed after reload.');

for(const template of Object.values(CATEGORY_TEMPLATES)) {
 const profile={...INITIAL_SALON_PROFILE,businessType:template.id,subdomain:'test-salon',socialVideos:[]};
 const html=renderToStaticMarkup(<SalonWebsitePreview profile={profile} services={[]} stylists={[]} gallery={[]} readOnly onManageDashboard={()=>{}} onCustomerAccount={()=>{}} customerSignedIn onAddAppointment={async apt=>apt}/>);
 const header=(html.match(/<header[\s\S]*?<\/header>/g)||[]).find(h=>h.includes('Customer account'));assert.ok(header,template.id);
 for(const label of ['Manage your customer account','My Bookings'])assert.ok(header.includes(label),`${template.id}: ${label} must be inside salon header`);assert.ok(!header.includes('Customer Login')&&!header.includes('Sign up'),`${template.id}: signed-in header must hide guest buttons`);
 for(const label of ['Replace / Manage video','Edit this section','owner-content','Edit featured client experiences','The salon owner can replace'])assert.ok(!html.includes(label),`${template.id}: public page must hide ${label}`);
 assert.equal((html.match(/class="sf-reel-media"/g)||[]).length,template.id==='skincare_clinic'?0:5);assert.equal((html.match(/<iframe/g)||[]).length,0);
}
console.log('PASS: public templates retain customer header access without owner management controls; Dermacure replaces reels with its editorial section.');

for(const template of Object.values(CATEGORY_TEMPLATES)) {
 const profile={...INITIAL_SALON_PROFILE,businessType:template.id,businessName:'Test Studio',whatsapp:'919876543210',websiteTestimonials:[]};
 const html=renderToStaticMarkup(<SalonWebsitePreview profile={profile} services={template.id==='skincare_clinic'?template.services.map(s=>({...s,clinicServiceApproved:true,clinicPublicationStatus:'published' as const,clinicFeeStatus:'verified' as const,clinicPriceVerified:true})):template.services} stylists={template.stylists} gallery={['https://example.com/look.jpg']} readOnly onAddAppointment={async apt=>apt}/>);
 if(template.id==='skincare_clinic'){
  let previous=-1; for(const id of ['home','treatments','about','directory','technology','results','journey','booking','contact']){const at=html.indexOf(`id="${id}"`);assert.ok(at>previous,`Dermacure: ${id} is missing or out of order`);previous=at;}
  for(const service of template.services){assert.ok(html.includes(service.name.replaceAll('&','&amp;').replaceAll("'",'&#x27;')));assert.ok(html.includes(`${service.durationMinutes} min`));}
  assert.ok(!html.includes('Verified checkout'));assert.ok(!html.includes('Verified client'));
  continue;
 }
 // Templates 06 and 08 are editorial single-page sites: the sticky header is the only
 // navigation, so they have no dock duplicating the same links.
 const order=template.id==='hair_spa'?['hero','services','team','gallery','location','footer']:template.id==='makeup_studio'?['hero','services','gallery','team','experiences','location','footer']:template.id==='massage_wellness'?['hero','services','experiences','gallery','location','footer']:template.id==='hair_coloring'?['hero','services','team','gallery','experiences','location','footer']:['hero','dock','services','team','experiences','location','footer'];let previous=-1;for(const section of order){const at=html.indexOf(`data-layout="${section}"`);assert.ok(at>previous,`${template.id}: ${section} must appear in requested order`);previous=at;}
 if(template.id==='hair_spa'){
  assert.ok(!html.includes('data-layout="dock"'),'hair spa keeps one navigation in the header');
  assert.ok(html.includes('kp-footer-social'),'hair spa social profiles live in the footer');
  assert.ok(!html.includes('data-section="social"'),'hair spa does not repeat social profiles as a section');
  assert.ok(html.includes('href="#treatments"')&&html.includes('href="#gallery"'),'header links resolve');
  assert.ok(html.includes('wa.me/'),'hair spa keeps a real WhatsApp contact path');
 }else if(template.id==='makeup_studio'){
  assert.ok(!html.includes('data-layout="dock"'),'Vogue Noir keeps one navigation in the sticky header');
  assert.ok(html.includes('href="#services"')&&html.includes('href="#academy"')&&html.includes('href="#portfolio"'),'Vogue Noir header links resolve');
  assert.ok(html.includes('wa.me/'),'Vogue Noir keeps a real WhatsApp contact path');
 }else if(template.id==='massage_wellness'){
  // Template 09 (Bodhi Tree) is a multi-page site: the sticky glass header is the
  // only navigation, so there is no dock duplicating the same links.
  assert.ok(!html.includes('data-layout="dock"'),'Bodhi Tree keeps one navigation in the sticky header');
  assert.ok(html.includes('wa.me/'),'Bodhi Tree keeps a real WhatsApp contact path');
  assert.ok(html.includes('Jaipur Palace Collection'),'Bodhi Tree home previews the Palace Collection');
 }else if(template.id==='hair_coloring'){
  // Template 10 (Prism & Chroma) is a single-page site: the sticky blurred
  // header is the only navigation, so there is no dock duplicating it.
  assert.ok(!html.includes('data-layout="dock"'),'Prism & Chroma keeps one navigation in the sticky header');
  assert.ok(html.includes('wa.me/'),'Prism & Chroma keeps a real WhatsApp contact path');
  assert.ok(html.includes('Shade Studio'),'Prism & Chroma home shows the Shade Studio');
 }else{
  const dock=html.match(/<nav data-layout="dock"[\s\S]*?<\/nav>/)?.[0]||'';for(const label of ['Offers','Services','Our Team','Lookbook','Reviews','Location'])assert.ok(dock.includes(label),`${template.id}: ${label} dock link missing`);
  assert.ok(html.includes('WhatsApp Inquiry'));
 }
if(['hair_spa','makeup_studio','massage_wellness','hair_coloring'].includes(template.id)){
 // Templates 06, 08, 09 and 10 use their own editorial hero instead of the shared "Rich warm mood" badge copy.
 assert.ok(!html.includes('Rich warm mood'),'Editorial hero must not leak shared design-reference copy');
 assert.ok(html.includes('Test Studio'),'Editorial hero shows the saved salon name');
}else assert.ok(html.includes('Rich warm mood'));
if(['hair_spa','makeup_studio','massage_wellness','hair_coloring'].includes(template.id))assert.ok(!html.includes('Verified checkout'),'Editorial demo must not imply an active verified checkout');else assert.ok(html.includes('Verified checkout'));assert.ok(html.includes('Service categories'));
 // Templates 06 and 08 name their booking action in the studio's own words.
 if(template.id==='hair_spa')assert.ok(html.includes('Book this service'),'hair spa service cards expose the booking action');else if(template.id==='makeup_studio')assert.ok(html.includes('>Book<')&&html.includes('Book Appointment'),'Vogue Noir service cards expose the booking action');else if(template.id==='massage_wellness')assert.ok(html.includes('Book Now'),'Bodhi Tree service cards expose the booking action in simple words');else if(template.id==='hair_coloring')assert.ok(html.includes('Book Now'),'Prism & Chroma service cards expose the booking action in simple words');else assert.ok(html.includes('Choose for online booking'));
 assert.ok(!html.includes('Verified client'),'Owner-entered reviews must not be labelled verified by default');
 if(template.id==='massage_wellness'){
  // Template 09 is multi-page: Home previews the most-loved massages, every
  // package and the first Palace Collection cards; the full menus live on the
  // Services / Palace / Packages pages (covered by verify-bodhi-tree-template).
  const homeServices=template.services.filter(s=>(s.popular&&s.category!=='Palace Collection')||s.category==='Packages');
  for(const service of homeServices){assert.ok(html.includes(service.name.replaceAll('&','&amp;').replaceAll("'",'&#x27;')),`Bodhi Tree home shows ${service.name}`);}
  for(const service of template.services.filter(s=>s.popular&&s.category!=='Palace Collection'&&s.category!=='Packages'))assert.ok(html.includes(`${service.durationMinutes} min`),`Bodhi Tree home shows ${service.name} duration`);
  for(const title of ['Hawa Mahal Calm Ritual','City Palace Royal Abhyanga','Amer Fort Warrior Recovery','Jal Mahal Lakeside Shirodhara'])assert.ok(html.includes(title),`Bodhi Tree home previews ${title}`);
 }else if(template.id==='hair_coloring'){
  // Template 10's bento menu shows every colour service with its duration;
  // packages are presented as the three glass tiers (Starter / Signature /
  // Full Transformation) instead of menu rows.
  for(const service of template.services.filter(s=>!/package|combo|bundle/i.test(s.name+' '+s.category))){assert.ok(html.includes(service.name.replaceAll('&','&amp;').replaceAll("'",'&#x27;')),`Prism & Chroma menu shows ${service.name}`);assert.ok(html.includes(`${service.durationMinutes} min`),`Prism & Chroma menu shows ${service.name} duration`);}
  for(const tier of ['Starter','Signature','Full Transformation'])assert.ok(html.includes(tier),`Prism & Chroma shows the ${tier} package tier`);
 }else for(const service of template.services){assert.ok(html.includes(service.name.replaceAll('&','&amp;').replaceAll("'",'&#x27;')));assert.ok(html.includes(`${service.durationMinutes} min`));}
}
console.log('PASS: all 14 templates follow hero → dock → services → specialists → experiences/lookbook → location → footer; category pricing, duration, WhatsApp and specialist booking controls are present.');

const oldRpc=supabase.rpc,functionsPrototype=Object.getPrototypeOf(supabase.functions),oldInvoke=functionsPrototype.invoke;
(supabase as any).rpc=async()=>({data:[],error:null});functionsPrototype.invoke=async()=>({data:{configured:true},error:null});
(globalThis as any).window={addEventListener(){},removeEventListener(){}};
let layout:any;
try{
 const fixture=CATEGORY_TEMPLATES.barber;
 const menu=[{...fixture.services[0],id:'cuts',name:'Executive Cut',category:'Executive Cuts'},{...fixture.services[0],id:'beards',name:'Beard Sculpt',category:'Beard Sculpting'}];
 await act(async()=>{layout=create(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:'barber'}} services={menu} stylists={fixture.stylists} onAddAppointment={async apt=>apt}/>);});
 await act(async()=>layout.root.findAll((n:any)=>n.type==='button'&&demoText(n)==='Beard Sculpting')[0].props.onClick());
 const cards=layout.root.findAll((n:any)=>n.type==='article'&&n.props.className==='sf-service-card');assert.equal(cards.length,1);assert.ok(demoText(cards[0]).includes('Beard Sculpt'));
 const toggles=layout.root.findAll((n:any)=>n.type==='button'&&n.props.className==='sf-specialist-toggle');await act(async()=>toggles[0].props.onClick());assert.equal(layout.root.findByType(BookingModal).props.initialStylist.id,fixture.stylists[0].id);
 await act(async()=>cards[0].findAllByType('button')[0].props.onClick());const checkout=layout.root.findByType(BookingModal);assert.equal(checkout.props.isOpen,true);assert.equal(checkout.props.initialService.id,'beards');assert.equal(checkout.props.initialStylist.id,fixture.stylists[0].id);
 console.log('PASS: category filter shows the right service card; specialist selection and service Book CTA pass exact IDs into the existing checkout.');
}finally{if(layout)await act(async()=>layout.unmount());supabase.rpc=oldRpc;functionsPrototype.invoke=oldInvoke;}

for(const template of Object.values(CATEGORY_TEMPLATES)) {
 const initial=normalizeWorkspace({profile:{...INITIAL_SALON_PROFILE,businessType:template.id,websiteTestimonials:[]},extras:{gallery:[]}});
 if(template.id==='hair_spa'){ // Template 06 ships no bundled testimonials: reviews only appear once real ones are published.
  assert.equal(initial.profile.websiteTestimonials.length,0,'hair_spa must not seed demo reviews');
 }else{
  assert.equal(initial.profile.websiteTestimonials.length,3,template.id);assert.ok(initial.profile.websiteTestimonials.every(r=>r.isDemo&&!r.verified));
 }
 assert.ok(initial.extras.gallery.length>=4,template.id);
 const html=renderToStaticMarkup(<SalonWebsitePreview profile={initial.profile} services={[]} stylists={[]} gallery={initial.extras.gallery} readOnly onAddAppointment={async apt=>apt}/>);if(template.id==='hair_spa'){assert.ok(html.includes('Rooted in'),'hair spa renders its own philosophy copy');assert.ok(html.includes('THE SERVICE MENU'),'hair spa owns a single service catalogue');assert.ok(!html.includes('Demo testimonial'),'Hair spa never presents sample reviews as authentic');assert.ok(html.includes('Demo / sample'));assert.ok(!html.includes('4.97')&&!html.includes('390 experiences'),'hair_spa must not print an invented average rating or review count');assert.ok(!html.includes('id="testimonials"'),'no empty testimonials section without published reviews');}else if(template.id==='skincare_clinic'){assert.ok(!html.includes('Demo testimonial'));assert.ok(!html.includes('PATIENT EXPERIENCES'));}else if(template.id==='makeup_studio'){assert.ok(html.includes('Luxury Makeup, Made For Every Indian Bride'),'Vogue Noir renders its current default hero heading');assert.ok(html.includes('id="portfolio"'));assert.ok(!html.includes('Verified client'));}else if(template.id==='massage_wellness'){
// Template 09 (Bodhi Tree) renders its own Jaipur guest reviews and gallery,
// never the generic demo labels or verified-client claims.
assert.ok(!html.includes('Demo testimonial'),'Bodhi Tree never prints the generic demo testimonial label');
assert.ok(html.includes('Neha S.'),'Bodhi Tree home shows its seeded Jaipur guest reviews');
assert.ok(html.includes('/templates/bodhi-tree/gallery/'),'Bodhi Tree home shows its own lookbook photographs');
assert.ok(!html.includes('Verified client'));
assert.ok(!html.includes('Client experiences will appear here'));
}else if(template.id==='hair_coloring'){
// Template 10 (Prism & Chroma) renders its own colour-studio reviews and
// gallery, never the generic demo labels or verified-client claims.
assert.ok(!html.includes('Demo testimonial'),'Prism & Chroma never prints the generic demo testimonial label');
assert.ok(html.includes('Ananya Kapoor'),'Prism & Chroma shows its seeded colour-studio reviews');
assert.ok(html.includes('/templates/10/'),'Prism & Chroma shows its own gallery photographs');
assert.ok(!html.includes('Verified client'));
assert.ok(!html.includes('Client experiences will appear here'));
}else{assert.ok(html.includes('Demo testimonial'));assert.ok(html.includes('Demo lookbook'));assert.ok(!html.includes('Client experiences will appear here'));}
 const deleted=normalizeWorkspace({profile:{...initial.profile,websiteTestimonials:[]},extras:{gallery:[]}});assert.equal(clientExperiences(deleted.profile).length,0);assert.equal(lookbookPhotos(deleted.profile,deleted.extras.gallery).length,0);
 const real={...initial.profile.websiteTestimonials[0],id:'real-review',isDemo:false,name:'Actual client',comment:'Actual client experience'};
 const own=normalizeWorkspace({profile:{...initial.profile,websiteTestimonials:[real]},extras:{gallery:['https://example.com/owner-photo.jpg']}});assert.deepEqual(own.profile.websiteTestimonials,[real]);assert.deepEqual(own.extras.gallery,['https://example.com/owner-photo.jpg']);
 const next=Object.values(CATEGORY_TEMPLATES).find(t=>t.id!==template.id)!;const switched=normalizeWorkspace({...initial,profile:applyTemplateDesign(initial.profile,next)});assert.ok(switched.profile.websiteTestimonials.every(r=>r.id.includes(next.id)));assert.ok(switched.extras.gallery.every(url=>lookbookPhotos({...switched.profile,demoGalleryInitialized:false},[]).includes(url)));
}
console.log('PASS: 13 templates seed three labelled demo reviews (Template 06 ships none) and every template seeds category lookbook photos; owner content stays intact; deletion persists; switching themes replaces only demo content.');

// Customer photo + rating + text submission uses the real form with isolated backend fixtures.
const reviewOldRpc=supabase.rpc,oldGetUser=supabase.auth.getUser,oldStorageFrom=supabase.storage.from;
(globalThis as any).document={hidden:false,addEventListener(){},removeEventListener(){},querySelector(){return null;}};
let capturedUpload:any;const canvasSizes:number[][]=[];
(globalThis as any).FileReader=class{onload:any;readAsDataURL(){this.onload({target:{result:'data:image/jpeg;base64,AQID'}});}};
(globalThis as any).Image=class{width=4000;height=3000;onload:any;set src(_value:string){queueMicrotask(()=>this.onload());}};
(globalThis as any).document.createElement=()=>{const canvas={width:0,height:0,getContext:()=>({drawImage:(_image:any,_x:number,_y:number,width:number,height:number)=>{canvasSizes.push([width,height]);}}),toDataURL:(type:string)=>`data:${type};base64,AQID`};return canvas;};

let submittedReview:any,loginCount=0;const reviewPhoto='https://example.com/customer-upload.jpg';
(supabase.auth as any).getUser=async()=>({data:{user:{id:'fixture-customer'}},error:null});
(supabase.storage as any).from=()=>({upload:async(_path:any,file:any)=>{capturedUpload=file;return {error:null};},getPublicUrl:()=>({data:{publicUrl:reviewPhoto}})});
(supabase as any).rpc=async(name:string,{p_slug,...request}:any)=>{if(name==='studioflow_submit_review'){submittedReview={p_slug,...request};const review={id:'submitted',name:request.p_name,rating:request.p_rating,comment:request.p_comment,serviceName:request.p_service_name,imageUrl:request.p_image_url,verified:false,isOwnerReview:true,isMine:true,date:'2026-10-14'};return {data:{reviews:[review],ownReview:review,canReview:true},error:null};}return {data:{reviews:[],ownReview:null,canReview:true},error:null};};
let reviewForm:any,ownerPhoto:any,ownerSaved:any;
try{
 await act(async()=>{reviewForm=create(<CustomerReviewPanel slug="test-salon" fallbackReviews={[]} signedIn={false} onLogin={()=>loginCount++} services={['Haircut','Beard trim']}/>);});
 await act(async()=>reviewForm.root.findAll((n:any)=>n.type==='button'&&demoText(n).includes('Write a review'))[0].props.onClick());assert.equal(loginCount,1);
 await act(async()=>reviewForm.unmount());
 await act(async()=>{reviewForm=create(<CustomerReviewPanel slug="test-salon" fallbackReviews={[]} signedIn onLogin={()=>{}} services={['Haircut','Beard trim']}/>);});
 await act(async()=>reviewForm.root.findAll((n:any)=>n.type==='button'&&demoText(n).includes('Write a review'))[0].props.onClick());
 await act(async()=>reviewForm.root.findAll((n:any)=>n.type==='input'&&n.props.maxLength===100)[0].props.onChange({target:{value:'Customer Name'}}));
 await act(async()=>reviewForm.root.findByType('textarea').props.onChange({target:{value:'A lovely salon visit with careful service.'}}));
 await act(async()=>reviewForm.root.findByProps({'aria-label':'4 stars'}).props.onClick());
 await act(async()=>reviewForm.root.findByProps({'aria-label':'Review service (optional)'}).props.onChange({target:{value:'Haircut'}}));
 const draftList=reviewForm.root.findByProps({className:'sf-review-template-list'});assert.equal(draftList.findAllByType('button').length,5);
 await act(async()=>draftList.findAllByType('button')[0].props.onClick());assert.ok(reviewForm.root.findByType('textarea').props.value.includes('Haircut'));assert.equal(reviewForm.root.findByProps({'aria-label':'4 stars'}).props['aria-pressed'],true);
 await act(async()=>reviewForm.root.findByProps({'aria-label':'Review service (optional)'}).props.onChange({target:{value:'Beard trim'}}));assert.ok(reviewForm.root.findByType('textarea').props.value.includes('Beard trim'));assert.ok(!reviewForm.root.findByType('textarea').props.value.includes('Haircut'));
 await act(async()=>reviewForm.root.findAll((n:any)=>n.type==='button'&&demoText(n)==='Write my own review')[0].props.onClick());assert.equal(reviewForm.root.findByType('textarea').props.value,'');
 await act(async()=>reviewForm.root.findByType('textarea').props.onChange({target:{value:'A lovely salon visit with careful service.'}}));
 await act(async()=>reviewForm.root.findByProps({'aria-label':'Review service (optional)'}).props.onChange({target:{value:'Haircut'}}));assert.equal(reviewForm.root.findByType('textarea').props.value,'A lovely salon visit with careful service.');

 const photoEvent={target:{files:[{name:'review.jpg',type:'image/jpeg',size:1024}],value:'review.jpg'}};
 await act(async()=>reviewForm.root.findAll((n:any)=>n.type==='input'&&n.props.type==='file')[0].props.onChange(photoEvent));
 await act(async()=>reviewForm.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert.ok(capturedUpload.size<2*1024*1024);assert.ok(canvasSizes.some(([width,height])=>width===1600&&height===1200));assert.equal(submittedReview.p_rating,4);assert.equal(submittedReview.p_image_url,reviewPhoto);assert.equal(submittedReview.p_service_name,'Haircut');assert.ok(demoText(reviewForm.toJSON()).includes('Your review is now visible'));assert.ok(reviewForm.root.findAllByType('img').some(n=>n.props.src===reviewPhoto));assert.ok(!demoText(reviewForm.toJSON()).includes('Verified visit'));assert.ok(demoText(reviewForm.toJSON()).includes('Owner update'));
 const existingReview={...CATEGORY_STANDARDIZED_DATA.hair_salon.reviews[0],reviewImageUrl:reviewPhoto};
 await act(async()=>{ownerPhoto=create(<TestimonialModal isOpen onClose={()=>{}} editingTestimonial={existingReview} onSave={saved=>ownerSaved=saved}/>);});
 assert.ok(ownerPhoto.root.findAllByType('img').some(n=>n.props.src===reviewPhoto));
 await act(async()=>ownerPhoto.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(ownerSaved.reviewImageUrl,reviewPhoto);
 console.log('PASS: customer login gating, rating/text/photo submission, persisted photo rendering and unverified status; owner testimonial editor preserves the experience photo.');
}finally{if(reviewForm)await act(async()=>reviewForm.unmount());if(ownerPhoto)await act(async()=>ownerPhoto.unmount());supabase.rpc=reviewOldRpc;supabase.auth.getUser=oldGetUser;supabase.storage.from=oldStorageFrom;}

for(const template of Object.values(CATEGORY_TEMPLATES))for(const service of template.services){const drafts=reviewTemplates(service.name);assert.equal(drafts.length,5);assert.equal(new Set(drafts.map(d=>d.id)).size,5);assert.ok(drafts.every(d=>d.text.includes(service.name)&&d.text.length<=2000));}
assert.deepEqual(reviewTemplates(''),[]);console.log('PASS: every service in all 14 templates has five editable review drafts; template/service changes preserve the rating and manual text.');

// Owner CRUD and public rendering share the same catalogue in every theme.
const customService:SalonService={clinicServiceApproved:true,clinicPublicationStatus:'published' as const,clinicFeeStatus:'verified' as const,clinicPriceVerified:true,id:'custom-ritual',name:'Owner Signature Ritual',description:'A completely custom service description.',category:'My custom category',price:1250.5,durationMinutes:55,icon:'spa',origin:'custom',showDuration:false};
for(const template of Object.values(CATEGORY_TEMPLATES)){
 const profile={...INITIAL_SALON_PROFILE,businessType:template.id,serviceCatalogueInitialized:true};
 const html=renderToStaticMarkup(<CustomerSalonWebsite profile={profile} services={[customService]} stylists={[]} onAddAppointment={async apt=>apt}/>);
 assert.ok(html.includes(template.id==='skincare_clinic'?'dc-directory-item':'sf-service-row'));assert.ok(html.includes(customService.name));assert.ok(html.includes(customService.description));assert.ok(html.includes(customService.category));assert.ok(html.includes('₹1,250.5'));assert.ok(!html.includes('55 min'));
 const normalized=normalizeWorkspace(JSON.parse(JSON.stringify({profile,services:[customService]})));
 assert.deepEqual(normalized.services,[customService]);
 const switched=servicesForTemplate(normalized.services,normalized.profile,template);assert.deepEqual(switched,[customService]);
 assert.deepEqual(servicesForTemplate([],profile,template),[],'An intentionally empty catalogue must stay empty');
 const first=CATEGORY_TEMPLATES.hair_salon;
 const seeded=servicesForTemplate([],{...INITIAL_SALON_PROFILE,serviceCatalogueInitialized:false},first);
 assert.ok(seeded.every(service=>service.origin==='template'));
 if(template.id!==first.id){
  const next=servicesForTemplate([...seeded,customService],{...INITIAL_SALON_PROFILE,businessType:first.id,serviceCatalogueInitialized:true},template);
  assert.equal(next[0],customService);assert.deepEqual(next.slice(1).map(service=>service.id),template.services.map(service=>service.id));
 }
 const changed={...first.services[0],price:first.services[0].price+1};assert.equal(serviceOrigin(changed),'custom');
}
assert.ok(serviceValidation({...customService,price:-1}));assert.ok(serviceValidation({...customService,price:1.001}));assert.ok(serviceValidation({...customService,durationMinutes:1.5}));assert.ok(serviceValidation({...customService,category:''}));
let editedMenu:SalonService[]=[];let serviceEditor:any;
function ServiceEditorFixture(){const [menu,setMenu]=useState<SalonService[]>([]);editedMenu=menu;return <ServiceManagement services={menu} setServices={setMenu} profile={INITIAL_SALON_PROFILE} primaryAccentColor="#334155"/>;}
await act(async()=>{serviceEditor=create(<ServiceEditorFixture/>);});
const servicePhotoAuth=supabase.auth.getUser,servicePhotoStorage=supabase.storage.from;
const serviceUploads:{path:string;file:Blob}[]=[],discardedServicePhotos:string[]=[];
(supabase.auth as any).getUser=async()=>({data:{user:{id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'}},error:null});
(supabase.storage as any).from=()=>({upload:async(path:string,file:Blob)=>{serviceUploads.push({path,file});return {error:null};},getPublicUrl:(path:string)=>({data:{publicUrl:`https://zilwgiuiygqqardzutxi.supabase.co/storage/v1/object/public/studioflow-media/${path}`}}),remove:async(paths:string[])=>{discardedServicePhotos.push(...paths);return {error:null};}});
const editorButton=(name:string)=>serviceEditor.root.findAll(n=>n.type==='button'&&demoText(n).trim()===name)[0];
await act(async()=>editorButton('Add service').props.onClick());
const serviceDialog=()=>serviceEditor.root.findByProps({role:'dialog'});
const inputService=(index:number,value:string)=>serviceDialog().findAllByType('input')[index].props.onChange({target:{value}});
const chosenStarter=CATEGORY_TEMPLATES[INITIAL_SALON_PROFILE.businessType].services[0];
await act(async()=>serviceDialog().findByProps({'aria-label':'Service name'}).props.onChange({target:{value:chosenStarter.name}}));
const chosenDescription=serviceDialog().findAllByType('input').find(n=>n.props.type==='radio')!.props.value;
const addNumber=(index:number,value:string)=>serviceDialog().findAllByType('input').filter(n=>n.props.type==='number')[index].props.onChange({target:{value}});
await act(async()=>{serviceDialog().findAllByType('input').find(n=>n.props.type==='radio')!.props.onChange();addNumber(0,'-1');addNumber(1,'55');});
await act(async()=>serviceDialog().findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(editedMenu.length,0);assert.ok(serviceEditor.root.findByProps({role:'alert'}));
await act(async()=>addNumber(0,'1250.50'));
const pickServicePhoto=async(file:File)=>{await act(async()=>{serviceDialog().findByProps({'aria-label':'Upload service image'}).props.onChange({target:{files:[file],value:'photo'}});await new Promise(resolve=>setTimeout(resolve,30));});};
await pickServicePhoto(new File([new Uint8Array(4)],'large-service.jpg',{type:'image/jpeg'}));
assert.ok(canvasSizes.some(([width,height])=>width===1200&&height===900),'Service upload must resize the long edge to 1200px');
assert.equal(serviceUploads.length,1);assert.ok(serviceUploads[0].path.startsWith('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/services/'));assert.ok(serviceUploads[0].file.size<=2*1024*1024);
assert.equal(serviceDialog().findAllByProps({alt:'Service photo preview'}).length,1,'Uploaded photo must preview before saving');
await act(async()=>serviceDialog().findByType('form').props.onSubmit({preventDefault(){}}));
assert.equal(editedMenu.length,1);assert.equal(editedMenu[0].price,1250.5);assert.equal(editedMenu[0].category,chosenStarter.category);assert.equal(editedMenu[0].description,chosenDescription);assert.equal(editedMenu[0].origin,'custom');const savedServiceId=editedMenu[0].id;
assert.equal(editedMenu[0].imagePath,serviceUploads[0].path);assert.ok(editedMenu[0].imageUrl?.endsWith(serviceUploads[0].path));
const initialServicePhoto=editedMenu[0].imageUrl;
for(const template of Object.values(CATEGORY_TEMPLATES)){
 const saved=normalizeWorkspace({profile:{...INITIAL_SALON_PROFILE,businessType:template.id,serviceCatalogueInitialized:true},services:editedMenu});
 const menu=servicesForTemplate(saved.services,saved.profile,template);
 assert.equal(menu[0].imageUrl,initialServicePhoto);assert.equal(menu[0].imagePath,serviceUploads[0].path);
 const html=renderToStaticMarkup(<CustomerSalonWebsite profile={saved.profile} services={template.id==='skincare_clinic'?menu.map(s=>({...s,clinicServiceApproved:true,clinicPublicationStatus:'published' as const,clinicFeeStatus:'verified' as const,clinicPriceVerified:true})):menu} stylists={[]} onAddAppointment={async apt=>apt}/>);
 assert.ok(html.includes('sf-service-image'));assert.ok(html.includes(initialServicePhoto!));assert.ok(html.includes('width="600" height="400"'));
}
await act(async()=>serviceEditor.root.findByProps({'aria-label':`Edit ${chosenStarter.name}`}).props.onClick());
await pickServicePhoto(new File([new Uint8Array(4)],'replacement.png',{type:'image/png'}));
await act(async()=>{inputService(0,'Updated scalp care');inputService(1,'Updated category');inputService(2,'1499.75');inputService(3,'60');serviceDialog().findAllByType('textarea').find(n=>n.props.maxLength===2000)!.props.onChange({target:{value:'Edited description'}});});
await act(async()=>serviceDialog().findByType('form').props.onSubmit({preventDefault(){}}));
assert.equal(editedMenu[0].id,savedServiceId);assert.equal(editedMenu[0].price,1499.75);assert.equal(editedMenu[0].durationMinutes,60);assert.equal(editedMenu[0].description,'Edited description');assert.notEqual(editedMenu[0].imageUrl,initialServicePhoto);assert.equal(editedMenu[0].imagePath,serviceUploads[1].path);
await act(async()=>serviceEditor.root.findByProps({'aria-label':'Edit Updated scalp care'}).props.onClick());
await act(async()=>editorButton('Remove photo').props.onClick());
await act(async()=>serviceDialog().findByType('form').props.onSubmit({preventDefault(){}}));
assert.equal(editedMenu[0].imageUrl,'');assert.equal(editedMenu[0].imagePath,'');
await act(async()=>serviceEditor.root.findByProps({'aria-label':'Edit Updated scalp care'}).props.onClick());
await pickServicePhoto(new File([new Uint8Array(4)],'cancelled.jpg',{type:'image/jpeg'}));
await act(async()=>editorButton('Cancel').props.onClick());
assert.equal(editedMenu[0].imageUrl,'','Cancelling must not change the saved photo');
assert.ok(discardedServicePhotos.includes(serviceUploads[2].path),'Cancelled unsaved uploads must be cleaned up');
await assert.rejects(()=>uploadServicePhoto(new File(['text'],'wrong.txt',{type:'text/plain'})),/JPG/);
await act(async()=>serviceEditor.root.findByProps({'aria-label':'Remove Updated scalp care'}).props.onClick());
await act(async()=>editorButton('Confirm removal').props.onClick());assert.equal(editedMenu.length,0);await act(async()=>serviceEditor.unmount());(supabase.auth as any).getUser=servicePhotoAuth;(supabase.storage as any).from=servicePhotoStorage;
let wizard:any;await act(async()=>{wizard=create(<OnboardingWizard profile={INITIAL_SALON_PROFILE} setProfile={()=>{}} services={[customService]} setServices={()=>{}} stylists={[]} setStylists={()=>{}} templates={Object.values(CATEGORY_TEMPLATES)} onComplete={()=>{}}/>);});
for(let step=0;step<3;step++)await act(async()=>wizard.root.findAll(n=>n.type==='button'&&demoText(n).includes('Continue'))[0].props.onClick());
assert.equal(wizard.root.findAllByType(ServiceManagement).length,1,'Guided setup must use the complete shared service editor');await act(async()=>wizard.unmount());
console.log('PASS: complete setup service editor add/edit/remove, input validation, stable IDs, reload and all 14 theme switches preserve custom offerings; intentional empty menus remain empty; public menus render saved fields in horizontal rows; service photo resizing, save, replacement, removal, cancel cleanup and all-theme image persistence.');

// Reference design isolation and owner-controlled menus in every template.
for(const template of Object.values(CATEGORY_TEMPLATES)){
 const profile={...INITIAL_SALON_PROFILE,businessType:template.id,subdomain:'nav-studio'};
 const html=renderToStaticMarkup(<CustomerSalonWebsite profile={profile} services={template.id==='skincare_clinic'?template.services.map(s=>({...s,clinicServiceApproved:true,clinicPublicationStatus:'published' as const,clinicFeeStatus:'verified' as const,clinicPriceVerified:true})):template.services} stylists={[]} onAddAppointment={async apt=>apt}/>);
 assert.equal(html.includes('sf-barber-hero'),template.id==='barber','Reference barber hero must stay isolated');
 if(template.id==='skincare_clinic'){
  const nav=html.match(/<nav class="dc-desktop-nav"[\s\S]*?<\/nav>/)?.[0]||'';
  for(const id of ['home','about','treatments','technology','results','contact']){assert.ok(nav.includes(`href="#${id}"`));assert.ok(html.includes(`id="${id}"`));}
  continue;
 }
 const nav=template.id==='hair_spa'?(html.match(/<nav class="kp-desktop-nav"[\s\S]*?<\/nav>/)?.[0]||''):template.id==='makeup_studio'?(html.match(/<nav class="vn-desktop-nav"[\s\S]*?<\/nav>/)?.[0]||''):template.id==='massage_wellness'?(html.match(/<nav class="bt-desktop-nav"[\s\S]*?<\/nav>/)?.[0]||''):template.id==='hair_coloring'?(html.match(/<nav[^>]*aria-label="Website navigation"[\s\S]*?<\/nav>/)?.[0]||''):html.match(/<nav class="sf-header-links"[\s\S]*?<\/nav>/)![0];
 if(template.id==='hair_spa'){for(const label of ['Our Philosophy','Treatments','Scalp Care','The Sanctuary','Gallery','Contact'])assert.ok(nav.includes(label),`${template.id}: missing editorial link ${label}`);for(const href of ['#philosophy','#treatments','#journey','#sanctuary','#gallery','#contact'])assert.ok(html.includes(`href="${href}"`),`${template.id}: broken anchor ${href}`);assert.ok(html.includes('id="sanctuary"')&&html.includes('id="gallery"'),'the sanctuary story and the gallery are two resolving sections');}
 else if(template.id==='makeup_studio'){for(const label of ['Home','Services','Academy','Portfolio','Reviews','Contact'])assert.ok(nav.includes(label),`${template.id}: missing Vogue Noir link ${label}`);for(const href of ['#home','#services','#academy','#portfolio','#reviews','#contact']){assert.ok(html.includes(`href="${href}"`),`${template.id}: broken anchor ${href}`);assert.ok(html.includes(`id="${href.slice(1)}"`),`${template.id}: missing section ${href}`);}}
 else if(template.id==='massage_wellness'){for(const label of ['Home','About','Massages','Palace Collection','Packages','Gallery','Team','Reviews','Contact'])assert.ok(nav.includes(label),`${template.id}: missing Bodhi Tree link ${label}`);assert.ok(!nav.includes('href="#"'),'Bodhi Tree page navigation uses working buttons, never dead anchors');}
 else if(template.id==='hair_coloring'){for(const label of ['Services','Shades','Results','Packages','Experts','Gallery','Reviews','FAQ'])assert.ok(nav.includes(label),`${template.id}: missing Prism & Chroma link ${label}`);for(const href of ['#pc-services','#pc-shades','#pc-results','#pc-packages','#pc-team','#pc-gallery','#pc-reviews','#pc-faq']){assert.ok(html.includes(`href="${href}"`),`${template.id}: broken anchor ${href}`);assert.ok(html.includes(`id="${href.slice(1)}"`),`${template.id}: missing section ${href}`);}assert.ok(!nav.includes('href="#"'),'Prism & Chroma navigation uses working anchors, never dead links');}
 else{for(const [,label] of HEADER_LINKS)assert.ok(nav.includes(label),`${template.id}: missing header link ${label}`);for(const link of headerLinks(profile))if(link.href.startsWith('#'))assert.ok(html.includes(`id="${link.href.slice(1)}"`),`${template.id}: broken anchor ${link.href}`);}
 const hidden={...profile,websiteSections:{gallery:false,packages:false,about:false}};
 assert.ok(headerLinks(hidden).every(link=>!['gallery','packages','about'].includes(link.id)));
 const order=HEADER_LINKS.slice().reverse().map(([id])=>({id,enabled:id!=='services'}));
 const saved=normalizeWorkspace(JSON.parse(JSON.stringify({profile:{...profile,headerNavigation:order},services:template.services})));
 assert.deepEqual(saved.profile.headerNavigation,order);assert.deepEqual(headerSettings(applyTemplateDesign(saved.profile,template)),order);
 assert.deepEqual(headerLinks(saved.profile).map(link=>link.id),order.filter(link=>link.enabled).map(link=>link.id));
}
let savedHeaderProfile:any;let menuManager:any;
function HeaderSettingsFixture(){const [profile,setProfile]=useState(INITIAL_SALON_PROFILE);savedHeaderProfile=profile;return <HeaderNavigationManager profile={profile} setProfile={setProfile}/>;}
await act(async()=>{menuManager=create(<HeaderSettingsFixture/>);});
await act(async()=>menuManager.root.findByProps({'aria-label':'Move Services up'}).props.onClick());assert.equal(headerSettings(savedHeaderProfile)[0].id,'services');
await act(async()=>menuManager.root.findAllByType('input')[0].props.onChange({target:{checked:false}}));assert.ok(!headerLinks(savedHeaderProfile).some(link=>link.id==='services'));
await act(async()=>menuManager.unmount());
let headerView:any;const scrollCalls:any[]=[];const headerKeys=new Map<string,any>();
const headerDoc:any={body:{style:{overflow:''}},defaultView:{matchMedia:()=>({matches:false})},getElementById:(id:string)=>({scrollIntoView:(options:any)=>scrollCalls.push({id,...options})}),addEventListener:(name:string,callback:any)=>headerKeys.set(name,callback),removeEventListener:(name:string)=>headerKeys.delete(name)};
await act(async()=>{headerView=create(<CustomerWebsiteHeader profile={{...INITIAL_SALON_PROFILE,subdomain:'nav-studio'}} onAccount={()=>{}}/>,{createNodeMock:element=>element.type==='header'?{ownerDocument:headerDoc,closest:()=>null,getBoundingClientRect:()=>({height:72})}:element.props.role==='dialog'?{querySelector:()=>({focus(){}}),querySelectorAll:()=>[]}:element.type==='button'?{focus(){}}:null});});
const openHeader=()=>headerView.root.findByProps({'aria-label':'Open website menu'}).props.onClick();
for(const link of headerLinks({...INITIAL_SALON_PROFILE,subdomain:'nav-studio'})){
 await act(async()=>openHeader());assert.equal(headerDoc.body.style.overflow,'hidden');
 const nav=headerView.root.findByProps({'aria-label':'Mobile website navigation'});
 assert.equal(nav.findAllByType('a').length,8);assert.ok(nav.findByProps({href:'/?app=1&install=1'}));
 await act(async()=>nav.findByProps({href:link.href}).props.onClick({preventDefault(){}}));
 assert.equal(headerView.root.findAllByProps({role:'dialog'}).length,0,'Selecting any mobile menu link must close the drawer');assert.equal(headerDoc.body.style.overflow,'');
}
assert.equal(scrollCalls.length,6);assert.ok(scrollCalls.every(call=>call.behavior==='smooth'));
const mobileTabs=headerView.root.findByProps({'aria-label':'Mobile quick navigation'});
assert.deepEqual(mobileTabs.findAllByType('a').map(node=>node.props['aria-label']),['Home','Services','Gallery','My Bookings']);
await act(async()=>mobileTabs.findByProps({'aria-label':'Services'}).props.onClick({preventDefault(){}}));
assert.equal(scrollCalls.at(-1).id,'services-section');assert.equal(headerView.root.findByProps({'aria-label':'Mobile quick navigation'}).findByProps({'aria-label':'Services'}).props['aria-current'],'location');
assert.equal(mobileTabs.findByProps({'aria-label':'My Bookings'}).props.href,'/?customer=1&return=nav-studio');

await act(async()=>openHeader());await act(async()=>headerKeys.get('keydown')({key:'Escape',preventDefault(){}}));assert.equal(headerView.root.findAllByProps({role:'dialog'}).length,0);
await act(async()=>headerView.unmount());
console.log('PASS: barber reference design is isolated; all seven links reach real destinations in 14 themes; dashboard enable/reorder survives normalization/theme switches; mobile selections and Escape close drawer, smooth scrolling and body lock cleanup pass.');

// The marquee is driven by native CSS animation, independent of scrollLeft rounding.
const listeners=new Map<string,Set<(event:any)=>void>>();
(globalThis as any).document.addEventListener=(type:string,callback:any)=>{if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type)!.add(callback);};
(globalThis as any).document.removeEventListener=(type:string,callback:any)=>listeners.get(type)?.delete(callback);
let carousel:any;
const containerNode={contains:(target:any)=>!!target?.inside};
await act(async()=>{carousel=create(<ReviewCarousel items={tenDemoTestimonials('hair_salon')}/>,{createNodeMock:element=>element.props.className==='sf-review-carousel-section'?containerNode:null});});
const state=()=>carousel.root.findByProps({className:'sf-review-track'}).props.style.animationPlayState;
assert.equal(state(),'running');assert.equal(carousel.root.findByProps({className:'sf-review-track'}).props.style.animationDuration,'300s');
const container=carousel.root.findByProps({className:'sf-review-carousel-section'});
assert.equal(carousel.root.findAll(n=>n.type==='button'&&/Play|Pause|Previous reviews|Next reviews|automatic review scroll/.test(demoText(n)+(n.props['aria-label']||''))).length,0);
assert.equal(carousel.root.findAll(n=>n.type==='article').length,20);
await act(async()=>container.props.onMouseEnter());assert.equal(state(),'paused');
await act(async()=>container.props.onMouseLeave());assert.equal(state(),'running');
await act(async()=>container.props.onClick());assert.equal(state(),'paused');
await act(async()=>container.props.onMouseLeave());assert.equal(state(),'running');
await act(async()=>container.props.onTouchStart());assert.equal(state(),'paused');
await act(async()=>{for(const callback of listeners.get('pointerdown')||[])callback({target:{inside:false}});});assert.equal(state(),'running');
await act(async()=>container.props.onFocusCapture());assert.equal(state(),'paused');
await act(async()=>container.props.onBlurCapture({currentTarget:{contains:()=>false},relatedTarget:null}));assert.equal(state(),'running');
await act(async()=>carousel.update(<ReviewCarousel items={tenDemoTestimonials('hair_salon')} formOpen/>));assert.equal(state(),'paused');
await act(async()=>carousel.update(<ReviewCarousel items={tenDemoTestimonials('hair_salon')}/>));assert.equal(state(),'running');
assert.equal(carousel.root.findAll(n=>n.type==='article'&&!n.props['aria-hidden']).length,10);
await act(async()=>carousel.unmount());
const {readFileSync}=await import('node:fs');
const carouselCss=readFileSync('src/index.css','utf8');
assert.ok(carouselCss.includes('@keyframes sf-review-marquee'));
assert.ok(carouselCss.includes('calc(-50% - var(--sf-review-gap,16px)/2)'));
assert.ok(carouselCss.includes('animation-timing-function:linear; animation-iteration-count:infinite'));
assert.ok(carouselCss.includes('.sf-review-carousel-section:hover .sf-review-track { animation-play-state:paused!important; }'));
console.log('PASS: CSS marquee runs without scrollLeft, pauses on hover/click/focus/form, resumes on leave/click-away/blur, and loops by the exact duplicated row width.');

for(const count of [1,3,5,7,10,12]){
 const items=Array.from({length:count},(_,i)=>({...CATEGORY_STANDARDIZED_DATA.hair_salon.reviews[0],id:`slot-${i}`}));
 const slots=reviewMarqueeItems(items),size=Math.min(count,10);
 assert.equal(slots.length,size*2);
 assert.deepEqual(slots.slice(0,size).map(s=>s.review.id),slots.slice(size).map(s=>s.review.id));
 assert.equal(slots.filter(s=>!s.clone).length,size);
}
for(const template of Object.values(CATEGORY_TEMPLATES)){
 const samples=tenDemoTestimonials(template.id);
 assert.equal(samples.length,10);
 assert.equal(new Set(samples.map(r=>r.name)).size,10);
 assert.equal(new Set(samples.map(r=>r.comment)).size,10);
 assert.ok(samples.every(r=>r.isDemo&&!r.verified&&template.services.some(s=>s.name===r.serviceName)));
 const real={...samples[0],id:'real',name:'Actual customer',comment:'A real customer story kept unchanged.',isDemo:false,isCustomer:true};
 const mixed=tenClientExperiences(template.id,[real,real,...samples]);
 assert.equal(mixed.length,10);assert.equal(mixed[0],real);
 assert.equal(new Set(mixed.map(r=>r.comment)).size,10);
}
console.log('PASS: ten distinct category-specific testimonials, real reviews preserved, hidden seamless loop copies, slow motion, no playback or navigation buttons, immediate hover/click pause and leave/click-away resume.');

// Customer bookings stay in the storefront and are scoped to the authenticated customer.
const bookingsOriginal={from:supabase.from,channel:supabase.channel,removeChannel:supabase.removeChannel,rpc:supabase.rpc,getSession:supabase.auth.getSession,onAuthStateChange:supabase.auth.onAuthStateChange};
const customerSession:any={user:{id:'customer-a',email:'customer-a@example.test'}};
let authListener:any;const bookingFilters:any[]=[];let bookingsResponse:any={data:[{id:'own-booking',status:'confirmed',payload:{serviceName:'My haircut',date:'2026-10-20',time:'10:00',stylistName:'My stylist',servicePrice:500}}],error:null};
(supabase as any).from=(table:string)=>({select:()=>({eq:(column:string,id:string)=>{bookingFilters.push({table,column,id});return {order:async()=>bookingsResponse};}})});
(supabase as any).channel=()=>({on:()=>({subscribe:()=>({})})});(supabase as any).removeChannel=async()=>{};
(supabase as any).rpc=async()=>({data:{reviews:[],canReview:true},error:null});
(supabase.auth as any).getSession=async()=>({data:{session:customerSession},error:null});
(supabase.auth as any).onAuthStateChange=(_callback:any)=>{authListener=_callback;return {data:{subscription:{unsubscribe(){}}}};};
try {
 for(const template of Object.values(CATEGORY_TEMPLATES)){
  let site:any;let prevented=false;
  await act(async()=>{site=create(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:template.id,subdomain:'nav-studio'}} services={template.services} stylists={[]} onAddAppointment={async apt=>apt}/>);});
  const link=site.root.findByProps({'aria-label':'Website navigation'}).findByProps({href:'/?customer=1&return=nav-studio'});
  await act(async()=>link.props.onClick({preventDefault(){prevented=true;}}));
  assert.ok(prevented,template.id+': My Bookings must prevent redirect');
  assert.equal(site.root.findAllByType(SalonBookingsDialog).length,1);
  assert.ok(demoText(site.root.findByProps({role:'dialog'})).includes('My haircut'));
  assert.equal(site.root.findByType(CustomerBookings).props.embedded,true);
  await act(async()=>site.root.findByProps({'aria-label':'Close my bookings'}).props.onClick());
  assert.equal(site.root.findAllByType(SalonBookingsDialog).length,0);
  await act(async()=>site.unmount());
 }
 let opens=0,header:any;
 await act(async()=>{header=create(<CustomerWebsiteHeader profile={{...INITIAL_SALON_PROFILE,subdomain:'nav-studio'}} onAccount={()=>{}} onMyBookings={()=>opens++}/>);});
 await act(async()=>header.root.findByProps({'aria-label':'Open website menu'}).props.onClick());
 await act(async()=>header.root.findByProps({'aria-label':'Mobile website navigation'}).findByProps({href:'/?customer=1&return=nav-studio'}).props.onClick({preventDefault(){}}));
 assert.equal(opens,1);assert.equal(header.root.findAllByProps({role:'dialog'}).length,0);
 await act(async()=>header.root.findByProps({'aria-label':'Mobile quick navigation'}).findByProps({'aria-label':'My Bookings'}).props.onClick({preventDefault(){}}));assert.equal(opens,2);
 await act(async()=>header.unmount());
 let panel:any;
 (supabase.auth as any).getSession=async()=>({data:{session:null},error:null});
 await act(async()=>{panel=create(<SalonBookingsDialog profile={INITIAL_SALON_PROFILE} onClose={()=>{}}/>);});
 assert.equal(panel.root.findAllByType(CustomerBookings).length,0);assert.equal(panel.root.findByType(AuthPage).props.customerMode,true);
 await act(async()=>authListener('SIGNED_IN',customerSession));assert.ok(demoText(panel.root).includes('My haircut'));
 await act(async()=>authListener('SIGNED_OUT',null));assert.equal(panel.root.findAllByType(CustomerBookings).length,0);assert.ok(!demoText(panel.root).includes('My haircut'));
 bookingsResponse={data:[],error:null};
 await act(async()=>authListener('SIGNED_IN',{user:{id:'customer-b',email:'b@example.test'}}));
 assert.ok(demoText(panel.root).includes('You have no bookings yet.'));assert.ok(!demoText(panel.root).includes('My haircut'));
 assert.ok(bookingFilters.every(filter=>filter.table==='studioflow_bookings'&&filter.column==='customer_id'));
 assert.equal(bookingFilters.at(-1).id,'customer-b');
 await act(async()=>panel.unmount());
} finally {
 Object.assign(supabase,{from:bookingsOriginal.from,channel:bookingsOriginal.channel,removeChannel:bookingsOriginal.removeChannel,rpc:bookingsOriginal.rpc});
 Object.assign(supabase.auth,{getSession:bookingsOriginal.getSession,onAuthStateChange:bookingsOriginal.onAuthStateChange});
}
console.log('PASS: all 14 storefronts open themed customer bookings without redirect; mobile drawer closes and bottom bookings tab works; customer login stays in-panel, queries use authenticated customer_id, sign-out clears records and an account without bookings sees an honest empty state.');

// Reel posters remain visible without an embed; only the hovered card starts playback.
const reelVideos=showcaseVideos({...INITIAL_SALON_PROFILE,socialVideos:[]});let reels:any;
await act(async()=>{reels=create(<FeaturedReels videos={reelVideos} salonName="Actual salon" fallbackImage="https://example.com/cover.jpg"/>);});
assert.equal(reels.root.findAllByType('iframe').length,0);assert.equal(reels.root.findAllByType('img').length,5);
const reelCards=()=>reels.root.findAll(n=>n.type==='article'&&n.props.className==='video-card');
await act(async()=>reelCards()[0].props.onMouseEnter());
let player=reels.root.findByType('iframe');assert.ok(player.props.src.includes('autoplay=1&mute=1&playsinline=1'));assert.ok(player.props.allow.includes('autoplay'));
await act(async()=>reelCards()[1].props.onMouseEnter());assert.equal(reels.root.findAllByType('iframe').length,1);assert.ok(reels.root.findByType('iframe').props.src.includes(reelVideos[1].videoId));
await act(async()=>reelCards()[1].props.onMouseLeave());assert.equal(reels.root.findAllByType('iframe').length,0);
const sourceLink=reels.root.findAll(n=>n.type==='a'&&n.props.className==='sf-reel-media')[0];assert.equal(sourceLink.props.href,reelVideos[0].youtubeUrl);assert.equal(sourceLink.props.target,'_blank');
await act(async()=>reels.root.findAllByType('img')[0].props.onError());assert.equal(reels.root.findAllByType('img')[0].props.src,'https://example.com/cover.jpg');
const insta={...reelVideos[0],id:'insta',youtubeUrl:'https://www.instagram.com/reel/OwnerReel_123/',videoId:'OwnerReel_123',thumbnailUrl:'https://example.com/reel.jpg',previewVideoUrl:'https://example.com/reel.mp4',isDemo:false};
await act(async()=>reels.update(<FeaturedReels videos={[insta]} salonName="Actual salon" fallbackImage="https://example.com/cover.jpg"/>));
await act(async()=>reelCards()[0].props.onMouseEnter());
const nativePlayer=reels.root.findByType('video');assert.ok(nativePlayer.props.muted&&nativePlayer.props.autoPlay&&nativePlayer.props.playsInline);assert.equal(reels.root.findAllByType('iframe').length,0);
assert.equal(reels.root.findAll(n=>n.type==='a'&&n.props.className==='sf-reel-media')[0].props.href,insta.youtubeUrl);
await act(async()=>nativePlayer.props.onError());assert.equal(reels.root.findAllByType('video').length,0);assert.ok(reels.root.findAllByType('img').length);
await act(async()=>reels.unmount());
assert.equal(socialVideoSource('javascript:alert(1)'),null);assert.equal(socialVideoSource('https://youtube.com.evil.test/watch?v=abcdefghijk'),null);assert.equal(socialVideoSource('https://www.youtube.com/shorts/abcdefghijk')?.platform,'YouTube');assert.equal(socialVideoSource(insta.youtubeUrl)?.platform,'Instagram');
console.log('PASS: portrait reel posters across 14 templates, one muted autoplay hover preview, stop on leave, source navigation, cover fallback, Instagram/native previews and safe source URL validation.');

// Setup accepts Instagram links plus owner-provided poster/video previews, kept on theme switch.
await act(async()=>{demoEditor=create(<DemoHarness/>);});
await act(async()=>demoButton('MANAGE / REPLACE').props.onClick());
await act(async()=>demoButton('Replace video / Edit URL & title').props.onClick());
await act(async()=>{
 demoEditor.root.findByProps({placeholder:'https://youtube.com/shorts/... or https://instagram.com/reel/...'}).props.onChange({target:{value:insta.youtubeUrl}});
 demoEditor.root.findByProps({placeholder:'https://your-site.com/reel-cover.jpg'}).props.onChange({target:{value:insta.thumbnailUrl}});
 demoEditor.root.findByProps({placeholder:'https://your-site.com/reel-preview.mp4'}).props.onChange({target:{value:insta.previewVideoUrl}});
});
await act(async()=>demoEditor.root.findAll((node:any)=>node.type==='form'&&node.props.onSubmit)[0].props.onSubmit({preventDefault(){}}));
assert.equal(demoProfile.socialVideos[0].youtubeUrl,insta.youtubeUrl);assert.equal(demoProfile.socialVideos[0].previewVideoUrl,insta.previewVideoUrl);assert.equal(demoProfile.socialVideos[0].thumbnailUrl,insta.thumbnailUrl);
for(const template of Object.values(CATEGORY_TEMPLATES)){
 const saved=normalizeWorkspace(JSON.parse(JSON.stringify({profile:applyTemplateDesign(demoProfile,template)})));
 assert.equal(saved.profile.socialVideos[0].previewVideoUrl,insta.previewVideoUrl);assert.equal(saved.profile.socialVideos[0].youtubeUrl,insta.youtubeUrl);
}
await act(async()=>demoEditor.unmount());
assert.ok(carouselCss.includes('aspect-ratio:9/16'));assert.ok(carouselCss.includes('flex:0 0 240px'));assert.ok(carouselCss.includes('flex-basis:210px'));
console.log('PASS: Instagram link, cover and playable preview persist through owner setup, JSON reload and all 14 theme switches; portrait responsive dimensions are configured.');

// Full videos must not enter the reel feed even if someone labels them SHORT.
for(const url of ['https://www.youtube.com/watch?v=abcdefghijk','https://youtu.be/abcdefghijk','https://www.youtube.com/embed/abcdefghijk','https://www.instagram.com/p/NotAReel/','https://www.instagram.com/tv/NotAReel/'])assert.equal(shortVideoSource(url),null);
assert.ok(shortVideoSource('https://www.youtube.com/shorts/abcdefghijk'));
assert.ok(shortVideoSource('https://www.instagram.com/reel/MyReel_123/'));
const ownerFull={...reelVideos[0],id:'owner-full',isDemo:false,isOwnerVideo:true,title:'Owner full video must stay out',youtubeUrl:'https://www.youtube.com/watch?v=abcdefghijk',videoId:'abcdefghijk',categoryTag:'SHORT' as const};
assert.equal(reelSource(ownerFull),null);
for(const template of Object.values(CATEGORY_TEMPLATES)){
 const legacy={...ownerFull,id:`demo-${template.id}-1`,videoId:'ulbjW3JyK8E',youtubeUrl:'https://www.youtube.com/watch?v=ulbjW3JyK8E',isDemo:true,isOwnerVideo:false};
 const profile={...INITIAL_SALON_PROFILE,businessType:template.id,socialVideos:[legacy,ownerFull],demoVideosInitialized:true};
 const migrated=showcaseVideos(profile);
 assert.equal(migrated.length,2);assert.equal(migrated[0].id,legacy.id);assert.ok(reelSource(migrated[0]));assert.equal(migrated[1],ownerFull);
 const html=renderToStaticMarkup(<WebsiteSections profile={profile} services={[]} onBook={()=>{}} readOnly/>);
 assert.ok(!html.includes(ownerFull.title));assert.ok(!html.includes('ulbjW3JyK8E'));assert.ok(html.includes('/shorts/'));
 const demos=showcaseVideos({...profile,socialVideos:[],demoVideosInitialized:false});
 assert.equal(demos.length,5);assert.ok(demos.every(video=>video.categoryTag==='SHORT'&&!!reelSource(video)));
}
await act(async()=>{demoEditor=create(<DemoHarness/>);});
await act(async()=>demoButton('MANAGE / REPLACE').props.onClick());await act(async()=>demoButton('Replace video / Edit URL & title').props.onClick());
await act(async()=>demoEditor.root.findByProps({placeholder:'https://youtube.com/shorts/... or https://instagram.com/reel/...'}).props.onChange({target:{value:ownerFull.youtubeUrl}}));
const beforeRejected=demoProfile.socialVideos;
await act(async()=>demoEditor.root.findAll((node:any)=>node.type==='form'&&node.props.onSubmit)[0].props.onSubmit({preventDefault(){}}));
assert.equal(demoProfile.socialVideos,beforeRejected);assert.ok(demoText(demoEditor.root).includes('Full-length videos are not supported'));
await act(async()=>demoEditor.unmount());
console.log('PASS: five Shorts per theme, legacy full demo replacement without resurrecting deletions, owner full videos preserved but hidden, and owner setup rejects full-video URLs rather than relabelling them as Shorts.');

for(const template of Object.values(CATEGORY_TEMPLATES)){const profile={...INITIAL_SALON_PROFILE,businessType:template.id};const html=renderToStaticMarkup(<SalonWebsitePreview profile={profile} services={[]} stylists={[]} gallery={[]} readOnly onAddAppointment={async apt=>apt}/>);for(const label of ['Nexora app announcement','Install and share Nexora customer app','/promo/nexora-customer-app-ad.png','Share App &amp; Poster','Download ad image','/?app=1&amp;install=1'])assert.ok(html.includes(label),`${template.id}: missing app campaign ${label}`);}
console.log('PASS: all 14 templates include app announcement, install guide route, shareable poster, image download and mobile app menu.');

import React, {useState} from 'react';
import {act,create} from 'react-test-renderer';
import {PromoStudio} from '../src/components/PromoStudio';
import {SocialConnectivityStep} from '../src/components/SocialConnectivityStep';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {SalonWebsitePreview} from '../src/components/SalonWebsitePreview';
import {Header} from '../src/components/Header';
import {socialUrl} from '../src/lib/websiteContent';
(globalThis as any).location={origin:'https://studioflow.test',search:''};
const campaign={enabled:true,selectedServiceId:'s1',campaignTheme:'flash_discount',discountPercent:20,customOfferText:'Owner Special',promoCode:'OWN20',headline:'Saved owner campaign',subtext:'Updated dashboard copy',aspectRatio:'1:1',aesthetic:'luxury_gold',imageUrl:'https://example.com/promo.jpg',customPrompt:''};
for(const template of Object.values(CATEGORY_TEMPLATES)) {
 const profile={...INITIAL_SALON_PROFILE,businessType:template.id,businessName:'Actual Salon',promoCampaign:campaign,socialVideos:[{id:'vid',youtubeUrl:'https://youtu.be/abcdefghijk',videoId:'abcdefghijk',title:'Saved owner reel',categoryTag:'SHORT' as const,isOwnerVideo:true}],instagramHandle:'https://instagram.com/actualsalon',websiteTestimonials:[],sectionHeadings:{videosTitle:'My updated reels'}};
 const props={profile,services:[],stylists:[],gallery:[],readOnly:true,policies:{cancellation:'Updated cancellation terms'}};
 const html=renderToStaticMarkup(<SalonWebsitePreview {...props}/>);
 for(const text of ['Saved owner campaign','Saved owner reel','My updated reels','Updated cancellation terms','https://instagram.com/actualsalon']) assert.ok(html.includes(text),`${template.id}: ${text} missing`);
 assert.ok(!html.includes('Infinity'),`${template.id}: empty service price`);
 const hidden=renderToStaticMarkup(<SalonWebsitePreview {...props} profile={{...profile,websiteSections:{promo:false,videos:false,social:false}}}/>);
 assert.ok(!hidden.includes('Saved owner campaign')&&!hidden.includes('Saved owner reel'),`${template.id}: hidden sections still visible`);
}
assert.equal(socialUrl('javascript:alert(1)','instagram'),'');
assert.equal(socialUrl('@mysalon','instagram'),'https://instagram.com/mysalon');
const header=renderToStaticMarkup(<Header currentView="dashboard" setCurrentView={()=>{}} salonName="Actual Salon"/>);
assert.ok(!header.includes('SaaS Dashboard'));
assert.equal((header.match(/\bDashboard\b/g)||[]).length,2,'One desktop and one mobile navigation dashboard');
console.log('PASS: all 14 full templates render saved promo, video, social links and policies; toggles hide content; empty services are safe; duplicate dashboard action removed.');

(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
let savedProfile:any, externalProfileUpdate:any;
function DashboardHarness(){const [profile,setProfile]=useState({...INITIAL_SALON_PROFILE,promoCampaign:campaign,socialVideos:[{id:'v1',videoId:'abcdefghijk',youtubeUrl:'https://youtu.be/abcdefghijk',title:'Owner reel',categoryTag:'SHORT' as const,isOwnerVideo:true}],instagramHandle:'@oldhandle'});savedProfile=profile;externalProfileUpdate=setProfile;return <><PromoStudio profile={profile} setProfile={setProfile} services={[]}/><SocialConnectivityStep profile={profile} setProfile={setProfile}/></>;}
let editor:any;
await act(async()=>{editor=create(<DashboardHarness/>);});
assert.equal(savedProfile.promoCampaign.headline,'Saved owner campaign','Existing promo copy must survive editor mount');
await act(async()=>{editor.root.findAll(node=>['input','textarea'].includes(node.type)&&node.props.value==='Saved owner campaign')[0].props.onChange({target:{value:'New saved dashboard campaign'}});});
assert.equal(savedProfile.promoCampaign.headline,'New saved dashboard campaign');
await act(async()=>{editor.root.findAll(node=>node.type==='input'&&node.props.value==='@oldhandle')[0].props.onChange({target:{value:'https://instagram.com/newhandle'}});});
assert.equal(savedProfile.instagramHandle,'https://instagram.com/newhandle');assert.equal(savedProfile.socialVideos[0].title,'Owner reel','Social edits must preserve saved videos');
await act(async()=>{externalProfileUpdate(p=>({...p,socialVideos:[]}));});
assert.equal(editor.root.findByType(SocialConnectivityStep).props.profile.socialVideos.length,0);
const persisted=savedProfile;
await act(async()=>{editor.unmount();editor=create(<PromoStudio profile={persisted} setProfile={update=>{savedProfile=typeof update==='function'?update(savedProfile):update;}} services={[]}/>);});
assert.equal(savedProfile.promoCampaign.headline,'New saved dashboard campaign','Promo edits must survive remount');
await act(async()=>{editor.unmount();});
console.log('PASS: promo edits persist, remount preserves custom copy, social links preserve videos, and empty video feeds remain empty.');

// Behavioral storefront guards; no network, payments, or real bookings.
import React from 'react';
import {act,create} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {CustomerSalonWebsite} from '../src/components/CustomerSalonWebsite';
import {CustomerSalon} from '../src/components/customer/Salon';
import {CustomerBookingFlow} from '../src/components/customer/BookingFlow';
import {BookingModal} from '../src/components/BookingModal';
import {parseBookingSlots} from '../src/lib/bookingSlots';
import {PrismOffersLive} from '../src/components/prism-chroma/OffersLive';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {TemplateBookingPreview} from '../src/lib/templateBookingPreview';
import {demoSalonOffers} from '../src/lib/salonOffers';
import {SHRINGAAR_DEFAULT_PACKAGES,resolveShringaarPackages} from '../src/lib/shringaarRoyal';
import {findEligibleServiceForOffer} from '../src/lib/ziyaPromotionsLoyalty';
import {menu} from '../src/components/customer/model';
import {supabase} from '../src/lib/supabase';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const loc:any={origin:'https://studioflow.test',search:'',hash:'',pathname:'/',href:'https://studioflow.test/',assign(){}};
(globalThis as any).location=loc;
(globalThis as any).document={hidden:false,addEventListener(){},removeEventListener(){},querySelector(){return null},getElementById(){return null},body:{style:{}},documentElement:{style:{}}};
(globalThis as any).window={location:loc,scrollY:0,setInterval,clearInterval,setTimeout,clearTimeout,scrollTo(){},addEventListener(){},removeEventListener(){},matchMedia(){return {matches:false,addEventListener(){},removeEventListener(){}}}};
(supabase as any).rpc=async()=>({data:[],error:null});
let writes=0;
(supabase as any).functions.invoke=async()=>{writes++;throw new Error('No remote writes in this test');};
const text=(node:any):string=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(' '):(node?.children||[]).map(text).join(' ');
const buttons=(root:any,label:string)=>root.findAll((node:any)=>node.type==='button'&&text(node).includes(label));
const offerCard=(root:any,title:string)=>root.findAll((node:any)=>node.type==='article'&&node.findAll((child:any)=>child.type==='h4'&&text(child)===title).length>0)[0];
const createSite=async(type:keyof typeof CATEGORY_TEMPLATES,profile:any,services:any[]=CATEGORY_TEMPLATES[type].services)=>{
 let ui:any;const template=CATEGORY_TEMPLATES[type];
 await act(async()=>{ui=create(<TemplateBookingPreview.Provider value><CustomerSalonWebsite readOnly profile={{...INITIAL_SALON_PROFILE,businessName:'Test salon',subdomain:'test-salon',businessType:type,...profile}} services={services} stylists={template.stylists} gallery={[]} onAddAppointment={async()=>{writes++;throw new Error('No bookings in this test');}}/></TemplateBookingPreview.Provider>)});
 return ui;
};
const openModal=(ui:any)=>ui.root.findAllByType(BookingModal).find((node:any)=>node.props.isOpen);

// A missing explicit package link must not be repaired by similar names; older
// unlinked packages may match only an unambiguous exact title.
const pkg=SHRINGAAR_DEFAULT_PACKAGES[0];
const titleMatch={...CATEGORY_TEMPLATES.bridal_lounge.services[0],id:'different',name:pkg.tier};
assert.equal(resolveShringaarPackages([{...pkg,serviceId:'deleted'}],[titleMatch])[0].bookable,false);
assert.equal(resolveShringaarPackages([{...pkg,serviceId:undefined}],[titleMatch])[0].liveServiceId,'different');
assert.equal(resolveShringaarPackages([{...pkg,serviceId:undefined}],[titleMatch,{...titleMatch,id:'duplicate'}])[0].bookable,false);
assert.equal(findEligibleServiceForOffer({applicableServiceIds:['removed'],minBookingAmount:0,couponCode:'X'},[titleMatch]),undefined);
assert.equal(findEligibleServiceForOffer({applicableServiceIds:['different'],minBookingAmount:999999,couponCode:'X'},[titleMatch]),undefined);

// Directory offer actions pick exactly one eligible active service, never an
// unrelated fallback or an automatic bundle; unavailable offers are disabled.
const lash=CATEGORY_TEMPLATES.lash_brow.services;
const offer=demoSalonOffers('lash_brow')[0];
const eligible={...offer,id:'eligible',title:'Eligible offer',applicableServices:[lash[0].id,lash[1].id],validFrom:'',validTo:'',isDemo:false};
const missing={...eligible,id:'missing',title:'Missing offer',applicableServices:['not-in-this-menu']};
const archived={...lash[2],id:'archived-service',status:'archived'};
const salon:any={slug:'directory-test',content:{profile:{...INITIAL_SALON_PROFILE,businessType:'lash_brow',businessName:'Directory Test',promoOffers:[eligible,missing]},services:[lash[0],lash[1],archived],stylists:[],gallery:[]}};
assert.deepEqual(menu(salon).map((service:any)=>service.id),[lash[0].id,lash[1].id]);
const bookings:any[]=[];let directory:any;
await act(async()=>{directory=create(<CustomerSalon salon={salon} salons={[salon]} saved={false} savedSlugs={[]} back={()=>{}} save={()=>{}} open={()=>{}} book={(_salon,ids)=>bookings.push(ids)} signedIn={false} onSignIn={()=>{}}/>)});
await act(async()=>directory.root.findAll((node:any)=>node.type==='button'&&node.props.role==='tab'&&text(node)==='Packages')[0].props.onClick());
const validCard=offerCard(directory.root,'Eligible offer'),missingCard=offerCard(directory.root,'Missing offer');
assert.ok(validCard&&missingCard);
assert.equal(buttons(missingCard,'Offer unavailable online')[0].props.disabled,true);
assert.match(text(missingCard),/No eligible service currently available/);
await act(async()=>buttons(validCard,'Choose an eligible service')[0].props.onClick());
assert.deepEqual(bookings,[[lash[0].id]],'directory passes one eligible ID, not multiple unrelated services');
await act(async()=>directory.unmount());

// Explicit deleted/archived handoffs must not become the first unrelated
// service, either in the directory or after the shared modal's open effect.
await act(async()=>{directory=create(<CustomerBookingFlow salon={salon} initialIds={['archived-service']} session={null} close={()=>{}} onCreated={()=>{}} onConfirmed={()=>{}}/>)});
assert.match(text(directory.toJSON()),/0\s+selected/);
assert.equal(buttons(directory.root,'Continue to Specialist & Slot')[0].props.disabled,true);
await act(async()=>directory.unmount());

// A resumed directory summary must not start a demo write, payment, or even
// sign-in handoff until the restored slot has been checked for this query.
let resolveSlot!:(result:any)=>void;
(supabase as any).rpc=(name:string)=>{
 if(name==='studioflow_public_branches')return Promise.resolve({data:[],error:null});
 if(name==='studioflow_android_slots')return new Promise(resolve=>{resolveSlot=resolve});
 writes++;throw new Error(`Unexpected write RPC: ${name}`);
};
const restoredSlot={time:'11:00',label:'11:00 AM',stylistId:'artist'};
const restoredProps={salon,initialIds:[lash[0].id],initialStylist:'artist',initialDate:'2099-01-01',initialSlot:restoredSlot,initialStage:'summary' as const,session:{user:{id:'customer',email:'guest@example.test',user_metadata:{full_name:'Test Guest'}}} as any,customerProfile:{full_name:'Test Guest',phone:'9876543210'},demo:true,close:()=>{},onCreated:()=>{},onConfirmed:()=>{}};
await act(async()=>{directory=create(<CustomerBookingFlow {...restoredProps}/>)});
assert.equal(buttons(directory.root,'Confirm Demo Booking')[0].props.disabled,true,'restored slot is disabled while its request is pending');
await act(async()=>buttons(directory.root,'Confirm Demo Booking')[0].props.onClick());
assert.equal(writes,0,'even an invoked handler cannot write before revalidation');
await act(async()=>{resolveSlot({data:null,error:{message:'Availability unavailable'}});await Promise.resolve();});
assert.equal(buttons(directory.root,'Confirm Demo Booking')[0].props.disabled,true);
assert.match(text(directory.toJSON()),/Availability unavailable/);
await act(async()=>buttons(directory.root,'Retry slots')[0].props.onClick());
assert.equal(buttons(directory.root,'Confirm Demo Booking')[0].props.disabled,true,'retry remains guarded while loading');
await act(async()=>{resolveSlot({data:[{...restoredSlot,available:true}],error:null});await Promise.resolve();});
assert.equal(buttons(directory.root,'Confirm Demo Booking')[0].props.disabled,false,'the exact matching slot enables the handoff');
await act(async()=>directory.unmount());
await act(async()=>{directory=create(<CustomerBookingFlow {...restoredProps}/>)});
await act(async()=>{resolveSlot({data:[],error:null});await Promise.resolve();});
assert.match(text(directory.toJSON()),/selected slot is no longer available/i,'a stale restored slot returns to selection');
assert.equal(buttons(directory.root,'Confirm Booking')[0].props.disabled,true);
await act(async()=>directory.unmount());

// The merged full-payment checkout must keep the same guard: a live restored
// summary cannot reserve or open checkout while availability is unresolved.
const functionsPrototype=Object.getPrototypeOf(supabase.functions),originalInvoke=functionsPrototype.invoke;
let checkoutReads=0;
functionsPrototype.invoke=async(name:string,options:any)=>{
 assert.equal(name,'studioflow-payments');assert.equal(options.method,'GET');checkoutReads++;
 return{data:{webCheckout:{online:true,venue:false,mode:'test'}},error:null};
};
await act(async()=>{directory=create(<CustomerBookingFlow {...restoredProps} demo={false}/>)});
const livePay=()=>buttons(directory.root,'Pay ₹')[0];
assert.ok(checkoutReads>0);assert.equal(livePay().props.disabled,true);
await act(async()=>livePay().props.onClick());
assert.equal(writes,0,'live checkout handler cannot reserve before slot revalidation');
await act(async()=>{resolveSlot({data:[{...restoredSlot,available:true}],error:null});await Promise.resolve();});
assert.equal(livePay().props.disabled,false,'valid restored slot enables configured checkout');
await act(async()=>directory.unmount());
functionsPrototype.invoke=originalInvoke;
(supabase as any).rpc=async()=>({data:[],error:null});

let invalidModal:any;
const oneStylist={...CATEGORY_TEMPLATES.lash_brow.stylists[0],assignedServices:[],status:'Available' as const};
await act(async()=>{invalidModal=create(<TemplateBookingPreview.Provider value><BookingModal isOpen onClose={()=>{}} profile={{...INITIAL_SALON_PROFILE,businessType:'lash_brow'}} services={[lash[0],archived as any]} stylists={[oneStylist]} initialService={archived as any}/></TemplateBookingPreview.Provider>)});
const serviceChoice=()=>invalidModal.root.findByProps({'aria-label':`Select service ${lash[0].name}`});
assert.equal(serviceChoice().props['aria-checked'],false);
assert.equal(invalidModal.root.findByProps({'data-testid':'booking-next-datetime'}).props.disabled,true);
await act(async()=>serviceChoice().props.onClick());
assert.equal(invalidModal.root.findByProps({'data-testid':'booking-next-datetime'}).props.disabled,false);
await act(async()=>serviceChoice().props.onClick());
assert.equal(invalidModal.root.findByProps({'data-testid':'booking-next-datetime'}).props.disabled,true,'empty preview selection cannot advance');
await act(async()=>invalidModal.unmount());

// Both flows share defensive parsing of live slot rows.
assert.deepEqual(parseBookingSlots([null,{time:'99:00',available:true,stylistId:'s'},{time:'11:00',available:'true',stylistId:'s'},{time:'12:00',available:true},
 {time:'13:00',available:true,stylistId:'s'},{time:'13:30',available:false,stylistId:null}]),[
 {time:'13:00',label:'13:00',available:true,stylistId:'s'},
 {time:'13:30',label:'13:30',available:false,stylistId:null},
]);

// Arch & Flutter offers retain catalogue prices in the booking sheet and do not
// open one at all when their configured service IDs cannot be resolved.
loc.hash='#offers';
let ui=await createSite('lash_brow',{promoOffers:[eligible,missing]},[lash[0],lash[1],archived]);
const missingAction=ui.root.findAll((node:any)=>node.type==='button'&&node.props['aria-label']==='Choose a service for Missing offer')[0];
assert.equal(missingAction.props.disabled,true);
const archAction=ui.root.findAll((node:any)=>node.type==='button'&&node.props['aria-label']==='Choose a service for Eligible offer')[0];
assert.equal(archAction.props.disabled,false);
await act(async()=>archAction.props.onClick());
let modal=openModal(ui);assert.ok(modal);
assert.equal(modal.props.initialService.id,lash[0].id);
assert.equal(modal.props.initialService.price,lash[0].price,'offer cannot silently override catalogue price');
assert.match(modal.props.initialBookingNote,/Eligible offer/);
assert.ok(!modal.props.services.some((service:any)=>service.id==='archived-service'));
await act(async()=>ui.unmount());
loc.hash='#packages';
ui=await createSite('lash_brow',{promoOffers:[]},[lash[0]]);
assert.ok(buttons(ui.root,'Package unavailable online').length>0,'sample packages without live links cannot open a booking');
assert.ok(buttons(ui.root,'Package unavailable online').every((node:any)=>node.props.disabled));
await act(async()=>ui.unmount());loc.hash='';

// A live Prism offer becomes an enquiry link if booking is disabled or its
// service no longer exists, rather than an enabled button that does nothing.
const prismOffer:any={id:'offer',title:'Colour offer',description:'',code:'COLOR',discountPercent:10,flatDiscountInr:null,priceNote:'',serviceId:'pc-s3',imageUrl:'',startsOn:null,endsOn:null};
const prismServices=CATEGORY_TEMPLATES.hair_coloring.services;
await act(async()=>{ui=create(<PrismOffersLive offers={[prismOffer]} services={prismServices} bookingAvailable={false} onBookService={()=>{writes++;}}/>)});
assert.equal(buttons(ui.root,'Book').length,0);
assert.equal(ui.root.findAll((node:any)=>node.type==='a'&&node.props.href==='#pc-contact').length,1);
await act(async()=>ui.unmount());
await act(async()=>{ui=create(<PrismOffersLive offers={[{...prismOffer,serviceId:'removed'}]} services={prismServices} onBookService={()=>{writes++;}}/>)});
assert.equal(ui.root.findAll((node:any)=>node.type==='a'&&node.props.href==='#pc-contact').length,1);
await act(async()=>ui.unmount());

// Prism package and shade actions use explicit links. The care-plan switch may
// not silently drop an extra that the shared booking sheet cannot represent.
ui=await createSite('hair_coloring',{},prismServices.filter(service=>service.id!=='pc-pkg-signature'));
assert.ok(buttons(ui.root,'Package unavailable online').some((node:any)=>node.props.disabled));
const shade=buttons(ui.root,'Book this shade')[0];assert.ok(shade&&!shade.props.disabled);
await act(async()=>shade.props.onClick());modal=openModal(ui);assert.equal(modal.props.initialService.id,'pc-s3');
await act(async()=>modal.props.onClose());
const starter=buttons(ui.root,'Book Starter')[0];assert.ok(starter&&!starter.props.disabled);
await act(async()=>starter.props.onClick());modal=openModal(ui);
assert.equal(modal.props.initialService.id,'pc-pkg-starter');
await act(async()=>modal.props.onClose());
await act(async()=>ui.root.findAll((node:any)=>node.type==='button'&&node.props.role==='switch')[0].props.onClick());
assert.ok(buttons(ui.root,'Contact us to add the care plan').every((node:any)=>node.props.disabled));
await act(async()=>ui.unmount());
ui=await createSite('hair_coloring',{},prismServices.filter(service=>service.id!=='pc-s3'));
assert.ok(buttons(ui.root,'Shade unavailable online').some((node:any)=>node.props.disabled));
await act(async()=>ui.unmount());

// Shringaar package cards are disabled for deleted links, and its seasonal
// offer points at a real enquiry section rather than a guessed package.
ui=await createSite('bridal_lounge',{},CATEGORY_TEMPLATES.bridal_lounge.services.filter(service=>service.id!=='sr-pkg-classic'));
assert.ok(buttons(ui.root,'Not available to book online').some((node:any)=>node.props.disabled));
const enquiry=ui.root.findAll((node:any)=>node.type==='a'&&node.props.href==='#sr-booking'&&text(node).includes('Enquire about this offer'));
assert.equal(enquiry.length,1);assert.ok(ui.root.findAll((node:any)=>node.props.id==='sr-booking').length);
const royal=buttons(ui.root,'Book Royal')[0];assert.ok(royal&&!royal.props.disabled);
await act(async()=>royal.props.onClick());modal=openModal(ui);assert.equal(modal.props.initialService.id,'sr-pkg-royal');
await act(async()=>ui.unmount());

// Gallery inspiration has no service identity: both tile and lightbox take
// customers to the actual menu instead of guessing a named haircut.
ui=await createSite('hair_salon',{});
const galleryLinks=ui.root.findAll((node:any)=>node.type==='a'&&node.props.className==='le-tile-book');
assert.ok(galleryLinks.length>0&&galleryLinks.every((node:any)=>node.props.href==='#services-section'));
const tile=ui.root.findAll((node:any)=>node.type==='button'&&String(node.props.className||'').includes('le-tile-trigger'))[0];
await act(async()=>tile.props.onClick());
const lightboxLink=ui.root.findAll((node:any)=>node.type==='a'&&node.props.href==='#services-section'&&text(node).includes('Choose a haircut'));
assert.ok(lightboxLink.length>0&&ui.root.findAll((node:any)=>node.props.id==='services-section').length);
assert.equal(openModal(ui),undefined,'gallery preview must not book an unrelated service');
await act(async()=>ui.unmount());

// A multi-location KeshKraft sheet receives the real branch list rather than
// erasing it before the live branch lookup/fallback runs.
const branches=[{id:'branch-a',name:'First',isActive:true,operatingHours:[]},{id:'branch-b',name:'Second',isActive:true,operatingHours:[]}];
ui=await createSite('mens_hair_studio',{branches});
const mensAction=ui.root.findAll((node:any)=>node.type==='button'&&node.props.className==='kk-book-link')[0];
assert.ok(mensAction);await act(async()=>mensAction.props.onClick());modal=openModal(ui);
assert.deepEqual(modal.props.profile.branches,branches);
await act(async()=>ui.unmount());
assert.equal(writes,0,'no test should create a booking or contact a payment service');
console.log('PASS: storefront package/shade/offer guards, catalogue prices, inactive services, directory selection and Template 15 branch handoff.');

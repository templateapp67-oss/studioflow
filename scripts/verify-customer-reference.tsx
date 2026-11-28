import {withTemplateDemos} from '../src/components/customer/templateDemos';
import {TemplateDemoSalon} from '../src/components/customer/TemplateDemoSalon';
import {CUSTOMER_CATEGORY_GROUPS,matchesCustomerCategory} from '../src/components/customer/categoryGroups';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {nexoraTemplateMeta} from '../src/lib/nexoraTemplateCatalogue';
import {HomeHeaderCarousel,homeBanners,bannerStep} from '../src/components/customer/HomeHeaderCarousel';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {act,create} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {CustomerHome} from '../src/components/customer/Home';
import {CustomerSalon} from '../src/components/customer/Salon';
import {CustomerBookingFlow} from '../src/components/customer/BookingFlow';
import {CustomerAppointments} from '../src/components/customer/Appointments';
import {supabase} from '../src/lib/supabase';
import {advance,istDate} from '../src/components/customer/model';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
(globalThis as any).window={addEventListener(){},removeEventListener(){},location:{origin:'https://salon.test'},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};
(globalThis as any).location={origin:'https://salon.test',search:'?app=1',hash:''};
(globalThis as any).document={body:{style:{}},activeElement:null,addEventListener(){},removeEventListener(){}};
const salon:any={slug:'real-published-salon',owner_id:'owner',content:{profile:{businessName:'Published Salon',city:'Mumbai',address:'Published address',coverImageUrl:'https://example.test/salon.jpg',promoCampaign:{enabled:true,headline:'Published Offer',customOfferText:'Offer details',imageUrl:'https://example.test/offer.jpg'}},services:[{id:'cut',name:'Published Haircut',price:249,durationMinutes:30,category:'Hair'},{id:'spa',name:'Published Spa',price:199,durationMinutes:45,category:'Spa'}],stylists:[{id:'stylist',name:'Published Stylist',role:'Hair professional'}]}};
let opening='',ids:string[]=[];
const home=renderToStaticMarkup(<CustomerHome salons={[salon]} favorites={[]} query="" setQuery={()=>{}} open={s=>opening=s.slug} book={(s,x)=>{opening=s.slug;ids=x||[]}} save={()=>{}} refresh={()=>{}}/>);
for(const value of ['Festival Offers','Published Offer','Smart Recommendations','Published Haircut','Published Spa','cr-recommend-grid','cr-pick-photo','Book Style'])assert.ok(home.includes(value),value);
assert.ok(!home.includes('Luxe Cut')&&!/>4\.8<|★\s*4\.8/.test(home),'No fabricated reference salon names or ratings');
let homeTree:any;await act(async()=>{homeTree=create(<CustomerHome salons={[salon]} favorites={[]} query="" setQuery={()=>{}} open={s=>opening=s.slug} book={(s,x)=>{opening=s.slug;ids=x||[]}} save={()=>{}} refresh={()=>{}}/>)});
const recommendationPhoto=homeTree.root.findAllByType('button').find((b:any)=>b.props.className==='cr-pick-photo');assert.ok(recommendationPhoto);await act(async()=>recommendationPhoto.props.onClick());assert.equal(opening,salon.slug);
const bookStyle=homeTree.root.findAllByType('button').find((b:any)=>b.props.children?.[0]?.trim?.()==='Book Style');await act(async()=>bookStyle.props.onClick());assert.equal(opening,salon.slug);assert.deepEqual(ids,['cut']);await act(async()=>homeTree.unmount());
const calls:any[]=[];
(supabase as any).rpc=async(name:string,args:any)=>{calls.push({name,args});if(name==='studioflow_public_branches')return{data:[],error:null};if(name==='studioflow_booking_specialists')return{data:{published:true,specialistIds:['stylist']},error:null};if(name==='studioflow_android_slots')return{data:[{time:'11:00',label:'11:00 AM',available:true,stylistId:'stylist'}],error:null};if(name==='studioflow_list_reviews')return{data:{reviews:[]},error:null};return{data:null,error:null}};
const functionPrototype=Object.getPrototypeOf(supabase.functions);
functionPrototype.invoke=async()=>({data:{webCheckout:{online:false,venue:false,mode:'test'}},error:null});
let booking:any;await act(async()=>{booking=create(<CustomerBookingFlow salon={salon} initialIds={['cut','spa']} session={null} close={()=>{}} onCreated={()=>{}} onConfirmed={()=>{}}/>)});
assert.deepEqual(calls.find(x=>x.name==='studioflow_android_slots').args.p_services,['cut','spa']);
await act(async()=>booking.root.findAllByType('button').find((b:any)=>b.props.children==='Continue to Specialist & Slot').props.onClick());
const slot=booking.root.findAllByType('button').find((b:any)=>b.props.children?.[0]?.props?.children==='11:00 AM');assert.ok(slot);await act(async()=>slot.props.onClick());
const confirm=booking.root.findAllByType('button').find((b:any)=>b.props.children==='Confirm Booking');assert.equal(confirm.props.disabled,false);await act(async()=>confirm.props.onClick());
const rendered=JSON.stringify(booking.toJSON());for(const text of ['BOOKING SUMMARY','SALON & VENUE','SELECTED SERVICES','ASSIGNED PROFESSIONAL','DATE & APPOINTMENT WINDOW','CONTACT FOR THIS APPOINTMENT','SPECIAL INSTRUCTIONS','PAYMENT','Online payment · UPI, cards or netbanking via Razorpay','Final payable amount'])assert.ok(rendered.includes(text),text);
assert.ok(rendered.includes('₹448'),'The full service total is displayed');
const signIn=booking.root.findAllByType('button').find((b:any)=>b.props.children==='Sign in to continue');await act(async()=>signIn.props.onClick());assert.equal(calls.some(x=>x.name==='studioflow_android_book'),false,'No anonymous booking reservation');assert.ok(JSON.stringify(booking.toJSON()).includes('Welcome back'));await act(async()=>booking.unmount());
let salonTree:any;await act(async()=>{salonTree=create(<CustomerSalon salon={salon} salons={[salon]} saved={false} savedSlugs={[]} back={()=>{}} save={()=>{}} open={()=>{}} book={()=>{}} signedIn={false} onSignIn={()=>{}}/>)});
for(const tab of ['Services','Stylists','Packages','Reviews','About'])assert.ok(salonTree.root.findAllByProps({role:'tab'}).some((n:any)=>n.props.children===tab));
const reviews=salonTree.root.findAllByProps({role:'tab'}).find((b:any)=>b.props.children==='Reviews');await act(async()=>reviews.props.onClick());assert.ok(JSON.stringify(salonTree.toJSON()).includes('No customer reviews yet'));await act(async()=>salonTree.unmount());
const bookings=renderToStaticMarkup(<CustomerAppointments bookings={[{id:'booking1',owner_id:'owner',status:'confirmed',payload:{serviceName:'Published Haircut',servicePrice:249,date:istDate(),time:'11:00',amountPaid:62.25,salonSlug:'real-published-salon'}}]} salons={[salon]} loading={false} error="" refresh={()=>{}} rebook={()=>{}} pay={()=>{}} signIn={()=>{}} signedIn/>);
for(const value of ['My Salon Appointments','Upcoming','Completed','Cancelled','All Log','Published Salon','62.25'])assert.ok(bookings.includes(value),value);
assert.equal(advance(259),64.75);assert.equal(advance(249.01),62.26);
console.log('PASS: reference home sections and service CTA; five salon tabs and honest reviews; multi-service live-slot request; checkout summary and full payable total; guest auth preserves selection without reserving; real booking filters and payment amounts.');
let enabled=false,verified=false,confirmed=0,created=0;
const reservation={id:'booking-created',owner_id:'owner',status:'pending',
 hold_expires_at:new Date(Date.now()+900000).toISOString(),
 payload:{servicePrice:448,serviceName:'Haircut + Spa',date:istDate(),time:'11:00',clientPhone:'+919000000000'}};
functionPrototype.invoke=async(name:string,{body}:any)=>{
 assert.equal(name,'studioflow-payments');
 if(!body)return{data:{webCheckout:{online:enabled,venue:false,mode:'test'}},error:null};
 if(body.action==='prepareWebCheckout')return{data:{booking:{...reservation.payload,id:reservation.id,status:'pending'}},error:null};
 if(body.action==='create')return{data:{keyId:'rzp_test_fixture',orderId:'order_fixture',amount:44800,currency:'INR'},error:null};
 if(body.action==='reconcile')return{data:{booking:{...reservation.payload,id:reservation.id,
   status:verified?'confirmed':'pending',amountPaid:verified?448:0,paymentId:verified?'pay_fixture':undefined}},error:null};
 throw new Error('Unexpected function call');
};
(supabase as any).rpc=async(name:string,args:any)=>{
 calls.push({name,args});
 if(name==='studioflow_public_branches')return{data:[],error:null};
 if(name==='studioflow_booking_specialists')return{data:{published:true,specialistIds:['stylist']},error:null};if(name==='studioflow_android_slots')return{data:[{time:'11:00',label:'11:00 AM',available:true,stylistId:'stylist'}],error:null};
 if(name==='studioflow_android_book'){created++;return{data:reservation,error:null};}
 return{data:null,error:null};
};
const member:any={user:{id:'member',email:'member@example.test',user_metadata:{full_name:'Test Member'}}};
let checkout:any;
async function openCheckout(){
 await act(async()=>{checkout=create(<CustomerBookingFlow salon={salon} initialIds={['cut','spa']} session={member} close={()=>{}} onCreated={()=>{}} onConfirmed={()=>{confirmed++}}/>)});
 await act(async()=>checkout.root.findAllByType('button').find((b:any)=>b.props.children==='Continue to Specialist & Slot').props.onClick());
 await act(async()=>checkout.root.findAllByType('button').find((b:any)=>b.props.children?.[0]?.props?.children==='11:00 AM').props.onClick());
 await act(async()=>checkout.root.findAllByType('button').find((b:any)=>b.props.children==='Confirm Booking').props.onClick());
 await act(async()=>checkout.root.findByProps({autoComplete:'tel'}).props.onChange({target:{value:'9000000000'}}));
}
const payButton=()=>checkout.root.findAllByType('button').find((b:any)=>typeof b.props.children==='string'&&b.props.children.startsWith('Pay ₹'));
await openCheckout();
assert.equal(payButton().props.disabled,true);
assert.equal(created,0,'Disabled payment configuration must not reserve a slot');
await act(async()=>checkout.unmount());
enabled=true;
await openCheckout();
let sdkOrder:any;
(globalThis as any).Razorpay=class {
 constructor(options:any){sdkOrder=options;}
 on(){}
 open(){sdkOrder.modal.ondismiss();}
};
await act(async()=>payButton().props.onClick());
delete (globalThis as any).Razorpay;
assert.equal(created,1);
assert.equal(sdkOrder.amount,44800);
const reserve=calls.find(x=>x.name==='studioflow_android_book');
assert.deepEqual(reserve.args.p_services,['cut','spa']);
assert.equal(reserve.args.p_stylist,'stylist');
assert.equal(reserve.args.p_time,'11:00');
assert.ok(reserve.args.p_request);
assert.equal(confirmed,0,'Closing checkout must not confirm payment');
const recheck=()=>checkout.root.findAllByType('button').find((b:any)=>b.props.children==='Recheck payment status');
await act(async()=>recheck().props.onClick());
assert.equal(confirmed,0,'User assertion must not confirm unpaid booking');
verified=true;
await act(async()=>recheck().props.onClick());
assert.ok(JSON.stringify(checkout.toJSON()).includes('pay_fixture'));
const view=checkout.root.findAllByType('button').find((b:any)=>b.props.children==='View My Bookings');
await act(async()=>view.props.onClick());
assert.equal(confirmed,1,'Only trusted server confirmation completes booking');
await act(async()=>checkout.unmount());
console.log('PASS: unavailable payments create no reservation; exact service, slot and amount reach checkout; only server verification confirms payment.');
(supabase as any).rpc=async()=>({data:{reviews:[{id:'photo-review',name:'Actual Reviewer',rating:4,comment:'Actual review with photograph',imageUrl:'https://example.test/existing-review-image.jpg',verified:true}]},error:null});
let photoReview:any;await act(async()=>{photoReview=create(<CustomerSalon salon={salon} salons={[salon]} saved={false} savedSlugs={[]} back={()=>{}} save={()=>{}} open={()=>{}} book={()=>{}} signedIn={false} onSignIn={()=>{}}/>)});
await act(async()=>photoReview.root.findAllByProps({role:'tab'}).find((b:any)=>b.props.children==='Reviews').props.onClick());
assert.equal(photoReview.root.findByProps({alt:'Customer review photograph'}).props.src,'https://example.test/existing-review-image.jpg');assert.equal(photoReview.root.findByProps({alt:'Customer style gallery photo'}).props.src,'https://example.test/existing-review-image.jpg');await act(async()=>photoReview.unmount());console.log('PASS: existing shared review imageUrl appears in the customer style gallery and review card.');
let demoCreated=0;confirmed=0;
functionPrototype.invoke=async()=>{throw new Error('Demo must never invoke payments')};
(supabase as any).rpc=async(name:string,args:any)=>{if(name==='studioflow_public_branches')return{data:[],error:null};if(name==='studioflow_booking_specialists')return{data:{published:true,specialistIds:['stylist']},error:null};if(name==='studioflow_android_slots')return{data:[{time:'11:00',label:'11:00 AM',available:true,stylistId:'stylist'}],error:null};assert.equal(name,'studioflow_demo_book');assert.deepEqual(args.p_services,['cut']);demoCreated++;return{data:{id:'demo',payload:{demo:true,servicePrice:0}},error:null}};
let demoFlow:any;await act(async()=>{demoFlow=create(<CustomerBookingFlow demo salon={salon} initialIds={['cut']} session={member} customerProfile={{full_name:'Demo Member',phone:'9876543210'}} close={()=>{}} onCreated={()=>{}} onConfirmed={()=>confirmed++}/>)});
await act(async()=>demoFlow.root.findAllByType('button').find((b:any)=>b.props.children==='Continue to Specialist & Slot').props.onClick());
await act(async()=>demoFlow.root.findAllByType('button').find((b:any)=>b.props.children?.[0]?.props?.children==='11:00 AM').props.onClick());
await act(async()=>demoFlow.root.findAllByType('button').find((b:any)=>b.props.children==='Confirm Booking').props.onClick());
assert.ok(JSON.stringify(demoFlow.toJSON()).includes('DEMO — NO PAYMENT'));
assert.ok(!JSON.stringify(demoFlow.toJSON()).includes('Nexora QR Payment'));
await act(async()=>demoFlow.root.findAllByType('button').find((b:any)=>b.props.children==='Confirm Demo Booking — ₹0').props.onClick());
assert.equal(demoCreated,1);assert.equal(confirmed,1);await act(async()=>demoFlow.unmount());
// Multi-location practice follows the exact branch whose slots were checked.
const branches=[{id:'branch-one',name:'First',isActive:true},{id:'branch-two',name:'Second',isActive:true}];
const branchSalon={...salon,content:{...salon.content,profile:{...salon.content.profile,branches}}};
let branchDemo:any,branchSlotQueries=0;
(supabase as any).rpc=async(name:string,args:any)=>{
 if(name==='studioflow_public_branches')return{data:branches,error:null};
 if(name==='studioflow_branch_specialists')return{data:{published:true,specialistIds:['stylist']},error:null};
 if(name==='studioflow_branch_android_slots'){
  assert.equal(args.p_branch,'branch-two');branchSlotQueries++;
  return{data:[{time:'11:00',label:'11:00 AM',available:true,stylistId:'stylist'}],error:null};
 }
 assert.equal(name,'studioflow_branch_demo_book');
 assert.equal(args.p_branch,'branch-two');assert.equal(args.p_stylist,'stylist');assert.equal(args.p_time,'11:00');assert.ok(args.p_request);
 branchDemo=args;return{data:{id:'branch-demo',payload:{demo:true,servicePrice:0}},error:null};
};
await act(async()=>{demoFlow=create(<CustomerBookingFlow demo salon={branchSalon} initialIds={['cut']} session={member} customerProfile={{full_name:'Demo Member',phone:'9876543210'}} close={()=>{}} onCreated={()=>{}} onConfirmed={()=>confirmed++}/>)});
const branchContinue=()=>demoFlow.root.findAllByType('button').find((b:any)=>b.props.children==='Continue to Specialist & Slot');
assert.equal(branchContinue().props.disabled,true,'choose a branch before practice-slot lookup');
await act(async()=>demoFlow.root.findByType('select').props.onChange({target:{value:'branch-two'}}));
assert.ok(branchSlotQueries>0);
await act(async()=>branchContinue().props.onClick());
await act(async()=>demoFlow.root.findAllByType('button').find((b:any)=>b.props.children?.[0]?.props?.children==='11:00 AM').props.onClick());
await act(async()=>demoFlow.root.findAllByType('button').find((b:any)=>b.props.children==='Confirm Booking').props.onClick());
await act(async()=>demoFlow.root.findAllByType('button').find((b:any)=>b.props.children==='Confirm Demo Booking — ₹0').props.onClick());
assert.ok(branchDemo);assert.equal(confirmed,2);await act(async()=>demoFlow.unmount());
const demoCard=renderToStaticMarkup(<CustomerAppointments bookings={[{id:'demo-1',owner_id:'owner',status:'confirmed',payload:{demo:true,serviceName:'Demo haircut',servicePrice:0,amountPaid:0}}]} salons={[salon]} loading={false} error="" refresh={()=>{}} rebook={()=>{}} pay={()=>{throw new Error('Demo cannot pay')}} signIn={()=>{}} signedIn/>);
assert.ok(demoCard.includes('₹0 DEMO'));assert.ok(!demoCard.includes('Pay 25% advance'));assert.ok(!demoCard.includes('Reschedule'));
console.log('PASS: ₹0 demo summaries, including multi-location, save through isolated RPCs without payment or real reservation; demo card clearly labelled with payment actions hidden.');

const replacedBranchSalon = {
 ...salon,
 content: {
  ...salon.content,
  profile: {...salon.content.profile,branches:[branches[0]]},
  stylists: [...salon.content.stylists,{id:'foreign-staff',name:'Unassigned Tattoo Artist'}],
 },
};
let hasProfessional = false;
let nextDayOnly = false;
const slotDates:string[] = [];
functionPrototype.invoke=async()=>({data:{webCheckout:{online:false,venue:false,mode:'test'}},error:null});
(supabase as any).rpc=async(name:string,args:any)=>{
 if(name==='studioflow_public_branches')return{data:[branches[1]],error:null};
 if(name==='studioflow_branch_specialists'){
  assert.equal(args.p_branch,'branch-two','use the current public branch, not the published snapshot ID');
  return{data:{published:true,specialistIds:hasProfessional&&args.p_service_id==='cut'?['stylist']:[]},error:null};
 }
 assert.equal(name,'studioflow_branch_android_slots');
 assert.equal(args.p_branch,'branch-two');
 slotDates.push(args.p_date);
 if(nextDayOnly&&args.p_date!==istDate(2))return{data:[],error:null};
 return{data:[
  {time:'11:00',label:'11:00 AM',available:true,stylistId:'stylist'},
  {time:'12:00',label:'12:00 PM',available:true,stylistId:'foreign-staff'},
 ],error:null};
};
let locationBooking:any;
const openLocationBooking=async(initialIds=['cut'])=>{
 await act(async()=>{locationBooking=create(<CustomerBookingFlow salon={replacedBranchSalon} initialIds={initialIds} session={null} close={()=>{}} onCreated={()=>{}} onConfirmed={()=>{}}/>)});
 const buttons=()=>locationBooking.root.findAllByType('button');
 await act(async()=>buttons().find((b:any)=>b.props.children==='Continue to Specialist & Slot').props.onClick());
 await act(async()=>buttons().find((b:any)=>b.props.children?.[0]==='Tomorrow').props.onClick());
};
await openLocationBooking();
assert.equal(slotDates.length,0,'no slot lookup without an eligible professional');
assert.match(JSON.stringify(locationBooking.toJSON()),/No professional with a booking schedule/);
assert.doesNotMatch(JSON.stringify(locationBooking.toJSON()),/Unassigned Tattoo Artist/);
await act(async()=>locationBooking.unmount());
hasProfessional=true;
await openLocationBooking();
assert.equal(slotDates.at(-1),istDate(1),'Tomorrow requests the next IST date');
assert.match(JSON.stringify(locationBooking.toJSON()),/11:00 AM/);
assert.doesNotMatch(JSON.stringify(locationBooking.toJSON()),/12:00 PM|Unassigned Tattoo Artist/);
await act(async()=>locationBooking.unmount());
nextDayOnly=true;
slotDates.length=0;
await openLocationBooking(['cut','spa']);
assert.match(JSON.stringify(locationBooking.toJSON()),/No scheduled professional can perform this combination/);
assert.equal(slotDates.length,0);
const findLocationButton=(lead:string)=>locationBooking.root.findAllByType('button').find((b:any)=>
 (Array.isArray(b.props.children)?b.props.children.join(''):String(b.props.children)).startsWith(lead));
assert.equal(findLocationButton('Continue with Published Spa'),undefined);
await act(async()=>findLocationButton('Continue with Published Haircut only').props.onClick());
assert.equal(slotDates.at(-1),istDate(1));
await act(async()=>findLocationButton('Find next available date').props.onClick());
assert.equal(slotDates.at(-1),istDate(2));
assert.equal(locationBooking.root.findByProps({'aria-label':'Appointment date'}).props.value,istDate(1),
 'finding the first opening cannot change the customer’s selected date');
await act(async()=>findLocationButton('Show slots for').props.onClick());
assert.equal(locationBooking.root.findByProps({'aria-label':'Appointment date'}).props.value,istDate(2));
assert.match(JSON.stringify(locationBooking.toJSON()),/11:00 AM/);
await act(async()=>locationBooking.unmount());
console.log('PASS: an unstaffed service can be excluded explicitly and the earliest verified future date is actionable.');

const banners=homeBanners([salon]);assert.equal(banners.length,5);assert.equal(new Set(banners.map(b=>b.image)).size,5);assert.equal(homeBanners([]).length,5);
assert.deepEqual(bannerStep(4,1),{index:3,direction:-1});assert.deepEqual(bannerStep(0,-1),{index:1,direction:1});
const actualInterval=globalThis.setInterval,actualClear=globalThis.clearInterval;let tick:()=>void=()=>{},running=false;
(globalThis as any).setInterval=(fn:any,ms:number)=>{assert.equal(ms,4000);tick=fn;running=true;return 111};(globalThis as any).clearInterval=()=>{running=false};
let carousel:any;await act(async()=>{carousel=create(<HomeHeaderCarousel salons={[salon]} open={()=>{}} browse={()=>{}}/>)});
const current=()=>carousel.root.findAllByProps({'aria-roledescription':'slide'}).findIndex((s:any)=>s.props['aria-hidden']===false);
assert.equal(carousel.root.findAllByType('img').length,5);assert.equal(current(),0);
for(let i=0;i<4;i++)await act(async()=>tick());assert.equal(current(),4);await act(async()=>tick());assert.equal(current(),3);
await act(async()=>carousel.root.findByProps({'aria-label':'Pause banner autoplay'}).props.onClick());assert.equal(running,false);
await act(async()=>carousel.root.findByProps({'aria-label':'Next offer'}).props.onClick());assert.equal(current(),4);
await act(async()=>carousel.root.findByProps({'aria-label':'Previous offer'}).props.onClick());assert.equal(current(),3);
await act(async()=>carousel.root.findAllByProps({'aria-roledescription':'carousel'})[0].props.onKeyDown({key:'ArrowLeft',preventDefault(){}}));assert.equal(current(),2);
await act(async()=>carousel.root.findByProps({className:'cr-banner-viewport'}).props.onPointerDown({clientX:200,clientY:50}));await act(async()=>carousel.root.findByProps({className:'cr-banner-viewport'}).props.onPointerUp({clientX:100,clientY:55}));assert.equal(current(),3);
await act(async()=>carousel.unmount());assert.equal(running,false);globalThis.setInterval=actualInterval;globalThis.clearInterval=actualClear;
console.log('PASS: exactly five unique header images; four-second autoplay moves left and reverses right at edges; pause, manual arrows, keyboard, touch swipe and cleanup.');

for(const id of Object.keys(CATEGORY_TEMPLATES))assert.ok(CUSTOMER_CATEGORY_GROUPS.some(g=>g.types.includes(id)),`Category group missing ${id}`);
const categorySalons:any[]=CUSTOMER_CATEGORY_GROUPS.map(g=>({slug:g.id,owner_id:g.id,content:{profile:{businessName:g.label+' QA Studio',businessType:g.types[0],coverImageUrl:'https://example.test/'+g.id+'.jpg'},services:[{id:g.id,name:g.label+' QA Service',price:300,durationMinutes:30}],stylists:[]}}));
let groupedHome:any;await act(async()=>{groupedHome=create(<CustomerHome salons={categorySalons} favorites={[]} query="" setQuery={()=>{}} open={()=>{}} book={()=>{}} save={()=>{}} refresh={()=>{}}/>)});
for(const group of CUSTOMER_CATEGORY_GROUPS){const tile=groupedHome.root.findAllByType('button').find((b:any)=>b.findAllByType('b').some((n:any)=>n.props.children===group.label));assert.ok(tile,group.label);await act(async()=>tile.props.onClick());const salons=groupedHome.root.findAllByProps({className:'cr-salon-card'});assert.equal(salons.length,1);assert.equal(salons[0].findByType('h4').props.children,group.label+' QA Studio');assert.ok(matchesCustomerCategory(categorySalons.find(s=>s.slug===group.id),group.id));}
await act(async()=>groupedHome.unmount());console.log('PASS: prominent Hair/Barber/Beauty/Spa/Massage/Tattoo categories cover all 16 templates and each filters the correct published salon, with existing booking features preserved.');

const spaKeyword=renderToStaticMarkup(<CustomerHome salons={[{...salon,content:{...salon.content,profile:{...salon.content.profile,businessName:'Wellness Studio',businessType:'ayurvedic_spa'}}}]} favorites={[]} query="spa" setQuery={()=>{}} open={()=>{}} book={()=>{}} save={()=>{}} refresh={()=>{}}/>);assert.equal((spaKeyword.match(/class="cr-salon-card"/g)||[]).length,1);console.log('PASS: category keywords such as spa find a published salon even when its name does not contain the category.');

const templateMeta=Object.values(CATEGORY_TEMPLATES).map(t=>({id:t.id,title:t.title,shortName:t.shortName,displayName:nexoraTemplateMeta(t.id)!.displayName,tagline:t.tagline,coverImageUrl:t.coverImageUrl}));
const demoCatalogue=withTemplateDemos([],templateMeta);
assert.equal(demoCatalogue.length,16);
for(const t of templateMeta){const s=demoCatalogue.find(s=>s.demoTemplateId===t.id)!;assert.ok(s);assert.ok(s.content.services?.length);assert.ok(s.content.profile.coverImageUrl);const detail=renderToStaticMarkup(<TemplateDemoSalon salon={s} back={()=>{}}/>);assert.ok(detail.includes('/?template='+t.id));assert.ok(detail.includes('SAMPLE CONTENT'));assert.ok(!detail.includes('Write Review'));assert.ok(!detail.includes('Book Appointment'));assert.ok(!detail.includes('tel:'));}
for(const group of CUSTOMER_CATEGORY_GROUPS)assert.ok(demoCatalogue.some(s=>matchesCustomerCategory(s,group.id)));
let demoHome:any;await act(async()=>{demoHome=create(<CustomerHome templates={templateMeta} salons={demoCatalogue} favorites={[]} query="" setQuery={()=>{}} open={()=>{}} book={()=>{}} save={()=>{}} refresh={()=>{}}/>)});
for(const t of templateMeta){const tile=demoHome.root.findAllByType('button').find((b:any)=>b.findAllByType('strong').some((n:any)=>n.props.children===t.displayName));assert.ok(tile,t.id);await act(async()=>tile.props.onClick());const cards=demoHome.root.findAllByProps({className:'cr-salon-card'});assert.equal(cards.length,1,t.id);assert.ok(cards[0].findAllByProps({className:'cr-cover-offer'}).some((n:any)=>n.props.children==='TEMPLATE DEMO'));}
await act(async()=>demoHome.unmount());
const realHair={...salon,content:{...salon.content,profile:{...salon.content.profile,businessType:'hair_salon'}}};
const replacement=withTemplateDemos([realHair],templateMeta);assert.equal(replacement.length,16);assert.equal(replacement[0],realHair);assert.equal(replacement.some(s=>s.demoTemplateId==='hair_salon'),false);assert.equal(replacement.filter(s=>s.demoTemplateId).length,15);
const allReal=templateMeta.map(t=>({...realHair,slug:t.id,content:{...realHair.content,profile:{...realHair.content.profile,businessType:t.id}}}));assert.deepEqual(withTemplateDemos(allReal,templateMeta),allReal);
assert.equal(withTemplateDemos([],templateMeta.filter(t=>t.id!=='tattoo_studio')).some(s=>s.demoTemplateId==='tattoo_studio'),false,'Inactive templates must not reappear');
console.log('PASS: all 16 template demos contain services/images and safe website links; category filters stay populated; real publication replaces only its own template demo, all-real catalogue removes all demos; inactive templates excluded.');

// Recommendations must actually overflow and both buttons must operate the same rail.
const rail={scrollLeft:0,clientWidth:320,scrollWidth:1200,scrollBy({left}:{left:number}){this.scrollLeft=Math.max(0,Math.min(this.scrollWidth-this.clientWidth,this.scrollLeft+left));}};
let railTree:any;await act(async()=>{railTree=create(<CustomerHome salons={[salon]} favorites={[]} query="" setQuery={()=>{}} open={()=>{}} book={()=>{}} save={()=>{}} refresh={()=>{}}/>,{createNodeMock:(element:any)=>element.props.className==='cr-recommend-grid'?rail:null})});
const nextPick=railTree.root.findAllByType('button').find((b:any)=>b.props['aria-label']==='Next recommendations');const previousPick=railTree.root.findAllByType('button').find((b:any)=>b.props['aria-label']==='Previous recommendations');assert.equal(nextPick.props.disabled,false);assert.equal(previousPick.props.disabled,true);
await act(async()=>nextPick.props.onClick());assert.ok(rail.scrollLeft>0);await act(async()=>railTree.root.findAll((n:any)=>n.props.className==='cr-recommend-grid').find((n:any)=>typeof n.props.onScroll==='function').props.onScroll());assert.equal(previousPick.props.disabled,false);
await act(async()=>previousPick.props.onClick());assert.equal(rail.scrollLeft,0);await act(async()=>railTree.unmount());
console.log('PASS: recommendation rail next/previous scroll, boundary state, and existing card booking actions.');

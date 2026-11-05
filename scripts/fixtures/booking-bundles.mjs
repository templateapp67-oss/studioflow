import assert from 'node:assert/strict';
export async function verifyBookingBundles(db) {
 const owner='c9a44111-1111-4111-8111-111111111111',customer='c9a44222-2222-4222-8222-222222222222';
 const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 const hours=days.map(day=>({day,enabled:true,fromTime:'09:00',toTime:'20:00'}));
 const staff=(id,assignedServices)=>({id,name:id,role:'Stylist',status:'Available',assignedServices,schedule:hours,experienceYears:8,rating:4.8,bio:'Published bio',phone:'PRIVATE',commissionRate:40,workGallery:[{id:'private',consented:false},{id:'public',consented:true,imageUrl:'https://example.com/work.jpg'}]});
 const draft={profile:{businessName:'Bundle QA',businessType:'barber',subdomain:'bundle-qa',requireDeposit:true},services:[{id:'cut',name:'Haircut',category:'Hair',description:'QA haircut',icon:'scissors',price:800,durationMinutes:30},{id:'beard',name:'Beard Sculpting',category:'Beard',description:'QA sculpting',icon:'scissors',price:400,durationMinutes:45}],stylists:[staff('a-cut',['cut']),staff('b-both',['cut','beard']),staff('c-beard',['beard']),{...staff('d-leave',[]),status:'On Leave'}]};
 const publicContent=()=>({...draft,stylists:draft.stylists.map(({schedule,assignedServices,phone,commissionRate,...safe})=>safe)});
 await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[owner,'bundle-owner@example.test',customer,'bundle-customer@example.test']);
 await db.query('insert into public.studioflow_accounts(user_id,draft) values($1,$2)',[owner,draft]);
 await db.query('insert into public.studioflow_websites(owner_id,slug,content) values($1,$2,$3)',[owner,'bundle-qa',publicContent()]);
 const branch=(await db.query('select id from public.branches where site_id=$1',[owner])).rows[0].id;
 await db.query('update public.branches set operating_hours=$1 where id=$2',[hours,branch]);
 for(const person of draft.stylists)for(const day of days)await db.query(`insert into public.studioflow_staff_branch_schedules(site_id,branch_id,staff_id,day_of_week,starts_at,ends_at,is_active) values($1,$2,$3,$4,'09:00','20:00',true) on conflict(site_id,branch_id,staff_id,day_of_week) do update set starts_at='09:00',ends_at='20:00',is_active=true`,[owner,branch,person.id,day]);
 const rpc=async(sql,args=[]) => (await db.query(sql,args)).rows[0].result;
 for(const branched of [false,true]) {
  const people=await rpc(branched?'select public.studioflow_branch_specialists($1,$2,$3) result':'select public.studioflow_booking_specialists($1,$2) result',branched?['bundle-qa','cut',branch]:['bundle-qa','cut']);
  assert.deepEqual([...people.specialistIds].sort(),['a-cut','b-both']);
  assert.equal(people.specialists.length,2);
  for(const person of people.specialists){assert.equal(person.bio,'Published bio');assert.equal(person.phone,undefined);assert.equal(person.schedule,undefined);assert.equal(person.commissionRate,undefined);assert.equal(person.workGallery.length,1);}
 }
 const date=(await db.query("select ((now() at time zone 'Asia/Kolkata')::date+5)::text as day")).rows[0].day;
 const slots=async(ids=['cut','beard'],stylist='any_available',branched=true)=>rpc(branched?'select public.studioflow_branch_android_slots($1,$2,$3,$4,$5) result':'select public.studioflow_android_slots($1,$2,$3,$4) result',branched?['bundle-qa',JSON.stringify(ids),date,stylist,branch]:['bundle-qa',JSON.stringify(ids),date,stylist]);
 for(const branched of [false,true]){
  const available=(await slots(undefined,undefined,branched)).filter(s=>s.available);
  assert.ok(available.length>0);assert.ok(available.every(s=>s.stylistId==='b-both'),'Any must handle ALL selected services');
  assert.ok(!available.some(s=>s.time==='19:00'),'75-minute bundle must fit before 20:00');
  assert.deepEqual(await slots(undefined,'a-cut',branched),[]);
  assert.deepEqual(await slots(['cut','cut'],'any',branched),[]);
  assert.deepEqual(await slots(['cut','missing'],'any',branched),[]);
 }
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[customer]);
 const time=(await slots()).find(s=>s.available).time;
 const request={serviceId:'cut',serviceIds:['cut','beard'],addOnIds:['beard'],stylistId:'any_available',branchId:branch,date,time,clientName:'Bundle Customer',clientPhone:'9876543210',servicePrice:1,durationMinutes:1,requestId:'c9a44333-3333-4333-8333-333333333333'};
 const book=()=>rpc('select public.studioflow_branch_book($1,$2) result',['bundle-qa',request]);
 const booked=await book();
 assert.equal(booked.servicePrice,1200);assert.equal(booked.durationMinutes,75);assert.equal(booked.stylistId,'b-both');assert.equal(booked.serviceItems.length,2);assert.deepEqual(booked.serviceIds,['cut','beard']);
 assert.equal(Math.ceil(booked.servicePrice*25)/100,300);
 assert.equal((await book()).id,booked.id,'retry returns same reservation');
 await assert.rejects(()=>rpc('select public.studioflow_branch_book($1,$2) result',['bundle-qa',{...request,requestId:crypto.randomUUID()}]),/slot|booked/i);
 await assert.rejects(()=>rpc('select public.studioflow_branch_book($1,$2) result',['bundle-qa',{...request,time:'13:00'}]),/Request changed/i);
 await assert.rejects(()=>rpc('select public.studioflow_branch_book($1,$2) result',['bundle-qa',{...request,serviceIds:['cut','cut'],addOnIds:['cut'],requestId:crypto.randomUUID()}]),/slot|distinct|valid/i);
 await db.query("select set_config('request.jwt.claim.sub','',false)");
 await assert.rejects(book,/sign in/i);
 // Template 15 keeps male-only categories and checks total window against breaks.
 draft.profile.businessType='mens_hair_studio';draft.profile.mensStudio={hours,breaks:[{staffId:'b-both',fromTime:'12:00',toTime:'13:00'}],offers:[{id:'offer',code:'CUT10',title:'10% cut',active:true,approved:true,type:'percent',discount:10,serviceIds:['cut']}]};
 draft.services[0]={...draft.services[0],mensTemplateId:'mens_hair_studio',category:"Men's Haircuts",name:'Haircut'};
 draft.services[1]={...draft.services[1],mensTemplateId:'mens_hair_studio',category:"Men's Hair Colour",name:'Hair Colour'};
 draft.stylists=draft.stylists.map(s=>({...s,businessType:'mens_hair_studio',mensMaleOnly:true}));
 await db.query('update public.studioflow_accounts set draft=$1 where user_id=$2',[draft,owner]);
 await db.query('update public.studioflow_websites set content=$1 where owner_id=$2',[publicContent(),owner]);
 assert.ok(!(await slots()).some(s=>s.available&&s.time==='11:00'),'bundle may not extend into a break');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[customer]);
 const quote=await rpc('select public.studioflow_mens_coupon_quote($1,$2,$3) result',['bundle-qa','["cut","beard"]','CUT10']);
 assert.equal(quote.finalPrice,1120);assert.equal(quote.advanceAmount,280);
 const mensRequest={...request,requestId:crypto.randomUUID(),time:'14:00',couponCode:'CUT10',couponExpectedTotal:1120};
 const mensBooking=await rpc('select public.studioflow_mens_book($1,$2) result',['bundle-qa',mensRequest]);
 assert.equal(mensBooking.servicePrice,1120);assert.equal(mensBooking.durationMinutes,75);
 assert.equal((await rpc('select public.studioflow_mens_book($1,$2) result',['bundle-qa',mensRequest])).id,mensBooking.id);
 console.log('PASS: multi-service SQL applies twice; public profile privacy; branch/unbranched ALL-service eligibility; full duration; server price/deposit; retries, overlap and auth; men’s bundle/break/coupon guards.');
}

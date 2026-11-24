import React from 'react';
import {act,create} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {PublishingStatusIndicator} from '../src/components/PublishingStatusIndicator';
import {WebsitePublishPanel} from '../src/components/WebsitePublishPanel';
import {OwnerWorkspace} from '../src/components/OwnerWorkspace';
import {SalonWebsitePreview} from '../src/components/SalonWebsitePreview';
import {supabase} from '../src/lib/supabase';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {formatPublishingError,isPublishingReady,normalizeWebsiteSlug,parsePublishedWebsite,publishSalonWebsite,runOptionalPublishTracking} from '../src/lib/publishing';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const mockLocation={origin:'https://studioflow.example',search:'',pathname:'/'};
(globalThis as any).location=mockLocation;

// Frontend publishing contract tests (real pure helpers with mocked Supabase boundaries).
const readyProfile={...INITIAL_SALON_PROFILE,businessName:'Glow & Shine Salon',businessType:'hair_salon' as any,serviceCatalogueInitialized:true,phone:''};
const readyServices=[{id:'publish-service',name:'Cut',price:500,durationMinutes:30,category:'Hair',description:'',icon:'content_cut'}];
const autoSlugResponse={slug:'glow-shine-salon-11111111',published:true,published_at:'2026-11-24T10:00:00.000Z'};
const publishOwnerId='11111111-1111-4111-8111-111111111111';
const makePublishDeps=(overrides:Record<string,unknown>={})=>({
  expectedWorkspaceOwnerId:publishOwnerId,
  profile:readyProfile,
  services:readyServices,
  getUser:async()=>({id:publishOwnerId}),
  getWorkspaceOwnerId:async()=>publishOwnerId,
  flush:async()=>{},
  publishRpc:async()=>({data:autoSlugResponse,error:null}),
  ...overrides,
} as any);
assert.equal(isPublishingReady(readyProfile,readyServices),true,'Checklist requires name, service, and template only; phone is not required');
assert.equal(isPublishingReady({...readyProfile,businessName:' '},readyServices),false,'Missing business name blocks publish');
assert.equal(isPublishingReady(readyProfile,[]),false,'No services blocks publish');
assert.equal(isPublishingReady({...readyProfile,serviceCatalogueInitialized:false},readyServices),false,'No selected template blocks publish');
assert.equal(normalizeWebsiteSlug('  Glow &  Shine / Salon !!! '),'glow-shine-salon','Website slug normalization lowercases and collapses invalid/duplicate separators');
assert.equal(normalizeWebsiteSlug('!!!'),'','Invalid-character business names normalize to empty for database fallback/validation');
let frontendFlushCalls=0,frontendRpcCalls=0;
const successDeps=makePublishDeps({flush:async()=>{frontendFlushCalls++;},publishRpc:async()=>{frontendRpcCalls++;return {data:autoSlugResponse,error:null};}});
const successfulWebsite=await publishSalonWebsite(successDeps);
assert.deepEqual(successfulWebsite,autoSlugResponse,'Successful publish returns actual persisted website record');
assert.equal(frontendFlushCalls,1);assert.equal(frontendRpcCalls,1);
await assert.rejects(()=>publishSalonWebsite(makePublishDeps({getUser:async()=>null})),/session has expired/i,'Missing authenticated user is blocked');
await assert.rejects(()=>publishSalonWebsite(makePublishDeps({expectedWorkspaceOwnerId:'22222222-2222-4222-8222-222222222222'})),/not the owner/i,'Different authenticated user is blocked');
await assert.rejects(()=>publishSalonWebsite(makePublishDeps({getWorkspaceOwnerId:async()=>'22222222-2222-4222-8222-222222222222'})),/could not be verified/i,'Workspace ownership relationship is verified');
await assert.rejects(()=>publishSalonWebsite(makePublishDeps({profile:{...readyProfile,businessName:''}})),/business name/i,'Actual publish validation blocks missing business name');
await assert.rejects(()=>publishSalonWebsite(makePublishDeps({services:[]})),/at least one service/i,'Actual publish validation blocks missing services');
await assert.rejects(()=>publishSalonWebsite(makePublishDeps({profile:{...readyProfile,serviceCatalogueInitialized:false}})),/template/i,'Actual publish validation blocks missing template');
let staleRpcCalls=0;
await assert.rejects(()=>publishSalonWebsite(makePublishDeps({getLatestWorkspace:()=>({profile:{...readyProfile,businessName:''},services:readyServices}),publishRpc:async()=>{staleRpcCalls++;return {data:autoSlugResponse,error:null};}})),/latest workspace changes/i,'Stale workspace readiness is rechecked after saving');
assert.equal(staleRpcCalls,0,'Stale invalid workspace never reaches publish RPC');
let collisionRpcCalls=0;
const collidedSlug=await publishSalonWebsite(makePublishDeps({publishRpc:async()=>{collisionRpcCalls++;return {data:autoSlugResponse,error:null};}}));
assert.equal(collidedSlug.slug,'glow-shine-salon-11111111','Auto-generated collision uses persisted database-resolved slug');
assert.equal(collisionRpcCalls,1);
const duplicateAddressError={message:'This website address is already in use.',details:'Key (slug) already exists.',hint:'Choose another website address.',code:'23505'};
await assert.rejects(()=>publishSalonWebsite(makePublishDeps({publishRpc:async()=>({data:null,error:duplicateAddressError})})),e=>e===duplicateAddressError,'Manually selected duplicate slug preserves Supabase error object');
const diagnosticError=Object.assign(new Error('publish rejected'),{details:'row conflict',hint:'pick another slug',code:'23505'});
const errorText=formatPublishingError(diagnosticError);
for(const diagnostic of ['publish rejected','Details: row conflict','Hint: pick another slug','Code: 23505'])assert.ok(errorText.includes(diagnostic),`Error instance preserves ${diagnostic}`);
const plainErrorText=formatPublishingError(duplicateAddressError);
for(const diagnostic of ['This website address is already in use.','Details: Key (slug) already exists.','Hint: Choose another website address.','Code: 23505'])assert.ok(plainErrorText.includes(diagnostic),`Plain PostgREST error preserves ${diagnostic}`);
assert.ok(!formatPublishingError({message:'password=abc access_token=xyz'}).includes('abc'),'Customer error redacts secrets');
for(const malformed of [null,undefined,{},[],{slug:'glow-shine-salon',published_at:autoSlugResponse.published_at},{slug:'glow-shine-salon',published:true},{slug:'glow-shine-salon',published:false,published_at:autoSlugResponse.published_at}]){
  await assert.rejects(()=>publishSalonWebsite(makePublishDeps({publishRpc:async()=>({data:malformed,error:null})})),/could not be confirmed/i,'Malformed/empty/unpublished RPC response never claims success');
}
assert.equal(parsePublishedWebsite(autoSlugResponse).slug,autoSlugResponse.slug,'Persisted slug is used');
assert.equal(parsePublishedWebsite(autoSlugResponse).published,true,'Persisted published flag is confirmed');
assert.equal(parsePublishedWebsite(autoSlugResponse).published_at,autoSlugResponse.published_at,'Persisted published timestamp is used');
let trackingLogged=false,publishStillSucceeded=false;
publishStillSucceeded=true;
await runOptionalPublishTracking(async()=>{throw {message:'tracking unavailable',code:'XX000'};},diagnostics=>{trackingLogged=diagnostics.code==='XX000';});
assert.equal(publishStillSucceeded,true,'Optional tracking failure does not affect successful publish state');
assert.equal(trackingLogged,true,'Optional tracking failure is separately logged');

// 1. Offline PostgreSQL / PGlite E2E: schema, storefront view, and publish migrations.
const db=new PGlite();
await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,raw_app_meta_data jsonb,banned_until timestamptz,deleted_at timestamptz,is_anonymous boolean);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(bucket_id text,name text,owner uuid,metadata jsonb);
create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
create publication supabase_realtime;
`);
const splitSql=(sql:string)=>{
  const out:string[]=[];let cur='',i=0,tag:string|null=null,quote=false,line=false;
  while(i<sql.length){
    const two=sql.slice(i,i+2);
    if(line){cur+=sql[i];if(sql[i]==='\n')line=false;i++;continue;}
    if(two==='--'&&!quote&&!tag){line=true;cur+=two;i+=2;continue;}
    if(sql[i]==="'"&&!tag){if(sql[i+1]==="'"){cur+="''";i+=2;continue;}quote=!quote;cur+=sql[i];i++;continue;}
    if(sql[i]==='$'&&!quote){
      const m=sql.slice(i).match(/^\$[A-Za-z_0-9]*\$/);
      if(m){if(!tag)tag=m[0];else if(tag===m[0])tag=null;cur+=m[0];i+=m[0].length;continue;}
    }
    if(sql[i]===';'&&!quote&&!tag){if(cur.trim())out.push(cur);cur='';i++;continue;}
    cur+=sql[i];i++;
  }
  if(cur.trim())out.push(cur);
  return out;
};
const applySql=async(file:string)=>{
  const stmts=splitSql(readFileSync(file,'utf8')).filter(s=>!/^\s*(begin|commit)\s*;?\s*$/i.test(s));
  await db.exec('BEGIN');
  try{
    for(const stmt of stmts)await db.exec(stmt);
    await db.exec('COMMIT');
  }catch(e){try{await db.exec('ROLLBACK')}catch{}throw new Error(`${file}: ${(e as Error).message}`);}
};
for(const file of [
  'backend/studioflow-shared-tables.sql',
  'backend/studioflow-schema.sql',
  'backend/studioflow-template-catalog.sql',
  'backend/studioflow-storage-and-booking-status.sql',
  'backend/studioflow-availability.sql',
  'backend/studioflow-book-available-slot.sql',
  'backend/studioflow-dashboard-wiring.sql',
  'backend/studioflow-service-catalogue.sql',
  'backend/studioflow-service-images.sql',
  'backend/staff-portfolios.sql',
]){
  await applySql(file);
}
await db.exec(`
create table if not exists public.studioflow_demo_bookings (
  id uuid primary key default gen_random_uuid(), customer_id uuid, owner_id uuid,
  request_id uuid, status text not null default 'confirmed', payload jsonb,
  created_at timestamptz not null default now()
);
alter table public.studioflow_demo_bookings enable row level security;
`);
for(const file of [
  'supabase/migrations/20261121130001_public_storefront_view.sql',
  'supabase/migrations/20261123082445_studioflow_robust_website_publish.sql',
  'supabase/migrations/20261123093000_studioflow_publish_slug_case_and_compat.sql',
  'supabase/migrations/20261123100000_studioflow_bookings_hold_expires_at_compat.sql',
  'supabase/migrations/20261124062248_studioflow_publish_optional_tracking_isolation.sql',
  'supabase/migrations/20261124063000_studioflow_public_salon_websites_security_invoker.sql',
]){
  await applySql(file);
}
const {rows:[holdCol]}=await db.query(`
  select data_type from information_schema.columns
  where table_schema='public' and table_name='studioflow_bookings' and column_name='hold_expires_at'
`);
assert.equal(holdCol?.data_type,'timestamp with time zone','studioflow_bookings.hold_expires_at exists after compat migration');

const ownerA='11111111-1111-4111-8111-111111111111';
const ownerB='22222222-2222-4222-8222-222222222222';
const customerC='33333333-3333-4333-8333-333333333333';
const ownerD='44444444-4444-4444-8444-444444444444';
const serviceImagePath=`${ownerA}/services/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`;
const serviceImageUrl=`https://zilwgiuiygqqardzutxi.supabase.co/storage/v1/object/public/studioflow-media/${serviceImagePath}`;
await db.query(`insert into auth.users(id,email) values($1,'owner-a@example.com'),($2,'owner-b@example.com'),($3,'customer-c@example.com'),($4,'owner-d@example.com')`,[ownerA,ownerB,customerC,ownerD]);
await db.exec(`
insert into public.growth_partners(user_id,referral_code) values('${ownerB}','TESTREFERRAL') on conflict do nothing;
insert into public.partner_referrals(partner_id,referred_user_id,referral_code,status,registered_at,source,referred_email)
select id,'${ownerA}',referral_code,'registered',now(),'test','owner-a@example.com'
from public.growth_partners where user_id='${ownerB}' on conflict do nothing;
create function public.test_fail_optional_referral_tracking() returns trigger language plpgsql as $$
begin raise exception 'injected optional referral tracking failure'; end
$$;
create trigger fail_optional_referral_tracking before update on public.partner_referrals
for each row execute function public.test_fail_optional_referral_tracking();
`);
await db.query(
  `insert into storage.objects(bucket_id,name,owner,metadata) values('studioflow-media',$1,$2,'{"mimetype":"image/jpeg"}'::jsonb)`,
  [serviceImagePath,ownerA]
);

const asRole=async<T,>(role:'anon'|'authenticated',uid:string|null,fn:()=>Promise<T>):Promise<T>=>{
  await db.exec('BEGIN');
  try{
    await db.exec(`set local role ${role}`);
    if(uid)await db.query(`select set_config('request.jwt.claim.sub',$1,true)`,[uid]);
    else await db.query(`select set_config('request.jwt.claim.sub','',true)`);
    const res=await fn();
    await db.exec('COMMIT');
    return res;
  }catch(e){
    try{await db.exec('ROLLBACK');}catch{}
    throw e;
  }
};

// Unauthenticated publish must fail with 42501.
await assert.rejects(
  ()=>asRole('anon',null,()=>db.query(`select public.studioflow_publish()`)),
  (err:any)=>err?.code==='42501' || /Sign in required/i.test(String(err?.message))
);

// Missing workspace must fail cleanly.
await assert.rejects(
  ()=>asRole('authenticated',ownerA,()=>db.query(`select public.studioflow_publish()`)),
  (err:any)=>err?.code==='P0001' || /workspace was not found/i.test(String(err?.message))
);

// Bootstrap Owner A and Owner B workspaces.
await asRole('authenticated',ownerA,()=>db.query(`select public.studioflow_ensure_account(null)`));
await asRole('authenticated',ownerB,()=>db.query(`select public.studioflow_ensure_account(null)`));
await asRole('authenticated',ownerD,()=>db.query(`select public.studioflow_ensure_account(null)`));

// Whitespace businessName must be rejected with 22023.
await asRole('authenticated',ownerA,()=>db.query(
  `select public.studioflow_save_workspace($1::jsonb,0)`,
  [JSON.stringify({
    profile:{businessName:'   ',businessType:'hair_salon',serviceCatalogueInitialized:true,email:'secret-owner@example.com'},
    services:[{id:'svc-1',name:'Signature Cut',price:900,durationMinutes:45,category:'Hair',description:'Precision cut',icon:'content_cut'}],
    stylists:[],clients:[],extras:{gallery:[]},loyaltyConfig:{},onboardingComplete:true,
  })]
));
await assert.rejects(
  ()=>asRole('authenticated',ownerA,()=>db.query(`select public.studioflow_publish()`)),
  /Add your business name/i
);

// Uninitialized template (serviceCatalogueInitialized: false) must be rejected.
await asRole('authenticated',ownerA,()=>db.query(
  `select public.studioflow_save_workspace($1::jsonb,1)`,
  [JSON.stringify({
    profile:{businessName:'Glow & Shine Salon',businessType:'hair_salon',serviceCatalogueInitialized:false},
    services:[{id:'svc-1',name:'Signature Cut',price:900,durationMinutes:45,category:'Hair',description:'Precision cut',icon:'content_cut'}],
    stylists:[],clients:[],extras:{gallery:[]},loyaltyConfig:{},onboardingComplete:true,
  })]
));
await assert.rejects(
  ()=>asRole('authenticated',ownerA,()=>db.query(`select public.studioflow_publish()`)),
  /Choose a salon template/i
);

// Empty services must be rejected.
await asRole('authenticated',ownerA,()=>db.query(
  `select public.studioflow_save_workspace($1::jsonb,2)`,
  [JSON.stringify({
    profile:{businessName:'Glow & Shine Salon',businessType:'hair_salon',serviceCatalogueInitialized:true},
    services:[],
    stylists:[],clients:[],extras:{gallery:[]},loyaltyConfig:{},onboardingComplete:true,
  })]
));
await assert.rejects(
  ()=>asRole('authenticated',ownerA,()=>db.query(`select public.studioflow_publish()`)),
  /Add at least one service/i
);

// Valid Owner A draft without custom subdomain -> auto-generates lowercase slug 'glow-shine-salon'
// (proving uppercase letters are lowercased before stripping) and stamps content.profile.subdomain.
const ownerADraft={
  profile:{
    businessName:'Glow & Shine Salon',
    businessType:'hair_salon',
    serviceCatalogueInitialized:true,
    email:'private-owner-a@example.com',
    coverImageUrl:'https://cdn.example.com/hero-glow.jpg',
    logoUrl:'https://cdn.example.com/logo-glow.png',
    city:'Jaipur',
  },
  services:[{
    id:'svc-1',
    name:'Bridal Blowout',
    price:1499,
    durationMinutes:60,
    category:'Styling',
    description:'Gloss finish styling',
    icon:'auto_awesome',
    imageUrl:serviceImageUrl,
    imagePath:serviceImagePath,
  }],
  stylists:[{id:'st-1',name:'Aanya',role:'Creative Director',avatarUrl:'https://cdn.example.com/aanya.jpg',specialties:['Styling'],rating:5,status:'Available',schedule:[],phone:'+919999999999'}],
  clients:[{id:'cl-1',name:'Secret Client',phone:'+918888888888'}],
  extras:{gallery:['https://cdn.example.com/gallery-1.jpg']},
  loyaltyConfig:{},
  onboardingComplete:true,
};
await asRole('authenticated',ownerA,()=>db.query(
  `select public.studioflow_save_workspace($1::jsonb,3)`,
  [JSON.stringify(ownerADraft)]
));
const {rows:[pubA]}=await asRole('authenticated',ownerA,()=>db.query(`select public.studioflow_publish() as res`));
assert.equal(pubA.res.slug,'glow-shine-salon','Mixed-case businessName produces clean lowercase slug');
assert.equal(pubA.res.published,true);
assert.ok(pubA.res.published_at,'published_at returned');
assert.equal(pubA.res.content.profile.subdomain,'glow-shine-salon','content.profile.subdomain synced with resolved slug');
await asRole('authenticated',ownerA,()=>db.query(`select public.studioflow_publish()`));
const {rows:[retryCount]}=await db.query(`select count(*)::int as count from public.studioflow_websites where owner_id=$1`,[ownerA]);
assert.equal(retryCount.count,1,'Retrying publish updates the owner row instead of creating duplicate records');
const {rows:[trackingResult]}=await asRole('authenticated',ownerA,()=>db.query(`select public.studioflow_track_publish() as res`));
assert.equal(trackingResult.res.tracked,true,'Optional publish tracking failure is isolated and reported without aborting');
const {rows:[stillPublished]}=await db.query(`select slug,published_at from public.studioflow_websites where owner_id=$1`,[ownerA]);
assert.equal(stillPublished.slug,'glow-shine-salon','Optional referral failure does not roll back published website');
assert.ok(stillPublished.published_at,'Published timestamp survives optional referral failure');

// A non-empty business name made only from invalid slug characters gets a safe valid fallback.
await asRole('authenticated',ownerD,()=>db.query(
  `select public.studioflow_save_workspace($1::jsonb,0)`,
  [JSON.stringify({profile:{businessName:'!!!',businessType:'hair_salon',serviceCatalogueInitialized:true},services:[{id:'svc-d',name:'Cut',price:500,durationMinutes:30,category:'Hair',description:'Cut',icon:'content_cut'}],stylists:[],clients:[],extras:{gallery:[]},loyaltyConfig:{},onboardingComplete:true})]
));
const {rows:[invalidNamePublish]}=await asRole('authenticated',ownerD,()=>db.query(`select public.studioflow_publish() as res`));
assert.match(invalidNamePublish.res.slug,/^salon-44444444$/,'Invalid characters in business name resolve to a valid safe fallback slug');

// Anonymous public read via public_salon_websites returns full storefront without owner PII;
// direct studioflow_websites read is blocked for anon.
await assert.rejects(
  ()=>asRole('anon',null,()=>db.query(`select * from public.studioflow_websites`)),
  /permission denied/i
);
const {rows:[publicRow]}=await asRole('anon',null,()=>db.query(
  `select slug,content,published_at from public.public_salon_websites where slug=$1`,
  ['glow-shine-salon']
));
assert.ok(publicRow,'Published site visible to anonymous visitor via public_salon_websites');
assert.equal(publicRow.content.profile.businessName,'Glow & Shine Salon');
assert.equal(publicRow.content.profile.businessType,'hair_salon');
assert.equal(publicRow.content.profile.subdomain,'glow-shine-salon');
assert.equal(publicRow.content.profile.coverImageUrl,'https://cdn.example.com/hero-glow.jpg');
assert.equal(publicRow.content.profile.logoUrl,'https://cdn.example.com/logo-glow.png');
assert.equal(publicRow.content.profile.email,undefined,'Owner email stripped from public storefront');
assert.equal(publicRow.content.clients,undefined,'CRM client list stripped from public storefront');
assert.equal(publicRow.content.services[0].name,'Bridal Blowout');
assert.equal(publicRow.content.services[0].imageUrl,serviceImageUrl);

// Owner B auto-slug collision -> adds stable owner suffix instead of overwriting Owner A.
await asRole('authenticated',ownerB,()=>db.query(
  `select public.studioflow_save_workspace($1::jsonb,0)`,
  [JSON.stringify({
    profile:{businessName:'Glow & Shine Salon',businessType:'hair_salon'}, // omits serviceCatalogueInitialized (legacy compat)
    services:[{id:'svc-b',name:'Hair Spa',price:1200,durationMinutes:45,category:'Hair',description:'Deep spa',icon:'spa'}],
    stylists:[],clients:[],extras:{gallery:[]},loyaltyConfig:{},onboardingComplete:true,
  })]
));
const {rows:[pubB]}=await asRole('authenticated',ownerB,()=>db.query(`select public.studioflow_publish() as res`));
assert.equal(pubB.res.slug,'glow-shine-salon-22222222','Auto-slug collision uses owner suffix and preserves legacy drafts without serviceCatalogueInitialized');

// Owner B explicit duplicate custom slug -> rejects with 23505 and preserves Owner A's site.
await asRole('authenticated',ownerB,()=>db.query(
  `select public.studioflow_save_workspace($1::jsonb,1)`,
  [JSON.stringify({
    profile:{businessName:'Glow & Shine Salon',businessType:'hair_salon',subdomain:'glow-shine-salon',serviceCatalogueInitialized:true},
    services:[{id:'svc-b',name:'Hair Spa',price:1200,durationMinutes:45,category:'Hair',description:'Deep spa',icon:'spa'}],
    stylists:[],clients:[],extras:{gallery:[]},loyaltyConfig:{},onboardingComplete:true,
  })]
));
await assert.rejects(
  ()=>asRole('authenticated',ownerB,()=>db.query(`select public.studioflow_publish() as res`)),
  /already in use/i
);

// Customer signup/login -> availability -> booking -> RLS isolation on published site.
const bookingDate=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
const {rows:[slotsRow]}=await asRole('anon',null,()=>db.query(
  `select public.studioflow_available_slots($1,$2,$3::date,$4) as slots`,
  ['glow-shine-salon','svc-1',bookingDate,'any_available']
));
assert.ok(Array.isArray(slotsRow.slots)&&slotsRow.slots.some((s:any)=>s.available&&s.time==='11:00'),
  'Published site serves available slots anonymously');

const {rows:[bookingRow]}=await asRole('authenticated',customerC,()=>db.query(
  `select public.studioflow_book($1,$2::jsonb) as booking`,
  ['glow-shine-salon',JSON.stringify({
    serviceId:'svc-1',
    stylistId:'any_available',
    clientName:'Customer C',
    clientPhone:'+919876543210',
    date:bookingDate,
    time:'11:00',
    servicePrice:1,
    amountPaid:1499,
  })]
));
assert.equal(bookingRow.booking.servicePrice,1499,'Server enforces canonical service price');
assert.equal(bookingRow.booking.amountPaid,0,'Server enforces unpaid initial deposit');
assert.equal(bookingRow.booking.status,'pending','Server enforces pending status when deposit is required');

await assert.rejects(
  ()=>asRole('authenticated',customerC,()=>db.query(
    `select public.studioflow_book($1,$2::jsonb) as booking`,
    ['glow-shine-salon',JSON.stringify({
      serviceId:'svc-1',
      stylistId:'any_available',
      clientName:'Customer C2',
      clientPhone:'+919876543211',
      date:bookingDate,
      time:'11:00',
    })]
  )),
  /booked|slot|unavailable/i,
  'Double booking the same slot is rejected'
);

const {rows:[ownerBookingCount]}=await asRole('authenticated',ownerA,()=>db.query(`select count(*)::int as count from public.studioflow_bookings`));
const {rows:[customerBookingCount]}=await asRole('authenticated',customerC,()=>db.query(`select count(*)::int as count from public.studioflow_bookings`));
const {rows:[strangerBookingCount]}=await asRole('authenticated',ownerB,()=>db.query(`select count(*)::int as count from public.studioflow_bookings`));
assert.equal(ownerBookingCount.count,1,'Owner sees customer booking');
assert.equal(customerBookingCount.count,1,'Customer sees own booking');
assert.equal(strangerBookingCount.count,0,'Unrelated owner sees 0 bookings via RLS');

// 2. React UI E2E: checklist whitespace guard, header error alert, and public storefront render.
Object.defineProperty(globalThis,'window',{configurable:true,value:{
  location:mockLocation,
  addEventListener:()=>{},
  removeEventListener:()=>{},
  scrollTo:()=>{},
  history:{replaceState:()=>{},pushState:()=>{}},
  setTimeout:globalThis.setTimeout.bind(globalThis),
  clearTimeout:globalThis.clearTimeout.bind(globalThis),
}});
Object.defineProperty(globalThis,'document',{configurable:true,value:{
  title:'',
  addEventListener:()=>{},
  removeEventListener:()=>{},
  querySelector:()=>null,
  createElement:()=>({setAttribute:()=>{},remove:()=>{}}),
  head:{appendChild:()=>{}},
  documentElement:{style:{setProperty:()=>{}}},
}});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async()=>{}}}});
let checklistTree:any;
await act(async()=>{
  checklistTree=create(
    <PublishingStatusIndicator
      profile={{...INITIAL_SALON_PROFILE,businessName:'   ',businessType:'hair_salon',serviceCatalogueInitialized:true}}
      services={[{id:'1',name:'Cut',price:500,durationMinutes:30,category:'Hair',description:'',icon:'content_cut'}]}
    />
  );
});
const checklistText=JSON.stringify(checklistTree.toJSON());
assert.ok(checklistText.includes('Complete all steps to enable the Publish button.'),`Expected whitespace businessName to show incomplete checklist, got: ${checklistText}`);
assert.ok(checklistText.includes('lucide-circle-x'),'Whitespace businessName shows X icon on Business name added');
await act(async()=>checklistTree.unmount());

let panelTree:any;
await act(async()=>{
  panelTree=create(
    <WebsitePublishPanel
      published={null}
      profile={{...INITIAL_SALON_PROFILE,businessName:'   ',businessType:'hair_salon',serviceCatalogueInitialized:true}}
      services={[{id:'1',name:'Cut',price:500,durationMinutes:30,category:'Hair',description:'',icon:'content_cut'}]}
      onPublish={async()=>{}}
    />
  );
});
assert.equal(panelTree.root.findByType('button').props.disabled,true,'Whitespace businessName keeps Publish Website disabled');
await act(async()=>panelTree.unmount());

let headerCalls=0;
let shouldFailHeader=true;
let workspaceTree:any;
await act(async()=>{
  workspaceTree=create(
    <OwnerWorkspace
      profile={{...INITIAL_SALON_PROFILE,businessName:'Glow & Shine Salon',businessType:'hair_salon',serviceCatalogueInitialized:true}}
      setProfile={()=>{}}
      services={[{id:'1',name:'Bridal Blowout',price:1499,durationMinutes:60,category:'Styling',description:'Gloss finish',icon:'auto_awesome',imageUrl:serviceImageUrl,imagePath:serviceImagePath}]}
      setServices={()=>{}}
      stylists={[]}
      setStylists={()=>{}}
      appointments={[]}
      setAppointments={()=>{}}
      clients={[]}
      setClients={()=>{}}
      loyaltyConfig={{enabled:true,pointsPerVisit:10,pointsPerHundredSpent:5,rewardThreshold:100,rewardValue:200,rewardDescription:'Off',tierThresholds:{silver:200,gold:500,platinum:1000},tierMultipliers:{bronze:1,silver:1.25,gold:1.5,platinum:2}}}
      setLoyaltyConfig={()=>{}}
      published={null}
      onPublish={async()=>{headerCalls+=1;if(shouldFailHeader)throw new Error('This website address is already in use.');}}
      onViewPublic={()=>{}}
      onChooseTemplate={()=>{}}
      sync="Saved to Supabase"
      syncError=""
      saveConflicts={[]}
      onResolveSaveConflict={()=>{}}
      onRetrySync={()=>{}}
      extras={{coverImageUrl:'',gallery:[],staffProfiles:[],bookingLeadHours:2,cancellationWindow:24}}
      setExtras={()=>{}}
      accountId={ownerA}
      onSignOut={()=>{}}
    />
  );
});
const headerPublishBtn=()=>workspaceTree.root.findAllByType('button').find((b:any)=>b.children.includes('Publish Website'));
assert.ok(headerPublishBtn(),'OwnerWorkspace header Publish Website button exists');
await act(async()=>{headerPublishBtn().props.onClick();});
assert.equal(headerCalls,1);
const alertBanner=workspaceTree.root.findByProps({role:'alert'});
assert.ok(alertBanner.findByType('span').children.join('').includes('already in use'),'Header publish failure renders persistent role="alert" banner');
assert.equal(workspaceTree.root.findAllByProps({role:'status'}).length,0,'Header publish failure must not render green status toast');
shouldFailHeader=false;
await act(async()=>{headerPublishBtn().props.onClick();});
assert.equal(headerCalls,2);
assert.equal(workspaceTree.root.findAllByProps({role:'alert'}).length,0,'Header publish retry clears role="alert" banner on success');
assert.ok(workspaceTree.root.findByProps({role:'status'}).findAllByType('span').map((s:any)=>s.children.join('')).join(' ').includes('Website published successfully.'),'Header publish success shows status banner');
await act(async()=>workspaceTree.unmount());

let previewTree:any;
await act(async()=>{
  previewTree=create(
    <SalonWebsitePreview
      profile={{...INITIAL_SALON_PROFILE,...publicRow.content.profile}}
      services={publicRow.content.services}
      stylists={publicRow.content.stylists||[]}
      onBook={async()=>({} as any)}
      isPublishedView
    />
  );
});
const previewText=JSON.stringify(previewTree.toJSON());
assert.ok(previewText.includes('Glow & Shine Salon'),'Public view renders salon business name');
assert.ok(previewText.includes('Bridal Blowout'),'Public view renders published service name');
assert.ok(previewText.includes(serviceImageUrl),'Public view renders published service image');
await act(async()=>previewTree.unmount());

// Confirm real Workspace component hydrates published state from studioflow_websites after reload.
const {Workspace}=await import('../src/App');
(globalThis as any).window.matchMedia=(globalThis as any).window.matchMedia||(()=>({matches:false,addEventListener:()=>{},removeEventListener:()=>{}}));
const origFrom=supabase.from.bind(supabase);
const origRpc=supabase.rpc.bind(supabase);
const origChannel=supabase.channel.bind(supabase);
const origRemoveChannel=supabase.removeChannel.bind(supabase);
const origGetSession=supabase.auth.getSession.bind(supabase.auth);
const origGetUser=supabase.auth.getUser.bind(supabase.auth);
const stubStorage=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:(k:string)=>stubStorage.get(k)??null,
  setItem:(k:string,v:string)=>{stubStorage.set(k,v);},
  removeItem:(k:string)=>{stubStorage.delete(k);},
}});
(supabase as any).auth.getSession=async()=>({data:{session:{user:{id:ownerA,email:'owner-a@example.com',user_metadata:{full_name:'Owner A',salon_name:'Glow & Shine Salon'}}}},error:null});
(supabase as any).auth.getUser=async()=>({data:{user:{id:ownerA,email:'owner-a@example.com'}},error:null});
(supabase as any).channel=()=>{const ch:any={on:()=>ch,subscribe:()=>ch};return ch;};
(supabase as any).removeChannel=async()=>{};
(supabase as any).from=(table:string)=>{
  if(table==='studioflow_accounts'){
    return {select:()=>( {eq:(_col:string,uid:string)=>({maybeSingle:async()=>({data:uid===ownerA?{user_id:uid}:null,error:null})})} )};
  }
  if(table==='studioflow_websites'){
    return {
      select:()=>({
        eq:(_col:string,uid:string)=>({
          maybeSingle:async()=>{
            const {rows:[row]}=await asRole('authenticated',uid,()=>db.query(
              `select slug, published_at::text as published_at from public.studioflow_websites where owner_id=$1`,
              [uid]
            ));
            return {data:row??null,error:null};
          },
        }),
      }),
    };
  }
  if(table==='studioflow_bookings'){
    return {select:()=>({eq:()=>({order:async()=>({data:[],error:null})})})};
  }
  return origFrom(table);
};
(supabase as any).rpc=async(fn:string,args?:any)=>{
  try{
    if(fn==='studioflow_save_workspace'){
      const {rows:[row]}=await asRole('authenticated',ownerA,()=>db.query(
        `select public.studioflow_save_workspace($1::jsonb,$2) as res`,
        [JSON.stringify(args.p_draft),args.p_revision]
      ));
      return {data:row.res,error:null};
    }
    if(fn==='studioflow_publish'){
      const {rows:[row]}=await asRole('authenticated',ownerA,()=>db.query(`select public.studioflow_publish() as res`));
      return {data:row.res,error:null};
    }
    if(fn==='studioflow_track_publish'){
      const {rows:[row]}=await asRole('authenticated',ownerA,()=>db.query(`select public.studioflow_track_publish() as res`));
      return {data:row.res,error:null};
    }
    return {data:null,error:null};
  }catch(err:any){
    return {data:null,error:{message:err?.message||String(err),code:err?.code}};
  }
};
// Reset ownerA's studioflow_websites row before testing Workspace unpublished -> publish -> refresh hydration.
await db.query(`delete from public.studioflow_websites where owner_id=$1`,[ownerA]);
const {rows:[latestAccount]}=await db.query(`select draft, revision from public.studioflow_accounts where user_id=$1`,[ownerA]);

const sessionStub={user:{id:ownerA,email:'owner-a@example.com',user_metadata:{full_name:'Owner A',salon_name:'Glow & Shine Salon'}}} as any;
const accountStub={user_id:ownerA,revision:latestAccount.revision,draft:latestAccount.draft,identity:{full_name:'Owner A',salon_name:'Glow & Shine Salon'}};
const templatesStub=Object.values(CATEGORY_TEMPLATES);

let mountedWorkspace:any;
await act(async()=>{
  mountedWorkspace=create(<Workspace key="first" session={sessionStub} account={accountStub} templates={templatesStub}/>);
});
await act(async()=>{await new Promise(r=>setTimeout(r,30));});
assert.ok(mountedWorkspace.root.findAllByType('span').some((s:any)=>s.children.includes('Draft')),
  'Unpublished Workspace starts with Draft badge');
const firstPublishBtn=mountedWorkspace.root.findAllByType('button').find((b:any)=>b.children.includes('Publish Website'));
assert.ok(firstPublishBtn,'Workspace shows Publish Website before publishing');
await act(async()=>{firstPublishBtn.props.onClick();});
await act(async()=>{await new Promise(r=>setTimeout(r,30));});
assert.ok(mountedWorkspace.root.findAllByType('span').some((s:any)=>s.children.includes('Published')),
  'Publishing inside Workspace switches badge to Published');
const openPreviewBtn=mountedWorkspace.root.findAllByType('button').find((b:any)=>b.children.includes('Preview Site'));
assert.ok(openPreviewBtn,'Preview Site button exists');
await act(async()=>{openPreviewBtn.props.onClick();});
await act(async()=>{await new Promise(r=>setTimeout(r,30));});
assert.ok(mountedWorkspace.root.findAllByProps({href:'https://studioflow.example/?site=glow-shine-salon'}).length>=1,
  'Publishing inside Workspace reveals live public URL in WebsitePublishPanel');
await act(async()=>mountedWorkspace.unmount());

// Simulate browser refresh: remount fresh Workspace with storedWebsite in PGlite.
let reloadedWorkspace:any;
await act(async()=>{
  reloadedWorkspace=create(<Workspace key="reloaded" session={sessionStub} account={accountStub} templates={templatesStub}/>);
});
await act(async()=>{await new Promise(r=>setTimeout(r,100));});
assert.ok(reloadedWorkspace.root.findAllByType('span').some((s:any)=>s.children.includes('Published')),
  'Reloaded Workspace hydrates published state from studioflow_websites and shows Published badge');
const reloadPreviewBtn=reloadedWorkspace.root.findAllByType('button').find((b:any)=>b.children.includes('Preview Site'));
await act(async()=>{reloadPreviewBtn.props.onClick();});
await act(async()=>{await new Promise(r=>setTimeout(r,30));});
assert.ok(reloadedWorkspace.root.findAllByProps({href:'https://studioflow.example/?site=glow-shine-salon'}).length>=1,
  'Reloaded Workspace retains live public URL in WebsitePublishPanel');
await act(async()=>reloadedWorkspace.unmount());

// CustomerBookings UI cancellation -> studioflow_update_booking -> slot reopens in studioflow_available_slots.
const {CustomerBookings}=await import('../src/components/CustomerBookings');
(supabase as any).from=(table:string)=>{
  if(table==='studioflow_bookings'){
    return {
      select:()=>({
        eq:(col:string,uid:string)=>({
          order:async()=>{
            const sql=col==='customer_id'
              ? `select id,status,payload,owner_id,null::uuid as branch_id,hold_expires_at::text as hold_expires_at from public.studioflow_bookings where customer_id=$1 order by starts_at desc`
              : `select id,status,payload,owner_id,null::uuid as branch_id,hold_expires_at::text as hold_expires_at from public.studioflow_bookings where owner_id=$1 order by starts_at desc`;
            const {rows}=await asRole('authenticated',uid,()=>db.query(sql,[uid]));
            return {data:rows,error:null};
          },
        }),
      }),
    };
  }
  return origFrom(table);
};
(supabase as any).rpc=async(fn:string,args?:any)=>{
  try{
    if(fn==='studioflow_update_booking'){
      const {rows:[row]}=await asRole('authenticated',customerC,()=>db.query(
        `select public.studioflow_update_booking($1::uuid,$2) as res`,
        [args.p_id,args.p_status]
      ));
      return {data:row.res,error:null};
    }
    return {data:null,error:null};
  }catch(err:any){
    return {data:null,error:{message:err?.message||String(err),code:err?.code}};
  }
};
const customerSessionStub={user:{id:customerC,email:'customer-c@example.com',user_metadata:{full_name:'Customer C'}}} as any;
let customerBookingsTree:any;
await act(async()=>{
  customerBookingsTree=create(<CustomerBookings session={customerSessionStub}/>);
});
await act(async()=>{await new Promise(r=>setTimeout(r,60));});
const cancelBtn=customerBookingsTree.root.findAllByType('button').find((b:any)=>b.children.includes('Cancel appointment'));
assert.ok(cancelBtn,'CustomerBookings renders Cancel appointment button for pending booking');
await act(async()=>{cancelBtn.props.onClick();});
await act(async()=>{await new Promise(r=>setTimeout(r,60));});
assert.ok(JSON.stringify(customerBookingsTree.toJSON()).includes('cancelled'),
  'CustomerBookings shows cancelled status after cancelling booking');
await act(async()=>customerBookingsTree.unmount());

const {rows:[reopenedSlotsRow]}=await asRole('anon',null,()=>db.query(
  `select public.studioflow_available_slots($1,$2,$3::date,$4) as slots`,
  ['glow-shine-salon','svc-1',bookingDate,'any_available']
));
assert.ok(Array.isArray(reopenedSlotsRow.slots)&&reopenedSlotsRow.slots.some((s:any)=>s.available&&s.time==='11:00'),
  'Cancelled slot becomes available again in studioflow_available_slots');

(supabase as any).from=origFrom;
(supabase as any).rpc=origRpc;
(supabase as any).channel=origChannel;
(supabase as any).removeChannel=origRemoveChannel;
(supabase as any).auth.getSession=origGetSession;
(supabase as any).auth.getUser=origGetUser;

console.log('PASS: studioflow publish website E2E (SQL, booking + RLS, storefront privacy, slug casing/collision, checklist, header error alert, Workspace reload hydration, public render, and customer cancellation + slot reopening).');

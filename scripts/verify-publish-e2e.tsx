import React from 'react';
import {act,create} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {PublishingStatusIndicator} from '../src/components/PublishingStatusIndicator';
import {WebsitePublishPanel} from '../src/components/WebsitePublishPanel';
import {OwnerWorkspace} from '../src/components/OwnerWorkspace';
import {SalonWebsitePreview} from '../src/components/SalonWebsitePreview';
import {INITIAL_SALON_PROFILE} from '../src/mockData';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const mockLocation={origin:'https://studioflow.example',search:'',pathname:'/'};
(globalThis as any).location=mockLocation;

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
]){
  await applySql(file);
}

const ownerA='11111111-1111-4111-8111-111111111111';
const ownerB='22222222-2222-4222-8222-222222222222';
const serviceImagePath=`${ownerA}/services/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`;
const serviceImageUrl=`https://zilwgiuiygqqardzutxi.supabase.co/storage/v1/object/public/studioflow-media/${serviceImagePath}`;
await db.query(`insert into auth.users(id,email) values($1,'owner-a@example.com'),($2,'owner-b@example.com')`,[ownerA,ownerB]);
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

// Confirm src/App.tsx includes studioflow_websites hydration guard on mount.
const appSrc=readFileSync('src/App.tsx','utf8');
assert.match(appSrc,/from\('studioflow_websites'\)\.select\('slug,published_at'\)\.eq\('owner_id',session\.user\.id\)\.maybeSingle\(\)/,
  'src/App.tsx hydrates published website state from studioflow_websites on mount');

console.log('PASS: studioflow publish website E2E (SQL, RLS, storefront privacy, slug casing/collision, checklist, header error alert, hydration, and public render).');

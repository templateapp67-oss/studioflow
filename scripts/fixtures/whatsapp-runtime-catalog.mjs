import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

// Minimal recorded StudioFlow baseline for exercising the WhatsApp delta.
// This is intentionally not a claim that the repository reconstructs every
// historical production migration. No live migration history is rewritten.
export async function verifyWhatsAppRuntimeCatalog(db) {
  await db.exec(`
    create schema studioflow_private;
    create schema vault;
    create schema extensions;
    create table vault.secrets(id uuid primary key default gen_random_uuid(),name text,secret text,description text);
    create view vault.decrypted_secrets as select name,secret as decrypted_secret from vault.secrets;
    create function vault.create_secret(secret text,name text,description text) returns uuid language sql as $$
      insert into vault.secrets(secret,name,description) values(secret,name,description) returning id$$;
    create function extensions.gen_random_bytes(n integer) returns bytea language sql as $$select decode(repeat('01',n),'hex')$$;
    create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
    alter table auth.users add column phone text;
    create table profiles(id uuid primary key,phone text,phone_number text,whatsapp text);
    create table studioflow_android_profiles(customer_id uuid primary key,phone text,whatsapp_number text);
    create table studioflow_websites(owner_id uuid primary key,slug text,content jsonb);
    create table branches(id uuid primary key,site_id uuid,name text,is_active boolean);
    create table studioflow_android_requests(customer_id uuid,request_id uuid,fingerprint text,booking_id uuid,primary key(customer_id,request_id));
    alter table studioflow_bookings add column owner_id uuid,add column customer_id uuid,add column stylist_id text,
      add column starts_at timestamptz,add column ends_at timestamptz,add column status text,add column payload jsonb,
      add column hold_expires_at timestamptz,add column branch_id uuid,add column booking_source text,
      add column external_idempotency_key text,add column created_at timestamptz default now();
    alter table studioflow_payment_orders add column order_id text unique,add column payment_id text,
      add column amount_paise bigint,add column currency text,add column status text;
    create function public.studioflow_android_slots(text,jsonb,date,text) returns jsonb language sql as $$select '[]'::jsonb$$;
    create function public.studioflow_branch_android_slots(text,jsonb,date,text,uuid) returns jsonb language sql as $$select '[]'::jsonb$$;
  `);
  const files=readdirSync('supabase/migrations').filter(name=>/^20261116.*nexora_whatsapp_.*\.sql$/.test(name)).sort();
  for (const name of files) await db.exec(readFileSync('supabase/migrations/'+name,'utf8'));
  const owner='00000000-0000-4000-8000-000000000001';
  await db.query('update auth.users set phone=$1 where id=$2',['+919999999999',owner]);
  await db.exec(`insert into vault.secrets(name,secret) values('nexora_whatsapp_meta_app_secret','fixture-app-secret');
    grant usage on schema public to service_role; set role service_role;
    select set_config('request.jwt.claim.role','service_role',false);`);
  assert.equal((await db.query(`select public.nexora_whatsapp_find_customer('+919999999999') id`)).rows[0].id,owner);
  assert.equal((await db.query(`select public.nexora_whatsapp_meta_secret('nexora_whatsapp_meta_app_secret') secret`)).rows[0].secret,'fixture-app-secret');
  assert.equal((await db.query(`select public.nexora_whatsapp_meta_secret('unrelated-secret') secret`)).rows[0].secret,null);
  assert.equal(typeof (await db.query(`select public.nexora_whatsapp_token_key() secret`)).rows[0].secret,'string');
  await db.exec('reset role');
  const {rows}=await db.query(`select n.nspname,p.proname,
    has_function_privilege('anon',p.oid,'EXECUTE') anon_access,
    has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_access,
    has_function_privilege('service_role',p.oid,'EXECUTE') server_access
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where p.proname like '%whatsapp%' and n.nspname in ('public','studioflow_private','studioflow_whatsapp_private')`);
  for(const row of rows){
    assert.equal(row.anon_access,false,row.proname+' anon');
    assert.equal(row.authenticated_access,false,row.proname+' authenticated');
    assert.equal(row.server_access,true,row.proname+' service_role');
  }
  // The registration RPC must preserve the winner's link on a duplicate request.
  const booking='00000000-0000-4000-8000-000000000010';
  await db.query(`insert into studioflow_bookings(id,owner_id,status,booking_source,hold_expires_at,payload)
    values($1,$2,'pending','whatsapp',now()+interval '15 minutes','{"servicePrice":100}')`,[booking,owner]);
  const register=async(link,tenant=owner)=>db.query(`select public.studioflow_whatsapp_register_payment_link($1,$2,$3,2500,$4,$5,0) result`,
    [tenant,booking,'wa_link_'+link,link,'https://rzp.io/'+link]);
  const first=(await register('plink_FIRST')).rows[0].result;
  const second=(await register('plink_SECOND')).rows[0].result;
  assert.equal(first.payment_link_id,'plink_FIRST');
  assert.equal(second.payment_link_id,'plink_FIRST');
  await assert.rejects(register('plink_OTHER','00000000-0000-4000-8000-000000000002'),/not found/i);
  // Exercise reservation creation, replay and tenant validation after the
  // phone match, using a deterministic availability provider fixture.
  await db.exec(`
    create or replace function public.studioflow_android_slots(text,jsonb,date,text) returns jsonb language sql as $$
      select '[{"time":"10:30","stylistId":"staff-a","stylistName":"Stylist A","available":true}]'::jsonb$$;
    update salon_whatsapp_connections set connection_status='connected',webhook_subscribed=true;
    insert into studioflow_websites(owner_id,slug,content) values('${owner}','salon-test',
      '{"services":[{"id":"svc-a","name":"Haircut","price":100,"durationMinutes":30}]}');
  `);
  const request='00000000-0000-4000-8000-000000000020';
  const reserve=(tenant=owner)=>db.query(`select public.nexora_whatsapp_book_guest($1,'salon-test','["svc-a"]',
    (now() at time zone 'Asia/Kolkata')::date+1,'10:30','any','Test Customer','+919999999999','',$2,$3,null) result`,
    [tenant,request,owner]);
  const booked=(await reserve()).rows[0].result;
  assert.ok(booked.id);
  assert.equal(booked.status,'pending');
  assert.equal((await reserve()).rows[0].result.id,booked.id,'replayed request must reuse its reservation');
  await assert.rejects(reserve('00000000-0000-4000-8000-000000000002'),/not published/i);
  await db.exec('set role authenticated');
  await assert.rejects(db.query(`select public.nexora_whatsapp_token_key()`),/permission denied/i);
  await db.exec('reset role');
  console.log('PASS: '+files.length+' WhatsApp runtime migrations apply against the recorded baseline; service-role Vault/customer RPCs execute, browser roles denied, cross-owner link rejected and duplicate link preserved.');
}

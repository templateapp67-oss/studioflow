begin;
do $$
declare client uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); w public.studioflow_websites; other_owner uuid; d date; options jsonb; chosen jsonb; made jsonb; denied boolean; real_count int;
begin
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values(client,'authenticated','authenticated',client::text||'@owner-demo-qa.invalid','{}','{}'),(stranger,'authenticated','authenticated',stranger::text||'@owner-demo-qa.invalid','{}','{}');
select * into w from public.studioflow_websites where slug not like 'studioflow-qa-%' limit 1;
select owner_id into other_owner from public.studioflow_websites where owner_id<>w.owner_id limit 1;
select count(*) into real_count from public.studioflow_bookings;
for n in 1..7 loop d:=(now() at time zone 'Asia/Kolkata')::date+n;options:=public.studioflow_android_slots(w.slug,jsonb_build_array(w.content->'services'->0->>'id'),d,'any');exit when jsonb_array_length(options)>0;end loop;chosen:=options->0;
perform set_config('request.jwt.claim.sub',client::text,true);execute 'set local role authenticated';
made:=public.studioflow_demo_book(w.slug,jsonb_build_array(w.content->'services'->0->>'id'),d,chosen->>'time',chosen->>'stylistId','Owner Delivery QA','9876543210',gen_random_uuid());
perform set_config('request.jwt.claim.sub',coalesce(other_owner,stranger)::text,true);
if exists(select 1 from public.studioflow_demo_bookings where id=(made->>'id')::uuid) then raise exception 'Wrong salon owner received demo';end if;
update public.studioflow_demo_bookings set status='cancelled' where id=(made->>'id')::uuid;
perform set_config('request.jwt.claim.sub',w.owner_id::text,true);
if not exists(select 1 from public.studioflow_demo_bookings where id=(made->>'id')::uuid and owner_id=w.owner_id and payload->>'clientName'='Owner Delivery QA' and status='confirmed') then raise exception 'Shop owner did not receive customer demo';end if;
denied:=false;begin update public.studioflow_demo_bookings set payload='{}' where id=(made->>'id')::uuid;exception when insufficient_privilege then denied:=true;end;
if not denied then raise exception 'Owner edited protected demo payload';end if;
update public.studioflow_demo_bookings set status='completed' where id=(made->>'id')::uuid;
perform set_config('request.jwt.claim.sub',client::text,true);
if not exists(select 1 from public.studioflow_demo_bookings where id=(made->>'id')::uuid and status='completed') then raise exception 'Customer cannot see owner completion';end if;
execute 'set local role postgres';
if(select count(*) from public.studioflow_bookings)<>real_count then raise exception 'Demo owner changed real bookings';end if;
end $$;
rollback;
select 'PASS: customer demo delivered to correct shop owner; wrong owner read/update denied; owner completion visible to customer; payload immutable; real bookings untouched; fixtures rolled back' as verification;

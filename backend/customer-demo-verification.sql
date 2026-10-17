begin;
do $$
declare actor uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); w public.studioflow_websites; d date; chosen jsonb; options jsonb; made jsonb; again jsonb; request uuid:=gen_random_uuid(); original_slots jsonb; denied boolean; real_count int;
begin
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values(actor,'authenticated','authenticated',actor::text||'@demo-qa.invalid','{}','{}'),(stranger,'authenticated','authenticated',stranger::text||'@demo-qa.invalid','{}','{}');
select * into w from public.studioflow_websites where slug not like 'studioflow-qa-%' limit 1;
for n in 1..7 loop d:=(now() at time zone 'Asia/Kolkata')::date+n;options:=public.studioflow_android_slots(w.slug,jsonb_build_array(w.content->'services'->0->>'id'),d,'any');exit when jsonb_array_length(options)>0;end loop;
chosen:=options->0;if chosen is null then raise exception 'No fixture time';end if;original_slots:=options;
select count(*) into real_count from public.studioflow_bookings;
perform set_config('request.jwt.claim.sub',actor::text,true);execute 'set local role authenticated';
made:=public.studioflow_demo_book(w.slug,jsonb_build_array(w.content->'services'->0->>'id'),d,chosen->>'time',chosen->>'stylistId','Demo Tester','9876543210',request);
if made->>'status'<>'confirmed' or made->'payload'->>'demo'<>'true' or (made->'payload'->>'servicePrice')::numeric<>0 or (made->'payload'->>'amountPaid')::numeric<>0 then raise exception 'Bad demo record';end if;
again:=public.studioflow_demo_book(w.slug,jsonb_build_array(w.content->'services'->0->>'id'),d,chosen->>'time',chosen->>'stylistId','Demo Tester','9876543210',request);
if again->>'id'<>made->>'id' then raise exception 'Demo retry duplicated';end if;
if public.studioflow_android_slots(w.slug,jsonb_build_array(w.content->'services'->0->>'id'),d,'any')<>original_slots then raise exception 'Demo blocked a real slot';end if;
perform set_config('request.jwt.claim.sub',stranger::text,true);
if exists(select 1 from public.studioflow_demo_bookings where id=(made->>'id')::uuid) then raise exception 'Demo private data leaked';end if;
update public.studioflow_demo_bookings set status='cancelled' where id=(made->>'id')::uuid;
perform set_config('request.jwt.claim.sub',actor::text,true);
if not exists(select 1 from public.studioflow_demo_bookings where id=(made->>'id')::uuid and status='confirmed') then raise exception 'Another account cancelled demo';end if;
denied:=false;begin update public.studioflow_demo_bookings set payload='{}' where id=(made->>'id')::uuid;exception when insufficient_privilege then denied:=true;end;
if not denied then raise exception 'Demo payload change permitted';end if;
update public.studioflow_demo_bookings set status='cancelled' where id=(made->>'id')::uuid;
execute 'set local role postgres';
if(select count(*) from public.studioflow_bookings)<>real_count then raise exception 'Demo inserted real booking';end if;
if exists(select 1 from public.studioflow_payment_orders where booking_id=(made->>'id')::uuid) then raise exception 'Demo generated payment';end if;
end $$;
rollback;
select 'PASS: isolated ₹0 demo saved and idempotent; real slots/bookings/payment tables unchanged; cross-user reads/cancel blocked; immutable payload; own cancellation; fixtures rolled back' as verification;

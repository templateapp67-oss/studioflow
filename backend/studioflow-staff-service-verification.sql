begin;
do $$
declare w public.studioflow_websites; a public.studioflow_accounts; staff jsonb; service text; other_service text; d date; slots jsonb; chosen jsonb; client uuid:=gen_random_uuid(); booked jsonb;
begin
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values(client,'authenticated','authenticated',client::text||'@booking-regression.invalid','{}','{}');
for w in select * from public.studioflow_websites where slug not like 'studioflow-qa-%' loop
 select * into a from public.studioflow_accounts where user_id=w.owner_id;
 service:=w.content->'services'->0->>'id';other_service:=w.content->'services'->1->>'id';
 for n in 1..7 loop
 d:=(now() at time zone 'Asia/Kolkata')::date+n;
 slots:=public.studioflow_android_slots(w.slug,jsonb_build_array(service),d,'any');exit when jsonb_array_length(slots)>0;
 end loop;
 if jsonb_array_length(slots)=0 then raise exception 'No real-menu slots for %',w.slug;end if;
 chosen:=slots->0;
 perform set_config('request.jwt.claim.sub',client::text,true);execute 'set local role authenticated';
 booked:=public.studioflow_android_book(w.slug,jsonb_build_array(service),d,chosen->>'time',chosen->>'stylistId','Regression Test','9876543210','Rollback-only booking',gen_random_uuid());
 if booked->>'status'<>'pending' then raise exception 'Unpaid booking confirmed';end if;
 execute 'set local role postgres';
 perform set_config('request.jwt.claim.sub',w.owner_id::text,true);
 update public.studioflow_bookings set status='cancelled' where id=(booked->>'id')::uuid;
 select jsonb_agg(jsonb_set(e,'{assignedServices}',jsonb_build_array(service))) into staff from jsonb_array_elements(a.draft->'stylists') e;
 update public.studioflow_accounts set draft=jsonb_set(draft,'{stylists}',staff) where user_id=w.owner_id;
 if jsonb_array_length(public.studioflow_android_slots(w.slug,jsonb_build_array(other_service),d,'any'))<>0 then raise exception 'App ignored service restrictions';end if;
 if exists(select 1 from jsonb_array_elements(public.studioflow_available_slots(w.slug,other_service,d,'any')) v where (v->>'available')::boolean) then raise exception 'Website ignored service restrictions';end if;
 update public.studioflow_accounts set draft=a.draft where user_id=w.owner_id;
end loop;
end $$;
rollback;
select 'PASS: both real salon menus can reserve pending appointments; explicit service restrictions enforced by website and app; fixtures rolled back' as verification;

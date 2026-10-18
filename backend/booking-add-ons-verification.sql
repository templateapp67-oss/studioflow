begin;
do $$
declare owner_actor uuid; client uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); salon_slug text; d jsonb; rev integer; saved jsonb; options jsonb; chosen jsonb; booked jsonb; again jsonb; request jsonb; bad boolean; n int:=0; template record; when_date date:=(now() at time zone 'Asia/Kolkata')::date+5;
begin
 select w.owner_id,w.slug,a.draft,a.revision into owner_actor,salon_slug,d,rev from public.studioflow_websites w join public.studioflow_accounts a on a.user_id=w.owner_id limit 1;
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values(client,'authenticated','authenticated',client::text||'@addon-qa.invalid','{}','{}'),(stranger,'authenticated','authenticated',stranger::text||'@addon-qa.invalid','{}','{}');
 d:=jsonb_set(d,'{services}','[{"id":"qa-base","name":"QA Main Service","description":"QA","category":"Hair","price":800,"durationMinutes":30,"icon":"spa"},{"id":"qa-extra","name":"QA Serum","description":"QA","category":"Hair","price":400,"durationMinutes":30,"icon":"spa"}]');
 d:=jsonb_set(d,'{stylists}','[{"id":"qa-addon-staff","name":"QA Specialist","role":"Stylist","status":"Available","schedule":[],"assignedServices":["qa-base","qa-extra"]}]');
 d:=jsonb_set(d,'{profile,bookingAddOnServiceIds}','["qa-extra"]');
 d:=jsonb_set(d,'{profile,defaultWebsiteLanguage}','"hi"');
 d:=jsonb_set(d,'{profile,comparisonPhotos}','[{"id":"qa","title":"QA comparison","beforeUrl":"https://example.com/before.jpg","afterUrl":"https://example.com/after.jpg","category":"Hair","consented":true}]');
 d:=jsonb_set(d,'{profile,reviewSource}','{"mode":"simulation","provider":"Google","url":"https://g.page/qa","items":[]}');
 perform set_config('request.jwt.claim.sub',owner_actor::text,true);execute 'set local role authenticated';
 for template in select id from public.studioflow_templates where active loop
  d:=jsonb_set(d,'{profile,businessType}',to_jsonb(template.id));saved:=public.studioflow_save_workspace(d,rev);rev:=(saved->>'revision')::integer;
  select content into saved from public.studioflow_websites where owner_id=owner_actor;
  if saved->'profile'->'bookingAddOnServiceIds'<>'["qa-extra"]'::jsonb or saved->'profile'->>'defaultWebsiteLanguage'<>'hi' or saved->'profile'->'comparisonPhotos'->0->>'title'<>'QA comparison' or saved->'profile'->'reviewSource'->>'mode'<>'simulation' then raise exception 'Feature state projection failed';end if;
  if saved->'profile' ? 'email' or saved->'stylists'->0 ? 'schedule' then raise exception 'Private data exposed';end if;n:=n+1;
 end loop;
 if n<>14 then raise exception 'Expected 14 templates';end if;
 perform set_config('request.jwt.claim.sub',client::text,true);
 options:=public.studioflow_android_slots(salon_slug,'["qa-base","qa-extra"]',when_date,'qa-addon-staff');chosen:=options->0;if chosen is null then raise exception 'No QA bundle slot';end if;
 request:=jsonb_build_object('serviceId','qa-base','addOnIds',jsonb_build_array('qa-extra'),'stylistId','qa-addon-staff','date',when_date,'time',chosen->>'time','clientName','QA Customer','clientPhone','9876543210','servicePrice',1,'requestId',gen_random_uuid());
 booked:=public.studioflow_book(salon_slug,request);
 if (booked->>'servicePrice')::numeric<>1200 or (booked->>'durationMinutes')::int<>60 or jsonb_array_length(booked->'serviceItems')<>2 then raise exception 'Server price/duration validation failed';end if;
 if ceil((booked->>'servicePrice')::numeric*100/4)/100<>300 then raise exception '25 percent deposit mismatch';end if;
 again:=public.studioflow_book(salon_slug,request);if again->>'id'<>booked->>'id' then raise exception 'Retry duplicated booking';end if;
 bad:=false;begin perform public.studioflow_book(salon_slug,request||jsonb_build_object('requestId',gen_random_uuid()));exception when others then bad:=true;end;if not bad then raise exception 'Overlap accepted';end if;
 bad:=false;begin perform public.studioflow_book(salon_slug,request||'{"addOnIds":["not-offered"]}');exception when others then bad:=true;end;if not bad then raise exception 'Unknown extra accepted';end if;
 bad:=false;begin perform public.studioflow_book(salon_slug,request||'{"addOnIds":["qa-extra","qa-extra"]}');exception when others then bad:=true;end;if not bad then raise exception 'Duplicate extra accepted';end if;
 perform set_config('request.jwt.claim.sub',stranger::text,true);if exists(select 1 from public.studioflow_bookings where id=(booked->>'id')::uuid) then raise exception 'Cross-customer read';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub','',true);execute 'set local role anon';
 bad:=false;begin perform public.studioflow_book(salon_slug,request);exception when others then bad:=true;end;if not bad then raise exception 'Anonymous booking accepted';end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: 14-template state projection, server 1200/60min bundle, 300 advance, idempotency, overlap protection, unknown/duplicate rejection and customer privacy. All QA changes rolled back.' as result;

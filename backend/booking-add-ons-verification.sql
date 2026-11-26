begin;
do $$
declare owner_actor uuid:=gen_random_uuid(); client uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); salon_slug text:='addon-qa-'||replace(owner_actor::text,'-',''); d jsonb; rev integer:=0; saved jsonb; options jsonb; chosen jsonb; booked jsonb; again jsonb; request jsonb; bad boolean; n int:=0; template record; when_date date:=(now() at time zone 'Asia/Kolkata')::date+5;
begin
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
 values (owner_actor,'authenticated','authenticated',owner_actor::text||'@addon-qa.invalid','{}','{}'),
        (client,'authenticated','authenticated',client::text||'@addon-qa.invalid','{}','{}'),
        (stranger,'authenticated','authenticated',stranger::text||'@addon-qa.invalid','{}','{}');
 d:=jsonb_build_object(
  'profile',jsonb_build_object(
   'businessType','hair_salon','businessName','Booking Add-ons QA','ownerName','QA Owner',
   'phone','+919876543210','subdomain',salon_slug,'email','owner-private@addon-qa.invalid',
   'bookingAddOnServiceIds','["qa-extra"]'::jsonb,'defaultWebsiteLanguage','hi',
   'comparisonPhotos','[{"id":"qa","title":"QA comparison","beforeUrl":"https://example.com/before.jpg","afterUrl":"https://example.com/after.jpg","category":"Hair","consented":true}]'::jsonb,
   'reviewSource','{"mode":"simulation","provider":"Google","url":"https://g.page/qa","items":[]}'::jsonb
  ),
  'services','[{"id":"qa-base","name":"QA Main Service","description":"QA","category":"Hair","price":800,"durationMinutes":30,"icon":"spa","clinicServiceApproved":true,"clinicPublicationStatus":"published"},{"id":"qa-extra","name":"QA Serum","description":"QA","category":"Hair","price":400,"durationMinutes":30,"icon":"spa","clinicServiceApproved":true,"clinicPublicationStatus":"published"}]'::jsonb,
  'stylists',jsonb_build_array(jsonb_build_object(
   'id','qa-addon-staff','name','QA Specialist','status','Available',
   'assignedServices','["qa-base","qa-extra"]'::jsonb,
   'schedule',(select jsonb_agg(jsonb_build_object('day',day,'enabled',true,'fromTime','09:00','toTime','18:00'))
    from unnest(array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']) day)
  )),
  'extras','{}'::jsonb
 );
 perform set_config('request.jwt.claim.sub',owner_actor::text,true);
 execute 'set local role authenticated';
 perform public.studioflow_ensure_account('');
 saved:=public.studioflow_save_workspace(d,rev);
 rev:=(saved->>'revision')::integer;
 select public.studioflow_publish()->>'slug' into salon_slug;
 for template in select id from public.studioflow_templates where active loop
  d:=jsonb_set(d,'{profile,businessType}',to_jsonb(template.id));saved:=public.studioflow_save_workspace(d,rev);rev:=(saved->>'revision')::integer;
  select content into saved from public.studioflow_websites where owner_id=owner_actor;
  -- Clinic services also require verified fees before they become bookable.
  if saved->'profile'->'bookingAddOnServiceIds' is distinct from
   (case when template.id='skincare_clinic' then '[]'::jsonb else '["qa-extra"]'::jsonb end)
   or saved->'profile'->>'defaultWebsiteLanguage' is distinct from 'hi'
   or saved->'profile'->'comparisonPhotos'->0->>'title' is distinct from 'QA comparison'
   or saved->'profile'->'reviewSource'->>'mode' is distinct from 'simulation'
  then raise exception 'Feature state projection failed for %',template.id;end if;
  if saved->'profile' ? 'email' or saved->'stylists'->0 ? 'schedule' then raise exception 'Private data exposed';end if;n:=n+1;
 end loop;
 if n<>16 then raise exception 'Expected 16 active templates, found %', n;end if;
 d:=jsonb_set(d,'{profile,businessType}','"hair_salon"');
 saved:=public.studioflow_save_workspace(d,rev);
 perform set_config('request.jwt.claim.sub',client::text,true);
 options:=public.studioflow_android_slots(salon_slug,'["qa-base","qa-extra"]',when_date,'qa-addon-staff');select value into chosen from jsonb_array_elements(options) where value->'available'='true'::jsonb limit 1;if chosen is null then raise exception 'No QA bundle slot';end if;
 request:=jsonb_build_object('serviceId','qa-base','addOnIds',jsonb_build_array('qa-extra'),'stylistId','qa-addon-staff','date',when_date,'time',chosen->>'time','clientName','QA Customer','clientPhone','9876543210','servicePrice',1,'requestId',gen_random_uuid());
 booked:=public.studioflow_book(salon_slug,request);
 if (booked->>'servicePrice')::numeric is distinct from 1200 or (booked->>'durationMinutes')::int is distinct from 60 or jsonb_array_length(booked->'serviceItems') is distinct from 2 then raise exception 'Server price/duration validation failed';end if;
 if ceil((booked->>'servicePrice')::numeric*100/4)/100<>300 then raise exception '25 percent deposit mismatch';end if;
 again:=public.studioflow_book(salon_slug,request);if booked->>'id' is null or again->>'id' is distinct from booked->>'id' then raise exception 'Retry duplicated booking';end if;
 bad:=false;begin perform public.studioflow_book(salon_slug,request||jsonb_build_object('requestId',gen_random_uuid()));exception when raise_exception then if sqlerrm <> 'This slot cannot fit the selected service and add-ons. Choose another slot.' then raise;end if;bad:=true;end;if not bad then raise exception 'Overlap accepted';end if;
 bad:=false;begin perform public.studioflow_book(salon_slug,request||'{"addOnIds":["not-offered"]}');exception when raise_exception then if sqlerrm <> 'An add-on is no longer offered. Review services again.' then raise;end if;bad:=true;end;if not bad then raise exception 'Unknown extra accepted';end if;
 bad:=false;begin perform public.studioflow_book(salon_slug,request||'{"addOnIds":["qa-extra","qa-extra"]}');exception when raise_exception then if sqlerrm <> 'Choose valid, distinct services' then raise;end if;bad:=true;end;if not bad then raise exception 'Duplicate extra accepted';end if;
 perform set_config('request.jwt.claim.sub',stranger::text,true);if exists(select 1 from public.studioflow_bookings where id=(booked->>'id')::uuid) then raise exception 'Cross-customer read';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub','',true);execute 'set local role anon';
 bad:=false;begin perform public.studioflow_book(salon_slug,request);exception when insufficient_privilege then bad:=true;end;if not bad then raise exception 'Anonymous booking accepted';end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: 16-template state projection, server 1200/60min bundle, 300 advance, idempotency, overlap protection, unknown/duplicate rejection and customer privacy. All QA changes rolled back.' as result;

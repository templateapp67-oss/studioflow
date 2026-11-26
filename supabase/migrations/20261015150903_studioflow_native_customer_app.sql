-- Additive extension of the existing StudioFlow database. No duplicate salon or booking catalog.
create schema if not exists studioflow_android_private;
revoke all on schema studioflow_android_private from public;
grant usage on schema studioflow_android_private to anon, authenticated, service_role;
create table public.studioflow_android_profiles (
 customer_id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check(length(full_name)<=150),
 phone text not null default '' check(length(phone)<=30), photo_path text,
 referral_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
 referred_by uuid references auth.users(id), updated_at timestamptz not null default now(),
 check(referred_by is null or referred_by<>customer_id)
);
create table public.studioflow_android_favorites (
 customer_id uuid not null references auth.users(id) on delete cascade,
 salon_slug text not null references public.studioflow_websites(slug) on update cascade on delete cascade,
 primary key(customer_id,salon_slug)
);
create table public.studioflow_android_uploads (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references auth.users(id) on delete cascade,
 path text not null unique,is_document boolean not null,created_at timestamptz not null default now()
);
create table public.studioflow_android_devices (
 token text primary key check(length(token) between 20 and 4096),customer_id uuid not null references auth.users(id) on delete cascade,
 updated_at timestamptz not null default now()
);
create index studioflow_android_devices_customer_idx on public.studioflow_android_devices(customer_id);
create index studioflow_android_profiles_referrer_idx on public.studioflow_android_profiles(referred_by);
create index studioflow_android_uploads_customer_idx on public.studioflow_android_uploads(customer_id);
create table public.studioflow_android_requests (
 customer_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,
 fingerprint text not null,booking_id uuid not null references public.studioflow_bookings(id),primary key(customer_id,request_id)
);
create table public.studioflow_android_push_queue (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references auth.users(id) on delete cascade,
 booking_id uuid not null references public.studioflow_bookings(id),created_at timestamptz not null default now(),
 sent_at timestamptz,attempts integer not null default 0
);
create index studioflow_android_push_pending_idx on public.studioflow_android_push_queue(created_at) where sent_at is null;
create index studioflow_android_push_customer_idx on public.studioflow_android_push_queue(customer_id);
create index studioflow_android_push_booking_idx on public.studioflow_android_push_queue(booking_id);
create index studioflow_android_requests_booking_idx on public.studioflow_android_requests(booking_id);
do $$ declare t text;begin
 foreach t in array array['profiles','favorites','uploads','devices','requests','push_queue'] loop
  execute format('alter table public.studioflow_android_%I enable row level security',t);
  execute format('revoke all on public.studioflow_android_%I from public,anon,authenticated',t);
  execute format('grant all on public.studioflow_android_%I to service_role',t);
 end loop;
end $$;
grant select on public.studioflow_android_profiles,public.studioflow_android_favorites,public.studioflow_android_uploads,public.studioflow_android_devices to authenticated;
grant delete on public.studioflow_android_favorites,public.studioflow_android_devices to authenticated;
create policy mobile_profiles_own on public.studioflow_android_profiles for select to authenticated using(customer_id=(select auth.uid()));
create policy mobile_uploads_own on public.studioflow_android_uploads for select to authenticated using(customer_id=(select auth.uid()));
create policy mobile_favorites_own on public.studioflow_android_favorites for select to authenticated using(customer_id=(select auth.uid()));
create policy mobile_favorites_delete on public.studioflow_android_favorites for delete to authenticated using(customer_id=(select auth.uid()));
create policy mobile_devices_own on public.studioflow_android_devices for select to authenticated using(customer_id=(select auth.uid()));
create policy mobile_devices_delete on public.studioflow_android_devices for delete to authenticated using(customer_id=(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('nexora-customer-private','nexora-customer-private',false,5242880,array['image/jpeg','image/png','application/pdf']) on conflict(id) do nothing;
create policy mobile_private_upload on storage.objects for insert to authenticated with check(bucket_id='nexora-customer-private' and (storage.foldername(name))[1]=(select auth.uid())::text and (storage.foldername(name))[2] in ('photos','documents'));
create policy mobile_private_read on storage.objects for select to authenticated using(bucket_id='nexora-customer-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy mobile_private_delete on storage.objects for delete to authenticated using(bucket_id='nexora-customer-private' and (storage.foldername(name))[1]=(select auth.uid())::text);

create function studioflow_android_private.profile() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 insert into public.studioflow_android_profiles(customer_id,full_name) select id,left(coalesce(raw_user_meta_data->>'full_name',''),150) from auth.users where id=auth.uid() on conflict do nothing;
 return (select to_jsonb(p)-'referred_by' from public.studioflow_android_profiles p where customer_id=auth.uid());
end $$;
create function studioflow_android_private.save_profile(p_name text,p_phone text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform studioflow_android_private.profile();
 if length(btrim(p_name)) not between 2 and 150 or length(p_phone)>30 then raise exception 'Enter a valid name and phone';end if;
 update public.studioflow_android_profiles set full_name=btrim(p_name),phone=btrim(p_phone),updated_at=now() where customer_id=auth.uid();
end $$;
create function studioflow_android_private.record_upload(p_path text,p_document boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 perform studioflow_android_private.profile();
 if p_path is null or left(p_path,length(auth.uid()::text)+1)<>auth.uid()::text||'/' or split_part(p_path,'/',2)<>(case when p_document then 'documents' else 'photos' end)
 or not exists(select 1 from storage.objects where bucket_id='nexora-customer-private' and name=p_path) then raise exception 'Upload your own permitted file';end if;
 if not p_document and p_path !~ '\.(jpg|png)$' then raise exception 'Profile photo must be JPEG or PNG';end if;
 insert into public.studioflow_android_uploads(customer_id,path,is_document) values(auth.uid(),p_path,p_document) on conflict do nothing;
 if not p_document then update public.studioflow_android_profiles set photo_path=p_path,updated_at=now() where customer_id=auth.uid();end if;
end $$;
create function studioflow_android_private.favorite(p_slug text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 insert into public.studioflow_android_favorites values(auth.uid(),p_slug) on conflict do nothing;
end $$;
create function studioflow_android_private.register_token(p_token text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if length(p_token) not between 20 and 4096 then raise exception 'Invalid device token';end if;
 insert into public.studioflow_android_devices(token,customer_id) values(p_token,auth.uid()) on conflict(token) do update set customer_id=auth.uid(),updated_at=now();
end $$;
create function studioflow_android_private.referral() returns text language plpgsql security definer set search_path='' as $$
begin perform studioflow_android_private.profile();return(select referral_code from public.studioflow_android_profiles where customer_id=auth.uid());end $$;
create function studioflow_android_private.apply_referral(p_code text) returns void language plpgsql security definer set search_path='' as $$
declare referrer uuid; existing uuid;begin
 perform studioflow_android_private.profile();
 select customer_id into referrer from public.studioflow_android_profiles where referral_code=upper(btrim(p_code));
 if referrer is null or referrer=auth.uid() then raise exception 'Invalid referral code';end if;
 select referred_by into existing from public.studioflow_android_profiles where customer_id=auth.uid() for update;
 if existing is not null and existing<>referrer then raise exception 'A referral is already linked';end if;
 if exists(select 1 from public.studioflow_bookings where customer_id=auth.uid() and status='completed') then raise exception 'Link your referral before your first completed booking';end if;
 update public.studioflow_android_profiles set referred_by=referrer where customer_id=auth.uid();
end $$;

-- Full-duration availability, public staff membership, and every selected service assignment are checked.
create function studioflow_android_private.slots(p_slug text,p_services jsonb,p_date date,p_stylist text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare w public.studioflow_websites; draft jsonb; employee jsonb; day jsonb; total_minutes int; slot jsonb; start_at timestamptz; end_at timestamptz; output jsonb:='[]';matched int;
begin
 if jsonb_typeof(p_services) is distinct from 'array' or jsonb_array_length(p_services) not between 1 and 10 then raise exception 'Choose 1–10 services';end if;
 if (select count(distinct value) from jsonb_array_elements_text(p_services))<>jsonb_array_length(p_services) then raise exception 'Duplicate services';end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null or p_date<(now() at time zone 'Asia/Kolkata')::date or p_date>(now() at time zone 'Asia/Kolkata')::date+90 then return '[]';end if;
 select count(*),sum((s->>'durationMinutes')::int) into matched,total_minutes from jsonb_array_elements(w.content->'services') s where p_services ? (s->>'id');
 if matched<>jsonb_array_length(p_services) or total_minutes not between 1 and 720 then raise exception 'A selected service is unavailable';end if;
 select a.draft into draft from public.studioflow_accounts a where user_id=w.owner_id;
 for employee in select e from jsonb_array_elements(draft->'stylists') e where (p_stylist='any' or e->>'id'=p_stylist) and coalesce(e->>'status','Available')='Available'
 and exists(select 1 from jsonb_array_elements(w.content->'stylists') p where p->>'id'=e->>'id')
 and (jsonb_array_length(coalesce(e->'assignedServices','[]'))=0 or not exists(select 1 from jsonb_array_elements_text(p_services) requested where not (e->'assignedServices') ? requested)) loop
  select entry into day from jsonb_array_elements(coalesce(employee->'schedule','[]')) entry where entry->>'day'=trim(to_char(p_date,'Day'));
  for slot in select v from jsonb_array_elements(studioflow_private.availability(p_slug,p_services->>0,p_date,employee->>'id')) v where coalesce((v->>'available')::boolean,false) loop
   start_at:=(p_date+(slot->>'time')::time) at time zone 'Asia/Kolkata';end_at:=start_at+total_minutes*interval '1 minute';
   if (end_at at time zone 'Asia/Kolkata')::date<>p_date or (end_at at time zone 'Asia/Kolkata')::time>time '21:00' then continue;end if;
   if day is not null and ((end_at at time zone 'Asia/Kolkata')::time>(day->>'toTime')::time or not coalesce((day->>'enabled')::boolean,false)) then continue;end if;
   if exists(select 1 from public.studioflow_bookings b where b.owner_id=w.owner_id and b.stylist_id=employee->>'id' and b.status in ('pending','confirmed') and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now()) and b.starts_at<end_at and b.ends_at>start_at) then continue;end if;
   output:=output||jsonb_build_array(jsonb_build_object('time',slot->>'time','label',slot->>'label','stylistId',employee->>'id'));
  end loop;
 end loop;
 return(select coalesce(jsonb_agg(value order by value->>'time'),'[]') from (select distinct on(value->>'time') value from jsonb_array_elements(output) order by value->>'time',value->>'stylistId') s);
end $$;
create function studioflow_android_private.book(p_slug text,p_services jsonb,p_date date,p_time text,p_stylist text,p_name text,p_phone text,p_instructions text,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.studioflow_websites; result jsonb; existing public.studioflow_android_requests; finger text; slot jsonb; menu jsonb; total numeric; minutes int; bid uuid:=gen_random_uuid(); start_at timestamptz; staff_name text; names text;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_request is null or p_stylist is null or p_time is null or p_date is null or p_name is null or p_phone is null then raise exception 'Complete booking details';end if;
 if length(btrim(p_name)) not between 2 and 150 or length(regexp_replace(p_phone,'[^0-9]','','g')) not between 10 and 15 or length(coalesce(p_instructions,''))>1000 then raise exception 'Enter valid contact details';end if;
 if exists(select 1 from auth.users where id=auth.uid() and banned_until>now()) then raise exception 'Account unavailable' using errcode='42501';end if;
 finger:=md5(jsonb_build_array(p_slug,p_services,p_date,p_time,p_stylist,p_name,p_phone,p_instructions)::text);
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,8));
 select * into existing from public.studioflow_android_requests where customer_id=auth.uid() and request_id=p_request;
 if existing.booking_id is not null then
  if existing.fingerprint<>finger then raise exception 'Request changed; choose the slot again';end if;
  return(select to_jsonb(b) from public.studioflow_bookings b where id=existing.booking_id);
 end if;
 if(select count(*) from public.studioflow_bookings where customer_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'Too many bookings; try again later';end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null then raise exception 'Salon is not published';end if;
 perform pg_advisory_xact_lock(hashtextextended(w.owner_id::text||p_stylist,0));
 select v into slot from jsonb_array_elements(studioflow_android_private.slots(p_slug,p_services,p_date,p_stylist)) v where v->>'time'=p_time and v->>'stylistId'=p_stylist;
 if slot is null then raise exception 'Slot unavailable. Choose another time.';end if;
 select jsonb_agg(s),sum((s->>'price')::numeric),sum((s->>'durationMinutes')::int),string_agg(s->>'name',' + ' order by s->>'id') into menu,total,minutes,names from jsonb_array_elements(w.content->'services') s where p_services ? (s->>'id');
 select e->>'name' into staff_name from jsonb_array_elements(w.content->'stylists') e where e->>'id'=p_stylist;
 start_at:=(p_date+p_time::time) at time zone 'Asia/Kolkata';
 insert into public.studioflow_bookings(id,owner_id,customer_id,stylist_id,starts_at,ends_at,status,hold_expires_at,payload)
 values(bid,w.owner_id,auth.uid(),p_stylist,start_at,start_at+minutes*interval '1 minute','pending',now()+interval '15 minutes',
 jsonb_build_object('id',bid,'clientName',btrim(p_name),'clientPhone',btrim(p_phone),'clientEmail',(select email from auth.users where id=auth.uid()),'serviceId',p_services->>0,'serviceName',names,'servicePrice',total,'serviceItems',menu,'durationMinutes',minutes,'stylistId',p_stylist,'stylistName',staff_name,'date',p_date,'time',p_time,'instructions',coalesce(p_instructions,''),'status','pending','paymentStatus','pay_at_salon','amountPaid',0,'source','nexora_android','createdAt',now()));
 insert into public.studioflow_android_requests values(auth.uid(),p_request,finger,bid);
 return(select to_jsonb(b) from public.studioflow_bookings b where id=bid);
end $$;
create function studioflow_android_private.review(p_slug text,p_name text,p_rating int,p_comment text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.studioflow_bookings b join public.studioflow_websites w on w.owner_id=b.owner_id where w.slug=p_slug and b.customer_id=auth.uid() and b.status='completed') then raise exception 'Complete a visit before reviewing';end if;
 return public.studioflow_submit_review(p_slug,p_name,p_rating,p_comment,'',null);
end $$;
create function studioflow_android_private.rewards() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 -- Derived server-side from completed visits. Redemption requires an explicit salon rule/ledger.
 return (select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (
 select w.content->'profile'->>'businessName' as salon,
 sum(greatest(0,coalesce((a.draft->'loyaltyConfig'->>'pointsPerVisit')::int,50))+floor((b.payload->>'servicePrice')::numeric/100)*greatest(0,coalesce((a.draft->'loyaltyConfig'->>'pointsPerHundredSpent')::int,10)))::int as points,
 'Earned from completed visits. Contact this salon to redeem under its current program.'::text as description
 from public.studioflow_bookings b join public.studioflow_websites w on w.owner_id=b.owner_id join public.studioflow_accounts a on a.user_id=b.owner_id
 where b.customer_id=auth.uid() and b.status='completed' and coalesce((w.content->'loyaltyConfig'->>'programEnabled')::boolean,false)
 group by w.owner_id,w.content->'profile'->>'businessName') r);
end $$;
create function studioflow_android_private.enqueue() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or new.status is distinct from old.status then
  insert into public.studioflow_android_push_queue(customer_id,booking_id) values(new.customer_id,new.id);
 end if;
 return new;
end $$;
create trigger studioflow_android_booking_push after insert or update of status on public.studioflow_bookings for each row execute function studioflow_android_private.enqueue();

create function public.studioflow_android_profile() returns jsonb language sql security invoker set search_path='' as $$select studioflow_android_private.profile()$$;
create function public.studioflow_android_save_profile(p_name text,p_phone text) returns void language sql security invoker set search_path='' as $$select studioflow_android_private.save_profile(p_name,p_phone)$$;
create function public.studioflow_android_record_upload(p_path text,p_document boolean) returns void language sql security invoker set search_path='' as $$select studioflow_android_private.record_upload(p_path,p_document)$$;
create function public.studioflow_android_favorite(p_slug text) returns void language sql security invoker set search_path='' as $$select studioflow_android_private.favorite(p_slug)$$;
create function public.studioflow_android_register_token(p_token text) returns void language sql security invoker set search_path='' as $$select studioflow_android_private.register_token(p_token)$$;
create function public.studioflow_android_referral() returns text language sql security invoker set search_path='' as $$select studioflow_android_private.referral()$$;
create function public.studioflow_android_apply_referral(p_code text) returns void language sql security invoker set search_path='' as $$select studioflow_android_private.apply_referral(p_code)$$;
create function public.studioflow_android_slots(p_slug text,p_services jsonb,p_date date,p_stylist text) returns jsonb language sql stable security invoker set search_path='' as $$select studioflow_android_private.slots(p_slug,p_services,p_date,p_stylist)$$;
create function public.studioflow_android_book(p_slug text,p_services jsonb,p_date date,p_time text,p_stylist text,p_name text,p_phone text,p_instructions text,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$select studioflow_android_private.book(p_slug,p_services,p_date,p_time,p_stylist,p_name,p_phone,p_instructions,p_request)$$;
create function public.studioflow_android_review(p_slug text,p_name text,p_rating int,p_comment text) returns jsonb language sql security invoker set search_path='' as $$select studioflow_android_private.review(p_slug,p_name,p_rating,p_comment)$$;
create function public.studioflow_android_rewards() returns jsonb language sql stable security invoker set search_path='' as $$select studioflow_android_private.rewards()$$;
-- Revoke PostgreSQL's default PUBLIC function execution. Internal trigger remains non-callable.
do $$declare f record;begin
 for f in select p.oid::regprocedure as signature,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='studioflow_android_private' or (n.nspname='public' and p.proname like 'studioflow_android_%') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  if f.proname<>'enqueue' then execute format('grant execute on function %s to authenticated',f.signature);end if;
  if f.proname in ('slots','studioflow_android_slots') then execute format('grant execute on function %s to anon',f.signature);end if;
 end loop;
end $$;
notify pgrst,'reload schema';

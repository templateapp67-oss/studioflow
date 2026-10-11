create schema if not exists studioflow_private;
revoke all on schema studioflow_private from public, anon;
grant usage on schema studioflow_private to authenticated;

create table public.studioflow_templates (
 id text primary key, title text not null, config jsonb not null,
 active boolean not null default true, updated_at timestamptz not null default now()
);
create table public.studioflow_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 template_id text references public.studioflow_templates(id),
 draft jsonb not null default '{}'::jsonb check (jsonb_typeof(draft)='object'),
 revision integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.studioflow_websites (
 owner_id uuid primary key references public.studioflow_accounts(user_id) on delete cascade,
 slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
 content jsonb not null, published_at timestamptz not null default now()
);
create table public.studioflow_bookings (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.studioflow_accounts(user_id),
 customer_id uuid not null references auth.users(id),
 stylist_id text not null, starts_at timestamptz not null, ends_at timestamptz not null,
 status text not null check(status in ('pending','confirmed','completed','cancelled')),
 payload jsonb not null, created_at timestamptz not null default now(),
 check(ends_at > starts_at)
);
create index studioflow_bookings_owner_idx on public.studioflow_bookings(owner_id, starts_at);
create index studioflow_bookings_customer_idx on public.studioflow_bookings(customer_id);

alter table public.studioflow_templates enable row level security;
alter table public.studioflow_accounts enable row level security;
alter table public.studioflow_websites enable row level security;
alter table public.studioflow_bookings enable row level security;
create policy studioflow_templates_read on public.studioflow_templates for select to anon,authenticated using(active);
create policy studioflow_account_read on public.studioflow_accounts for select to authenticated using(user_id=(select auth.uid()));
create policy studioflow_websites_read on public.studioflow_websites for select to anon,authenticated using(true);
create policy studioflow_bookings_read on public.studioflow_bookings for select to authenticated using(owner_id=(select auth.uid()) or customer_id=(select auth.uid()));
grant select on public.studioflow_templates,public.studioflow_websites to anon,authenticated;
grant select on public.studioflow_accounts,public.studioflow_bookings to authenticated;

create function studioflow_private.ensure_account(p_ref text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); gp public.growth_partners; referrer public.growth_partners; code text; existing_ref uuid;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,1));
 if exists(select 1 from auth.users where id=actor and banned_until>now()) then raise exception 'Account suspended'; end if;
 select * into gp from public.growth_partners where user_id=actor;
 if gp.user_id is not null and (gp.banned_at is not null or gp.deleted_at is not null) then raise exception 'Partner account unavailable'; end if;
 if gp.user_id is null then
   loop
    begin
     insert into public.growth_partners(user_id,referral_code) values(actor,upper(substr(md5(gen_random_uuid()::text),1,12))) on conflict(user_id) do nothing;
     exit;
    exception when unique_violation then null;
    end;
   end loop;
 end if;
 insert into public.studioflow_accounts(user_id) values(actor) on conflict do nothing;
 code:=upper(btrim(coalesce(nullif(p_ref,''),(select raw_user_meta_data->>'referral_code' from auth.users where id=actor),'')));
 select growth_partner_id into existing_ref from public.growth_onboarding where user_id=actor;
 if existing_ref is not null then
   select * into referrer from public.growth_partners where user_id=existing_ref;
 elsif code<>'' then
   select * into referrer from public.growth_partners where referral_code=code and is_active and banned_at is null and deleted_at is null;
   if referrer.user_id is null then raise exception 'Invalid or inactive referral code' using errcode='22023'; end if;
   if referrer.user_id=actor then raise exception 'You cannot use your own referral code' using errcode='22023'; end if;
   perform public.link_my_growth_referral(code);
 end if;
 if referrer.user_id is not null then
  insert into public.partner_referrals(partner_id,referred_user_id,referral_code,status,registered_at,source,referred_email)
  select referrer.id,actor,referrer.referral_code,'registered',now(),'studioflow',(select email from auth.users where id=actor)
  where not exists(select 1 from public.partner_referrals where referred_user_id=actor);
 end if;
 return (select to_jsonb(a) from public.studioflow_accounts a where user_id=actor);
end $$;
create function public.studioflow_ensure_account(p_ref text default null) returns jsonb language sql security invoker set search_path='' as $$ select studioflow_private.ensure_account(p_ref) $$;

create function studioflow_private.save_workspace(p_draft jsonb,p_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if jsonb_typeof(p_draft) is distinct from 'object' or jsonb_typeof(p_draft->'profile') is distinct from 'object' or jsonb_typeof(p_draft->'services') is distinct from 'array' or jsonb_typeof(p_draft->'stylists') is distinct from 'array' then raise exception 'Invalid workspace data'; end if;
 if pg_column_size(p_draft)>15000000 then raise exception 'Workspace is too large. Upload smaller images.'; end if;
 update public.studioflow_accounts set draft=p_draft, template_id=p_draft->'profile'->>'businessType',revision=revision+1,updated_at=now() where user_id=actor and revision=p_revision returning to_jsonb(studioflow_accounts.*) into result;
 if result is null then raise exception 'Workspace changed in another tab. Reload before saving.' using errcode='P0001'; end if;
 -- Mirror business identity into the existing shared account profile.
 update public.profiles set full_name=p_draft->'profile'->>'ownerName',salon_name=p_draft->'profile'->>'businessName',phone_number=p_draft->'profile'->>'phone',phone=p_draft->'profile'->>'phone',whatsapp=p_draft->'profile'->>'whatsapp',city=p_draft->'profile'->>'city',postal_code=p_draft->'profile'->>'postalCode',updated_at=now() where id=actor;
 perform public.update_my_onboarding_progress('start_template');
 return result;
end $$;
create function public.studioflow_save_workspace(p_draft jsonb,p_revision integer) returns jsonb language sql security invoker set search_path='' as $$select studioflow_private.save_workspace(p_draft,p_revision)$$;

create function studioflow_private.publish() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); d jsonb; slug text; result jsonb; safe_staff jsonb;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select draft into d from public.studioflow_accounts where user_id=actor for update;
 slug:=lower(btrim(d->'profile'->>'subdomain'));
 if slug is null or slug !~ '^[a-z0-9][a-z0-9-]{2,62}$' then raise exception 'Website address must be 3–63 lowercase letters, numbers or hyphens.'; end if;
 if coalesce(btrim(d->'profile'->>'businessName'),'')='' or coalesce(btrim(d->'profile'->>'phone'),'')='' or jsonb_array_length(d->'services')=0 then raise exception 'Add a business name, phone and at least one service before publishing.'; end if;
 select coalesce(jsonb_agg(s-'schedule'-'commissionRate'-'accessRole'-'assignedServices'-'phone'), '[]'::jsonb) into safe_staff from jsonb_array_elements(d->'stylists') s where coalesce(s->>'status','Available')<>'Inactive';
 insert into public.studioflow_websites(owner_id,slug,content) values(actor,slug,jsonb_build_object('profile',(d->'profile')-'email','services',d->'services','stylists',safe_staff,'gallery',coalesce(d->'extras'->'gallery','[]'::jsonb)))
 on conflict(owner_id) do update set slug=excluded.slug,content=excluded.content,published_at=now() returning to_jsonb(studioflow_websites.*) into result;
 update public.partner_referrals set website_created_at=coalesce(website_created_at,now()),website_published_at=now(),last_activity_at=now(),updated_at=now() where referred_user_id=actor;
 perform public.update_my_onboarding_progress('complete_template');
 return result;
end $$;
create function public.studioflow_publish() returns jsonb language sql security invoker set search_path='' as $$select studioflow_private.publish()$$;

create function studioflow_private.validate_ref(p_code text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.growth_partners where referral_code=upper(btrim(p_code)) and is_active and banned_at is null and deleted_at is null) $$;
create function public.studioflow_validate_ref(p_code text) returns boolean language sql stable security invoker set search_path='' as $$select studioflow_private.validate_ref(p_code)$$;

create function studioflow_private.book(p_slug text,p_request jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); w public.studioflow_websites; svc jsonb; staff jsonb; start_time timestamptz; end_time timestamptz; payload jsonb; bid uuid:=gen_random_uuid(); bstatus text; candidate jsonb; schedule jsonb; day_entry jsonb; owner_draft jsonb;
begin
 if actor is null then raise exception 'Please sign in to book an appointment' using errcode='42501'; end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null then raise exception 'Website is not published'; end if;
 select s into svc from jsonb_array_elements(w.content->'services') s where s->>'id'=p_request->>'serviceId';
 select slot into candidate from jsonb_array_elements(studioflow_private.availability(p_slug,p_request->>'serviceId',(p_request->>'date')::date,p_request->>'stylistId')) slot where slot->>'time'=p_request->>'time' and (slot->>'available')::boolean;
 if candidate is null then raise exception 'This slot has just been booked or is unavailable. Choose another time.';end if;
 select s into staff from jsonb_array_elements(w.content->'stylists') s where s->>'id'=candidate->>'stylistId';
 if svc is null or staff is null then raise exception 'Choose an available service and specialist'; end if;
 if coalesce(btrim(p_request->>'clientName'),'')='' or length(regexp_replace(coalesce(p_request->>'clientPhone',''),'[^0-9]','','g'))<10 then raise exception 'Enter your name and a valid phone number'; end if;
 start_time:=((p_request->>'date')::date+(p_request->>'time')::time) at time zone 'Asia/Kolkata';
 end_time:=start_time+greatest(1,(svc->>'durationMinutes')::int)*interval '1 minute';
 if start_time is null or start_time<now() or start_time>now()+interval '90 days' then raise exception 'Choose a future appointment within 90 days'; end if;
 select draft into owner_draft from public.studioflow_accounts where user_id=w.owner_id;
 select s->'schedule' into schedule from jsonb_array_elements(owner_draft->'stylists') s where s->>'id'=staff->>'id';
 if schedule is not null and jsonb_array_length(schedule)>0 then
   select entry into day_entry from jsonb_array_elements(schedule) entry where entry->>'day'=trim(to_char(start_time at time zone 'Asia/Kolkata','Day'));
   if day_entry is null or not coalesce((day_entry->>'enabled')::boolean,false) or (start_time at time zone 'Asia/Kolkata')::time<(day_entry->>'fromTime')::time or (end_time at time zone 'Asia/Kolkata')::time>(day_entry->>'toTime')::time then raise exception 'Specialist is unavailable at this time'; end if;
 end if;
 if (select count(*) from public.studioflow_bookings where customer_id=actor and created_at>now()-interval '1 hour')>=10 then raise exception 'Too many booking requests. Please try later.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(w.owner_id::text || (staff->>'id'),0));
 if exists(select 1 from public.studioflow_bookings where owner_id=w.owner_id and stylist_id=staff->>'id' and status in ('pending','confirmed') and starts_at<end_time and ends_at>start_time) then raise exception 'This slot has just been booked. Choose another time.'; end if;
 bstatus:=case when coalesce((w.content->'profile'->>'requireDeposit')::boolean,true) then 'pending' else 'confirmed' end;
 payload:=jsonb_build_object('id',bid,'clientName',left(btrim(p_request->>'clientName'),150),'clientPhone',left(p_request->>'clientPhone',30),'clientEmail',(select email from auth.users where id=actor),'serviceId',svc->>'id','serviceName',svc->>'name','servicePrice',(svc->>'price')::numeric,'stylistId',staff->>'id','stylistName',staff->>'name','date',p_request->>'date','time',p_request->>'time','status',bstatus,'paymentStatus','pay_at_salon','amountPaid',0,'createdAt',now());
 insert into public.studioflow_bookings(id,owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload) values(bid,w.owner_id,actor,staff->>'id',start_time,end_time,bstatus,payload);
 return payload;
end $$;
create function public.studioflow_book(p_slug text,p_request jsonb) returns jsonb language sql security invoker set search_path='' as $$select studioflow_private.book(p_slug,p_request)$$;

revoke all on all functions in schema studioflow_private from public,anon,authenticated;
grant execute on function studioflow_private.ensure_account(text),studioflow_private.save_workspace(jsonb,integer),studioflow_private.publish(),studioflow_private.book(text,jsonb) to authenticated;
grant usage on schema studioflow_private to anon;
grant execute on function studioflow_private.validate_ref(text) to anon,authenticated;
revoke all on function public.studioflow_ensure_account(text),public.studioflow_save_workspace(jsonb,integer),public.studioflow_publish(),public.studioflow_book(text,jsonb),public.studioflow_validate_ref(text) from public,anon,authenticated;
grant execute on function public.studioflow_ensure_account(text),public.studioflow_save_workspace(jsonb,integer),public.studioflow_publish(),public.studioflow_book(text,jsonb) to authenticated;
grant execute on function public.studioflow_validate_ref(text) to anon,authenticated;

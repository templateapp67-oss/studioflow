-- Explicit empty referral opts out; stale metadata does not block login. Validate service data and booking assignments.
create or replace function studioflow_private.ensure_account(p_ref text default null) returns jsonb
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
 code:=upper(btrim(coalesce(p_ref,(select raw_user_meta_data->>'referral_code' from auth.users where id=actor),'')));
 select growth_partner_id into existing_ref from public.growth_onboarding where user_id=actor;
 if existing_ref is not null then
   select * into referrer from public.growth_partners where user_id=existing_ref;
 elsif code<>'' then
   select * into referrer from public.growth_partners where referral_code=code and is_active and banned_at is null and deleted_at is null;
   if referrer.user_id is null and p_ref is not null then raise exception 'Invalid or inactive referral code' using errcode='22023'; end if;
   if referrer.user_id=actor then
    if p_ref is not null then raise exception 'You cannot use your own referral code' using errcode='22023'; end if;
    referrer:=null;
   end if;
   if referrer.user_id is not null then perform public.link_my_growth_referral(code); end if;
 end if;
 if referrer.user_id is not null then
  insert into public.partner_referrals(partner_id,referred_user_id,referral_code,status,registered_at,source,referred_email)
  select referrer.id,actor,referrer.referral_code,'registered',now(),'studioflow',(select email from auth.users where id=actor)
  where not exists(select 1 from public.partner_referrals where referred_user_id=actor);
 end if;
 return (select to_jsonb(a) from public.studioflow_accounts a where user_id=actor);
end $$;
create or replace function public.studioflow_ensure_account(p_ref text default null) returns jsonb language sql security invoker set search_path='' as $$ select studioflow_private.ensure_account(p_ref) $$;

create or replace function studioflow_private.save_workspace(p_draft jsonb,p_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb; item jsonb;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if jsonb_typeof(p_draft) is distinct from 'object' or jsonb_typeof(p_draft->'profile') is distinct from 'object' or jsonb_typeof(p_draft->'services') is distinct from 'array' or jsonb_typeof(p_draft->'stylists') is distinct from 'array' then raise exception 'Invalid workspace data'; end if;
 if pg_column_size(p_draft)>15000000 then raise exception 'Workspace is too large. Upload smaller images.'; end if;
 if jsonb_array_length(p_draft->'services')>500 or jsonb_array_length(p_draft->'stylists')>500 then raise exception 'Maximum 500 services or specialists per workspace'; end if;
 for item in select value from jsonb_array_elements(p_draft->'services') loop
  if jsonb_typeof(item) is distinct from 'object' or coalesce(btrim(item->>'id'),'')='' or coalesce(btrim(item->>'name'),'')='' then raise exception 'Each service needs a unique ID and name'; end if;
  if jsonb_typeof(item->'price') is distinct from 'number' or jsonb_typeof(item->'durationMinutes') is distinct from 'number' then raise exception 'Service price and duration must be numbers'; end if;
  if (item->>'price')::numeric<0 or (item->>'price')::numeric>10000000 or (item->>'durationMinutes')::numeric<1 or (item->>'durationMinutes')::numeric>720 or (item->>'durationMinutes')::numeric<>trunc((item->>'durationMinutes')::numeric) then raise exception 'Service price must be nonnegative; duration must be 1–720 whole minutes'; end if;
 end loop;
 if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(p_draft->'services')) then raise exception 'Service IDs must be unique'; end if;
 for item in select value from jsonb_array_elements(p_draft->'stylists') loop
  if jsonb_typeof(item) is distinct from 'object' or coalesce(btrim(item->>'id'),'')='' or coalesce(btrim(item->>'name'),'')='' then raise exception 'Each specialist needs a unique ID and name'; end if;
  if item ? 'assignedServices' and jsonb_typeof(item->'assignedServices') is distinct from 'array' then raise exception 'Specialist services must be a list'; end if;
  if item ? 'schedule' and jsonb_typeof(item->'schedule') is distinct from 'array' then raise exception 'Specialist schedule must be a list'; end if;
 end loop;
 if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(p_draft->'stylists')) then raise exception 'Specialist IDs must be unique'; end if;
 if p_draft->'extras' ? 'bookingLeadHours' then
  if jsonb_typeof(p_draft->'extras'->'bookingLeadHours') is distinct from 'number' then raise exception 'Booking lead time must be a number'; end if;
  if (p_draft->'extras'->>'bookingLeadHours')::numeric<0 or (p_draft->'extras'->>'bookingLeadHours')::numeric>2160 then raise exception 'Booking lead time must be 0–2160 hours'; end if;
 end if;
 update public.studioflow_accounts set draft=p_draft, template_id=p_draft->'profile'->>'businessType',revision=revision+1,updated_at=now() where user_id=actor and revision=p_revision returning to_jsonb(studioflow_accounts.*) into result;
 if result is null then raise exception 'Workspace changed in another tab. Reload before saving.' using errcode='P0001'; end if;
 -- Mirror business identity into the existing shared account profile.
 update public.profiles set full_name=p_draft->'profile'->>'ownerName',salon_name=p_draft->'profile'->>'businessName',phone_number=p_draft->'profile'->>'phone',phone=p_draft->'profile'->>'phone',whatsapp=p_draft->'profile'->>'whatsapp',city=p_draft->'profile'->>'city',postal_code=p_draft->'profile'->>'postalCode',updated_at=now() where id=actor;
 perform public.update_my_onboarding_progress('start_template');
 return result;
end $$;
create or replace function public.studioflow_save_workspace(p_draft jsonb,p_revision integer) returns jsonb language sql security invoker set search_path='' as $$select studioflow_private.save_workspace(p_draft,p_revision)$$;

create or replace function studioflow_private.availability(p_slug text,p_service_id text,p_date date,p_stylist_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare w public.studioflow_websites; v_draft jsonb; svc jsonb; result jsonb;
begin
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null then return '[]'::jsonb;end if;
 select draft into v_draft from public.studioflow_accounts where user_id=w.owner_id;
 select s into svc from jsonb_array_elements(w.content->'services') s where s->>'id'=p_service_id;
 if svc is null or p_date is null or p_date<(now() at time zone 'Asia/Kolkata')::date or p_date>(now() at time zone 'Asia/Kolkata')::date+90 then return '[]'::jsonb;end if;
 with staff as (
  select s, (select entry from jsonb_array_elements(coalesce(s->'schedule','[]'::jsonb)) entry where entry->>'day'=trim(to_char(p_date,'Day'))) as day
  from jsonb_array_elements(v_draft->'stylists') s
  where (p_stylist_id in ('any','any-specialist','any_available') or s->>'id'=p_stylist_id) and coalesce(s->>'status','Available')='Available'
  and exists(select 1 from jsonb_array_elements(w.content->'stylists') published where published->>'id'=s->>'id')
  and (jsonb_array_length(coalesce(s->'assignedServices','[]'::jsonb))=0 or coalesce(s->'assignedServices','[]'::jsonb) ? p_service_id)
 ), candidates as (
  select staff.s->>'id' as stylist_id, slot at time zone 'Asia/Kolkata' as starts_at,slot,slot+greatest(1,(svc->>'durationMinutes')::int)*interval '1 minute' as end_slot
  from staff cross join generate_series(p_date+time '09:00',p_date+time '20:00',interval '30 minutes') slot
  where (staff.day is null and jsonb_array_length(coalesce(staff.s->'schedule','[]'::jsonb))=0)
   or (coalesce((staff.day->>'enabled')::boolean,false) and slot::time>=(staff.day->>'fromTime')::time and (slot+greatest(1,(svc->>'durationMinutes')::int)*interval '1 minute')::time<=(staff.day->>'toTime')::time)
 ), availability as (
  select to_char(slot,'HH24:MI') as time,to_char(slot,'HH12:MI AM') as label,stylist_id,
  starts_at>now()+greatest(0,coalesce((v_draft->'extras'->>'bookingLeadHours')::numeric,0))*interval '1 hour'
  and end_slot<=p_date+time '21:00'
  and not exists(select 1 from public.studioflow_bookings b where b.owner_id=w.owner_id and b.stylist_id=c.stylist_id and b.status in ('pending','confirmed') and b.starts_at<(end_slot at time zone 'Asia/Kolkata') and b.ends_at>c.starts_at) as available from candidates c
 ), grouped as (
 select time,min(label) as label,bool_or(available) as available,min(stylist_id) filter(where available) as "stylistId" from availability group by time
 ) select coalesce(jsonb_agg(to_jsonb(g) order by time),'[]'::jsonb) into result from grouped g;
 return result;
end $$;
create or replace function public.studioflow_available_slots(p_slug text,p_service_id text,p_date date,p_stylist_id text) returns jsonb language sql stable security invoker set search_path='' as $$select studioflow_private.availability(p_slug,p_service_id,p_date,p_stylist_id)$$;
revoke all on function studioflow_private.availability(text,text,date,text),public.studioflow_available_slots(text,text,date,text) from public,anon,authenticated;
grant execute on function studioflow_private.availability(text,text,date,text),public.studioflow_available_slots(text,text,date,text) to anon,authenticated;

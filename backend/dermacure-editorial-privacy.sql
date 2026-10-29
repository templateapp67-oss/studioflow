-- Apply after studioflow-service-images.sql and studioflow-dashboard-wiring.sql.
-- All changes are transactional. Review with a database administrator before applying.
begin;
create or replace function studioflow_private.clinic_service_visible(d jsonb, s jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare hidden jsonb;
begin
 if s->'clinicServiceApproved' is distinct from 'true'::jsonb or s->>'clinicPublicationStatus' is distinct from 'published' then return false; end if;
 begin hidden:=coalesce(nullif(d->'profile'->'sectionHeadings'->>'clinicHiddenServices',''),'[]')::jsonb;
 exception when others then return false; end;
 if jsonb_typeof(hidden) is distinct from 'array' then return false; end if;
 return not (hidden ? (s->>'id'));
end $$;
revoke all on function studioflow_private.clinic_service_visible(jsonb,jsonb) from public,anon,authenticated;
-- Section settings and staff references may contain IDs for private drafts.
create or replace function studioflow_private.clinic_public_headings(d jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare original jsonb:=d->'profile'->'sectionHeadings'; result jsonb; key text; parsed jsonb; filtered jsonb;
begin
 if jsonb_typeof(original) is distinct from 'object' then return '{}'::jsonb; end if;
 result:=original-'clinicHiddenServices'-'clinicServiceOrder'-'clinicFeaturedServices'-'clinicServiceGroups';
 foreach key in array array['clinicServiceOrder','clinicFeaturedServices','clinicServiceGroups'] loop
  begin parsed:=nullif(original->>key,'')::jsonb; exception when others then parsed:=null; end;
  if key='clinicServiceGroups' and jsonb_typeof(parsed)='object' then
   select coalesce(jsonb_object_agg(entry.key,entry.value),'{}'::jsonb) into filtered from jsonb_each(parsed) entry
    where exists(select 1 from jsonb_array_elements(coalesce(d->'services','[]'::jsonb)) svc where svc->>'id'=entry.key and studioflow_private.clinic_service_visible(d,svc));
  elsif key<>'clinicServiceGroups' and jsonb_typeof(parsed)='array' then
   select coalesce(jsonb_agg(entry.value order by entry.ordinality),'[]'::jsonb) into filtered from jsonb_array_elements(parsed) with ordinality entry(value,ordinality)
    where jsonb_typeof(entry.value)='string' and exists(select 1 from jsonb_array_elements(coalesce(d->'services','[]'::jsonb)) svc where svc->>'id'=entry.value#>>'{}' and studioflow_private.clinic_service_visible(d,svc));
  else continue; end if;
  result:=result||jsonb_build_object(key,filtered::text);
 end loop;
 return result;
end $$;
revoke all on function studioflow_private.clinic_public_headings(jsonb) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION studioflow_private.website_content(d jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object(
  'profile',case when d->'profile'->>'businessType' = 'skincare_clinic' then
    ((d->'profile')-'email'-'clinicArticles'-'clinicFaq'-'clinicEnquiryServices'-'websiteTestimonials'-'comparisonPhotos'-'socialVideos'-'clinicTechnology'-'promoCampaign') || jsonb_build_object(
      'sectionHeadings', studioflow_private.clinic_public_headings(d),
      'clinicPublicEmail', case when length(btrim(coalesce(d->'profile'->>'clinicPublicEmail','')))<=254 and btrim(coalesce(d->'profile'->>'clinicPublicEmail','')) ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,63}$' then btrim(d->'profile'->>'clinicPublicEmail') else null end,
      'bookingAddOnServiceIds', (select coalesce(jsonb_agg(id),'[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(d->'profile'->'bookingAddOnServiceIds')='array' then d->'profile'->'bookingAddOnServiceIds' else '[]'::jsonb end) id where exists(select 1 from jsonb_array_elements(coalesce(d->'services','[]'::jsonb)) svc where svc->>'id'=id#>>'{}' and studioflow_private.clinic_service_visible(d,svc) and svc->>'clinicFeeStatus'='verified' and svc->'clinicPriceVerified'='true'::jsonb and jsonb_typeof(svc->'price')='number')),
      'websiteTestimonials', (select coalesce(jsonb_agg(r),'[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(d->'profile'->'websiteTestimonials')='array' then d->'profile'->'websiteTestimonials' else '[]'::jsonb end) r where r->'isDemo' is distinct from 'true'::jsonb),
      'comparisonPhotos', (select coalesce(jsonb_agg(r),'[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(d->'profile'->'comparisonPhotos')='array' then d->'profile'->'comparisonPhotos' else '[]'::jsonb end) r where r->'consented'='true'::jsonb),
      'socialVideos', (select coalesce(jsonb_agg(v),'[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(d->'profile'->'socialVideos')='array' then d->'profile'->'socialVideos' else '[]'::jsonb end) v where v->'isOwnerVideo'='true'::jsonb and v->'isDemo' is distinct from 'true'::jsonb),
      'clinicTechnology', case when d->'profile'->'clinicTechnology'->'approved'='true'::jsonb then d->'profile'->'clinicTechnology' else 'null'::jsonb end,
      'promoCampaign', case when exists(select 1 from jsonb_array_elements(case when jsonb_typeof(d->'services')='array' then d->'services' else '[]'::jsonb end) s where s->>'id'=d->'profile'->'promoCampaign'->>'selectedServiceId' and studioflow_private.clinic_service_visible(d,s) and s->>'clinicFeeStatus'='verified' and s->'clinicPriceVerified'='true'::jsonb and jsonb_typeof(s->'price')='number') then d->'profile'->'promoCampaign' else 'null'::jsonb end,
      'clinicEnquiryServices', (select coalesce(jsonb_agg(s-'price'-'clinicServiceVerifiedBy'-'clinicServiceVerifiedAt'-'clinicFeeVerifiedBy'-'clinicFeeVerifiedAt'),'[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(d->'services')='array' then d->'services' else '[]'::jsonb end) s where studioflow_private.clinic_service_visible(d,s) and (s->>'clinicFeeStatus' is distinct from 'verified' or s->'clinicPriceVerified' is distinct from 'true'::jsonb or jsonb_typeof(s->'price') is distinct from 'number')),
      'clinicArticles', (select coalesce(jsonb_agg(a),'[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(d->'profile'->'clinicArticles')='array' then d->'profile'->'clinicArticles' else '[]'::jsonb end) a where a->'published'='true'::jsonb),
      'clinicFaq', (select coalesce(jsonb_agg(f),'[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(d->'profile'->'clinicFaq')='array' then d->'profile'->'clinicFaq' else '[]'::jsonb end) f where f->'published'='true'::jsonb)
    ) else (d->'profile')-'email' end,
  -- Booking RPCs only see confirmed fees; enquiry-only listings have no numeric price.
  'services',case when d->'profile'->>'businessType'='skincare_clinic' then (select coalesce(jsonb_agg(s-'clinicServiceVerifiedBy'-'clinicServiceVerifiedAt'-'clinicFeeVerifiedBy'-'clinicFeeVerifiedAt'),'[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(d->'services')='array' then d->'services' else '[]'::jsonb end) s where studioflow_private.clinic_service_visible(d,s) and s->>'clinicFeeStatus'='verified' and s->'clinicPriceVerified'='true'::jsonb and jsonb_typeof(s->'price')='number') else coalesce(d->'services','[]'::jsonb) end,
  'stylists',(select coalesce(jsonb_agg((s-'schedule'-'commissionRate'-'accessRole'-'assignedServices'-'phone'-'workGallery'-'expertiseServiceIds')||case when d->'profile'->>'businessType'='skincare_clinic' and s->>'avatarUrl' ~* '^https?://images[.]unsplash[.]com([/?]|$)' then jsonb_build_object('avatarUrl','') else '{}'::jsonb end||jsonb_build_object('expertiseServiceIds',(select coalesce(jsonb_agg(svc->>'id'),'[]'::jsonb) from jsonb_array_elements(coalesce(d->'services','[]'::jsonb)) svc where (d->'profile'->>'businessType' is distinct from 'skincare_clinic' or studioflow_private.clinic_service_visible(d,svc)) and (jsonb_array_length(coalesce(s->'assignedServices','[]'::jsonb))=0 or coalesce(s->'assignedServices','[]'::jsonb) ? (svc->>'id') or coalesce(s->'assignedServices','[]'::jsonb) ? (svc->>'name'))),'workGallery',(select coalesce(jsonb_agg(jsonb_build_object('id',photo->>'id','imageUrl',photo->>'imageUrl','caption',photo->>'caption','serviceId',photo->>'serviceId','consented',true)),'[]'::jsonb) from (select entry.value photo from jsonb_array_elements(coalesce(s->'workGallery','[]'::jsonb)) entry(value) where entry.value->'consented'='true'::jsonb and entry.value->>'imageUrl' ~ '^https://' and (d->'profile'->>'businessType' is distinct from 'skincare_clinic' or coalesce(entry.value->>'serviceId','')='' or exists(select 1 from jsonb_array_elements(coalesce(d->'services','[]'::jsonb)) svc where svc->>'id'=entry.value->>'serviceId' and studioflow_private.clinic_service_visible(d,svc))) limit 12) permitted))),'[]'::jsonb) from jsonb_array_elements(coalesce(d->'stylists','[]'::jsonb)) s where coalesce(s->>'status','Available')<>'Inactive' and (d->'profile'->>'businessType' is distinct from 'skincare_clinic' or coalesce(s->>'id','') not in ('sk-st-1','sk-st-2','sk-st-3'))),
  'gallery',coalesce(d->'extras'->'gallery','[]'::jsonb),
  'policies',coalesce(d->'extras'->'policies','{}'::jsonb),
  'branding',jsonb_build_object('platformName',d->'extras'->'whiteLabel'->>'platformName','supportEmail',d->'extras'->'whiteLabel'->>'supportEmail','poweredBy',coalesce(d->'extras'->'whiteLabel'->'poweredBy','false'::jsonb),'faviconUrl',d->'extras'->'whiteLabel'->>'faviconUrl'),
  'loyaltyConfig',jsonb_build_object('programEnabled',coalesce(d->'loyaltyConfig'->'programEnabled','false'::jsonb),'rewards',(select coalesce(jsonb_agg(r-'couponCodePrefix'),'[]'::jsonb) from jsonb_array_elements(coalesce(d->'loyaltyConfig'->'rewards','[]'::jsonb)) r where r->'isActive'='true'::jsonb))
 );
$function$
;



-- The existing workspace remains authoritative; the table is an owner-only append-only audit trail.
alter table public.studioflow_services alter column price drop not null;
create table if not exists public.studioflow_clinic_service_audit (
 id bigint generated always as identity primary key,
 owner_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
 service_id text not null, actor_id uuid, changed_at timestamptz not null default now(),
 old_value jsonb, new_value jsonb
);
alter table public.studioflow_clinic_service_audit enable row level security;
revoke all on public.studioflow_clinic_service_audit from public,anon,authenticated;
grant select on public.studioflow_clinic_service_audit to authenticated;
drop policy if exists clinic_service_audit_owner on public.studioflow_clinic_service_audit;
create policy clinic_service_audit_owner on public.studioflow_clinic_service_audit for select to authenticated using(owner_id=(select auth.uid()));
create or replace function studioflow_private.validate_clinic_service_changes() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); item jsonb; prior jsonb; output jsonb:='[]'::jsonb; oldmenu jsonb; oldgroups jsonb; newgroups jsonb; changed_service boolean; changed_group boolean; changed_fee boolean; editorial_key text; editorial_item jsonb; editorial_prior jsonb; editorial_old jsonb; editorial_new jsonb;
begin
 if new.draft->'profile'->>'businessType' is distinct from 'skincare_clinic' then return new; end if;
 if actor is not null and actor<>new.user_id then raise exception 'Only the clinic owner can update its services' using errcode='42501'; end if;
 if jsonb_typeof(new.draft->'services') is distinct from 'array' then raise exception 'Service catalogue must be a list'; end if;
 -- A published claim cannot be changed and kept approved in the same save.
 -- Save the revision privately, then explicitly publish the reviewed version.
 foreach editorial_key in array array['clinicArticles','clinicFaq'] loop
  editorial_old:=case when jsonb_typeof(old.draft->'profile'->editorial_key)='array' then old.draft->'profile'->editorial_key else '[]'::jsonb end;
  editorial_new:=case when jsonb_typeof(new.draft->'profile'->editorial_key)='array' then new.draft->'profile'->editorial_key else '[]'::jsonb end;
  for editorial_item in select value from jsonb_array_elements(editorial_new) loop
   select value into editorial_prior from jsonb_array_elements(editorial_old) where value->>'id'=editorial_item->>'id' limit 1;
   if editorial_prior->'published'='true'::jsonb and editorial_item->'published'='true'::jsonb and (editorial_prior-'published') is distinct from (editorial_item-'published') then
    raise exception 'Save changed clinic articles and FAQs as drafts before republishing';
   end if;
  end loop;
 end loop;
 if old.draft->'profile'->'clinicTechnology'->'approved'='true'::jsonb and new.draft->'profile'->'clinicTechnology'->'approved'='true'::jsonb and ((old.draft->'profile'->'clinicTechnology')-'approved') is distinct from ((new.draft->'profile'->'clinicTechnology')-'approved') then
  raise exception 'Save changed clinic equipment details as unapproved before reconfirming';
 end if;

 oldmenu:=case when jsonb_typeof(old.draft->'services')='array' then old.draft->'services' else '[]'::jsonb end;
 begin
  oldgroups:=coalesce(nullif(old.draft->'profile'->'sectionHeadings'->>'clinicServiceGroups',''),'{}')::jsonb;
  newgroups:=coalesce(nullif(new.draft->'profile'->'sectionHeadings'->>'clinicServiceGroups',''),'{}')::jsonb;
 exception when others then raise exception 'Invalid clinic service group configuration'; end;
 if jsonb_typeof(oldgroups) is distinct from 'object' or jsonb_typeof(newgroups) is distinct from 'object' then raise exception 'Invalid clinic service group configuration'; end if;
 for item in select value from jsonb_array_elements(new.draft->'services') loop
  select value into prior from jsonb_array_elements(oldmenu) where value->>'id'=item->>'id' limit 1;
  if item ? 'clinicServiceApproved' and jsonb_typeof(item->'clinicServiceApproved') is distinct from 'boolean' then raise exception 'Invalid service verification'; end if;
  if item ? 'clinicPublicationStatus' and coalesce(item->>'clinicPublicationStatus','') not in ('draft','published','unpublished') then raise exception 'Invalid publication status'; end if;
  if item ? 'clinicFeeStatus' and coalesce(item->>'clinicFeeStatus','') not in ('unverified','verified','on_request') then raise exception 'Invalid fee status'; end if;
  if item->>'clinicPublicationStatus'='published' and item->'clinicServiceApproved' is distinct from 'true'::jsonb then raise exception 'Verify service details before publication'; end if;
  if item->>'clinicFeeStatus'='verified' and (jsonb_typeof(item->'price') is distinct from 'number' or item->'clinicPriceVerified' is distinct from 'true'::jsonb) then raise exception 'Verified fees require a numeric fee and explicit confirmation'; end if;
  if item->'clinicPriceVerified'='true'::jsonb and item ? 'clinicFeeStatus' and item->>'clinicFeeStatus' is distinct from 'verified' then raise exception 'Fee confirmation does not match fee status'; end if;
  if item->>'clinicFeeStatus'='on_request' and item->>'price' is not null then raise exception 'Price-on-request services must not contain a numeric fee'; end if;
  changed_service:=prior is not null and (prior->'name',prior->'description',prior->'category',coalesce(prior->>'imageUrl',''),coalesce(prior->>'imagePath','')) is distinct from (item->'name',item->'description',item->'category',coalesce(item->>'imageUrl',''),coalesce(item->>'imagePath',''));
  changed_group:=prior is not null and (oldgroups->(item->>'id')) is distinct from (newgroups->(item->>'id'));
  changed_service:=changed_service or changed_group;
  changed_fee:=prior is not null and (prior->'price',prior->'durationMinutes') is distinct from (item->'price',item->'durationMinutes');
  if changed_service and prior->'clinicServiceApproved'='true'::jsonb and item->'clinicServiceApproved'='true'::jsonb then raise exception 'Save changed service details as unverified before reconfirming'; end if;
  if changed_fee and prior->>'clinicFeeStatus'='verified' and item->>'clinicFeeStatus'='verified' then raise exception 'Save changed fees as unverified before reconfirming'; end if;
  item:=item-'clinicServiceVerifiedBy'-'clinicServiceVerifiedAt'-'clinicFeeVerifiedBy'-'clinicFeeVerifiedAt';
  if item->'clinicServiceApproved'='true'::jsonb then
   if prior->'clinicServiceApproved' is distinct from 'true'::jsonb then
    if actor is null then raise exception 'Authenticated clinic owner must verify services'; end if;
    item:=item||jsonb_build_object('clinicServiceVerifiedBy',actor,'clinicServiceVerifiedAt',now());
   elsif prior ? 'clinicServiceVerifiedAt' then item:=item||jsonb_build_object('clinicServiceVerifiedBy',prior->'clinicServiceVerifiedBy','clinicServiceVerifiedAt',prior->'clinicServiceVerifiedAt'); end if;
  end if;
  if item->>'clinicFeeStatus'='verified' then
   if prior->>'clinicFeeStatus' is distinct from 'verified' then
    if actor is null then raise exception 'Authenticated clinic owner must verify fees'; end if;
    item:=item||jsonb_build_object('clinicFeeVerifiedBy',actor,'clinicFeeVerifiedAt',now());
   elsif prior ? 'clinicFeeVerifiedAt' then item:=item||jsonb_build_object('clinicFeeVerifiedBy',prior->'clinicFeeVerifiedBy','clinicFeeVerifiedAt',prior->'clinicFeeVerifiedAt'); end if;
  end if;
  if prior is distinct from item or changed_group then insert into public.studioflow_clinic_service_audit(owner_id,service_id,actor_id,old_value,new_value) values(new.user_id,item->>'id',actor,case when prior is null then null else prior||jsonb_build_object('_clinicGroup',oldgroups->(item->>'id')) end,item||jsonb_build_object('_clinicGroup',newgroups->(item->>'id'))); end if;
  output:=output||jsonb_build_array(item);
 end loop;
 for prior in select value from jsonb_array_elements(oldmenu) loop
  if not exists(select 1 from jsonb_array_elements(output) value where value->>'id'=prior->>'id') then insert into public.studioflow_clinic_service_audit(owner_id,service_id,actor_id,old_value,new_value) values(new.user_id,prior->>'id',actor,prior,null); end if;
 end loop;
 new.draft:=jsonb_set(new.draft,'{services}',output); return new;
end $$;
revoke all on function studioflow_private.validate_clinic_service_changes() from public,anon,authenticated;
drop trigger if exists dermacure_service_verification on public.studioflow_accounts;
create trigger dermacure_service_verification before update of draft on public.studioflow_accounts for each row execute function studioflow_private.validate_clinic_service_changes();
create or replace function studioflow_private.sync_service_catalogue() returns trigger
language plpgsql security definer set search_path='' as $$
declare menu jsonb:=coalesce(new.draft->'services','[]'::jsonb); item jsonb; image_path text; image_url text; prefix constant text:='https://zilwgiuiygqqardzutxi.supabase.co/storage/v1/object/public/studioflow-media/';
begin
 -- Trigger entry only: callers cannot execute this private function directly.
 if auth.uid() is not null and auth.uid()<>new.user_id then
  raise exception 'You can only change your own service catalogue' using errcode='42501';
 end if;
 if jsonb_typeof(menu) is distinct from 'array' or jsonb_array_length(menu)>500 then raise exception 'Service catalogue must be a list of up to 500 services';end if;
 if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(menu)) then raise exception 'Service IDs must be unique';end if;
 for item in select value from jsonb_array_elements(menu) loop
  if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'id') is distinct from 'string' or length(btrim(item->>'id')) not between 1 and 200 then raise exception 'Each service needs a unique ID';end if;
  if jsonb_typeof(item->'name') is distinct from 'string' or length(btrim(item->>'name')) not between 1 and 160 then raise exception 'Service name must be 1–160 characters';end if;
  if jsonb_typeof(item->'category') is distinct from 'string' or length(btrim(item->>'category')) not between 1 and 100 then raise exception 'Service category must be 1–100 characters';end if;
  if jsonb_typeof(item->'description') is distinct from 'string' or length(item->>'description')>2000 then raise exception 'Service description must be text of up to 2000 characters';end if;
  if (jsonb_typeof(item->'price') is distinct from 'number' and not (new.draft->'profile'->>'businessType'='skincare_clinic' and jsonb_typeof(item->'price')='null')) or jsonb_typeof(item->'durationMinutes') is distinct from 'number' then raise exception 'Price must be numeric (or null for clinic enquiries); duration must be numeric';end if;
  if item->>'price' is not null and ((item->>'price')::numeric not between 0 and 10000000 or (item->>'price')::numeric<>round((item->>'price')::numeric,2)) then raise exception 'Price must be 0–10000000 INR with up to two decimal places';end if;
  if (item->>'durationMinutes')::numeric not between 1 and 720 or (item->>'durationMinutes')::numeric<>trunc((item->>'durationMinutes')::numeric) then raise exception 'Duration must be 1–720 whole minutes';end if;
  image_path:=nullif(item->>'imagePath','');image_url:=nullif(item->>'imageUrl','');
  if item ? 'imagePath' and jsonb_typeof(item->'imagePath') is distinct from 'string' then raise exception 'Service image path must be text';end if;
  if item ? 'imageUrl' and jsonb_typeof(item->'imageUrl') is distinct from 'string' then raise exception 'Service image URL must be text';end if;
  if (image_path is null)<>(image_url is null) then raise exception 'Upload a service photo to save its URL and path together';end if;
  if image_path is not null then
   if length(image_path)>1024 or length(image_url)>2048 or left(image_path,length(new.user_id::text||'/services/'))<>new.user_id::text||'/services/' or image_path !~ '^[a-f0-9-]+/services/[a-f0-9-]+\.(jpg|png|webp)$' or image_url<>prefix||image_path then raise exception 'Upload your own service photo';end if;
   if not exists(select 1 from storage.objects where bucket_id='studioflow-media' and name=image_path and coalesce(metadata->>'mimetype','') in ('image/jpeg','image/png','image/webp')) then raise exception 'Service photo upload is unavailable';end if;
  end if;
  if item ? 'origin' and (jsonb_typeof(item->'origin') is distinct from 'string' or item->>'origin' not in ('custom','template')) then raise exception 'Invalid service origin';end if;
  if item ? 'popular' and jsonb_typeof(item->'popular') is distinct from 'boolean' then raise exception 'Featured service must be true or false';end if;
  if item ? 'showDuration' and jsonb_typeof(item->'showDuration') is distinct from 'boolean' then raise exception 'Show duration must be true or false';end if;
 end loop;
 insert into public.studioflow_services(owner_id,service_id,name,description,category,price,duration_minutes,icon,popular,show_duration,origin,position,image_url,image_path)
 select new.user_id,s->>'id',s->>'name',s->>'description',s->>'category',(s->>'price')::numeric,(s->>'durationMinutes')::integer,coalesce(s->>'icon','spa'),coalesce((s->>'popular')::boolean,false),coalesce((s->>'showDuration')::boolean,true),s->>'origin',(ordinality-1)::integer,nullif(s->>'imageUrl',''),nullif(s->>'imagePath','')
 from jsonb_array_elements(menu) with ordinality as entries(s,ordinality)
 on conflict(owner_id,service_id) do update set name=excluded.name,description=excluded.description,category=excluded.category,price=excluded.price,duration_minutes=excluded.duration_minutes,icon=excluded.icon,popular=excluded.popular,show_duration=excluded.show_duration,origin=excluded.origin,position=excluded.position,image_url=excluded.image_url,image_path=excluded.image_path,updated_at=now();
 delete from public.studioflow_services where owner_id=new.user_id and not exists(select 1 from jsonb_array_elements(menu) s where s->>'id'=service_id);
 return new;
end $$;
revoke all on function studioflow_private.sync_service_catalogue() from public,anon,authenticated;

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
  if (jsonb_typeof(item->'price') is distinct from 'number' and not (p_draft->'profile'->>'businessType'='skincare_clinic' and jsonb_typeof(item->'price')='null')) or jsonb_typeof(item->'durationMinutes') is distinct from 'number' then raise exception 'Service price and duration must be numbers'; end if;
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
 p_draft:=result->'draft'; -- use server-stamped verification fields in public snapshot
 -- Mirror business identity into the existing shared account profile.
 update public.profiles set full_name=p_draft->'profile'->>'ownerName',salon_name=p_draft->'profile'->>'businessName',phone_number=p_draft->'profile'->>'phone',phone=p_draft->'profile'->>'phone',whatsapp=p_draft->'profile'->>'whatsapp',city=p_draft->'profile'->>'city',postal_code=p_draft->'profile'->>'postalCode',updated_at=now() where id=actor;
 perform public.update_my_onboarding_progress('start_template');
 -- Keep the existing published URL; renaming requires explicit Publish.
 update public.studioflow_websites w set content=jsonb_set(studioflow_private.website_content(p_draft),'{profile,subdomain}',to_jsonb(w.slug)),published_at=now() where owner_id=actor;
 return result;
end $$;
create or replace function public.studioflow_save_workspace(p_draft jsonb,p_revision integer) returns jsonb language sql security invoker set search_path='' as $$select studioflow_private.save_workspace(p_draft,p_revision)$$;


-- Independent final guard covers single-service, add-on, mobile and owner POS inserts.
-- Existing bookings and coupon updates are not rewritten.
create or replace function studioflow_private.guard_clinic_booking() returns trigger
language plpgsql security definer set search_path='' as $$
declare draft jsonb; snapshot jsonb; item jsonb; svc jsonb; published jsonb; total numeric:=0; items jsonb;
begin
 select a.draft into draft from public.studioflow_accounts a where a.user_id=new.owner_id;
 if draft->'profile'->>'businessType' is distinct from 'skincare_clinic' then return new; end if;
 if auth.uid() is null or (new.customer_id is distinct from auth.uid() and not (new.customer_id is null and new.owner_id=auth.uid() and coalesce(new.payload->>'origin','')='owner_pos')) then raise exception 'Not authorised to create this clinic booking' using errcode='42501'; end if;
 select w.content into snapshot from public.studioflow_websites w where w.owner_id=new.owner_id;
 if snapshot is null then raise exception 'Clinic website is not published'; end if;
 items:=case when jsonb_typeof(new.payload->'serviceItems')='array' and jsonb_array_length(new.payload->'serviceItems')>0 then new.payload->'serviceItems' else jsonb_build_array(jsonb_build_object('id',new.payload->>'serviceId')) end;
 if jsonb_array_length(items) not between 1 and 10 or (select count(distinct value->>'id') from jsonb_array_elements(items))<>jsonb_array_length(items) or not exists(select 1 from jsonb_array_elements(items) where value->>'id'=new.payload->>'serviceId') then raise exception 'Choose valid, distinct clinic services'; end if;
 for item in select value from jsonb_array_elements(items) loop
  select value into svc from jsonb_array_elements(draft->'services') where value->>'id'=item->>'id' limit 1;
  select value into published from jsonb_array_elements(coalesce(snapshot->'services','[]'::jsonb)) where value->>'id'=item->>'id' limit 1;
  if svc is null or published is null or not studioflow_private.clinic_service_visible(draft,svc) or svc->>'clinicFeeStatus' is distinct from 'verified' or svc->'clinicPriceVerified' is distinct from 'true'::jsonb or jsonb_typeof(svc->'price') is distinct from 'number' or svc->'price' is distinct from published->'price' then raise exception 'This clinic service or fee is not available for online booking. Contact the clinic.' using errcode='P0001'; end if;
  if item ? 'price' and item->'price' is distinct from svc->'price' then raise exception 'The service fee has changed. Review the booking again.'; end if;
  total:=total+(svc->>'price')::numeric;
 end loop;
 if jsonb_typeof(new.payload->'servicePrice') is distinct from 'number' or (new.payload->>'servicePrice')::numeric<>total then raise exception 'The service fee has changed. Review the booking again.'; end if;
 return new;
end $$;
revoke all on function studioflow_private.guard_clinic_booking() from public,anon,authenticated;
drop trigger if exists dermacure_booking_guard on public.studioflow_bookings;
create trigger dermacure_booking_guard before insert on public.studioflow_bookings for each row execute function studioflow_private.guard_clinic_booking();


-- There was no existing enquiry workflow. This table is not a second service catalogue.
create table if not exists public.studioflow_clinic_enquiries (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
 customer_id uuid not null references auth.users(id) on delete cascade,
 service_id text not null, service_name text not null,
 customer_name text not null, customer_phone text not null, message text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists clinic_enquiries_owner_created_idx on public.studioflow_clinic_enquiries(owner_id,created_at desc);
alter table public.studioflow_clinic_enquiries enable row level security;
revoke all on public.studioflow_clinic_enquiries from public,anon,authenticated;
grant select on public.studioflow_clinic_enquiries to authenticated;
drop policy if exists clinic_enquiries_owner_customer on public.studioflow_clinic_enquiries;
create policy clinic_enquiries_owner_customer on public.studioflow_clinic_enquiries for select to authenticated using(owner_id=(select auth.uid()) or customer_id=(select auth.uid()));
create or replace function studioflow_private.clinic_enquire(p_slug text,p_service_id text,p_name text,p_phone text,p_message text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); w public.studioflow_websites; draft jsonb; svc jsonb; published jsonb; enquiry public.studioflow_clinic_enquiries; phone text;
begin
 if actor is null then raise exception 'Sign in to send an enquiry' using errcode='42501'; end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null then raise exception 'Clinic website is unavailable'; end if;
 select a.draft into draft from public.studioflow_accounts a where a.user_id=w.owner_id;
 if draft->'profile'->>'businessType' is distinct from 'skincare_clinic' then raise exception 'Clinic enquiry unavailable'; end if;
 select value into svc from jsonb_array_elements(draft->'services') where value->>'id'=p_service_id limit 1;
 select value into published from jsonb_array_elements(coalesce(w.content->'profile'->'clinicEnquiryServices','[]'::jsonb)) where value->>'id'=p_service_id limit 1;
 if svc is null or published is null or not studioflow_private.clinic_service_visible(draft,svc) or (svc->>'clinicFeeStatus'='verified' and svc->'clinicPriceVerified'='true'::jsonb) then raise exception 'This service is no longer available for an enquiry'; end if;
 phone:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 if length(phone)=12 and left(phone,2)='91' then phone:=substring(phone from 3); end if;
 if length(btrim(coalesce(p_name,''))) not between 2 and 150 or phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter your name and a valid 10-digit Indian mobile number'; end if;
 if length(coalesce(p_message,''))>1000 then raise exception 'Enquiry message must be at most 1000 characters'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,123));
 if (select count(*) from public.studioflow_clinic_enquiries where customer_id=actor and created_at>now()-interval '1 hour')>=10 then raise exception 'Too many enquiries. Please try again later.'; end if;
 insert into public.studioflow_clinic_enquiries(owner_id,customer_id,service_id,service_name,customer_name,customer_phone,message)
 values(w.owner_id,actor,svc->>'id',svc->>'name',btrim(p_name),phone,btrim(coalesce(p_message,''))) returning * into enquiry;
 return jsonb_build_object('id',enquiry.id,'createdAt',enquiry.created_at);
end $$;
revoke all on function studioflow_private.clinic_enquire(text,text,text,text,text) from public,anon,authenticated;
grant execute on function studioflow_private.clinic_enquire(text,text,text,text,text) to authenticated;
create or replace function public.studioflow_clinic_enquire(p_slug text,p_service_id text,p_name text,p_phone text,p_message text default '') returns jsonb
language sql security invoker set search_path='' as $$select studioflow_private.clinic_enquire(p_slug,p_service_id,p_name,p_phone,p_message)$$;
revoke all on function public.studioflow_clinic_enquire(text,text,text,text,text) from public,anon;
grant execute on function public.studioflow_clinic_enquire(text,text,text,text,text) to authenticated;

-- Refresh only clinic public snapshots; no draft, booking or payment rows are deleted.
update public.studioflow_websites w set content=jsonb_set(studioflow_private.website_content(a.draft),'{profile,subdomain}',to_jsonb(w.slug)), published_at=now() from public.studioflow_accounts a where a.user_id=w.owner_id and a.draft->'profile'->>'businessType'='skincare_clinic';
commit;

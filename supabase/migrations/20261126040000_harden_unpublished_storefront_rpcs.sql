-- Public read RPCs must not expose information from unpublished draft sites.
-- The existing functions were public by design for published salon storefronts;
-- keep their signatures and privileges while enforcing publication state.
begin;

CREATE OR REPLACE FUNCTION public.get_salon_social_videos(p_slug text)
 RETURNS SETOF salon_social_videos
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select v.*
  from public.salon_social_videos v
  join public.studioflow_websites w on w.owner_id = v.salon_id
  where w.slug = p_slug
    and w.published_at is not null
    and w.published_at <= now()
    and v.is_active
  order by v.sort_order asc, v.created_at asc;
$function$

CREATE OR REPLACE FUNCTION public.studioflow_branch_specialists(p_slug text, p_service_id text, p_branch uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare w public.studioflow_websites; service_row jsonb; result jsonb;
begin
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null or w.published_at is null or w.published_at > now() or not exists(select 1 from public.branches where site_id=w.owner_id and id=p_branch and is_active) then return jsonb_build_object('published',false,'specialistIds','[]'::jsonb); end if;
 select value into service_row from jsonb_array_elements(w.content->'services') value where value->>'id'=p_service_id;
 if service_row is null then return jsonb_build_object('published',true,'specialistIds','[]'::jsonb); end if;
 select coalesce(jsonb_agg(s->>'id' order by s->>'name'),'[]'::jsonb) into result from public.studioflow_accounts account cross join lateral jsonb_array_elements(account.draft->'stylists') s
 where account.user_id=w.owner_id and exists(select 1 from jsonb_array_elements(w.content->'stylists') pub where pub->>'id'=s->>'id') and coalesce(s->>'status','Available')='Available' and exists(select 1 from public.studioflow_staff_branch_schedules x where x.site_id=w.owner_id and x.branch_id=p_branch and x.staff_id=s->>'id' and x.is_active)
 and (s->'assignedServices' is null or jsonb_typeof(s->'assignedServices')<>'array' or jsonb_array_length(s->'assignedServices')=0 or exists(select 1 from jsonb_array_elements_text(s->'assignedServices') a where a=p_service_id));
 return jsonb_build_object('published',true,'specialistIds',result,'specialists',studioflow_private.booking_staff_profiles(p_slug,result));
end $function$

CREATE OR REPLACE FUNCTION public.studioflow_mens_slots(p_slug text, p_service_id text, p_date date, p_stylist_id text, p_branch uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare w public.studioflow_websites; d jsonb; c jsonb; svc jsonb; staff jsonb; h jsonb; slot jsonb; result jsonb:='[]'; finish time; begin_time time; branch_result jsonb;
begin
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null or w.published_at is null or w.published_at > now() then return '[]'; end if;
 if w.content->'profile'->>'businessType' is distinct from 'mens_hair_studio' then return '[]'; end if;
 select draft into d from public.studioflow_accounts where user_id=w.owner_id;
 c:=coalesce(d->'profile'->'mensStudio','{}');
 select s into svc from jsonb_array_elements(w.content->'services') s where s->>'id'=p_service_id and studioflow_private.mens_service(s);
 if svc is null or p_date is null or p_date<(now() at time zone 'Asia/Kolkata')::date or p_date>(now() at time zone 'Asia/Kolkata')::date+90 or coalesce(c->'holidays','[]') ? p_date::text then return '[]'; end if;
 if p_branch is not null then
  branch_result:=studioflow_private.branch_slots(p_slug,jsonb_build_array(p_service_id),p_date,p_stylist_id,p_branch);
  return (select coalesce(jsonb_agg(v order by v->>'time'),'[]'::jsonb) from jsonb_array_elements(coalesce(branch_result,'[]'::jsonb)) v
   where exists(select 1 from jsonb_array_elements(coalesce(d->'stylists',w.content->'stylists','[]'::jsonb)) s
    where s->>'id'=v->>'stylistId' and s->>'businessType'='mens_hair_studio' and coalesce((s->>'mensMaleOnly')::boolean,false)
     and coalesce(s->>'role','') !~* 'women|woman|female|unisex|kids?|child|beard|shav|facial|spa\M|treatment|makeup|bridal|nail|wax'));
 end if;
 select x into h from jsonb_array_elements(coalesce(c->'hours','[]')) x where x->>'day'=trim(to_char(p_date,'Day'));
 -- Missing hours fail closed for Template 15, rather than inventing a schedule.
 if h is null or not coalesce((h->>'enabled')::boolean,false) then return '[]'; end if;
 for staff in select s from jsonb_array_elements(coalesce(d->'stylists','[]')) s
 where s->>'businessType'='mens_hair_studio' and coalesce((s->>'mensMaleOnly')::boolean,false)
 and coalesce(s->>'role','') !~* 'women|woman|female|unisex|kids?|child|beard|shav|facial|spa\M|treatment|makeup|bridal|nail|wax'
 and s->>'status'='Available' and (p_stylist_id in ('any','any_available','any-specialist') or s->>'id'=p_stylist_id)
 loop
  if exists(select 1 from jsonb_array_elements(coalesce(c->'leave','[]')) l where l->>'staffId'=staff->>'id' and p_date between (l->>'from')::date and (l->>'to')::date) then continue;end if;
  for slot in select x from jsonb_array_elements(studioflow_private.availability(p_slug,p_service_id,p_date,staff->>'id')) x where coalesce((x->>'available')::boolean,false)
  loop
   begin_time:=(slot->>'time')::time;finish:=(p_date+begin_time+(svc->>'durationMinutes')::int*interval '1 minute')::time;
   if begin_time<(h->>'fromTime')::time or finish>(h->>'toTime')::time or finish<=begin_time then continue;end if;
   if exists(select 1 from jsonb_array_elements(coalesce(c->'breaks','[]')) b where b->>'staffId'=staff->>'id' and begin_time<(b->>'toTime')::time and finish>(b->>'fromTime')::time) then continue;end if;
   result:=result||jsonb_build_array(slot||jsonb_build_object('stylistId',staff->>'id'));
  end loop;
 end loop;
 return (select coalesce(jsonb_agg(x order by x->>'time'),'[]') from (select distinct on (v->>'time') v as x from jsonb_array_elements(result) v order by v->>'time',v->>'stylistId') q);
end $function$

commit;

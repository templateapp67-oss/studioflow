CREATE OR REPLACE FUNCTION studioflow_private.availability(p_slug text, p_service_id text, p_date date, p_stylist_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  and (jsonb_array_length(coalesce(s->'assignedServices','[]'))=0 or (s->'assignedServices') ? p_service_id)
 ), candidates as (
  select staff.s->>'id' as stylist_id, slot at time zone 'Asia/Kolkata' as starts_at,slot,slot+greatest(1,(svc->>'durationMinutes')::int)*interval '1 minute' as end_slot
  from staff cross join generate_series(p_date+time '09:00',p_date+time '20:00',interval '30 minutes') slot
  where (staff.day is null and jsonb_array_length(coalesce(staff.s->'schedule','[]'::jsonb))=0)
   or (coalesce((staff.day->>'enabled')::boolean,false) and slot::time>=(staff.day->>'fromTime')::time and (slot+greatest(1,(svc->>'durationMinutes')::int)*interval '1 minute')::time<=(staff.day->>'toTime')::time)
 ), availability as (
  select to_char(slot,'HH24:MI') as time,to_char(slot,'HH12:MI AM') as label,stylist_id,
  starts_at>now()+greatest(0,coalesce((v_draft->'extras'->>'bookingLeadHours')::numeric,0))*interval '1 hour'
  and end_slot<=p_date+time '21:00'
  and not exists(select 1 from public.studioflow_bookings b where b.owner_id=w.owner_id and b.stylist_id=c.stylist_id and b.status in ('pending','confirmed') and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now()) and b.starts_at<(end_slot at time zone 'Asia/Kolkata') and b.ends_at>c.starts_at) as available from candidates c
 ), grouped as (
 select time,min(label) as label,bool_or(available) as available,min(stylist_id) filter(where available) as "stylistId" from availability group by time
 ) select coalesce(jsonb_agg(to_jsonb(g) order by time),'[]'::jsonb) into result from grouped g;
 return result;
end $function$

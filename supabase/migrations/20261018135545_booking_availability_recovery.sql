-- One response for customer booking: eligibility, current slots, and an actionable next date.
-- Uses the same slot engine that revalidates reservations; never invents staff or bypasses hours.
create or replace function studioflow_android_private.booking_availability(p_slug text,p_services jsonb,p_date date,p_stylist text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ids jsonb; effective text; options jsonb; next_options jsonb; next_day date; candidate date; today date:=(now() at time zone 'Asia/Kolkata')::date;
begin
 if jsonb_typeof(p_services) is distinct from 'array' or jsonb_array_length(p_services) not between 1 and 10 then raise exception 'Choose 1–10 services';end if;
 if p_date is null or p_date<today or p_date>today+90 then raise exception 'Choose a date within the next 90 days';end if;
 -- Metadata returns only IDs already visible on the published site. Intersect across the bundle.
 select coalesce(jsonb_agg(to_jsonb(id) order by id),'[]'::jsonb) into ids from (
  select id from jsonb_array_elements_text((studioflow_private.booking_specialists(p_slug,p_services->>0))->'specialistIds') id
  where not exists(select 1 from jsonb_array_elements_text(p_services) service where not ((studioflow_private.booking_specialists(p_slug,service))->'specialistIds') ? id)
 ) eligible;
 effective:=case when ids ? p_stylist then p_stylist else 'any' end;
 -- Validate the service bundle even when no specialist is assigned.
 options:=studioflow_android_private.slots(p_slug,p_services,p_date,effective);
 if jsonb_array_length(ids)>0 and jsonb_array_length(options)=0 then
  for candidate in select generate_series(p_date+1,least(p_date+14,today+90),interval '1 day')::date loop
   next_options:=studioflow_android_private.slots(p_slug,p_services,candidate,effective);
   if jsonb_array_length(next_options)>0 then next_day:=candidate;exit;end if;
  end loop;
 end if;
 return jsonb_build_object('specialistIds',ids,'effectiveStylistId',effective,'slots',options,'reason',case when jsonb_array_length(ids)=0 then 'no_eligible_specialist' when jsonb_array_length(options)=0 then 'no_times_on_date' else null end,'nextDate',next_day,'nextSlots',case when next_day is null then '[]'::jsonb else next_options end);
end $$;
create or replace function public.studioflow_booking_availability(p_slug text,p_services jsonb,p_date date,p_stylist text)
returns jsonb language sql stable security invoker set search_path='' as $$select studioflow_android_private.booking_availability(p_slug,p_services,p_date,p_stylist)$$;
revoke all on function studioflow_android_private.booking_availability(text,jsonb,date,text),public.studioflow_booking_availability(text,jsonb,date,text) from public,anon,authenticated;
grant execute on function studioflow_android_private.booking_availability(text,jsonb,date,text),public.studioflow_booking_availability(text,jsonb,date,text) to anon,authenticated;

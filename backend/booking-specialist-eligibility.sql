-- Public booking metadata: only published specialist IDs, never private schedules or contact fields.
create or replace function studioflow_private.booking_specialists(p_slug text,p_service_id text) returns jsonb
language sql stable security definer set search_path='' as $$
 with salon as (
  select w.content,a.draft from public.studioflow_websites w
  join public.studioflow_accounts a on a.user_id=w.owner_id where w.slug=p_slug
 ), eligible as (
  select s->>'id' as id from salon cross join lateral jsonb_array_elements(coalesce(salon.draft->'stylists','[]'::jsonb)) s
  where exists(select 1 from jsonb_array_elements(coalesce(salon.content->'services','[]'::jsonb)) svc where svc->>'id'=p_service_id)
   and exists(select 1 from jsonb_array_elements(coalesce(salon.content->'stylists','[]'::jsonb)) pub where pub->>'id'=s->>'id')
   and coalesce(s->>'status','Available')='Available'
   and (jsonb_array_length(coalesce(nullif(s->'assignedServices','null'::jsonb),'[]'::jsonb))=0 or (s->'assignedServices') ? p_service_id)
 ) select jsonb_build_object('published',exists(select 1 from salon),'specialistIds',coalesce((select jsonb_agg(id order by id) from eligible),'[]'::jsonb));
$$;
create or replace function public.studioflow_booking_specialists(p_slug text,p_service_id text) returns jsonb
language sql stable security invoker set search_path='' as $$select studioflow_private.booking_specialists(p_slug,p_service_id)$$;
revoke all on function studioflow_private.booking_specialists(text,text),public.studioflow_booking_specialists(text,text) from public,anon,authenticated;
grant execute on function studioflow_private.booking_specialists(text,text),public.studioflow_booking_specialists(text,text) to anon,authenticated;

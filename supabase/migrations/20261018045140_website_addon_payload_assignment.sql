-- Reuse the existing multi-service slot validator, staff locks, idempotency and payment ledger.
-- Public request prices and duration are never trusted.
create or replace function studioflow_private.book_with_addons(p_slug text,p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare addons jsonb:=coalesce(p_request->'addOnIds','[]'::jsonb); ids jsonb; w public.studioflow_websites; candidate jsonb; result jsonb; v_payload jsonb;
begin
 if auth.uid() is null then raise exception 'Please sign in to book an appointment' using errcode='42501';end if;
 if jsonb_typeof(addons) is distinct from 'array' or jsonb_array_length(addons)>9 then raise exception 'Choose up to 9 add-ons';end if;
 if jsonb_array_length(addons)=0 then return studioflow_private.book(p_slug,p_request);end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null then raise exception 'Salon is not published';end if;
 if exists(select 1 from jsonb_array_elements(addons) a where jsonb_typeof(a)<>'string') then raise exception 'Invalid add-on IDs';end if;
 if exists(select 1 from jsonb_array_elements_text(addons) id where not coalesce(w.content->'profile'->'bookingAddOnServiceIds','[]'::jsonb) ? id) then raise exception 'An add-on is no longer offered. Review services again.';end if;
 ids:=jsonb_build_array(p_request->>'serviceId')||addons;
 -- A retry must return its original reservation before checking its now-occupied slot.
 select to_jsonb(b) into result from public.studioflow_android_requests r join public.studioflow_bookings b on b.id=r.booking_id where r.customer_id=auth.uid() and r.request_id=(p_request->>'requestId')::uuid;
 if result is not null then
  if p_request->>'stylistId' not in ('any','any_available','any-specialist',result->>'stylist_id') then raise exception 'Request changed; choose the slot again';end if;
  result:=studioflow_android_private.book(p_slug,ids,(p_request->>'date')::date,p_request->>'time',result->>'stylist_id',p_request->>'clientName',p_request->>'clientPhone','',(p_request->>'requestId')::uuid);
  return result->'payload';
 end if;
 select s into candidate from jsonb_array_elements(studioflow_android_private.slots(p_slug,ids,(p_request->>'date')::date,case when p_request->>'stylistId' in ('any','any_available','any-specialist') then 'any' else p_request->>'stylistId' end)) s where s->>'time'=p_request->>'time';
 if candidate is null then raise exception 'This slot cannot fit the selected service and add-ons. Choose another slot.';end if;
 result:=studioflow_android_private.book(p_slug,ids,(p_request->>'date')::date,p_request->>'time',candidate->>'stylistId',p_request->>'clientName',p_request->>'clientPhone','',(p_request->>'requestId')::uuid);
 v_payload:=(result->'payload')||jsonb_build_object('addOnIds',addons,'source','nexora_website');
 update public.studioflow_bookings set payload=v_payload where id=(result->>'id')::uuid and customer_id=auth.uid();
 return v_payload;
end $$;
revoke all on function studioflow_private.book_with_addons(text,jsonb) from public;
grant execute on function studioflow_private.book_with_addons(text,jsonb) to anon,authenticated;
create or replace function public.studioflow_book(p_slug text,p_request jsonb) returns jsonb language sql set search_path='' as $$select studioflow_private.book_with_addons(p_slug,p_request)$$;

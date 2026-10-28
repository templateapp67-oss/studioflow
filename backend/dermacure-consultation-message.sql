-- Apply after the existing booking migrations. No public read or table grants.
-- Stores an optional message on the authenticated customer's existing booking;
-- never changes appointment prices, payment state, ownership or availability.
begin;
create or replace function public.studioflow_save_booking_message(p_booking uuid,p_message text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to save consultation details'; end if;
 if p_message is null or length(btrim(p_message))>1000 then raise exception 'Message must be at most 1000 characters'; end if;
 update public.studioflow_bookings
 set payload=jsonb_set(payload,'{consultationMessage}',to_jsonb(btrim(p_message)),true)
 where id=p_booking and customer_id=auth.uid() and status='pending';
 if not found then raise exception 'Pending booking not found or access denied'; end if;
end;
$$;
revoke all on function public.studioflow_save_booking_message(uuid,text) from public,anon;
grant execute on function public.studioflow_save_booking_message(uuid,text) to authenticated;
commit;

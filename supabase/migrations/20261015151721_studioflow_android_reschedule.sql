create or replace function studioflow_android_private.enqueue() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if coalesce(current_setting('studioflow.android_temporary_move',true),'')='yes' then return new;end if;
 if tg_op='INSERT' or new.status is distinct from old.status then insert into public.studioflow_android_push_queue(customer_id,booking_id) values(new.customer_id,new.id);end if;
 return new;
end $$;
create function studioflow_android_private.reschedule(p_booking uuid,p_date date,p_time text,p_stylist text) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.studioflow_bookings; w public.studioflow_websites; services jsonb; chosen jsonb; start_at timestamptz; old_duration interval; cancel_hours numeric; staff_name text;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select * into b from public.studioflow_bookings where id=p_booking and customer_id=auth.uid() for update;
 if b.id is null or b.status<>'confirmed' then raise exception 'Choose a confirmed appointment to reschedule';end if;
 select * into w from public.studioflow_websites where owner_id=b.owner_id;
 if w.owner_id is null then raise exception 'Salon is unavailable';end if;
 select coalesce((draft->'extras'->>'cancellationWindow')::numeric,24) into cancel_hours from public.studioflow_accounts where user_id=b.owner_id;
 if b.starts_at<=now()+greatest(0,cancel_hours)*interval '1 hour' then raise exception 'Contact the salon to reschedule inside its cancellation window';end if;
 services:=coalesce((select jsonb_agg(s->>'id') from jsonb_array_elements(b.payload->'serviceItems') s),jsonb_build_array(b.payload->>'serviceId'));
 perform pg_advisory_xact_lock(hashtextextended(b.owner_id::text||least(b.stylist_id,p_stylist),0));
 perform pg_advisory_xact_lock(hashtextextended(b.owner_id::text||greatest(b.stylist_id,p_stylist),0));
 -- Remove only this appointment from conflict checks, within the same transaction.
 perform set_config('studioflow.android_temporary_move','yes',true);
 update public.studioflow_bookings set status='cancelled' where id=b.id;
 select s into chosen from jsonb_array_elements(studioflow_android_private.slots(w.slug,services,p_date,p_stylist)) s where s->>'time'=p_time and s->>'stylistId'=p_stylist;
 if chosen is null then raise exception 'New slot unavailable. Your original booking has been retained.';end if;
 start_at:=(p_date+p_time::time) at time zone 'Asia/Kolkata';
 select s->>'name' into staff_name from jsonb_array_elements(w.content->'stylists') s where s->>'id'=p_stylist;
 -- Keep original contracted duration and paid amounts. Menu duration changes require a new booking.
 if (select sum((s->>'durationMinutes')::int) from jsonb_array_elements(w.content->'services') s where services ? (s->>'id'))*interval '1 minute' <> b.ends_at-b.starts_at then raise exception 'Service duration changed. Contact the salon to move this booking.';end if;
 perform set_config('studioflow.android_temporary_move','no',true);
 update public.studioflow_bookings set status='confirmed',stylist_id=p_stylist,starts_at=start_at,ends_at=start_at+(b.ends_at-b.starts_at),payload=b.payload||jsonb_build_object('date',p_date,'time',p_time,'stylistId',p_stylist,'stylistName',staff_name,'rescheduledAt',now()) where id=b.id;
 return(select to_jsonb(row) from public.studioflow_bookings row where id=b.id);
end $$;
create function public.studioflow_android_reschedule(p_booking uuid,p_date date,p_time text,p_stylist text) returns jsonb language sql security invoker set search_path='' as $$select studioflow_android_private.reschedule(p_booking,p_date,p_time,p_stylist)$$;
revoke all on function studioflow_android_private.reschedule(uuid,date,text,text),public.studioflow_android_reschedule(uuid,date,text,text) from public,anon,authenticated;
grant execute on function studioflow_android_private.reschedule(uuid,date,text,text),public.studioflow_android_reschedule(uuid,date,text,text) to authenticated;
notify pgrst,'reload schema';

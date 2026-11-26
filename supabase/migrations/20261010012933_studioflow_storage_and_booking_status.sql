insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('studioflow-media','studioflow-media',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy studioflow_media_read on storage.objects for select to authenticated using(bucket_id='studioflow-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy studioflow_media_insert on storage.objects for insert to authenticated with check(bucket_id='studioflow-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy studioflow_media_update on storage.objects for update to authenticated using(bucket_id='studioflow-media' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='studioflow-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy studioflow_media_delete on storage.objects for delete to authenticated using(bucket_id='studioflow-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create function studioflow_private.update_booking(p_id uuid,p_status text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); b public.studioflow_bookings; result jsonb;
begin
 if actor is null then raise exception 'Sign in required'; end if;
 select * into b from public.studioflow_bookings where id=p_id for update;
 if b.id is null or (actor<>b.owner_id and actor<>b.customer_id) then raise exception 'Booking unavailable' using errcode='42501'; end if;
 if p_status not in ('cancelled','completed','confirmed') then raise exception 'Invalid status'; end if;
 if actor<>b.owner_id and p_status<>'cancelled' then raise exception 'Owner access required'; end if;
 if b.status in ('completed','cancelled') then raise exception 'This booking is already closed'; end if;
 if p_status='confirmed' and b.status='pending' then raise exception 'Advance payment must be verified by the payment provider before confirming'; end if;
 if p_status='completed' and (b.status<>'confirmed' or b.ends_at>now()) then raise exception 'Only confirmed past appointments can be completed'; end if;
 update public.studioflow_bookings set status=p_status,payload=jsonb_set(payload,'{status}',to_jsonb(p_status)) where id=p_id returning payload into result;
 return result;
end $$;
create function public.studioflow_update_booking(p_id uuid,p_status text) returns jsonb language sql security invoker set search_path='' as $$select studioflow_private.update_booking(p_id,p_status)$$;
revoke all on function studioflow_private.update_booking(uuid,text),public.studioflow_update_booking(uuid,text) from public,anon,authenticated;
grant execute on function studioflow_private.update_booking(uuid,text),public.studioflow_update_booking(uuid,text) to authenticated;

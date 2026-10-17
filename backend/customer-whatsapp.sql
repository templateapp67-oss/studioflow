alter table public.studioflow_android_profiles add column if not exists whatsapp_number text;
alter table public.studioflow_android_profiles add constraint studioflow_customer_whatsapp_valid check(whatsapp_number is null or whatsapp_number ~ '^\+91[1-9][0-9]{9}$');
create or replace function studioflow_android_private.capture_customer_whatsapp() returns trigger
language plpgsql security definer set search_path='' as $$
declare number text:=nullif(new.raw_user_meta_data->>'whatsapp_number','');
begin
 if number is null then return new;end if;
 if number !~ '^\+91[1-9][0-9]{9}$' then raise exception 'Enter a valid WhatsApp number with +91 and 10 digits' using errcode='22023';end if;
 insert into public.studioflow_android_profiles(customer_id,full_name,phone,whatsapp_number) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),150),number,number)
 on conflict(customer_id) do update set whatsapp_number=excluded.whatsapp_number,phone=case when coalesce(public.studioflow_android_profiles.phone,'')='' then excluded.phone else public.studioflow_android_profiles.phone end;
 return new;
end $$;
revoke all on function studioflow_android_private.capture_customer_whatsapp() from public,anon,authenticated;
create trigger studioflow_customer_whatsapp after insert on auth.users for each row execute function studioflow_android_private.capture_customer_whatsapp();

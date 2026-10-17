-- Add settings to existing owner-scoped customer preferences; existing RLS applies.
alter table public.studioflow_customer_preferences add column if not exists notifications_enabled boolean not null default true;
create or replace function studioflow_android_private.update_customer_details(p_name text,p_phone text,p_whatsapp text,p_birth_date date) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_name is null or length(btrim(p_name)) not between 2 and 150 or p_phone is null or length(btrim(p_phone))>30 then raise exception 'Enter a valid name and phone';end if;
 if p_whatsapp is null or p_whatsapp !~ '^\+91[1-9][0-9]{9}$' then raise exception 'Enter a valid +91 WhatsApp number';end if;
 if p_birth_date is null or p_birth_date<date '1900-01-01' or p_birth_date>(now() at time zone 'Asia/Kolkata')::date then raise exception 'Enter a valid date of birth';end if;
 perform studioflow_android_private.profile();
 update public.studioflow_android_profiles set full_name=btrim(p_name),phone=btrim(p_phone),whatsapp_number=p_whatsapp,date_of_birth=p_birth_date,updated_at=now() where customer_id=auth.uid();
end $$;
create or replace function public.studioflow_customer_update_details(p_name text,p_phone text,p_whatsapp text,p_birth_date date) returns void
language sql security invoker set search_path='' as $$select studioflow_android_private.update_customer_details(p_name,p_phone,p_whatsapp,p_birth_date)$$;
revoke all on function studioflow_android_private.update_customer_details(text,text,text,date),public.studioflow_customer_update_details(text,text,text,date) from public,anon,authenticated;
grant execute on function studioflow_android_private.update_customer_details(text,text,text,date),public.studioflow_customer_update_details(text,text,text,date) to authenticated,service_role;
-- Respect the customer's choice before creating future booking push deliveries.
create or replace function studioflow_android_private.enqueue() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if coalesce(current_setting('studioflow.android_temporary_move',true),'')='yes' then return new;end if;
 if exists(select 1 from public.studioflow_customer_preferences where customer_id=new.customer_id and not notifications_enabled) then return new;end if;
 if tg_op='INSERT' or new.status is distinct from old.status then insert into public.studioflow_android_push_queue(customer_id,booking_id) values(new.customer_id,new.id);end if;
 return new;
end $$;

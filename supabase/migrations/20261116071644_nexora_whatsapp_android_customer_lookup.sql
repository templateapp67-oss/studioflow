-- Include the phone number captured by StudioFlow's customer signup in
-- the private phone lookup used by NEXORA's WhatsApp booking flow.
create or replace function studioflow_whatsapp_private.find_customer(p_phone text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_customer_id uuid;
begin
  if length(v_digits) not between 10 and 15 then return null; end if;

  select u.id into v_customer_id
  from auth.users u
  left join public.profiles p on p.id = u.id
  where regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g') = v_digits
     or regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = v_digits
     or regexp_replace(coalesce(p.phone_number, ''), '[^0-9]', '', 'g') = v_digits
     or regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g') = v_digits
     or regexp_replace(coalesce(p.whatsapp_number, ''), '[^0-9]', '', 'g') = v_digits
     or regexp_replace(coalesce(p.mobile, ''), '[^0-9]', '', 'g') = v_digits
     or exists (
       select 1
       from public.studioflow_android_profiles ap
       where ap.customer_id = u.id
         and (
           regexp_replace(coalesce(ap.phone, ''), '[^0-9]', '', 'g') = v_digits
           or regexp_replace(coalesce(ap.whatsapp_number, ''), '[^0-9]', '', 'g') = v_digits
         )
     )
  order by case
    when regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g') = v_digits then 0
    else 1
  end
  limit 1;

  return v_customer_id;
end;
$$;

revoke all on function studioflow_whatsapp_private.find_customer(text) from public, anon, authenticated;
grant execute on function studioflow_whatsapp_private.find_customer(text) to service_role;

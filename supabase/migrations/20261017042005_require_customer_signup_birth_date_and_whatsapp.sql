-- Customer signup metadata is distinct from owner and other applications' accounts.
-- Existing accounts remain intact; new normal/referral customer signups require both fields.
create or replace function studioflow_android_private.require_customer_signup_fields() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.raw_user_meta_data ? 'customer_referral_code' then
  if nullif(btrim(new.raw_user_meta_data->>'date_of_birth'),'') is null then raise exception 'Date of Birth is required' using errcode='22023';end if;
  if nullif(btrim(new.raw_user_meta_data->>'whatsapp_number'),'') is null then raise exception 'WhatsApp number is required' using errcode='22023';end if;
 end if;
 return new;
end $$;
revoke all on function studioflow_android_private.require_customer_signup_fields() from public,anon,authenticated;
create trigger studioflow_require_customer_signup_fields before insert on auth.users for each row execute function studioflow_android_private.require_customer_signup_fields();

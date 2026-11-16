-- Read only the two NEXORA WhatsApp Meta secrets from Vault.
-- The function is not callable by browser roles; trusted Edge Functions use service_role.
create or replace function studioflow_private.nexora_whatsapp_meta_secret(p_secret_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = p_secret_name
    and p_secret_name in (
      'nexora_whatsapp_meta_app_secret',
      'nexora_whatsapp_webhook_verify_token'
    )
  limit 1
$$;

create or replace function public.nexora_whatsapp_meta_secret(p_secret_name text)
returns text
language sql
stable
set search_path = ''
as $$
  select studioflow_private.nexora_whatsapp_meta_secret(p_secret_name)
$$;

revoke all on function studioflow_private.nexora_whatsapp_meta_secret(text) from public, anon, authenticated;
revoke all on function public.nexora_whatsapp_meta_secret(text) from public, anon, authenticated;
grant execute on function public.nexora_whatsapp_meta_secret(text) to service_role;

comment on function public.nexora_whatsapp_meta_secret(text) is
  'Reads allow-listed NEXORA Meta WhatsApp secrets from Vault. Service-role Edge Functions only.';

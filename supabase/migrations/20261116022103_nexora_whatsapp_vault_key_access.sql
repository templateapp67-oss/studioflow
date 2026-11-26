-- Expose the Vault-held WhatsApp token-encryption key only to trusted Edge Functions.
create or replace function studioflow_private.nexora_whatsapp_token_key()
returns text
language sql
stable
security definer
set search_path=''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name='nexora_whatsapp_token_encryption_key'
  limit 1
$$;

create or replace function public.nexora_whatsapp_token_key()
returns text
language sql
stable
security invoker
set search_path=''
as $$
  select studioflow_private.nexora_whatsapp_token_key()
$$;

revoke all on function studioflow_private.nexora_whatsapp_token_key() from public,anon,authenticated;
revoke all on function public.nexora_whatsapp_token_key() from public,anon,authenticated;
grant usage on schema studioflow_private to service_role;
grant execute on function studioflow_private.nexora_whatsapp_token_key() to service_role;
grant execute on function public.nexora_whatsapp_token_key() to service_role;

comment on function public.nexora_whatsapp_token_key() is
  'Service-role-only helper returning the Vault-held AES-256 WhatsApp token key to trusted Edge Functions. Never grant to browser roles.';

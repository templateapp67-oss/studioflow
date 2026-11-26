create or replace function public.nexora_whatsapp_find_customer(p_phone text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select studioflow_whatsapp_private.find_customer(p_phone)
$$;

revoke all on function public.nexora_whatsapp_find_customer(text) from public, anon, authenticated;
grant execute on function public.nexora_whatsapp_find_customer(text) to service_role;

comment on function public.nexora_whatsapp_find_customer(text) is
  'Returns an existing authenticated customer only when the stored account phone matches the WhatsApp sender; service-role Edge Functions only.';

create or replace function public.studioflow_whatsapp_find_customer(p_phone text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select studioflow_whatsapp_private.find_customer(p_phone)
$$;

revoke all on function public.studioflow_whatsapp_find_customer(text) from public, anon, authenticated;
grant execute on function public.studioflow_whatsapp_find_customer(text) to service_role;

comment on function public.studioflow_whatsapp_find_customer(text)
is 'Finds a customer identity by verified WhatsApp phone for trusted server-side booking only.';

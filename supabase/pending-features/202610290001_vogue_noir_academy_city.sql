-- Requires backend/vogue-noir-template-08.sql. Additive: existing enquiries and
-- seven-argument RPC continue to work. RLS and status permissions are unchanged.
begin;
alter table public.studioflow_academy_enquiries
  add column if not exists city text not null default '';

create or replace function studioflow_private.academy_enquire_with_city(
  p_slug text, p_name text, p_phone text, p_email text,
  p_course text, p_batch text, p_message text, p_city text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb; clean_city text := btrim(coalesce(p_city, ''));
begin
  if auth.uid() is null then
    raise exception 'Sign in to submit an Academy enquiry' using errcode = '42501';
  end if;
  if char_length(clean_city) not between 2 and 100 or clean_city ~ '[[:cntrl:]]' then
    raise exception 'Enter a valid preferred city or Online';
  end if;
  -- The existing RPC resolves the owner from the published slug, validates input,
  -- checks academy visibility, and applies the per-customer rate limit.
  result := studioflow_private.academy_enquire(p_slug, p_name, p_phone, p_email, p_course, p_batch, p_message);
  update public.studioflow_academy_enquiries
    set city = clean_city
    where id = (result->>'id')::uuid and customer_id = auth.uid();
  if not found then raise exception 'Could not save enquiry city'; end if;
  return result;
end $$;
revoke all on function studioflow_private.academy_enquire_with_city(text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function studioflow_private.academy_enquire_with_city(text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.studioflow_academy_enquire_with_city(
  p_slug text, p_name text, p_phone text, p_email text,
  p_course text, p_batch text, p_message text, p_city text
) returns jsonb language sql security invoker set search_path = '' as $$
  select studioflow_private.academy_enquire_with_city(p_slug,p_name,p_phone,p_email,p_course,p_batch,p_message,p_city)
$$;
revoke all on function public.studioflow_academy_enquire_with_city(text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.studioflow_academy_enquire_with_city(text,text,text,text,text,text,text,text) to authenticated;
commit;

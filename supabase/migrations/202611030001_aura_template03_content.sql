-- Template 03 · Aura Unisex Salon & Wellness Lounge
-- Durable Supabase section content, public projection, RLS and media policies.
--
-- Existing tables are reused: studioflow_templates (template catalogue),
-- studioflow_accounts (salon tenant/owner), studioflow_websites (published
-- projection), studioflow_branch_staff_members (server-managed manager roles),
-- auth.users, and the existing public `studioflow-media` Storage bucket.
-- No customer, booking, service, staff, review, payment or loyalty records are
-- inserted, replaced, or overwritten.
--
-- Apply after the StudioFlow base schema and 202611020001_ziya_promotions_and_loyalty.sql.
begin;

create schema if not exists studioflow_private;
revoke all on schema studioflow_private from public, anon;
grant usage on schema studioflow_private to authenticated;

-- Authorisation comes only from the salon owner key and the relational branch
-- staff directory. User-editable auth metadata is never consulted.
create or replace function studioflow_private.aura_can_manage_salon(p_salon_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  allowed boolean := false;
begin
  if actor is null or p_salon_id is null then return false; end if;
  if p_salon_id = actor and exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    return true;
  end if;
  if to_regclass('public.studioflow_branch_staff_members') is not null then
    execute 'select exists(select 1 from public.studioflow_branch_staff_members m '
         || 'where m.site_id = $1 and m.user_id = $2 and m.is_active = true '
         || 'and m.role in (''manager'',''owner''))'
      into allowed using p_salon_id, actor;
    if allowed then return true; end if;
  end if;
  return false;
end
$$;
revoke all on function studioflow_private.aura_can_manage_salon(uuid) from public, anon, authenticated;
grant execute on function studioflow_private.aura_can_manage_salon(uuid) to authenticated, service_role;

-- One generic row per section; no per-section tables and no duplicate catalogues.
create table if not exists public.studioflow_template_sections (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references public.studioflow_templates(id) on delete restrict,
  salon_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  section_key text not null,
  section_content jsonb not null default '{}'::jsonb
    check (jsonb_typeof(section_content) = 'object' and octet_length(section_content::text) <= 2000000),
  section_settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(section_settings) = 'object' and octet_length(section_settings::text) <= 100000),
  is_visible boolean not null default true,
  display_order integer not null default 0 check (display_order between -1000 and 10000),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint studioflow_template_sections_template_scope check (template_id = 'unisex_salon'),
  constraint studioflow_template_sections_key check (section_key in (
    'header','branding','hero','hero_media','buttons','categories','about','why_choose_us',
    'services','staff','gallery','videos','reviews','promotions','loyalty','booking',
    'contact','social','footer'
  )),
  constraint studioflow_template_sections_unique unique (template_id, salon_id, section_key),
  constraint studioflow_template_sections_safe_text check (
    section_content::text !~* '(javascript:|data:text/html|<script|</script)'
    and section_settings::text !~* '(javascript:|data:text/html|<script|</script)'
    and section_content::text !~* '"(amountPaid|bookingId|customerId|paymentStatus|paymentIntent|bookingRecords|customerRecords|financialRecords|serviceRoleKey|secret)"'
  )
);

create index if not exists studioflow_template_sections_salon_order_idx
  on public.studioflow_template_sections (salon_id, template_id, display_order, section_key);
create index if not exists studioflow_template_sections_public_idx
  on public.studioflow_template_sections (template_id, salon_id, is_visible) where is_visible;

alter table public.studioflow_template_sections enable row level security;
revoke all on public.studioflow_template_sections from public, anon, authenticated;
grant select on public.studioflow_template_sections to anon, authenticated;
grant insert, update, delete on public.studioflow_template_sections to authenticated;
grant all on public.studioflow_template_sections to service_role;

drop policy if exists studioflow_template_sections_public_read on public.studioflow_template_sections;
create policy studioflow_template_sections_public_read
  on public.studioflow_template_sections for select to anon, authenticated
  using (
    template_id = 'unisex_salon'
    and is_visible
    and exists (
      select 1 from public.studioflow_websites w
      where w.owner_id = studioflow_template_sections.salon_id
        and coalesce(w.content->'profile'->>'businessType', '') = 'unisex_salon'
    )
  );

drop policy if exists studioflow_template_sections_admin_read on public.studioflow_template_sections;
create policy studioflow_template_sections_admin_read
  on public.studioflow_template_sections for select to authenticated
  using (studioflow_private.aura_can_manage_salon(salon_id));

drop policy if exists studioflow_template_sections_admin_insert on public.studioflow_template_sections;
create policy studioflow_template_sections_admin_insert
  on public.studioflow_template_sections for insert to authenticated
  with check (studioflow_private.aura_can_manage_salon(salon_id));

drop policy if exists studioflow_template_sections_admin_update on public.studioflow_template_sections;
create policy studioflow_template_sections_admin_update
  on public.studioflow_template_sections for update to authenticated
  using (studioflow_private.aura_can_manage_salon(salon_id))
  with check (studioflow_private.aura_can_manage_salon(salon_id));

drop policy if exists studioflow_template_sections_admin_delete on public.studioflow_template_sections;
create policy studioflow_template_sections_admin_delete
  on public.studioflow_template_sections for delete to authenticated
  using (studioflow_private.aura_can_manage_salon(salon_id));

-- Pin tenant/section identity, reject protected field names, and maintain
-- updated_at / updated_by from the authenticated session (never client input).
create or replace function studioflow_private.aura_validate_template_section()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.template_id <> 'unisex_salon' then
    raise exception 'Only Template 03 content can be saved here' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.studioflow_accounts a
    where a.user_id = new.salon_id
      and coalesce(a.draft->'profile'->>'businessType', a.template_id, '') = 'unisex_salon'
  ) then
    raise exception 'This salon is not using Template 03' using errcode = '23514';
  end if;
  if new.section_content::text ~* '(javascript:|data:text/html|<script|</script)'
    or new.section_settings::text ~* '(javascript:|data:text/html|<script|</script)' then
    raise exception 'Unsupported markup in website content' using errcode = '23514';
  end if;
  if new.section_content::text ~* '"(amountPaid|bookingId|customerId|paymentStatus|paymentIntent|bookingRecords|customerRecords|financialRecords|serviceRoleKey|secret)"' then
    raise exception 'Protected business records cannot be edited as website content' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.template_id <> old.template_id
      or new.salon_id <> old.salon_id or new.section_key <> old.section_key then
      raise exception 'Section identity cannot be changed' using errcode = '42501';
    end if;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_by := coalesce(auth.uid(), old.updated_by);
  else
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end
$$;
revoke all on function studioflow_private.aura_validate_template_section() from public, anon, authenticated;
drop trigger if exists studioflow_template_sections_validate on public.studioflow_template_sections;
create trigger studioflow_template_sections_validate
  before insert or update on public.studioflow_template_sections
  for each row execute function studioflow_private.aura_validate_template_section();

-- Resolve the tenant whose Template 03 content an authenticated manager edits.
create or replace function public.get_aura_editable_salon_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.user_id
  from public.studioflow_accounts a
  where coalesce(a.draft->'profile'->>'businessType', a.template_id, '') = 'unisex_salon'
    and studioflow_private.aura_can_manage_salon(a.user_id)
  order by case when a.user_id = auth.uid() then 0 else 1 end, a.created_at
  limit 1
$$;
revoke all on function public.get_aura_editable_salon_id() from public, anon, authenticated;
grant execute on function public.get_aura_editable_salon_id() to authenticated, service_role;

-- Hidden sections are returned as empty, non-visible placeholders so the
-- storefront can honour a hide action. Hidden content is never exposed.
create or replace function public.get_aura_template_sections(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(s.section_key, jsonb_build_object(
      'content', case when s.is_visible then s.section_content else '{}'::jsonb end,
      'settings', case when s.is_visible then s.section_settings else '{}'::jsonb end,
      'isVisible', s.is_visible,
      'displayOrder', s.display_order,
      'updatedAt', s.updated_at
    )), '{}'::jsonb)
  from public.studioflow_websites w
  join public.studioflow_template_sections s
    on s.salon_id = w.owner_id
   and s.template_id = 'unisex_salon'
  where w.slug = lower(btrim(coalesce(p_slug, '')))
    and coalesce(w.content->'profile'->>'businessType', '') = 'unisex_salon'
$$;
revoke all on function public.get_aura_template_sections(text) from public, anon, authenticated;
grant execute on function public.get_aura_template_sections(text) to anon, authenticated, service_role;

-- Keep the existing published projection compatible with older clients. This
-- updates only the Template 03 key inside an already-published site; it never
-- creates a website, changes its URL, or changes published_at.
create or replace function studioflow_private.aura_section_projection(p_salon_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(s.section_key, jsonb_build_object(
      'content', case when s.is_visible then s.section_content else '{}'::jsonb end,
      'settings', case when s.is_visible then s.section_settings else '{}'::jsonb end,
      'isVisible', s.is_visible,
      'displayOrder', s.display_order,
      'updatedAt', s.updated_at
    )), '{}'::jsonb)
  from public.studioflow_template_sections s
  where s.salon_id = p_salon_id and s.template_id = 'unisex_salon'
$$;
revoke all on function studioflow_private.aura_section_projection(uuid) from public, anon, authenticated;
grant execute on function studioflow_private.aura_section_projection(uuid) to service_role;

create or replace function studioflow_private.aura_sync_published_sections()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  salon uuid;
  projection jsonb;
begin
  if tg_op = 'DELETE' then salon := old.salon_id; else salon := new.salon_id; end if;
  if not exists (
    select 1 from public.studioflow_accounts a
    where a.user_id = salon
      and coalesce(a.draft->'profile'->>'businessType', a.template_id, '') = 'unisex_salon'
  ) then
    return null;
  end if;
  projection := studioflow_private.aura_section_projection(salon);
  update public.studioflow_websites w
     set content = jsonb_set(
       jsonb_set(coalesce(w.content, '{}'::jsonb), '{templateSections}',
         coalesce(w.content->'templateSections', '{}'::jsonb), true),
       '{templateSections,unisex_salon}', projection, true)
   where w.owner_id = salon
     and coalesce(w.content->'profile'->>'businessType', '') = 'unisex_salon';
  return null;
end
$$;
revoke all on function studioflow_private.aura_sync_published_sections() from public, anon, authenticated;
drop trigger if exists studioflow_template_sections_sync_published on public.studioflow_template_sections;
create trigger studioflow_template_sections_sync_published
  after insert or update or delete on public.studioflow_template_sections
  for each row execute function studioflow_private.aura_sync_published_sections();

-- Existing configured Storage bucket: preserve image types, add video types and
-- a larger limit. No object rows are changed.
update storage.buckets
   set public = true,
       file_size_limit = greatest(coalesce(file_size_limit, 0), 52428800::bigint),
       allowed_mime_types = array(
         select distinct x
         from unnest(coalesce(allowed_mime_types, array[]::text[]) || array[
           'image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'
         ]) as x
       )
 where id = 'studioflow-media';
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studioflow-media', 'studioflow-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']
) on conflict (id) do nothing;

alter table storage.objects enable row level security;
grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;

drop policy if exists studioflow_media_read on storage.objects;
create policy studioflow_media_read on storage.objects for select to authenticated
  using (bucket_id = 'studioflow-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists studioflow_media_public_read on storage.objects;
create policy studioflow_media_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'studioflow-media');

-- Ordinary owner uploads continue to work. Template 03 paths are reserved for
-- the stricter policy below so MIME type, size and manager role are checked.
drop policy if exists studioflow_media_insert on storage.objects;
create policy studioflow_media_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'studioflow-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and coalesce((storage.foldername(name))[2], '') <> 'template-03'
  );

drop policy if exists studioflow_media_template03_insert on storage.objects;
create policy studioflow_media_template03_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'studioflow-media'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = 'template-03'
    and (storage.foldername(name))[3] in ('images', 'videos')
    and studioflow_private.aura_can_manage_salon(case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid else null end)
    and coalesce(metadata->>'mimetype', '') in (
      'image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'
    )
    and case when coalesce(metadata->>'size', '') ~ '^[0-9]+$'
      then (metadata->>'size')::bigint <= 52428800 else false end
  );

-- Owner updates/deletes of their own folder remain; active managers receive the
-- same scoped rights for Template 03 media only.
drop policy if exists studioflow_media_update on storage.objects;
create policy studioflow_media_update on storage.objects for update to authenticated
  using (bucket_id = 'studioflow-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'studioflow-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists studioflow_media_delete on storage.objects;
create policy studioflow_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'studioflow-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists studioflow_media_template03_manager_update on storage.objects;
create policy studioflow_media_template03_manager_update on storage.objects for update to authenticated
  using (
    bucket_id = 'studioflow-media'
    and (storage.foldername(name))[2] = 'template-03'
    and studioflow_private.aura_can_manage_salon(case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid else null end)
  )
  with check (
    bucket_id = 'studioflow-media'
    and (storage.foldername(name))[2] = 'template-03'
    and studioflow_private.aura_can_manage_salon(case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid else null end)
  );

drop policy if exists studioflow_media_template03_manager_delete on storage.objects;
create policy studioflow_media_template03_manager_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'studioflow-media'
    and (storage.foldername(name))[2] = 'template-03'
    and studioflow_private.aura_can_manage_salon(case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid else null end)
  );

-- Immediate owner-side change notifications; public pages also poll on focus.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'studioflow_template_sections'
     ) then
    alter publication supabase_realtime add table public.studioflow_template_sections;
  end if;
end
$$;

notify pgrst, 'reload schema';
commit;

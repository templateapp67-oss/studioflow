-- Canonical persistence contract for every Nexora salon template.
-- The editor draft remains lossless while the public salon row receives the
-- published fields required by the site resolver.
begin;

alter table public.profiles
  add column if not exists shop_flat_no text,
  add column if not exists promotional_banner jsonb not null default '{}'::jsonb,
  add column if not exists white_label_enabled boolean not null default true,
  add column if not exists accepts_online_bookings boolean not null default true,
  add column if not exists template_settings jsonb not null default '{}'::jsonb;

create table if not exists public.salon_gallery_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text,
  caption text,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salon_gallery_items_image_url_length check (char_length(image_url) <= 700000)
);
create index if not exists salon_gallery_items_owner_sort_idx on public.salon_gallery_items(owner_id, sort_order, created_at);
alter table public.salon_gallery_items enable row level security;
drop policy if exists salon_gallery_items_owner_all on public.salon_gallery_items;
create policy salon_gallery_items_owner_all on public.salon_gallery_items for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop trigger if exists trg_salon_gallery_items_updated_at on public.salon_gallery_items;
create trigger trg_salon_gallery_items_updated_at before update on public.salon_gallery_items
  for each row execute procedure public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('salon-media', 'salon-media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists salon_media_owner_read on storage.objects;
drop policy if exists salon_media_owner_insert on storage.objects;
drop policy if exists salon_media_owner_update on storage.objects;
drop policy if exists salon_media_owner_delete on storage.objects;
create policy salon_media_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'salon-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy salon_media_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'salon-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy salon_media_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'salon-media' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'salon-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy salon_media_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'salon-media' and (storage.foldername(name))[1] = (select auth.uid()::text));

create or replace function public.save_owner_editor_state(p_state jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
  actor uuid := auth.uid();
  v_profile jsonb;
  v_template_id text;
  v_salon_id uuid;
  v_subdomain text;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' or octet_length(p_state::text) > 1500000 then
    raise exception 'Invalid or oversized editor state' using errcode='22023';
  end if;
  v_profile := coalesce(p_state->'profile', '{}'::jsonb);
  if jsonb_typeof(v_profile) <> 'object' then raise exception 'Invalid editor profile' using errcode='22023'; end if;
  v_template_id := nullif(btrim(p_state->>'selectedTemplateId'), '');
  v_subdomain := nullif(lower(btrim(v_profile->>'subdomain')), '');
  if v_subdomain is not null and v_subdomain !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' then
    raise exception 'Invalid website slug' using errcode='22023';
  end if;

  insert into public.profiles(id, user_id) values (actor, actor) on conflict (id) do nothing;
  update public.profiles set
    business_type = case when v_profile ? 'businessType' then nullif(btrim(v_profile->>'businessType'),'') else business_type end,
    salon_name = case when v_profile ? 'businessName' then nullif(btrim(v_profile->>'businessName'),'') else salon_name end,
    full_name = case when v_profile ? 'ownerName' then nullif(btrim(v_profile->>'ownerName'),'') else full_name end,
    owner_role = case when v_profile ? 'ownerRole' then nullif(btrim(v_profile->>'ownerRole'),'') else owner_role end,
    tagline = case when v_profile ? 'tagline' then nullif(v_profile->>'tagline','') else tagline end,
    about = case when v_profile ? 'about' then nullif(v_profile->>'about','') else about end,
    logo_url = case when v_profile ? 'logoUrl' then nullif(v_profile->>'logoUrl','') else logo_url end,
    cover_image_url = case when v_profile ? 'coverImageUrl' then nullif(v_profile->>'coverImageUrl','') else cover_image_url end,
    owner_photo_url = case when v_profile ? 'ownerPhotoUrl' then nullif(v_profile->>'ownerPhotoUrl','') else owner_photo_url end,
    subdomain = coalesce(v_subdomain, subdomain),
    custom_domain = case when v_profile ? 'customDomain' then nullif(lower(btrim(v_profile->>'customDomain')),'') else custom_domain end,
    full_address = case when v_profile ? 'address' then nullif(btrim(v_profile->>'address'),'') else full_address end,
    shop_flat_no = case when v_profile ? 'shopFlatNo' then nullif(btrim(v_profile->>'shopFlatNo'),'') else shop_flat_no end,
    area = case when v_profile ? 'areaLocality' then nullif(btrim(v_profile->>'areaLocality'),'') else area end,
    city = case when v_profile ? 'city' then nullif(btrim(v_profile->>'city'),'') else city end,
    state = case when v_profile ? 'state' then nullif(btrim(v_profile->>'state'),'') else state end,
    postal_code = case when v_profile ? 'postalCode' then nullif(btrim(v_profile->>'postalCode'),'') else postal_code end,
    landmark = case when v_profile ? 'landmark' then nullif(btrim(v_profile->>'landmark'),'') else landmark end,
    theme_preset = case when v_profile ? 'themePreset' then nullif(v_profile->>'themePreset','') else theme_preset end,
    promotional_banner = case when jsonb_typeof(v_profile->'promotionalBanner')='object' then v_profile->'promotionalBanner' else promotional_banner end,
    white_label_enabled = case when v_profile ? 'whiteLabelEnabled' then coalesce((v_profile->>'whiteLabelEnabled')::boolean, true) else white_label_enabled end,
    accepts_online_bookings = case when v_profile ? 'acceptsOnlineBookings' then coalesce((v_profile->>'acceptsOnlineBookings')::boolean, true) else accepts_online_bookings end,
    template_settings = jsonb_strip_nulls(jsonb_build_object(
      'selectedTemplateId', v_template_id,
      'sectionVisibility', v_profile->'sectionVisibility',
      'sectionHeadings', v_profile->'sectionHeadings'
    )),
    updated_at = now()
  where id = actor;

  insert into public.owner_editor_state(owner_id, state) values(actor, p_state)
  on conflict(owner_id) do update set state = excluded.state, updated_at = now();

  select id into v_salon_id from public.nexora_owner_salon_ids() limit 1;
  if v_salon_id is not null then
    update public.salons set
      name = coalesce(nullif(btrim(v_profile->>'businessName'),''), name),
      description = coalesce(nullif(v_profile->>'about',''), description),
      phone = coalesce(nullif(v_profile->>'phone',''), phone),
      accepts_online_bookings = case when v_profile ? 'acceptsOnlineBookings' then coalesce((v_profile->>'acceptsOnlineBookings')::boolean, true) else accepts_online_bookings end,
      slug = coalesce(v_subdomain, slug),
      data = coalesce(data, '{}'::jsonb) || jsonb_build_object('editor_profile', v_profile, 'editor_state', p_state, 'selected_template_id', v_template_id),
      updated_at = now()
    where id = v_salon_id;
  end if;

  return p_state;
end $$;

revoke all on function public.save_owner_editor_state(jsonb) from public, anon;
grant execute on function public.save_owner_editor_state(jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;

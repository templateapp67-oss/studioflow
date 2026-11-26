-- Normalized public-template catalogue, as required by the live site reader.
begin;

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.salons(id) on delete cascade,
  name text not null, description text, sort_order integer not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(salon_id,name)
);
create table if not exists public.salon_services (
  id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.salons(id) on delete cascade,
  category_id uuid references public.service_categories(id) on delete set null, name text not null, category text not null default 'General', description text,
  price numeric(12,2) not null default 0 check(price>=0), duration_minutes integer not null default 45 check(duration_minutes>0),
  icon text not null default 'sparkles', is_active boolean not null default true, is_bookable_online boolean not null default true, is_featured boolean not null default false,
  display_order integer not null default 0, editor_key text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(salon_id,editor_key)
);
create index if not exists salon_services_public_idx on public.salon_services(salon_id,is_active,is_bookable_online,display_order);
create table if not exists public.staff_roles (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.salons(id) on delete cascade, name text not null, permissions jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(), unique(salon_id,name));
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.salons(id) on delete cascade, role_id uuid references public.staff_roles(id) on delete set null,
  name text not null, full_name text, role_title text, bio text, profile_photo_url text, avatar_path text, phone text, email text, specialties jsonb not null default '[]'::jsonb,
  employment_status text not null default 'active' check(employment_status in ('active','inactive','on_leave')), is_active boolean not null default true, is_public boolean not null default true,
  commission_rate numeric(5,2) not null default 0 check(commission_rate between 0 and 100), editor_key text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(salon_id,editor_key)
);
create index if not exists staff_public_idx on public.staff(salon_id,is_active,is_public);
create table if not exists public.staff_services (staff_id uuid not null references public.staff(id) on delete cascade, service_id uuid not null references public.salon_services(id) on delete cascade, is_active boolean not null default true, primary key(staff_id,service_id));
create table if not exists public.salon_hours (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.salons(id) on delete cascade, day_of_week smallint not null check(day_of_week between 0 and 6), opens_at time, closes_at time, is_closed boolean not null default false, unique(salon_id,day_of_week));
create table if not exists public.salon_branding (salon_id uuid primary key references public.salons(id) on delete cascade, logo_url text, cover_image_url text, primary_color text, secondary_color text, background_color text, custom_css text, updated_at timestamptz not null default now());
create table if not exists public.salon_booking_settings (salon_id uuid primary key references public.salons(id) on delete cascade, accepts_online_bookings boolean not null default true, require_deposit boolean not null default false, deposit_percentage numeric(5,2) not null default 25 check(deposit_percentage between 0 and 100), home_service jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.salon_media (id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.salons(id) on delete cascade, media_type text not null check(media_type in ('image','video','document')), url text not null, title text, alt_text text, section_key text, sort_order integer not null default 0, is_published boolean not null default true, created_at timestamptz not null default now());
create table if not exists public.salon_public_websites (salon_id uuid primary key references public.salons(id) on delete cascade, template_id text not null, slug text not null unique, custom_domain text unique, is_published boolean not null default true, published_at timestamptz, updated_at timestamptz not null default now());

alter table public.service_categories enable row level security; alter table public.salon_services enable row level security; alter table public.staff_roles enable row level security; alter table public.staff enable row level security; alter table public.staff_services enable row level security; alter table public.salon_hours enable row level security; alter table public.salon_branding enable row level security; alter table public.salon_booking_settings enable row level security; alter table public.salon_media enable row level security; alter table public.salon_public_websites enable row level security;

create or replace function public.is_my_salon(p_salon_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$ select p_salon_id in (select public.nexora_owner_salon_ids()) $$;
revoke all on function public.is_my_salon(uuid) from public,anon; grant execute on function public.is_my_salon(uuid) to authenticated;

drop policy if exists service_categories_owner_all on public.service_categories; create policy service_categories_owner_all on public.service_categories for all to authenticated using (public.is_my_salon(salon_id)) with check (public.is_my_salon(salon_id));
drop policy if exists salon_services_owner_all on public.salon_services; create policy salon_services_owner_all on public.salon_services for all to authenticated using (public.is_my_salon(salon_id)) with check (public.is_my_salon(salon_id));
drop policy if exists staff_roles_owner_all on public.staff_roles; create policy staff_roles_owner_all on public.staff_roles for all to authenticated using (public.is_my_salon(salon_id)) with check (public.is_my_salon(salon_id));
drop policy if exists staff_owner_all on public.staff; create policy staff_owner_all on public.staff for all to authenticated using (public.is_my_salon(salon_id)) with check (public.is_my_salon(salon_id));
drop policy if exists staff_services_owner_all on public.staff_services; create policy staff_services_owner_all on public.staff_services for all to authenticated using (exists(select 1 from public.staff s where s.id=staff_id and public.is_my_salon(s.salon_id))) with check (exists(select 1 from public.staff s where s.id=staff_id and public.is_my_salon(s.salon_id)));
drop policy if exists salon_hours_owner_all on public.salon_hours; create policy salon_hours_owner_all on public.salon_hours for all to authenticated using (public.is_my_salon(salon_id)) with check (public.is_my_salon(salon_id));
drop policy if exists salon_branding_owner_all on public.salon_branding; create policy salon_branding_owner_all on public.salon_branding for all to authenticated using (public.is_my_salon(salon_id)) with check (public.is_my_salon(salon_id));
drop policy if exists salon_booking_settings_owner_all on public.salon_booking_settings; create policy salon_booking_settings_owner_all on public.salon_booking_settings for all to authenticated using (public.is_my_salon(salon_id)) with check (public.is_my_salon(salon_id));
drop policy if exists salon_media_owner_all on public.salon_media; create policy salon_media_owner_all on public.salon_media for all to authenticated using (public.is_my_salon(salon_id)) with check (public.is_my_salon(salon_id));
drop policy if exists salon_public_websites_owner_all on public.salon_public_websites; create policy salon_public_websites_owner_all on public.salon_public_websites for all to authenticated using (public.is_my_salon(salon_id)) with check (public.is_my_salon(salon_id));
create policy salon_services_public_read on public.salon_services for select using (is_active and is_bookable_online);
create policy staff_public_read on public.staff for select using (is_active and is_public);
create policy staff_services_public_read on public.staff_services for select using (exists(select 1 from public.staff s where s.id=staff_id and s.is_active and s.is_public));
create policy salon_hours_public_read on public.salon_hours for select using (true);
create policy salon_media_public_read on public.salon_media for select using (is_published);
create policy salon_public_websites_public_read on public.salon_public_websites for select using (is_published);

create or replace function public.sync_owner_template_catalogue() returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare sid uuid; item jsonb; staff_row jsonb; new_staff_id uuid; service_name text; selected_template text; item_key text; begin
 select s.id into sid from public.salons s join public.organization_members m on m.organization_id=s.organization_id where m.user_id=new.owner_id and m.status='active' and m.role in ('owner','manager') and s.deleted_at is null order by s.created_at desc limit 1;
 if sid is null then return new; end if;
 for item in select value from jsonb_array_elements(coalesce(new.state->'services','[]'::jsonb)) loop
   service_name:=nullif(btrim(item->>'name'),''); if service_name is null then continue; end if; item_key:='service:'||coalesce(nullif(item->>'id',''),md5(item::text));
   insert into public.salon_services(salon_id,name,category,description,price,duration_minutes,icon,is_active,is_bookable_online,is_featured,display_order,editor_key)
   values(sid,service_name,coalesce(nullif(item->>'category',''),'General'),nullif(item->>'description',''),greatest(0,coalesce((item->>'price')::numeric,0)),greatest(1,coalesce((item->>'durationMinutes')::int,45)),coalesce(nullif(item->>'icon',''),'sparkles'),true,coalesce((item->>'isBookableOnline')::boolean,true),coalesce((item->>'popular')::boolean,false),coalesce((item->>'sortOrder')::int,0),item_key)
   on conflict(salon_id,editor_key) do update set name=excluded.name,category=excluded.category,description=excluded.description,price=excluded.price,duration_minutes=excluded.duration_minutes,icon=excluded.icon,is_active=excluded.is_active,is_bookable_online=excluded.is_bookable_online,is_featured=excluded.is_featured,display_order=excluded.display_order,updated_at=now();
 end loop;
 for staff_row in select value from jsonb_array_elements(coalesce(new.state->'stylists','[]'::jsonb)) loop
   if nullif(btrim(staff_row->>'name'),'') is null then continue; end if; item_key:='staff:'||coalesce(nullif(staff_row->>'id',''),md5(staff_row::text));
   insert into public.staff(salon_id,name,full_name,role_title,bio,profile_photo_url,phone,specialties,employment_status,is_active,is_public,commission_rate,editor_key)
   values(sid,staff_row->>'name',staff_row->>'name',coalesce(nullif(staff_row->>'role',''),'Service Provider'),nullif(staff_row->>'bio',''),nullif(staff_row->>'avatarUrl',''),nullif(staff_row->>'phone',''),coalesce(staff_row->'specialties','[]'::jsonb),case when lower(coalesce(staff_row->>'status','available')) in ('available','active') then 'active' else 'inactive' end,lower(coalesce(staff_row->>'status','available')) in ('available','active'),true,coalesce((staff_row->>'commissionRate')::numeric,0),item_key)
   on conflict(salon_id,editor_key) do update set name=excluded.name,full_name=excluded.full_name,role_title=excluded.role_title,bio=excluded.bio,profile_photo_url=excluded.profile_photo_url,phone=excluded.phone,specialties=excluded.specialties,employment_status=excluded.employment_status,is_active=excluded.is_active,is_public=excluded.is_public,commission_rate=excluded.commission_rate,updated_at=now() returning id into new_staff_id;
 end loop;
 selected_template:=nullif(new.state->>'selectedTemplateId','');
 insert into public.salon_public_websites(salon_id,template_id,slug,is_published,published_at) select sid,coalesce(selected_template,p.business_type,'hair_salon'),coalesce(p.subdomain,s.slug),true,now() from public.profiles p join public.salons s on s.id=sid where p.id=new.owner_id on conflict(salon_id) do update set template_id=excluded.template_id,slug=excluded.slug,is_published=true,published_at=coalesce(public.salon_public_websites.published_at,now()),updated_at=now();
 insert into public.salon_branding(salon_id,logo_url,cover_image_url,primary_color,secondary_color,background_color) select sid,p.logo_url,p.cover_image_url,p.primary_color,p.secondary_color,p.background_color from public.profiles p where p.id=new.owner_id on conflict(salon_id) do update set logo_url=excluded.logo_url,cover_image_url=excluded.cover_image_url,primary_color=excluded.primary_color,secondary_color=excluded.secondary_color,background_color=excluded.background_color,updated_at=now();
 insert into public.salon_booking_settings(salon_id,accepts_online_bookings,require_deposit,deposit_percentage,home_service) select sid,p.accepts_online_bookings,p.require_deposit,p.deposit_percentage,coalesce(p.home_service,'{}'::jsonb) from public.profiles p where p.id=new.owner_id on conflict(salon_id) do update set accepts_online_bookings=excluded.accepts_online_bookings,require_deposit=excluded.require_deposit,deposit_percentage=excluded.deposit_percentage,home_service=excluded.home_service,updated_at=now();
 return new; end $$;
drop trigger if exists trg_owner_editor_state_catalogue_sync on public.owner_editor_state;
create trigger trg_owner_editor_state_catalogue_sync after insert or update of state on public.owner_editor_state for each row execute function public.sync_owner_template_catalogue();
notify pgrst,'reload schema'; commit;

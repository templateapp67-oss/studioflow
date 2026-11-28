-- Tables used by the actual historical sync_owner_template_catalogue trigger.
-- Synthetic minimal columns only; the trigger itself is loaded from its real
-- timestamped migration by the verifier.
create table if not exists public.organization_members(organization_id uuid,user_id uuid,role text,status text);
create table public.profiles(id uuid primary key,business_type text,subdomain text,logo_url text,cover_image_url text,primary_color text,secondary_color text,background_color text,accepts_online_bookings boolean,require_deposit boolean,deposit_percentage numeric,home_service jsonb);
create table public.salon_public_websites(salon_id uuid primary key,template_id text,slug text,is_published boolean,published_at timestamptz,updated_at timestamptz default now());
create table public.salon_branding(salon_id uuid primary key,logo_url text,cover_image_url text,primary_color text,secondary_color text,background_color text,updated_at timestamptz default now());
create table public.salon_booking_settings(salon_id uuid primary key,accepts_online_bookings boolean,require_deposit boolean,deposit_percentage numeric,home_service jsonb,updated_at timestamptz default now());

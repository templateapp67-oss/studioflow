-- Synthetic Supabase surface for scripts/verify-postgres-booking-concurrency.mjs.
-- The normalized fixture and the actual historical Iron Ink migration are
-- loaded separately; all records, auth identities and email addresses are fake.
create schema studioflow_private;
create schema studioflow_android_private;
create table auth.users(id uuid primary key,email text,banned_until timestamptz);
create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(bucket_id text,name text,owner uuid,metadata jsonb);
create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
create publication supabase_realtime;
create table public.studioflow_accounts(user_id uuid primary key,draft jsonb);
create table public.studioflow_websites(owner_id uuid primary key,slug text unique,content jsonb,published_at timestamptz);
create table public.studioflow_templates(id text primary key,title text,config jsonb,active boolean,updated_at timestamptz);
create table public.branches(id uuid primary key default gen_random_uuid(),site_id uuid,name text,city text default '',address text default '',phone text default '',is_active boolean,operating_hours jsonb,created_at timestamptz default now(),updated_at timestamptz default now(),unique(site_id,name),unique(site_id,id));
create table public.studioflow_staff_branch_schedules(site_id uuid,branch_id uuid,staff_id text,day_of_week text,starts_at time,ends_at time,is_active boolean,updated_at timestamptz default now(),unique(site_id,branch_id,staff_id,day_of_week));
create table public.organization_members(organization_id uuid,user_id uuid,role text,status text);
create table public.studioflow_services(owner_id uuid,service_id text,branch_ids uuid[]);
create table public.studioflow_bookings(id uuid primary key default gen_random_uuid(),owner_id uuid,customer_id uuid,stylist_id text,starts_at timestamptz,ends_at timestamptz,status text,payload jsonb,created_at timestamptz default now(),hold_expires_at timestamptz,branch_id uuid);
create table public.studioflow_android_requests(customer_id uuid,request_id uuid,fingerprint text,booking_id uuid,primary key(customer_id,request_id));
create table public.studioflow_demo_bookings(id uuid primary key default gen_random_uuid(),customer_id uuid,owner_id uuid,request_id uuid,status text default 'confirmed',payload jsonb,created_at timestamptz default now(),unique(customer_id,request_id));
alter table public.studioflow_bookings enable row level security;
grant select on public.studioflow_bookings to authenticated;
create policy booking_read on public.studioflow_bookings for select to authenticated using(owner_id=auth.uid() or customer_id=auth.uid());
create function studioflow_private.service_catalogue_available_at_branch(p_owner uuid,p_services jsonb,p_branch uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.studioflow_services s where s.owner_id=p_owner and p_services ? s.service_id and cardinality(s.branch_ids)>0 and (p_branch is null or not p_branch=any(s.branch_ids)))
$$;
create function studioflow_private.booking_staff_profiles(p_slug text,p_ids jsonb) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(s),'[]'::jsonb) from public.studioflow_websites w cross join lateral jsonb_array_elements(w.content->'stylists') s where w.slug=p_slug and p_ids ? (s->>'id')
$$;
create function studioflow_private.mens_service(s jsonb) returns boolean language sql immutable as $$select coalesce(s->>'mensTemplateId'='mens_hair_studio',false)$$;
create function studioflow_private.availability(p_slug text,p_service_id text,p_date date,p_stylist_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare selected text:=nullif(current_setting('studioflow.branch_id',true),''); begin
 if selected is not null then return studioflow_private.branch_slots(p_slug,jsonb_build_array(p_service_id),p_date,p_stylist_id,selected::uuid); end if;
 return studioflow_private.availability_unbranched(p_slug,p_service_id,p_date,p_stylist_id); end $$;
create function studioflow_private.validate_studioflow_booking_branch() returns trigger language plpgsql security definer set search_path='' as $$begin return new; end$$;
create trigger studioflow_booking_branch_guard before insert or update of branch_id,stylist_id,starts_at,ends_at on public.studioflow_bookings for each row execute function studioflow_private.validate_studioflow_booking_branch();
grant usage on schema public,auth,studioflow_private,studioflow_android_private to anon,authenticated;

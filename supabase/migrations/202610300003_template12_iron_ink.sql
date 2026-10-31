-- Template 12 · Iron & Ink
-- Additive multi-tenant data layer. site_id is the existing StudioFlow owner
-- tenant key (studioflow_accounts.user_id / studioflow_websites.owner_id).
-- Requires the existing StudioFlow base schema and auth/storage extensions.
begin;

create schema if not exists studioflow_ink_private;
revoke all on schema studioflow_ink_private from public, anon;
grant usage on schema studioflow_ink_private to authenticated;

-- Settings + content tables -------------------------------------------------
create table if not exists public.ink_studio_settings (
  site_id uuid primary key references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'),
  studio_name text not null default 'Iron & Ink Urban Tattoo & Body Art Studio' check (char_length(btrim(studio_name)) between 2 and 160),
  tagline text not null default 'Your Story. Our Ink.' check (char_length(tagline) <= 240),
  logo_url text not null default '',
  brand_color text not null default '#E11D48' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  address text not null default '',
  map_url text not null default '',
  timings jsonb not null default '{"mon":"11:00-20:00","tue":"11:00-20:00","wed":"11:00-20:00","thu":"11:00-20:00","fri":"11:00-20:00","sat":"11:00-20:00","sun":"by-appointment"}'::jsonb check (jsonb_typeof(timings)='object'),
  socials jsonb not null default '{}'::jsonb check (jsonb_typeof(socials)='object'),
  deposit_amount numeric(10,2) not null default 1000 check (deposit_amount between 0 and 1000000),
  min_age smallint not null default 18 check (min_age between 18 and 100),
  hero_images jsonb not null default '[]'::jsonb check (jsonb_typeof(hero_images)='array'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.ink_categories (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'), slug text not null, name text not null,
  "group" text not null check ("group" in ('tattoo_style','body_art','extra')),
  description text not null default '', image_url text not null default '', starting_price numeric(10,2) not null default 0 check (starting_price>=0),
  duration_min integer not null default 60 check (duration_min between 1 and 1440), duration_label text not null default '60 min', is_active boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(site_id,slug), unique(site_id,id)
);
alter table public.ink_categories add column if not exists duration_label text not null default '60 min';

create table if not exists public.ink_artists (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'), name text not null check (char_length(btrim(name)) between 2 and 120), photo_url text not null default '', bio text not null default '', specialties text[] not null default '{}',
  instagram text not null default '', experience_years smallint not null default 0 check (experience_years between 0 and 80), is_active boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(site_id,id), unique(site_id,name)
);

create table if not exists public.ink_portfolio (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'), category_id uuid, artist_id uuid, image_url text not null default '', title text not null default '', placement text not null default '', is_featured boolean not null default false, is_published boolean not null default true, healed_image_url text not null default '', sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(site_id,category_id) references public.ink_categories(site_id,id),
  foreign key(site_id,artist_id) references public.ink_artists(site_id,id)
);
alter table public.ink_portfolio add column if not exists is_published boolean not null default true;

create table if not exists public.ink_pricing_plans (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'), name text not null, type text not null check (type in ('hourly','session','flash_day','sleeve')),
  price numeric(10,2) not null check (price>=0), duration_min integer not null default 60 check (duration_min between 1 and 1440), description text not null default '', is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(site_id,name)
);

create table if not exists public.ink_bookings (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'), customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 120), phone text not null check (length(regexp_replace(phone,'[^0-9]','','g')) between 10 and 15),
  email text not null default '' check (email='' or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  customer_birth_date date, category_id uuid not null, artist_id uuid not null, booking_date date not null, start_time time not null,
  size_cm numeric(6,2) check (size_cm is null or size_cm between 0.1 and 300), placement text not null default '', description text not null default '', reference_images text[] not null default '{}',
  deposit_paid boolean not null default false, status text not null default 'pending' check (status in ('pending','confirmed','in_progress','completed','cancelled','no_show')),
  notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(site_id,category_id) references public.ink_categories(site_id,id),
  foreign key(site_id,artist_id) references public.ink_artists(site_id,id)
);

create table if not exists public.ink_availability (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'), artist_id uuid not null, day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null, end_time time not null, is_off boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(site_id,artist_id) references public.ink_artists(site_id,id) on delete cascade, check(end_time>start_time), unique(site_id,artist_id,day_of_week,start_time)
);
create table if not exists public.ink_blocked_dates (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'), artist_id uuid, date date not null, reason text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(site_id,artist_id) references public.ink_artists(site_id,id) on delete cascade, unique(site_id,artist_id,date)
);

create table if not exists public.ink_testimonials (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'), client_name text not null, photo_url text not null default '', rating smallint not null check (rating between 1 and 5), review text not null default '', category_id uuid, is_published boolean not null default false, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), foreign key(site_id,category_id) references public.ink_categories(site_id,id) on delete set null, unique(site_id,client_name,review)
);
create table if not exists public.ink_faqs (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'), question text not null, answer text not null, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(site_id,question)
);
create table if not exists public.ink_aftercare (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'), step_no smallint not null, title text not null, body text not null, image_url text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(site_id,step_no)
);
create table if not exists public.ink_blog_posts (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'), slug text not null, title text not null, cover_url text not null default '', content text not null default '', is_published boolean not null default false, published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(site_id,slug)
);
create table if not exists public.ink_enquiries (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'), name text not null check (char_length(btrim(name)) between 2 and 120), phone text not null default '' check (phone='' or length(regexp_replace(phone,'[^0-9]','','g')) between 10 and 15),
  email text not null default '' check(email='' or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'), message text not null check(char_length(btrim(message)) between 2 and 2000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), is_read boolean not null default false
);
create table if not exists public.ink_onboarding (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'), step text not null, data jsonb not null default '{}'::jsonb check(jsonb_typeof(data)='object'), completed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(site_id,step)
);
create table if not exists public.ink_notifications (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  template_key text not null default 'iron-ink' check (template_key='iron-ink'), booking_id uuid not null references public.ink_bookings(id) on delete cascade,
  notification_type text not null default 'new_booking', payload jsonb not null default '{}'::jsonb, read_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(booking_id,notification_type)
);

-- Required tenant indexes (tables have active/order columns only where relevant).
create index if not exists ink_categories_site_idx on public.ink_categories(site_id);
create index if not exists ink_categories_site_active_idx on public.ink_categories(site_id,is_active);
create index if not exists ink_categories_site_order_idx on public.ink_categories(site_id,sort_order);
create index if not exists ink_artists_site_idx on public.ink_artists(site_id);
create index if not exists ink_artists_site_active_idx on public.ink_artists(site_id,is_active);
create index if not exists ink_artists_site_order_idx on public.ink_artists(site_id,sort_order);
create index if not exists ink_portfolio_site_idx on public.ink_portfolio(site_id);
create unique index if not exists ink_portfolio_seed_image_title_uidx on public.ink_portfolio(site_id,image_url,title);
create index if not exists ink_portfolio_site_order_idx on public.ink_portfolio(site_id,sort_order);
create index if not exists ink_portfolio_site_featured_idx on public.ink_portfolio(site_id,is_featured,sort_order);
create index if not exists ink_pricing_site_idx on public.ink_pricing_plans(site_id);
create index if not exists ink_pricing_site_active_idx on public.ink_pricing_plans(site_id,is_active);
create index if not exists ink_bookings_site_date_artist_idx on public.ink_bookings(site_id,booking_date,artist_id);
create index if not exists ink_bookings_customer_idx on public.ink_bookings(customer_id,created_at desc) where customer_id is not null;
create index if not exists ink_bookings_site_phone_idx on public.ink_bookings(site_id,phone,created_at desc);
create index if not exists ink_bookings_site_status_idx on public.ink_bookings(site_id,status,booking_date);
create unique index if not exists ink_bookings_artist_slot_active_uidx on public.ink_bookings(artist_id,booking_date,start_time) where status<>'cancelled';
create index if not exists ink_availability_site_idx on public.ink_availability(site_id);
create index if not exists ink_blocked_dates_site_idx on public.ink_blocked_dates(site_id,date);
create index if not exists ink_testimonials_site_idx on public.ink_testimonials(site_id);
create index if not exists ink_testimonials_site_active_idx on public.ink_testimonials(site_id,is_published);
create index if not exists ink_testimonials_site_order_idx on public.ink_testimonials(site_id,sort_order);
create index if not exists ink_faqs_site_idx on public.ink_faqs(site_id);
create index if not exists ink_faqs_site_order_idx on public.ink_faqs(site_id,sort_order);
create index if not exists ink_aftercare_site_idx on public.ink_aftercare(site_id);
create index if not exists ink_aftercare_site_order_idx on public.ink_aftercare(site_id,step_no);
create index if not exists ink_blog_site_idx on public.ink_blog_posts(site_id);
create index if not exists ink_blog_site_active_idx on public.ink_blog_posts(site_id,is_published);
create index if not exists ink_enquiries_site_idx on public.ink_enquiries(site_id,created_at desc);
create index if not exists ink_onboarding_site_idx on public.ink_onboarding(site_id);
create index if not exists ink_notifications_site_idx on public.ink_notifications(site_id,created_at desc);
create index if not exists ink_notifications_site_unread_idx on public.ink_notifications(site_id,read_at) where read_at is null;

-- Realtime is used by the Template 12 owner booking inbox.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ink_bookings') then
  execute 'alter publication supabase_realtime add table public.ink_bookings';
 end if;
end $$;

-- Timestamp trigger is idempotently replaced on every ink table.
create or replace function studioflow_ink_private.touch_updated_at() returns trigger
language plpgsql security definer set search_path='' as $$ begin new.updated_at:=now(); return new; end $$;
revoke all on function studioflow_ink_private.touch_updated_at() from public,anon,authenticated;
do $$ declare t text; begin
  foreach t in array array['ink_studio_settings','ink_categories','ink_artists','ink_portfolio','ink_pricing_plans','ink_bookings','ink_availability','ink_blocked_dates','ink_testimonials','ink_faqs','ink_aftercare','ink_blog_posts','ink_enquiries','ink_onboarding','ink_notifications'] loop
    execute format('drop trigger if exists %I on public.%I',t||'_touch',t);
    execute format('create trigger %I before update on public.%I for each row execute function studioflow_ink_private.touch_updated_at()',t||'_touch',t);
  end loop;
end $$;

-- RLS: all public content is select-only; all writes are owner-scoped or
-- validated booking/enquiry submissions. No write policy uses USING(true).
do $$ declare t text; begin foreach t in array array['ink_studio_settings','ink_categories','ink_artists','ink_portfolio','ink_pricing_plans','ink_bookings','ink_availability','ink_blocked_dates','ink_testimonials','ink_faqs','ink_aftercare','ink_blog_posts','ink_enquiries','ink_onboarding','ink_notifications'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
revoke all on public.ink_studio_settings,public.ink_categories,public.ink_artists,public.ink_portfolio,public.ink_pricing_plans,public.ink_bookings,public.ink_availability,public.ink_blocked_dates,public.ink_testimonials,public.ink_faqs,public.ink_aftercare,public.ink_blog_posts,public.ink_enquiries,public.ink_onboarding,public.ink_notifications from anon,authenticated;
grant select on public.ink_studio_settings,public.ink_categories,public.ink_artists,public.ink_portfolio,public.ink_pricing_plans,public.ink_testimonials,public.ink_faqs,public.ink_aftercare,public.ink_blog_posts to anon,authenticated;
grant select,insert,update,delete on public.ink_studio_settings,public.ink_categories,public.ink_artists,public.ink_portfolio,public.ink_pricing_plans,public.ink_bookings,public.ink_availability,public.ink_blocked_dates,public.ink_testimonials,public.ink_faqs,public.ink_aftercare,public.ink_blog_posts,public.ink_enquiries,public.ink_onboarding,public.ink_notifications to authenticated;
grant insert on public.ink_bookings,public.ink_enquiries to anon;

do $$ declare t text; begin
 foreach t in array array['ink_studio_settings','ink_categories','ink_artists','ink_portfolio','ink_pricing_plans','ink_availability','ink_blocked_dates','ink_testimonials','ink_faqs','ink_aftercare','ink_blog_posts','ink_enquiries','ink_onboarding','ink_notifications'] loop
  execute format('drop policy if exists %I on public.%I',t||'_owner_all',t);
  execute format('create policy %I on public.%I for all to authenticated using (site_id=(select auth.uid())) with check (site_id=(select auth.uid()))',t||'_owner_all',t);
 end loop;
end $$;
-- Public reads: constrained to the content's published/active flag.
drop policy if exists ink_settings_public_read on public.ink_studio_settings;
create policy ink_settings_public_read on public.ink_studio_settings for select to anon,authenticated using (true);
drop policy if exists ink_categories_public_read on public.ink_categories;
create policy ink_categories_public_read on public.ink_categories for select to anon,authenticated using (is_active);
drop policy if exists ink_artists_public_read on public.ink_artists;
create policy ink_artists_public_read on public.ink_artists for select to anon,authenticated using (is_active);
drop policy if exists ink_portfolio_public_read on public.ink_portfolio;
create policy ink_portfolio_public_read on public.ink_portfolio for select to anon,authenticated using (is_published);
drop policy if exists ink_pricing_public_read on public.ink_pricing_plans;
create policy ink_pricing_public_read on public.ink_pricing_plans for select to anon,authenticated using (is_active);
drop policy if exists ink_testimonials_public_read on public.ink_testimonials;
create policy ink_testimonials_public_read on public.ink_testimonials for select to anon,authenticated using (is_published);
drop policy if exists ink_faqs_public_read on public.ink_faqs;
create policy ink_faqs_public_read on public.ink_faqs for select to anon,authenticated using (true);
drop policy if exists ink_aftercare_public_read on public.ink_aftercare;
create policy ink_aftercare_public_read on public.ink_aftercare for select to anon,authenticated using (true);
drop policy if exists ink_blog_public_read on public.ink_blog_posts;
create policy ink_blog_public_read on public.ink_blog_posts for select to anon,authenticated using (is_published);
-- Anonymous direct insert is limited by RLS and an additional validation/rate-limit trigger.
drop policy if exists ink_bookings_public_insert on public.ink_bookings;
create policy ink_bookings_public_insert on public.ink_bookings for insert to anon with check (status='pending' and deposit_paid=false and exists(select 1 from public.studioflow_accounts a where a.user_id=site_id));
drop policy if exists ink_bookings_customer_read on public.ink_bookings;
create policy ink_bookings_customer_read on public.ink_bookings for select to authenticated using (customer_id=(select auth.uid()));
drop policy if exists ink_bookings_customer_cancel on public.ink_bookings;
create policy ink_bookings_customer_cancel on public.ink_bookings for update to authenticated using (customer_id=(select auth.uid())) with check (status='cancelled' and customer_id=(select auth.uid()));
drop policy if exists ink_enquiries_public_insert on public.ink_enquiries;
create policy ink_enquiries_public_insert on public.ink_enquiries for insert to anon with check (is_read=false and exists(select 1 from public.studioflow_accounts a where a.user_id=site_id));
drop policy if exists ink_enquiries_owner_all on public.ink_enquiries;
create policy ink_enquiries_owner_all on public.ink_enquiries for all to authenticated using(site_id=(select auth.uid())) with check(site_id=(select auth.uid()));
-- Owner booking policy separate from the customer policy.
drop policy if exists ink_bookings_owner_all on public.ink_bookings;
create policy ink_bookings_owner_all on public.ink_bookings for all to authenticated using(site_id=(select auth.uid())) with check(site_id=(select auth.uid()));
-- Private rows have no public read/write policies.

-- Booking + enquiry validation, anti-spam, locking and notifications.
create or replace function studioflow_ink_private.validate_booking_write() returns trigger
language plpgsql security definer set search_path='' as $$
declare cat public.ink_categories; settings public.ink_studio_settings; digits text; age integer; duration integer; avail boolean;
begin
 if new.site_id is null or not exists(select 1 from public.studioflow_accounts where user_id=new.site_id) then raise exception 'Unknown StudioFlow site'; end if;
 if TG_OP='UPDATE' and auth.uid() is distinct from new.site_id then
   if new.status<>'cancelled' or (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then raise exception 'Customers may only cancel their own booking'; end if;
   return new;
 end if;
 if TG_OP='INSERT' then
  digits:=regexp_replace(new.phone,'[^0-9]','','g');
  if length(digits)<10 or length(digits)>15 then raise exception 'Enter a valid phone number'; end if;
  if new.email<>'' and new.email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'Enter a valid email address'; end if;
  select * into settings from public.ink_studio_settings where site_id=new.site_id;
  if settings.site_id is not null then
   if new.customer_birth_date is null then raise exception 'Date of birth is required to verify the studio age policy'; end if;
   age:=date_part('year',age(current_date,new.customer_birth_date));
   if age<settings.min_age then raise exception 'Clients must be at least % years old',settings.min_age; end if;
  end if;
  select * into cat from public.ink_categories where site_id=new.site_id and id=new.category_id and is_active;
  if cat.id is null then raise exception 'Choose an active tattoo category'; end if;
  if not exists(select 1 from public.ink_artists where site_id=new.site_id and id=new.artist_id and is_active) then raise exception 'Choose an active artist'; end if;
  duration:=greatest(coalesce(cat.duration_min,60),30);
  perform pg_advisory_xact_lock(hashtextextended(new.site_id::text||new.artist_id::text||new.booking_date::text,12));
  if new.booking_date<current_date then raise exception 'Choose a future booking date'; end if;
  if (select count(*) from public.ink_bookings b where b.site_id=new.site_id and regexp_replace(b.phone,'[^0-9]','','g')=digits and b.created_at>now()-interval '10 minutes')>=3 then raise exception 'Too many booking attempts. Please try again later.'; end if;
  if not exists(select 1 from public.get_available_slots(new.site_id,new.artist_id,new.booking_date,duration) s where s.start_time=new.start_time) then raise exception 'That time is not available. Please choose another slot.'; end if;
  if exists(select 1 from public.ink_bookings b where b.site_id=new.site_id and b.artist_id=new.artist_id and b.booking_date=new.booking_date and b.status<>'cancelled' and tsrange(new.booking_date+new.start_time,(new.booking_date+new.start_time)+(duration||' minutes')::interval,'[)') && tsrange(b.booking_date+b.start_time,(b.booking_date+b.start_time)+(greatest(coalesce((select c.duration_min from public.ink_categories c where c.site_id=b.site_id and c.id=b.category_id),60),30)||' minutes')::interval,'[)')) then raise exception 'This artist already has a booking at that time'; end if;
  if cardinality(new.reference_images)>0 and exists(select 1 from unnest(new.reference_images) p where p !~ ('^'||new.site_id::text||'/')) then raise exception 'Reference images must use this site storage path'; end if;
 end if;
 return new;
end $$;
revoke all on function studioflow_ink_private.validate_booking_write() from public,anon,authenticated;
drop trigger if exists ink_bookings_validate on public.ink_bookings;
create trigger ink_bookings_validate before insert or update on public.ink_bookings for each row execute function studioflow_ink_private.validate_booking_write();

create or replace function studioflow_ink_private.rate_limit_enquiry() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.created_at<now()-interval '30 seconds' or new.created_at>now()+interval '1 minute' then raise exception 'Invalid request timestamp'; end if;
 perform pg_advisory_xact_lock(hashtextextended(new.site_id::text||lower(new.email)||new.phone,15));
 if (select count(*) from public.ink_enquiries e where e.site_id=new.site_id and e.created_at>now()-interval '10 minutes' and ((new.email<>'' and lower(e.email)=lower(new.email)) or (new.phone<>'' and regexp_replace(e.phone,'[^0-9]','','g')=regexp_replace(new.phone,'[^0-9]','','g'))))>=5 then raise exception 'Too many enquiries. Please try again later.'; end if;
 return new;
end $$;
revoke all on function studioflow_ink_private.rate_limit_enquiry() from public,anon,authenticated;
drop trigger if exists ink_enquiries_rate_limit on public.ink_enquiries;
create trigger ink_enquiries_rate_limit before insert on public.ink_enquiries for each row execute function studioflow_ink_private.rate_limit_enquiry();

create or replace function studioflow_ink_private.notify_booking_insert() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.ink_notifications(site_id,booking_id,notification_type,payload) values(new.site_id,new.id,'new_booking',jsonb_build_object('customer_name',new.customer_name,'booking_date',new.booking_date,'start_time',new.start_time)) on conflict(booking_id,notification_type) do nothing;
 return new;
end $$;
revoke all on function studioflow_ink_private.notify_booking_insert() from public,anon,authenticated;
drop trigger if exists ink_bookings_notify on public.ink_bookings;
create trigger ink_bookings_notify after insert on public.ink_bookings for each row execute function studioflow_ink_private.notify_booking_insert();

-- Storage: public artwork, private owner-only booking references.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('ink-logos','ink-logos',true,5242880,array['image/jpeg','image/png','image/webp','image/svg+xml']),
 ('ink-gallery','ink-gallery',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('ink-artists','ink-artists',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('ink-references','ink-references',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('ink-blog','ink-blog',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

do $$ declare b text; begin foreach b in array array['ink-logos','ink-gallery','ink-artists','ink-blog'] loop
 execute format('drop policy if exists %I on storage.objects',b||'_public_read');
 execute format('create policy %I on storage.objects for select to anon,authenticated using(bucket_id=%L)',b||'_public_read',b);
 execute format('drop policy if exists %I on storage.objects',b||'_owner_insert');
 execute format('create policy %I on storage.objects for insert to authenticated with check(bucket_id=%L and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.studioflow_accounts a where a.user_id=(select auth.uid())))',b||'_owner_insert',b);
 execute format('drop policy if exists %I on storage.objects',b||'_owner_update');
 execute format('create policy %I on storage.objects for update to authenticated using(bucket_id=%L and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id=%L and (storage.foldername(name))[1]=(select auth.uid())::text)',b||'_owner_update',b,b);
 execute format('drop policy if exists %I on storage.objects',b||'_owner_delete');
 execute format('create policy %I on storage.objects for delete to authenticated using(bucket_id=%L and (storage.foldername(name))[1]=(select auth.uid())::text)',b||'_owner_delete',b);
end loop; end $$;
drop policy if exists ink_references_anon_upload on storage.objects;
create policy ink_references_anon_upload on storage.objects for insert to anon,authenticated with check(bucket_id='ink-references' and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' and exists(select 1 from public.studioflow_accounts a where a.user_id=((storage.foldername(name))[1])::uuid) and coalesce((metadata->>'size')::bigint,0)<=5242880 and coalesce(metadata->>'mimetype','') in ('image/jpeg','image/png','image/webp'));
drop policy if exists ink_references_owner_read on storage.objects;
create policy ink_references_owner_read on storage.objects for select to authenticated using(bucket_id='ink-references' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists ink_references_owner_delete on storage.objects;
create policy ink_references_owner_delete on storage.objects for delete to authenticated using(bucket_id='ink-references' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Availability is a fixed 30-minute grid, checked against category duration.
create or replace function public.get_available_slots(p_site_id uuid,p_artist_id uuid,p_date date,p_duration_min integer default 60)
returns table(start_time time,end_time time) language sql stable security definer set search_path='' as $$
  select s.slot::time,(s.slot+make_interval(mins=>greatest(p_duration_min,30)))::time
  from public.ink_availability a
  cross join lateral generate_series((p_date+a.start_time)::timestamp,(p_date+a.end_time-make_interval(mins=>greatest(p_duration_min,30)))::timestamp,interval '30 minutes') s(slot)
  where a.site_id=p_site_id and a.artist_id=p_artist_id and a.day_of_week=extract(dow from p_date)::int and not a.is_off
    and p_date>=current_date
    and not exists(select 1 from public.ink_blocked_dates d where d.site_id=p_site_id and d.date=p_date and (d.artist_id=p_artist_id or d.artist_id is null))
    and not exists(select 1 from public.ink_bookings b where b.site_id=p_site_id and b.artist_id=p_artist_id and b.booking_date=p_date and b.status<>'cancelled' and tsrange(p_date+b.start_time,(p_date+b.start_time)+make_interval(mins=>greatest(coalesce((select c.duration_min from public.ink_categories c where c.site_id=b.site_id and c.id=b.category_id),60),30)),'[)') && tsrange(s.slot,s.slot+make_interval(mins=>greatest(p_duration_min,30)),'[)'))
  order by s.slot
$$;
revoke all on function public.get_available_slots(uuid,uuid,date,integer) from public;
grant execute on function public.get_available_slots(uuid,uuid,date,integer) to anon,authenticated;

create or replace function public.create_booking(p_site_id uuid,p_customer_name text,p_phone text,p_email text,p_category_id uuid,p_artist_id uuid,p_booking_date date,p_start_time time,p_customer_birth_date date,p_size_cm numeric default null,p_placement text default '',p_description text default '',p_reference_images text[] default '{}')
returns public.ink_bookings language plpgsql security definer set search_path='' as $$
declare r public.ink_bookings; begin
 if auth.uid() is not null and not exists(select 1 from public.studioflow_accounts a where a.user_id=p_site_id) then raise exception 'Unknown site'; end if;
 insert into public.ink_bookings(site_id,customer_id,customer_name,phone,email,category_id,artist_id,booking_date,start_time,customer_birth_date,size_cm,placement,description,reference_images,status,deposit_paid)
 values(p_site_id,auth.uid(),btrim(p_customer_name),btrim(p_phone),lower(btrim(coalesce(p_email,''))),p_category_id,p_artist_id,p_booking_date,p_start_time,p_customer_birth_date,p_size_cm,btrim(coalesce(p_placement,'')),btrim(coalesce(p_description,'')),coalesce(p_reference_images,'{}'),'pending',false)
 returning * into r; return r;
end $$;
revoke all on function public.create_booking(uuid,text,text,text,uuid,uuid,date,time,date,numeric,text,text,text[]) from public;
grant execute on function public.create_booking(uuid,text,text,text,uuid,uuid,date,time,date,numeric,text,text,text[]) to anon,authenticated;

create or replace function public.get_template12_site(p_site_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
 select jsonb_build_object(
  'site_id',p_site_id,
  'settings',(select to_jsonb(s) from public.ink_studio_settings s where s.site_id=p_site_id),
  'categories',coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order,c.name) from public.ink_categories c where c.site_id=p_site_id and c.is_active),'[]'::jsonb),
  'artists',coalesce((select jsonb_agg(to_jsonb(a) order by a.sort_order,a.name) from public.ink_artists a where a.site_id=p_site_id and a.is_active),'[]'::jsonb),
  'portfolio',coalesce((select jsonb_agg(to_jsonb(p) order by p.is_featured desc,p.sort_order,p.created_at desc) from public.ink_portfolio p where p.site_id=p_site_id and p.is_published),'[]'::jsonb),
  'pricing',coalesce((select jsonb_agg(to_jsonb(p) order by p.price) from public.ink_pricing_plans p where p.site_id=p_site_id and p.is_active),'[]'::jsonb),
  'testimonials',coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order,t.created_at desc) from public.ink_testimonials t where t.site_id=p_site_id and t.is_published),'[]'::jsonb),
  'faqs',coalesce((select jsonb_agg(to_jsonb(f) order by f.sort_order) from public.ink_faqs f where f.site_id=p_site_id),'[]'::jsonb),
  'aftercare',coalesce((select jsonb_agg(to_jsonb(a) order by a.step_no) from public.ink_aftercare a where a.site_id=p_site_id),'[]'::jsonb),
  'blog',coalesce((select jsonb_agg(to_jsonb(b) order by b.published_at desc nulls last) from public.ink_blog_posts b where b.site_id=p_site_id and b.is_published),'[]'::jsonb)
 ) into result;
 if result->'settings'='null'::jsonb then return null; end if; return result;
end $$;
revoke all on function public.get_template12_site(uuid) from public;
grant execute on function public.get_template12_site(uuid) to anon,authenticated;

create or replace function public.get_template12_site_by_slug(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select public.get_template12_site(w.owner_id) from public.studioflow_websites w where w.slug=lower(btrim(p_slug)) and w.content->'profile'->>'businessType'='tattoo_studio'
$$;
revoke all on function public.get_template12_site_by_slug(text) from public;
grant execute on function public.get_template12_site_by_slug(text) to anon,authenticated;

create or replace function public.submit_ink_enquiry(p_site_id uuid,p_name text,p_phone text,p_email text,p_message text)
returns uuid language plpgsql security definer set search_path='' as $$ declare new_id uuid; begin
 insert into public.ink_enquiries(site_id,name,phone,email,message) values(p_site_id,btrim(p_name),btrim(coalesce(p_phone,'')),lower(btrim(coalesce(p_email,''))),btrim(p_message)) returning id into new_id; return new_id;
end $$;
revoke all on function public.submit_ink_enquiry(uuid,text,text,text,text) from public;
grant execute on function public.submit_ink_enquiry(uuid,text,text,text,text) to anon,authenticated;

-- Idempotent template seed. Each seed row uses stable tenant-scoped unique keys.
create or replace function public.seed_template12(p_site_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a1 uuid; a2 uuid; a3 uuid; a4 uuid; cat uuid; inserted integer:=0;
begin
 if auth.uid() is null or auth.uid()<>p_site_id then raise exception 'Only the site owner may seed Template 12' using errcode='42501'; end if;
 if not exists(select 1 from public.studioflow_accounts where user_id=p_site_id) then raise exception 'Create the StudioFlow account before seeding'; end if;
 insert into public.ink_studio_settings(site_id) values(p_site_id) on conflict(site_id) do nothing;
 insert into public.ink_categories(site_id,slug,name,"group",description,image_url,starting_price,duration_min,duration_label,sort_order) values
 (p_site_id,'realism-portrait','Realism / Portrait Tattoo','tattoo_style','Bring a portrait, beloved pet or reference image; your artist builds depth through carefully layered tone, precise contrast and expressive fine detail.','https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=900&q=80',4500,180,'2–4 hr',1),
 (p_site_id,'black-grey','Black & Grey','tattoo_style','Soft greywash and deliberate black values create a timeless monochrome piece. We plan contrast, skin breaks and placement together for a result that ages beautifully.','https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&w=900&q=80',3500,150,'2–3 hr',2),
 (p_site_id,'blackwork-dotwork','Blackwork / Dotwork','tattoo_style','Choose graphic black shapes, stippled gradients or dense ornamental pattern. Each design is composed to follow your anatomy and keep its visual clarity over time.','https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?auto=format&fit=crop&w=900&q=80',3000,150,'2–3 hr',3),
 (p_site_id,'traditional-old-school','Traditional / Old School','tattoo_style','Classic motifs meet confident outlines and saturated colour. We can adapt a traditional flash idea or draw a personal variation with balanced, lasting composition.','https://images.unsplash.com/photo-1590246814883-57c511e8f309?auto=format&fit=crop&w=900&q=80',2500,120,'1–3 hr',4),
 (p_site_id,'neo-traditional','Neo-Traditional','tattoo_style','Expressive linework, ornamental framing and dimensional colour bring this illustrative style to life. Your artist will shape a custom composition around your reference and placement.','https://images.unsplash.com/photo-1611843467160-25afb8df1074?auto=format&fit=crop&w=900&q=80',3500,180,'2–4 hr',5),
 (p_site_id,'japanese-irezumi','Japanese (Irezumi)','tattoo_style','Flowing koi, botanicals and mythic motifs are composed with attention to movement, scale and traditional visual balance. Larger projects are planned in clear sessions.','https://images.unsplash.com/photo-1562962230-16e4623d36e6?auto=format&fit=crop&w=900&q=80',5000,240,'3–5 hr',6),
 (p_site_id,'tribal-polynesian','Tribal / Polynesian','tattoo_style','Bold, repeating patternwork is tailored to the contours of your body. Share the symbols and cultural references that matter so your design is considered and personal.','https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=900&q=80',3500,180,'2–4 hr',7),
 (p_site_id,'geometric-mandala','Geometric / Mandala','tattoo_style','Crisp geometry, mandala structure and ornamental symmetry require careful sizing and placement. We review line density and scale so fine details stay legible as they heal.','https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?auto=format&fit=crop&w=900&q=80',3000,150,'2–3 hr',8),
 (p_site_id,'minimal-fine-line','Minimalist / Fine Line','tattoo_style','Fine, understated marks are drawn with deliberate spacing and a light touch. Bring a simple reference or idea; your artist will advise on size and long-term legibility.','https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&w=900&q=80',1500,68,'45–90 min',9),
 (p_site_id,'watercolor','Watercolor','tattoo_style','Expressive colour transitions and painterly movement create a softer, illustrative finish. We discuss palette, skin tone and placement before confirming a design and session plan.','https://images.unsplash.com/photo-1611843467160-25afb8df1074?auto=format&fit=crop&w=900&q=80',3000,150,'2–3 hr',10),
 (p_site_id,'lettering-script','Lettering / Script / Calligraphy','tattoo_style','From handwritten scripts to carefully kerned lettering, every line is composed for your chosen words and placement. We check spelling, scale and readability before the appointment.','https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=900&q=80',1800,90,'1–2 hr',11),
 (p_site_id,'biomechanical','Biomechanical','tattoo_style','Layered mechanical forms, organic textures and dimensional shading are designed to move naturally with the body. Larger concepts begin with references and a placement consultation.','https://images.unsplash.com/photo-1562962230-16e4623d36e6?auto=format&fit=crop&w=900&q=80',4500,240,'3–5 hr',12),
 (p_site_id,'anime-cartoon','Anime / Cartoon','tattoo_style','Commission an original character, favourite-inspired motif or playful colour illustration. We translate your references into a custom design while keeping the final artwork studio-original.','https://images.unsplash.com/photo-1611843467160-25afb8df1074?auto=format&fit=crop&w=900&q=80',2500,120,'1–3 hr',13),
 (p_site_id,'religious-spiritual','Religious / Spiritual','tattoo_style','Personal symbols and spiritual motifs are approached with care and respect. Discuss the meaning, script and placement with your artist before the final design is prepared.','https://images.unsplash.com/photo-1590246814883-57c511e8f309?auto=format&fit=crop&w=900&q=80',2200,120,'1–3 hr',14),
 (p_site_id,'name-date-quote','Name / Date / Quote Tattoo','tattoo_style','Names, meaningful dates and short quotations are composed in a type style that suits your idea. We confirm spelling, alignment and a readable size together.','https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&w=900&q=80',1200,68,'45–90 min',15),
 (p_site_id,'couple-matching','Couple / Matching Tattoo','tattoo_style','Create two complementary pieces that work individually and together. Your artist can adapt one shared motif to different sizes, placements or personal details.','https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=900&q=80',2500,90,'1–2 hr',16),
 (p_site_id,'cover-up','Cover-up Tattoo','tattoo_style','Cover-ups start with an honest assessment of the existing tattoo, its age and placement. Your artist explores suitable scale, contrast and options before recommending a design.','https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?auto=format&fit=crop&w=900&q=80',4000,180,'2–4 hr',17),
 (p_site_id,'custom-sleeve','Custom Sleeve / Half Sleeve / Full Sleeve','tattoo_style','Build a connected visual story across a half or full sleeve. Planning, stencil reviews and multiple sessions help the composition flow around your anatomy.','https://images.unsplash.com/photo-1562962230-16e4623d36e6?auto=format&fit=crop&w=900&q=80',12000,240,'Multi-session',18),
 (p_site_id,'back-chest-piece','Back Piece / Chest Piece','tattoo_style','A back or chest piece is mapped to your natural proportions and movement. Begin with a consultation to develop the concept, scale and multi-session schedule.','https://images.unsplash.com/photo-1590246814883-57c511e8f309?auto=format&fit=crop&w=900&q=80',15000,240,'Multi-session',19),
 (p_site_id,'uv-glow','UV / Glow Tattoo','tattoo_style','Explore UV-reactive details with a specialist consultation about design, placement and product suitability. The artist will explain care and visibility in regular light before proceeding.','https://images.unsplash.com/photo-1611843467160-25afb8df1074?auto=format&fit=crop&w=900&q=80',3500,150,'2–3 hr',20),
 (p_site_id,'small-flash','Small Flash Tattoo','tattoo_style','Choose a small, artist-designed flash piece or ask about available designs. Final placement and sizing are confirmed in studio before work begins.','https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&w=900&q=80',1000,45,'30–60 min',21),
 (p_site_id,'laser-removal','Tattoo Removal / Fading (Laser)','body_art','Start with a qualified consultation to discuss the tattoo, skin and realistic fading goals. Treatment suitability and session spacing are assessed before any laser service.','https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=900&q=80',2500,45,'30–60 min',22),
 (p_site_id,'touch-up-rework','Tattoo Touch-up & Rework','body_art','Refresh healed work or discuss a careful rework with an experienced artist. We assess the existing ink first and confirm what can be improved in a new session.','https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?auto=format&fit=crop&w=900&q=80',1200,68,'45–90 min',23),
 (p_site_id,'permanent-makeup','Permanent Makeup','body_art','Explore brows, lip blush or eyeliner with a detailed suitability and colour consultation. Your artist explains preparation, healing and any required follow-up before you decide.','https://images.unsplash.com/photo-1611843467160-25afb8df1074?auto=format&fit=crop&w=900&q=80',6000,150,'2–3 hr',24),
 (p_site_id,'scar-cover','Scar Cover Tattoo','body_art','Scar-cover work begins with a private, unhurried consultation. We discuss healing, skin suitability and design options with care; each case is assessed individually.','https://images.unsplash.com/photo-1562962230-16e4623d36e6?auto=format&fit=crop&w=900&q=80',3500,180,'2–4 hr',25),
 (p_site_id,'body-piercing','Body Piercing','body_art','Choose from ear, nose, lip, navel and other available piercings. A trained piercer will review anatomy, jewellery and aftercare, using sterile single-use equipment.','https://images.unsplash.com/photo-1590246814883-57c511e8f309?auto=format&fit=crop&w=900&q=80',900,38,'30–45 min',26),
 (p_site_id,'temporary-henna','Temporary Tattoo / Henna Art','body_art','Temporary henna and body art can be tailored for celebrations, events or personal style. Discuss the design, placement and timing with the artist before your visit.','https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&w=900&q=80',800,45,'30–60 min',27),
 (p_site_id,'airbrush-body-art','Airbrush Body Art','body_art','Add temporary colour and bold designs for festivals, shoots or special events. We can discuss the artwork, application time and event schedule in advance.','https://images.unsplash.com/photo-1611843467160-25afb8df1074?auto=format&fit=crop&w=900&q=80',1500,90,'1–2 hr',28),
 (p_site_id,'custom-design','Custom Design / Sketch Consultation','extra','Bring references, a rough sketch or just the beginning of an idea. In a focused consultation, your artist helps develop a distinct concept and next steps.','https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=900&q=80',500,45,'45 min',29),
 (p_site_id,'aftercare-shop','Aftercare Products Shop','extra','Find artist-recommended essentials for fresh and healed tattoos. Ask the studio which products suit your aftercare plan; availability and collection timing are confirmed directly.','https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?auto=format&fit=crop&w=900&q=80',350,10,'Pickup / 10 min',30)
 on conflict(site_id,slug) do nothing;
 insert into public.ink_artists(site_id,name,photo_url,bio,specialties,instagram,experience_years,sort_order) values
 (p_site_id,'Varun “Ink” Mathur','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80','Founder and realism tattooist focused on custom blackwork and portrait art.',array['Dark realism','Blackwork','Sleeves'],'',12,1),
 (p_site_id,'Tanya Roy','https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80','Fine-line artist creating considered script, botanicals and small custom work.',array['Fine line','Lettering','Botanical'],'',8,2),
 (p_site_id,'Chetan Rawat','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80','Body piercing artist specialising in safe, precise placements and jewellery.',array['Body piercing','Jewellery','Aftercare'],'',9,3),
 (p_site_id,'Meera Kapoor','https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=700&q=80','Illustrative tattoo artist with a love of neo-traditional forms and colour.',array['Neo-traditional','Watercolor','Custom design'],'',6,4)
 on conflict(site_id,name) do nothing;
 select id into a1 from public.ink_artists where site_id=p_site_id and name='Varun “Ink” Mathur';
 select id into a2 from public.ink_artists where site_id=p_site_id and name='Tanya Roy';
 select id into a3 from public.ink_artists where site_id=p_site_id and name='Chetan Rawat';
 select id into a4 from public.ink_artists where site_id=p_site_id and name='Meera Kapoor';
 -- Artist availability: Monday–Saturday, staggered sessions, Sunday closed.
 insert into public.ink_availability(site_id,artist_id,day_of_week,start_time,end_time,is_off)
 select p_site_id,x.artist_id,d.day_no,'11:00'::time,'20:00'::time,(d.day_no=0)
 from (values(a1),(a2),(a3),(a4)) x(artist_id) cross join generate_series(0,6) d(day_no) where x.artist_id is not null
 on conflict(site_id,artist_id,day_of_week,start_time) do nothing;
 insert into public.ink_pricing_plans(site_id,name,type,price,duration_min,description) values
 (p_site_id,'Hourly custom tattoo','hourly',2500,60,'Final quote depends on detail, placement and artist.'),
 (p_site_id,'Custom session','session',6500,180,'A focused custom tattoo session, designed with your artist.'),
 (p_site_id,'Flash day','flash_day',1500,60,'Small artist-designed flash pieces, subject to availability.'),
 (p_site_id,'Sleeve project','sleeve',18000,240,'Large-scale custom sleeve work, planned over multiple sessions.'),
 (p_site_id,'Fine-line pairing package','session',5000,120,'A considered fine-line design pairing with a focused artist session.')
 on conflict(site_id,name) do nothing;
 -- Do not seed fabricated portfolio or testimonial entries; the public site labels demo gallery imagery until owner work is published.
 insert into public.ink_faqs(site_id,question,answer,sort_order) values
 (p_site_id,'Does getting a tattoo hurt?','Sensation varies by placement and person. Your artist will explain what to expect and keep you comfortable.',1),
 (p_site_id,'How do I care for a new tattoo?','Keep the bandage on as advised, wash gently, moisturize lightly and follow your artist’s aftercare instructions.',2),
 (p_site_id,'What is the minimum age?','We only tattoo clients aged 18 and above with valid identification.',3),
 (p_site_id,'Is a deposit required?','A booking deposit secures your artist and consultation. The amount is confirmed before your appointment.',4),
 (p_site_id,'Can you cover an old tattoo?','Yes. Cover-ups start with a consultation so the artist can assess the existing tattoo and plan a suitable design.',5),
 (p_site_id,'Can I bring a reference image?','Yes. Bring references for inspiration; the final artwork is custom-drawn by your artist.',6),
 (p_site_id,'Are needles single use?','Yes. Needles and other single-use items are opened for your appointment.',7),
 (p_site_id,'How do I book a consultation?','Choose a category, artist and preferred time in the booking form. The studio will confirm availability.',8)
 on conflict(site_id,question) do nothing;
 insert into public.ink_aftercare(site_id,step_no,title,body,image_url) values
 (p_site_id,1,'Keep the dressing on','Follow the timing your artist gives you. Wash your hands before touching fresh ink.','https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80'),
 (p_site_id,2,'Wash gently','Use clean lukewarm water and fragrance-free soap. Pat dry with a clean towel.','https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?auto=format&fit=crop&w=800&q=80'),
 (p_site_id,3,'Moisturize lightly','Apply a thin layer of artist-recommended fragrance-free moisturizer.','https://images.unsplash.com/photo-1611843467160-25afb8df1074?auto=format&fit=crop&w=800&q=80'),
 (p_site_id,4,'Avoid soaking and sun','Avoid pools, baths and direct sun while your tattoo heals.','https://images.unsplash.com/photo-1562962230-16e4623d36e6?auto=format&fit=crop&w=800&q=80'),
 (p_site_id,5,'Let it heal','Do not pick or scratch. Contact your artist if anything concerns you.','https://images.unsplash.com/photo-1590246814883-57c511e8f309?auto=format&fit=crop&w=800&q=80')
 on conflict(site_id,step_no) do nothing;
 insert into public.ink_blog_posts(site_id,slug,title,cover_url,content,is_published,published_at) values
 (p_site_id,'first-tattoo-guide','Choosing your first tattoo','https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=1100&q=80','Start with an idea, not a trend. Think about placement, scale, references and the artist whose work resonates with you.',true,now()),
 (p_site_id,'tattoo-aftercare-basics','The art of healing well','https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?auto=format&fit=crop&w=1100&q=80','Your artist’s aftercare instructions are part of the tattoo. Keep the area clean and avoid soaking or picking.',true,now()),
 (p_site_id,'finding-your-placement','Finding the right placement','https://images.unsplash.com/photo-1611843467160-25afb8df1074?auto=format&fit=crop&w=1100&q=80','Placement changes how a tattoo moves, reads and ages. Discuss your daily routine and design with your artist.',true,now())
 on conflict(site_id,slug) do nothing;
 insert into public.ink_onboarding(site_id,step,data,completed) values(p_site_id,'template_selected',jsonb_build_object('template_key','iron-ink','business_type','tattoo_studio'),true) on conflict(site_id,step) do nothing;
 return jsonb_build_object('site_id',p_site_id,'template_key','iron-ink','category_count',(select count(*) from public.ink_categories where site_id=p_site_id),'artist_count',(select count(*) from public.ink_artists where site_id=p_site_id));
end $$;
revoke all on function public.seed_template12(uuid) from public,anon;
grant execute on function public.seed_template12(uuid) to authenticated;

-- Keep template registry additive; only the tattoo_studio template row changes.
insert into public.studioflow_templates(id,title,config,active,updated_at)
values('tattoo_studio','Iron & Ink Urban Tattoo & Body Art Studio',jsonb_build_object('template_key','iron-ink','shortName','Template 12 – Iron & Ink','tagline','Your Story. Our Ink.','brand_color','#E11D48','seed_rpc','seed_template12'),true,now())
on conflict(id) do update set title=excluded.title,config=coalesce(public.studioflow_templates.config,'{}'::jsonb)||excluded.config,active=true,updated_at=now();

commit;

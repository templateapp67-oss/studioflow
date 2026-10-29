-- Template 08 ("Vogue Noir Makeup Studio & Academy") — Academy Enquiries & Catalog Sync
-- Safe, transactional, idempotent migration with strict tenant-isolated RLS.
begin;

-- 1. Academy Enquiries table (tenant-isolated per salon owner + authenticated customer)
create table if not exists public.studioflow_academy_enquiries (
  id uuid primary key default gen_random_uuid(),
  website_slug text not null,
  owner_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  email text not null default '',
  course text not null,
  batch text not null,
  message text not null default '',
  status text not null default 'new' check (status in ('new', 'contacted', 'enrolled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_enquiries_owner_created_idx
  on public.studioflow_academy_enquiries(owner_id, created_at desc);

create index if not exists academy_enquiries_customer_created_idx
  on public.studioflow_academy_enquiries(customer_id, created_at desc);

alter table public.studioflow_academy_enquiries enable row level security;

revoke all on public.studioflow_academy_enquiries from public, anon, authenticated;
grant select on public.studioflow_academy_enquiries to authenticated;

drop policy if exists academy_enquiries_select_owner_customer on public.studioflow_academy_enquiries;
create policy academy_enquiries_select_owner_customer
  on public.studioflow_academy_enquiries
  for select
  to authenticated
  using (owner_id = (select auth.uid()) or customer_id = (select auth.uid()));

-- 2. Authenticated Customer Submit RPC (enforces customer sign-in, input validation & rate limit)
create or replace function studioflow_private.academy_enquire(
  p_slug text,
  p_name text,
  p_phone text,
  p_email text,
  p_course text,
  p_batch text,
  p_message text default ''
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  w public.studioflow_websites;
  academy_on boolean;
  clean_phone text;
  clean_email text;
  enquiry public.studioflow_academy_enquiries;
begin
  if actor is null then
    raise exception 'Sign in to submit an Academy enquiry' using errcode = '42501';
  end if;

  select * into w from public.studioflow_websites where slug = btrim(coalesce(p_slug, ''));
  if w.owner_id is null then
    raise exception 'Studio website is unavailable';
  end if;

  if coalesce(w.content->'profile'->>'businessType', '') <> 'makeup_studio' then
    raise exception 'Academy enquiries are not enabled for this website';
  end if;

  academy_on := coalesce(
    (w.content->'profile'->'vogueNoir'->>'academyEnabled')::boolean,
    coalesce((w.content->'profile'->'websiteSections'->>'academy')::boolean, true)
  );
  if not academy_on then
    raise exception 'The Makeup Academy module is currently closed for enquiries';
  end if;

  clean_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if length(clean_phone) = 12 and left(clean_phone, 2) = '91' then
    clean_phone := substring(clean_phone from 3);
  elsif length(clean_phone) = 11 and left(clean_phone, 1) = '0' then
    clean_phone := substring(clean_phone from 2);
  end if;

  if length(btrim(coalesce(p_name, ''))) not between 2 and 150
     or clean_phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'Enter your full name and a valid 10-digit Indian mobile number';
  end if;

  clean_email := btrim(coalesce(p_email, ''));
  if clean_email <> '' and (
    length(clean_email) > 254
    or clean_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,63}$'
  ) then
    raise exception 'Enter a valid email address';
  end if;

  if length(btrim(coalesce(p_course, ''))) not between 2 and 200 then
    raise exception 'Select a course to enquire about';
  end if;

  if length(btrim(coalesce(p_batch, ''))) not between 2 and 120 then
    raise exception 'Select a preferred batch';
  end if;

  if length(coalesce(p_message, '')) > 1000 then
    raise exception 'Message must be 1000 characters or fewer';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(actor::text, 808));
  if (
    select count(*)
    from public.studioflow_academy_enquiries
    where customer_id = actor
      and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Too many enquiries submitted recently. Please try again later.';
  end if;

  insert into public.studioflow_academy_enquiries (
    website_slug,
    owner_id,
    customer_id,
    name,
    phone,
    email,
    course,
    batch,
    message,
    status
  ) values (
    w.slug,
    w.owner_id,
    actor,
    btrim(p_name),
    clean_phone,
    clean_email,
    btrim(p_course),
    btrim(p_batch),
    btrim(coalesce(p_message, '')),
    'new'
  )
  returning * into enquiry;

  return jsonb_build_object(
    'id', enquiry.id,
    'status', enquiry.status,
    'createdAt', enquiry.created_at
  );
end $$;

revoke all on function studioflow_private.academy_enquire(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function studioflow_private.academy_enquire(text, text, text, text, text, text, text) to authenticated;

create or replace function public.studioflow_academy_enquire(
  p_slug text,
  p_name text,
  p_phone text,
  p_email text,
  p_course text,
  p_batch text,
  p_message text default ''
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select studioflow_private.academy_enquire(p_slug, p_name, p_phone, p_email, p_course, p_batch, p_message)
$$;

revoke all on function public.studioflow_academy_enquire(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.studioflow_academy_enquire(text, text, text, text, text, text, text) to authenticated;

-- 3. Owner Status Update RPC (tenant-isolated to owner_id = auth.uid())
create or replace function studioflow_private.academy_enquiry_set_status(
  p_enquiry_id uuid,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  clean_status text := lower(btrim(coalesce(p_status, '')));
  updated_row public.studioflow_academy_enquiries;
begin
  if actor is null then
    raise exception 'Sign in as the studio owner to update enquiry status' using errcode = '42501';
  end if;

  if clean_status not in ('new', 'contacted', 'enrolled') then
    raise exception 'Status must be new, contacted, or enrolled';
  end if;

  update public.studioflow_academy_enquiries
  set status = clean_status,
      updated_at = now()
  where id = p_enquiry_id
    and owner_id = actor
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Academy enquiry not found for this account' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', updated_row.id,
    'status', updated_row.status,
    'updatedAt', updated_row.updated_at
  );
end $$;

revoke all on function studioflow_private.academy_enquiry_set_status(uuid, text) from public, anon, authenticated;
grant execute on function studioflow_private.academy_enquiry_set_status(uuid, text) to authenticated;

create or replace function public.studioflow_academy_enquiry_set_status(
  p_enquiry_id uuid,
  p_status text
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select studioflow_private.academy_enquiry_set_status(p_enquiry_id, p_status)
$$;

revoke all on function public.studioflow_academy_enquiry_set_status(uuid, text) from public, anon;
grant execute on function public.studioflow_academy_enquiry_set_status(uuid, text) to authenticated;

-- 4. Idempotent Template 08 ("Vogue Noir") Catalog Sync on makeup_studio only
update public.studioflow_templates
set title = 'Vogue Noir Makeup Studio & Academy',
    config = config || jsonb_build_object(
      'id', 'makeup_studio',
      'title', 'Vogue Noir Makeup Studio & Academy',
      'shortName', 'Vogue Noir (08)',
      'tagline', 'Bridal, Party & Editorial Makeup Studio + Certified Pro Makeup Academy',
      'about', 'Founded by Riya Kapoor, Vogue Noir Makeup Studio & Academy blends editorial skin minimalism with heirloom Indian bridal artistry. Every appointment begins with bespoke skin preparation, luxury international formulations, and lighting-calibrated coverage designed to look refined in person and effortless on 4K lenses. Alongside our private bridal suites, our certified Pro Makeup Academy mentors the next generation of makeup artists through intensive hands-on studio practice.',
      'paletteLabel', 'Obsidian Noir & Antique Gold',
      'themePreset', 'obsidian_gold',
      'layoutStyle', 'dark_glam',
      'defaultCity', 'Studio City',
      'defaultAddress', '2nd Floor, Galleria Market, Sector 28, Studio City, India',
      'defaultPostalCode', '122009',
      'phone', '+91 90000 00000',
      'whatsapp', '+91 90000 00000',
      'ownerName', 'Riya Kapoor',
      'ownerRole', 'Founder & Lead Bridal Artist',
      'ownerPhotoUrl', '/templates/vogue-noir/artists/riya-kapoor.webp',
      'coverImageUrl', '/templates/vogue-noir/hero-1.webp',
      'instagramHandle', '@voguenoir.studio',
      'themeStyle', '{
        "heroBackground": "bg-[#0B0B0C]",
        "heroTextColor": "text-[#F5EFE6]",
        "cardBorder": "border-[#2A2A2D]",
        "cardBackground": "bg-[#151517]",
        "cardRadius": "rounded-none",
        "accentColor": "text-[#C9A96E]",
        "accentBg": "bg-[#C9A96E]",
        "badgeBg": "bg-[#151517]",
        "badgeText": "text-[#C9A96E]",
        "buttonBg": "bg-[#C9A96E] hover:bg-[#b89658]",
        "buttonText": "text-[#0B0B0C]",
        "priceColor": "text-[#C9A96E]",
        "isDark": true,
        "headerBanner": "bg-[#0B0B0C] border-b border-[#2A2A2D]"
      }'::jsonb,
      'stylists', '[
        {"id":"vn-st-1","name":"Riya Kapoor","role":"Founder & Lead Bridal Artist","experienceYears":8,"avatarUrl":"/templates/vogue-noir/artists/riya-kapoor.webp","specialties":["Couture Bridal","HD & Airbrush","Luxury Skin Minimalism"],"rating":5.0},
        {"id":"vn-st-2","name":"Simran Sethi","role":"Senior Makeup Artist","experienceYears":6,"avatarUrl":"/templates/vogue-noir/artists/simran-sethi.webp","specialties":["Airbrush & Editorial Glam","Reception Looks","Photoshoot Beauty"],"rating":4.9},
        {"id":"vn-st-3","name":"Aarav Mehta","role":"Hair Styling Lead","experienceYears":5,"avatarUrl":"/templates/vogue-noir/artists/aarav-mehta.webp","specialties":["Bridal Buns","Hollywood Curls","Seamless Extensions"],"rating":4.9},
        {"id":"vn-st-4","name":"Neha Joshi","role":"Academy Head Trainer","experienceYears":7,"avatarUrl":"/templates/vogue-noir/artists/neha-joshi.webp","specialties":["Pro Makeup Education","Color Theory","Portfolio Direction"],"rating":5.0}
      ]'::jsonb
    ),
    updated_at = now()
where id = 'makeup_studio';

commit;

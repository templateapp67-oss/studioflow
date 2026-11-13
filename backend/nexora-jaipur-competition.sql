-- NEXORA Top Salon Jaipur Awards: fixed 90-day competition, registration and verified report cards.
-- Additive migration. It does not replace the existing Growth Partner referral rewards system.
-- Apply only after review and a production backup. Do not expose payment tables to browser roles.

begin;

create schema if not exists nexora_competition_private;
revoke all on schema nexora_competition_private from public, anon, authenticated;
grant usage on schema nexora_competition_private to service_role;

create sequence if not exists nexora_competition_private.salon_number_seq
  as bigint start with 1 increment by 1 minvalue 1;

create table if not exists nexora_competition_private.salon_numbers (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  salon_number bigint not null unique default nextval('nexora_competition_private.salon_number_seq'),
  created_at timestamptz not null default now()
);
revoke all on nexora_competition_private.salon_numbers from public, anon, authenticated;

create table if not exists public.nexora_competition_cycles (
  id uuid primary key default gen_random_uuid(),
  cycle_code text not null unique check (cycle_code ~ '^[0-9]{4}Q[1-4]$'),
  name text not null check (char_length(btrim(name)) between 4 and 120),
  city text not null default 'Jaipur' check (lower(city) = 'jaipur'),
  timezone text not null default 'Asia/Kolkata' check (timezone = 'Asia/Kolkata'),
  registration_opens_at timestamptz not null,
  registration_closes_at timestamptz not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft'
    check (status in ('draft','registration_open','locked','active','completed','cancelled')),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date = start_date + 89),
  check (registration_opens_at < registration_closes_at),
  check (registration_closes_at < (start_date::timestamp at time zone 'Asia/Kolkata')),
  check (start_date < end_date + 1)
);
create index if not exists nexora_competition_cycles_schedule_idx
  on public.nexora_competition_cycles(status, start_date, end_date);

create table if not exists public.nexora_competition_entries (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.nexora_competition_cycles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  salon_number bigint not null,
  competition_id text not null unique,
  salon_name text not null check (char_length(btrim(salon_name)) between 2 and 120),
  owner_name text not null default '',
  owner_email text,
  owner_phone text,
  business_address text not null check (char_length(btrim(business_address)) between 5 and 300),
  city text not null check (lower(city) = 'jaipur'),
  area text not null check (char_length(btrim(area)) between 2 and 100),
  category text not null check (char_length(btrim(category)) between 2 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  salon_slug text,
  logo_url text,
  cover_image_url text,
  profile_visibility jsonb not null default '{"showCategory":true,"showArea":true,"showDescription":true,"showLogo":true,"showCover":true,"showWebsite":true}'::jsonb
    check (jsonb_typeof(profile_visibility) = 'object'),
  public_profile_visible boolean not null default false,
  profile_consent_at timestamptz,
  competition_terms_accepted boolean not null default false,
  competition_terms_accepted_at timestamptz,
  report_sharing_consent boolean not null default false,
  report_sharing_consent_at timestamptz,
  award_applied boolean not null default true,
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn')),
  verification_note text,
  registered_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  final_rank integer,
  final_score numeric(7,3),
  final_report_card jsonb,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, owner_id),
  unique (cycle_id, salon_number),
  check (competition_terms_accepted = true),
  check (report_sharing_consent = true),
  check (final_rank is null or final_rank between 1 and 3)
);
create table if not exists public.nexora_competition_reward_fulfilments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.nexora_competition_cycles(id) on delete cascade,
  entry_id uuid not null references public.nexora_competition_entries(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  reward_key text not null check (reward_key in ('coBrandedTshirts','ledSignBoard','promotionalAdvertising','achievementTrophy')),
  status text not null default 'eligible'
    check (status in ('eligible','under_verification','approved','preparing','scheduled','dispatched','completed','not_eligible','rejected')),
  eligibility_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(eligibility_snapshot)='object'),
  admin_note text,
  partner_note text,
  fulfilment_reference text,
  estimated_completion_date date,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entry_id,reward_key)
);
alter table public.nexora_competition_reward_fulfilments enable row level security;
revoke all on public.nexora_competition_reward_fulfilments from public, anon, authenticated;
grant select,insert,update,delete on public.nexora_competition_reward_fulfilments to service_role;

create unique index if not exists nexora_competition_physical_reward_once_idx
  on public.nexora_competition_reward_fulfilments(owner_id,reward_key)
  where reward_key in ('coBrandedTshirts','ledSignBoard','achievementTrophy');

create index if not exists nexora_competition_entries_cycle_status_idx
  on public.nexora_competition_entries(cycle_id, status, registered_at);
create index if not exists nexora_competition_entries_owner_idx
  on public.nexora_competition_entries(owner_id, registered_at desc);

alter table public.nexora_competition_cycles enable row level security;
alter table public.nexora_competition_entries enable row level security;
revoke all on public.nexora_competition_cycles from public, anon, authenticated;
revoke all on public.nexora_competition_entries from public, anon, authenticated;
grant select, insert, update, delete on public.nexora_competition_cycles to service_role;
grant select, insert, update, delete on public.nexora_competition_entries to service_role;

create or replace function nexora_competition_private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins a
    where a.user_id = (select auth.uid())
  );
$$;
revoke all on function nexora_competition_private.is_admin() from public, anon, authenticated;

create or replace function nexora_competition_private.cycle_json(p_cycle public.nexora_competition_cycles)
returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_cycle.id,
    'cycleCode', p_cycle.cycle_code,
    'name', p_cycle.name,
    'city', p_cycle.city,
    'timezone', p_cycle.timezone,
    'registrationOpensAt', p_cycle.registration_opens_at,
    'registrationClosesAt', p_cycle.registration_closes_at,
    'startDate', p_cycle.start_date,
    'endDate', p_cycle.end_date,
    'durationDays', 90,
    'status', p_cycle.status,
    'registrationOpen',
      p_cycle.status = 'registration_open'
      and now() >= p_cycle.registration_opens_at
      and now() <= p_cycle.registration_closes_at
      and (now() at time zone 'Asia/Kolkata')::date < p_cycle.start_date,
    'phase', case
      when p_cycle.status = 'cancelled' then 'cancelled'
      when p_cycle.status = 'completed' then 'completed'
      when now() < p_cycle.registration_opens_at then 'scheduled'
      when now() <= p_cycle.registration_closes_at and p_cycle.status = 'registration_open' then 'registration'
      when (now() at time zone 'Asia/Kolkata')::date < p_cycle.start_date then 'registration_closed'
      when (now() at time zone 'Asia/Kolkata')::date <= p_cycle.end_date then 'active'
      else 'verification'
    end
  );
$$;
revoke all on function nexora_competition_private.cycle_json(public.nexora_competition_cycles) from public, anon, authenticated;

create or replace function nexora_competition_private.report_cards(p_cycle_id uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  with cycle as (
    select c.id,
           (c.start_date::timestamp at time zone 'Asia/Kolkata') as starts_at,
           ((c.end_date + 1)::timestamp at time zone 'Asia/Kolkata') as ends_at
    from public.nexora_competition_cycles c
    where c.id = p_cycle_id
  ),
  entrants as (
    select e.id, e.owner_id, e.salon_number, e.competition_id,
           e.salon_name,
           case when coalesce((e.profile_visibility->>'showArea')::boolean,true) then e.area end as area,
           case when coalesce((e.profile_visibility->>'showCategory')::boolean,true) then e.category end as category,
           e.registered_at, e.final_report_card, c.status as cycle_status,
           e.public_profile_visible, e.profile_visibility,
           e.logo_url, e.cover_image_url, e.description, e.salon_slug
    from public.nexora_competition_entries e
    join public.nexora_competition_cycles c on c.id=e.cycle_id
    where e.cycle_id = p_cycle_id and e.status = 'approved' and e.award_applied = true
  ),
  metrics as (
    select e.*,
      coalesce((
        select count(distinct o.order_id)
        from public.studioflow_payment_orders o
        join public.studioflow_bookings b on b.id = o.booking_id
        cross join cycle c
        where b.owner_id = e.owner_id
          and b.status = 'completed'
          and b.starts_at >= c.starts_at and b.starts_at < c.ends_at
          and o.status = 'captured'
          and o.currency = 'INR'
          and o.payment_id is not null
          and o.verified_at is not null
          and o.verified_at >= c.starts_at and o.verified_at < c.ends_at
      ), 0)::bigint as successful_transactions,
      coalesce((
        select sum(o.amount_paise)
        from public.studioflow_payment_orders o
        join public.studioflow_bookings b on b.id = o.booking_id
        cross join cycle c
        where b.owner_id = e.owner_id
          and b.status = 'completed'
          and b.starts_at >= c.starts_at and b.starts_at < c.ends_at
          and o.status = 'captured'
          and o.currency = 'INR'
          and o.payment_id is not null
          and o.verified_at is not null
          and o.verified_at >= c.starts_at and o.verified_at < c.ends_at
      ), 0)::bigint as gateway_collections_paise,
      coalesce((
        select count(distinct b.customer_id)
        from public.studioflow_payment_orders o
        join public.studioflow_bookings b on b.id = o.booking_id
        cross join cycle c
        where b.owner_id = e.owner_id
          and b.customer_id is not null
          and b.status = 'completed'
          and b.starts_at >= c.starts_at and b.starts_at < c.ends_at
          and o.status = 'captured'
          and o.currency = 'INR'
          and o.payment_id is not null
          and o.verified_at >= c.starts_at and o.verified_at < c.ends_at
      ), 0)::bigint as unique_paying_customers,
      coalesce((
        select count(*)
        from public.studioflow_reviews r
        cross join cycle c
        where r.owner_id = e.owner_id
          and r.created_at >= c.starts_at and r.created_at < c.ends_at
          and exists (
            select 1 from public.studioflow_bookings b
            where b.owner_id = r.owner_id
              and b.customer_id = r.customer_id
              and b.status = 'completed'
              and b.starts_at >= c.starts_at and b.starts_at < c.ends_at
          )
      ), 0)::bigint as verified_reviews,
      coalesce((
        select avg(r.rating)::numeric(5,2)
        from public.studioflow_reviews r
        cross join cycle c
        where r.owner_id = e.owner_id
          and r.created_at >= c.starts_at and r.created_at < c.ends_at
          and exists (
            select 1 from public.studioflow_bookings b
            where b.owner_id = r.owner_id
              and b.customer_id = r.customer_id
              and b.status = 'completed'
              and b.starts_at >= c.starts_at and b.starts_at < c.ends_at
          )
      ), 0)::numeric(5,2) as average_rating
    from entrants e
  ),
  maxima as (
    select greatest(coalesce(max(successful_transactions),0),1) as max_tx,
           greatest(coalesce(max(gateway_collections_paise),0),1) as max_value,
           greatest(coalesce(max(unique_paying_customers),0),1) as max_customers,
           greatest(coalesce(max(verified_reviews),0),1) as max_reviews
    from metrics
  ),
  scored as (
    select m.*,
      round((
        40.0 * m.successful_transactions / x.max_tx
        + 30.0 * m.gateway_collections_paise / x.max_value
        + 20.0 * m.unique_paying_customers / x.max_customers
        + 5.0 * m.verified_reviews / x.max_reviews
        + 5.0 * least(m.average_rating,5.0) / 5.0
      )::numeric, 3) as competition_score
    from metrics m cross join maxima x
  ),
  ranked as (
    select s.*,
      row_number() over (
        order by competition_score desc,
          gateway_collections_paise desc,
          successful_transactions desc,
          average_rating desc,
          registered_at asc,
          competition_id asc
      )::integer as current_rank
    from scored s
  )
  select case when coalesce(bool_or(cycle_status='completed'),false)
    then coalesce(jsonb_agg(final_report_card order by (final_report_card->>'currentRank')::integer)
      filter (where final_report_card is not null),'[]'::jsonb)
    else coalesce(jsonb_agg(jsonb_build_object(
    'entryId', id,
    'salonName', salon_name,
    'competitionId', competition_id,
    'salonNumber', salon_number,
    'area', area,
    'category', category,
    'currentRank', current_rank,
    'score', competition_score,
    'successfulTransactions', successful_transactions,
    'gatewayCollectionsPaise', gateway_collections_paise,
    'gatewayCollectionsRupees', round(gateway_collections_paise / 100.0, 2),
    'uniquePayingCustomers', unique_paying_customers,
    'verifiedReviews', verified_reviews,
    'averageRating', average_rating,
    'rewardEligibility', jsonb_build_object(
      'coBrandedTshirts',
        successful_transactions >= 50 and gateway_collections_paise >= 5000000
        and unique_paying_customers >= 30 and verified_reviews >= 10 and average_rating >= 4.3,
      'ledSignBoard',
        successful_transactions >= 150 and gateway_collections_paise >= 20000000
        and unique_paying_customers >= 100 and verified_reviews >= 25 and average_rating >= 4.5,
      'promotionalAdvertising',
        successful_transactions >= 300 and gateway_collections_paise >= 50000000
        and unique_paying_customers >= 200 and verified_reviews >= 50 and average_rating >= 4.5,
      'achievementTrophy',
        successful_transactions >= 500 and gateway_collections_paise >= 80000000
        and unique_paying_customers >= 300 and verified_reviews >= 75 and average_rating >= 4.6
    )
  ) order by current_rank), '[]'::jsonb)
    end
  from ranked;
$$;
revoke all on function nexora_competition_private.report_cards(uuid) from public, anon, authenticated;

create or replace function nexora_competition_private.public_profile(p_entry public.nexora_competition_entries)
returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'salonName', p_entry.salon_name,
    'competitionId', p_entry.competition_id,
    'area', case when coalesce((p_entry.profile_visibility->>'showArea')::boolean,true) then p_entry.area end,
    'category', case when coalesce((p_entry.profile_visibility->>'showCategory')::boolean,true) then p_entry.category end,
    'description', case when coalesce((p_entry.profile_visibility->>'showDescription')::boolean,true) then p_entry.description end,
    'logoUrl', case when coalesce((p_entry.profile_visibility->>'showLogo')::boolean,true) then p_entry.logo_url end,
    'coverImageUrl', case when coalesce((p_entry.profile_visibility->>'showCover')::boolean,true) then p_entry.cover_image_url end,
    'websiteUrl', case
      when coalesce((p_entry.profile_visibility->>'showWebsite')::boolean,false)
       and p_entry.salon_slug is not null
      then 'https://nexorasalon.online/?site=' || p_entry.salon_slug
    end
  ));
$$;
revoke all on function nexora_competition_private.public_profile(public.nexora_competition_entries) from public, anon, authenticated;

create or replace function public.nexora_competition_get_current_cycle()
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select coalesce((
    select nexora_competition_private.cycle_json(c)
    from public.nexora_competition_cycles c
    where c.status <> 'cancelled'
      and (c.status = 'completed' or c.end_date >= (now() at time zone 'Asia/Kolkata')::date)
    order by case when c.status='completed' then 1 else 0 end,
      case when c.status<>'completed' then c.start_date end asc,
      case when c.status='completed' then c.start_date end desc
    limit 1
  ), 'null'::jsonb);
$$;

create or replace function public.nexora_competition_public_directory(p_cycle_code text default null)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare v_cycle_id uuid; v_result jsonb;
begin
  select id into v_cycle_id
  from public.nexora_competition_cycles
  where (p_cycle_code is null or cycle_code = p_cycle_code)
    and status not in ('cancelled')
  order by start_date desc limit 1;
  if v_cycle_id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(
    nexora_competition_private.public_profile(e)
    || jsonb_build_object('verifiedCompetitor',true,'status','approved')
    order by e.salon_name
  ),'[]'::jsonb)
  into v_result
  from public.nexora_competition_entries e
  where e.cycle_id = v_cycle_id
    and e.status = 'approved'
    and e.award_applied = true
    and e.public_profile_visible = true;

  return v_result;
end;
$$;

create or replace function public.nexora_competition_member_leaderboard(p_cycle_code text)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare v_cycle public.nexora_competition_cycles; v_user uuid := auth.uid();
        v_is_member boolean; v_cards jsonb; v_my_entry jsonb;
begin
  if v_user is null then raise exception 'Sign in to view the competitor report cards' using errcode='42501'; end if;
  select * into v_cycle from public.nexora_competition_cycles where cycle_code=p_cycle_code;
  if v_cycle.id is null then raise exception 'Competition cycle not found'; end if;

  select exists (
    select 1 from public.nexora_competition_entries e
    where e.cycle_id=v_cycle.id and e.owner_id=v_user and e.status='approved' and e.award_applied=true
  ) into v_is_member;
  if not v_is_member and not nexora_competition_private.is_admin() then
    raise exception 'Only approved competition members can view competitor report cards' using errcode='42501';
  end if;

  v_cards := nexora_competition_private.report_cards(v_cycle.id);
  select to_jsonb(e) - 'owner_id' - 'verification_note' - 'profile_consent_at'
    - 'competition_terms_accepted_at' - 'report_sharing_consent_at'
  into v_my_entry
  from public.nexora_competition_entries e
  where e.cycle_id=v_cycle.id and e.owner_id=v_user;

  return jsonb_build_object(
    'cycle', nexora_competition_private.cycle_json(v_cycle),
    'isMember', v_is_member,
    'myEntry', v_my_entry,
    'competitors', v_cards
  );
end;
$$;

create or replace function public.nexora_competition_get_my_entry(p_cycle_code text default null)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare v_user uuid:=auth.uid(); v_result jsonb;
begin
  if v_user is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select jsonb_build_object(
    'id', e.id,
    'competitionId', e.competition_id,
    'salonName', e.salon_name,
    'status', e.status,
    'registeredAt', e.registered_at,
    'verificationNote', e.verification_note,
    'publicProfileVisible', e.public_profile_visible,
    'profileVisibility', e.profile_visibility,
    'cycle', nexora_competition_private.cycle_json(c)
  ) into v_result
  from public.nexora_competition_entries e
  join public.nexora_competition_cycles c on c.id=e.cycle_id
  where e.owner_id=v_user
    and (p_cycle_code is null or c.cycle_code=p_cycle_code)
  order by c.start_date desc limit 1;
  return coalesce(v_result,'null'::jsonb);
end;
$$;

create or replace function public.nexora_competition_register(
  p_cycle_code text,
  p_salon_name text,
  p_city text,
  p_area text,
  p_full_address text,
  p_category text,
  p_competition_terms_accepted boolean,
  p_report_sharing_consent boolean,
  p_description text default '',
  p_profile_visibility jsonb default '{}'::jsonb,
  p_public_profile_visible boolean default false,
  p_show_logo boolean default true,
  p_show_cover boolean default true,
  p_show_website boolean default true
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare v_user uuid:=auth.uid(); v_cycle public.nexora_competition_cycles;
        v_salon_number bigint; v_competition_id text; v_slug text;
        v_owner_name text; v_owner_email text; v_owner_phone text;
        v_logo text; v_cover text; v_visibility jsonb; v_entry public.nexora_competition_entries;
begin
  if v_user is null then raise exception 'Sign in to register for the competition' using errcode='42501'; end if;
  if p_competition_terms_accepted is distinct from true or p_report_sharing_consent is distinct from true then
    raise exception 'Accept the competition rules and competitor report-card sharing consent before registering';
  end if;
  if char_length(btrim(coalesce(p_salon_name,''))) not between 2 and 120
     or lower(btrim(coalesce(p_city,''))) <> 'jaipur'
     or char_length(btrim(coalesce(p_area,''))) not between 2 and 100
     or char_length(btrim(coalesce(p_full_address,''))) not between 5 and 300
     or char_length(btrim(coalesce(p_category,''))) not between 2 and 80
     or char_length(coalesce(p_description,'')) > 1000 then
    raise exception 'Enter the salon name, Jaipur city, area and salon category';
  end if;
  select * into v_cycle from public.nexora_competition_cycles c
   where c.cycle_code=p_cycle_code
     and c.status='registration_open'
     and now() >= c.registration_opens_at
     and now() <= c.registration_closes_at
     and (now() at time zone 'Asia/Kolkata')::date < c.start_date;
  if v_cycle.id is null then raise exception 'Competition registration is not open'; end if;

  select p.full_name, p.email, coalesce(p.phone_number,p.phone,p.mobile), p.logo_url, p.cover_image_url
    into v_owner_name, v_owner_email, v_owner_phone, v_logo, v_cover
  from public.profiles p
  where p.id=v_user or p.user_id=v_user
  limit 1;

  select w.slug into v_slug
  from public.studioflow_websites w
  where w.owner_id=v_user and w.published_at is not null
  order by w.published_at desc limit 1;

  insert into nexora_competition_private.salon_numbers(owner_id)
  values(v_user) on conflict(owner_id) do nothing;
  select salon_number into v_salon_number
  from nexora_competition_private.salon_numbers where owner_id=v_user;
  v_competition_id := 'NEXORA-JPR-' || lpad(v_salon_number::text,4,'0') || '-' || v_cycle.cycle_code;

  v_visibility := jsonb_build_object(
    'showCategory', coalesce((p_profile_visibility->>'showCategory')::boolean,true),
    'showArea', coalesce((p_profile_visibility->>'showArea')::boolean,true),
    'showDescription', coalesce((p_profile_visibility->>'showDescription')::boolean,true),
    'showLogo', coalesce(p_show_logo,true) and coalesce((p_profile_visibility->>'showLogo')::boolean,true),
    'showCover', coalesce(p_show_cover,true) and coalesce((p_profile_visibility->>'showCover')::boolean,true),
    'showWebsite', coalesce(p_show_website,true) and coalesce((p_profile_visibility->>'showWebsite')::boolean,true)
  );

  insert into public.nexora_competition_entries(
    cycle_id,owner_id,salon_number,competition_id,salon_name,owner_name,owner_email,owner_phone,
    business_address,city,area,category,description,salon_slug,logo_url,cover_image_url,
    profile_visibility,public_profile_visible,
    profile_consent_at,competition_terms_accepted,competition_terms_accepted_at,
    report_sharing_consent,report_sharing_consent_at,award_applied,status
  ) values (
    v_cycle.id,v_user,v_salon_number,v_competition_id,btrim(p_salon_name),
    coalesce(nullif(btrim(v_owner_name),''),btrim(p_salon_name)),v_owner_email,v_owner_phone,
    btrim(p_full_address),'Jaipur',btrim(p_area),btrim(p_category),
    btrim(coalesce(p_description,'')),v_slug,v_logo,v_cover,v_visibility,
    coalesce(p_public_profile_visible,false),
    case when coalesce(p_public_profile_visible,false) then now() else null end,
    p_competition_terms_accepted,now(),p_report_sharing_consent,now(),true,'pending'
  )
  on conflict(cycle_id,owner_id) do update set
    salon_name=excluded.salon_name,owner_name=excluded.owner_name,owner_email=excluded.owner_email,
    owner_phone=excluded.owner_phone,business_address=excluded.business_address,
    city=excluded.city,area=excluded.area,category=excluded.category,
    description=excluded.description,salon_slug=excluded.salon_slug,logo_url=excluded.logo_url,
    cover_image_url=excluded.cover_image_url,profile_visibility=excluded.profile_visibility,
    competition_terms_accepted=excluded.competition_terms_accepted,
    competition_terms_accepted_at=now(),report_sharing_consent=excluded.report_sharing_consent,
    report_sharing_consent_at=now(),
    public_profile_visible=excluded.public_profile_visible,
    profile_consent_at=case when excluded.public_profile_visible then now() else null end,
    updated_at=now()
  where public.nexora_competition_entries.status='pending'
  returning * into v_entry;

  if v_entry.id is null then
    raise exception 'Your application is already approved or closed; contact NEXORA support to request a change';
  end if;

  return jsonb_build_object(
    'entryId',v_entry.id,
    'competitionId',v_entry.competition_id,
    'status',v_entry.status,
    'registeredAt',v_entry.registered_at,
    'cycle',nexora_competition_private.cycle_json(v_cycle)
  );
end;
$$;

create or replace function public.nexora_competition_admin_save_cycle(
  p_cycle_code text,
  p_name text,
  p_registration_opens_at timestamptz,
  p_registration_closes_at timestamptz,
  p_start_date date,
  p_end_date date,
  p_status text default 'draft'
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare v_cycle public.nexora_competition_cycles;
begin
  if not nexora_competition_private.is_admin() then raise exception 'NEXORA admin access required' using errcode='42501'; end if;
  if p_cycle_code !~ '^[0-9]{4}Q[1-4]$'
     or p_start_date is null
     or p_end_date <> p_start_date + 89
     or p_cycle_code <> to_char(p_start_date,'YYYY') || 'Q' || ceil(extract(month from p_start_date)/3)::integer::text
     or p_registration_opens_at is null or p_registration_closes_at is null
     or p_registration_opens_at >= p_registration_closes_at
     or p_registration_closes_at <= now()
     or p_start_date <= (now() at time zone 'Asia/Kolkata')::date
     or p_registration_closes_at >= (p_start_date::timestamp at time zone 'Asia/Kolkata')
     or p_status not in ('draft','registration_open','locked','active','completed','cancelled')
     or char_length(btrim(coalesce(p_name,''))) not between 4 and 120 then
    raise exception 'Invalid competition schedule. Select a 90-day date range and a registration deadline before start date';
  end if;

  if exists (
    select 1 from public.nexora_competition_cycles c
    where c.cycle_code <> p_cycle_code
      and c.status not in ('completed','cancelled')
      and daterange(c.start_date,c.end_date + 1,'[)')
          && daterange(p_start_date,p_end_date + 1,'[)')
  ) then
    raise exception 'Another NEXORA Jaipur competition cycle overlaps these 90 days';
  end if;

  insert into public.nexora_competition_cycles(
    cycle_code,name,registration_opens_at,registration_closes_at,start_date,end_date,
    status,created_by,updated_by
  ) values (
    p_cycle_code,btrim(p_name),p_registration_opens_at,p_registration_closes_at,
    p_start_date,p_end_date,p_status,auth.uid(),auth.uid()
  )
  on conflict(cycle_code) do update set
    name=excluded.name,
    registration_opens_at=excluded.registration_opens_at,
    registration_closes_at=excluded.registration_closes_at,
    start_date=excluded.start_date,
    end_date=excluded.end_date,
    status=excluded.status,
    updated_by=auth.uid(),
    updated_at=now()
  where public.nexora_competition_cycles.status in ('draft','registration_open')
    and (
      not exists (select 1 from public.nexora_competition_entries e where e.cycle_id=public.nexora_competition_cycles.id)
      or (
        public.nexora_competition_cycles.registration_opens_at=excluded.registration_opens_at
        and public.nexora_competition_cycles.registration_closes_at=excluded.registration_closes_at
        and public.nexora_competition_cycles.start_date=excluded.start_date
        and public.nexora_competition_cycles.end_date=excluded.end_date
      )
    )
  returning * into v_cycle;

  if v_cycle.id is null then
    raise exception 'A cycle with registrations or a locked status cannot have its dates changed';
  end if;
  return nexora_competition_private.cycle_json(v_cycle);
end;
$$;

create or replace function public.nexora_competition_admin_list_entries(p_cycle_code text)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare v_cycle public.nexora_competition_cycles; v_result jsonb;
begin
  if not nexora_competition_private.is_admin() then raise exception 'NEXORA admin access required' using errcode='42501'; end if;
  select * into v_cycle from public.nexora_competition_cycles where cycle_code=p_cycle_code;
  if v_cycle.id is null then raise exception 'Competition cycle not found'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'entryId',e.id,'salonName',e.salon_name,'competitionId',e.competition_id,
    'area',e.area,'category',e.category,'status',e.status,'registeredAt',e.registered_at,
    'ownerName',e.owner_name,'ownerEmail',e.owner_email,'ownerPhone',e.owner_phone,
    'businessAddress',e.business_address,
    'publicProfileVisible',e.public_profile_visible,'profileVisibility',e.profile_visibility,
    'verificationNote',e.verification_note,'awardApplied',e.award_applied
  ) order by e.registered_at),'[]'::jsonb)
  into v_result
  from public.nexora_competition_entries e where e.cycle_id=v_cycle.id;
  return jsonb_build_object('cycle',nexora_competition_private.cycle_json(v_cycle),'applications',v_result);
end;
$$;

create or replace function public.nexora_competition_admin_review_entry(
  p_entry_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare v_entry public.nexora_competition_entries;
begin
  if not nexora_competition_private.is_admin() then raise exception 'NEXORA admin access required' using errcode='42501'; end if;
  if p_status not in ('approved','rejected') then raise exception 'Choose approved or rejected'; end if;
  update public.nexora_competition_entries
  set status=p_status,verification_note=left(nullif(btrim(coalesce(p_note,'')),''),1000),
      reviewed_at=now(),reviewed_by=auth.uid(),updated_at=now()
  where id=p_entry_id and status='pending'
  returning * into v_entry;
  if v_entry.id is null then raise exception 'Competition application not found'; end if;
  return jsonb_build_object('entryId',v_entry.id,'competitionId',v_entry.competition_id,
    'status',v_entry.status,'verificationNote',v_entry.verification_note);
end;
$$;

create or replace function public.nexora_competition_admin_finalize_cycle(p_cycle_code text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare v_cycle public.nexora_competition_cycles; v_cards jsonb;
begin
  if not nexora_competition_private.is_admin() then raise exception 'NEXORA admin access required' using errcode='42501'; end if;
  select * into v_cycle from public.nexora_competition_cycles where cycle_code=p_cycle_code for update;
  if v_cycle.id is null then raise exception 'Competition cycle not found'; end if;
  if v_cycle.status='completed' then raise exception 'This competition cycle has already been finalized'; end if;
  if (now() at time zone 'Asia/Kolkata')::date <= v_cycle.end_date then
    raise exception 'The 90-day competition has not ended yet';
  end if;
  v_cards:=nexora_competition_private.report_cards(v_cycle.id);
  with ranked as (
    select (item->>'entryId')::uuid as entry_id,
           (item->>'currentRank')::integer as current_rank,
           (item->>'score')::numeric as score,
           item as report_card,
           coalesce((item->'rewardEligibility'->>'coBrandedTshirts')::boolean,false) as baseline_eligible
    from jsonb_array_elements(v_cards) item
  ), eligible_awards as (
    select entry_id,row_number() over(order by current_rank)::integer as award_rank
    from ranked where baseline_eligible
  )
  update public.nexora_competition_entries e
  set final_rank=case when a.award_rank<=3 then a.award_rank else null end,
      final_score=r.score,
      final_report_card=r.report_card || jsonb_build_object(
        'awardRank',case when a.award_rank<=3 then a.award_rank else null end
      ),
      finalized_at=now(),updated_at=now()
  from ranked r left join eligible_awards a on a.entry_id=r.entry_id
  where e.id=r.entry_id;
  update public.nexora_competition_cycles set status='completed',updated_at=now(),updated_by=auth.uid()
  where id=v_cycle.id;
  return jsonb_build_object('cycleCode',v_cycle.cycle_code,'finalizedAt',now(),'winnerCards',(
    select coalesce(jsonb_agg(e.final_report_card order by e.final_rank),'[]'::jsonb)
    from public.nexora_competition_entries e
    where e.cycle_id=v_cycle.id and e.final_rank between 1 and 3
  ));
end;
$$;


create or replace function public.nexora_competition_admin_list_cycles()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not nexora_competition_private.is_admin() then raise exception 'NEXORA admin access required' using errcode='42501'; end if;
  return coalesce((
    select jsonb_agg(nexora_competition_private.cycle_json(c) order by c.start_date desc)
    from public.nexora_competition_cycles c
  ),'[]'::jsonb);
end;
$$;

create or replace function public.nexora_competition_update_visibility(
  p_cycle_code text,
  p_public_profile_visible boolean,
  p_profile_visibility jsonb
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare v_entry public.nexora_competition_entries;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if jsonb_typeof(coalesce(p_profile_visibility,'{}'::jsonb)) <> 'object' then
    raise exception 'Invalid profile visibility settings';
  end if;
  update public.nexora_competition_entries e
  set public_profile_visible=coalesce(p_public_profile_visible,false),
      profile_visibility=jsonb_build_object(
        'showCategory',coalesce((p_profile_visibility->>'showCategory')::boolean,true),
        'showArea',coalesce((p_profile_visibility->>'showArea')::boolean,true),
        'showDescription',coalesce((p_profile_visibility->>'showDescription')::boolean,true),
        'showLogo',coalesce((p_profile_visibility->>'showLogo')::boolean,true),
        'showCover',coalesce((p_profile_visibility->>'showCover')::boolean,true),
        'showWebsite',coalesce((p_profile_visibility->>'showWebsite')::boolean,true)
      ),
      profile_consent_at=case when coalesce(p_public_profile_visible,false) then now() else null end,
      updated_at=now()
  where e.owner_id=auth.uid()
    and e.cycle_id=(select c.id from public.nexora_competition_cycles c where c.cycle_code=p_cycle_code)
  returning * into v_entry;
  if v_entry.id is null then raise exception 'Your competition registration was not found'; end if;
  return jsonb_build_object(
    'competitionId',v_entry.competition_id,
    'publicProfileVisible',v_entry.public_profile_visible,
    'profileVisibility',v_entry.profile_visibility
  );
end;
$$;

create or replace function nexora_competition_private.sync_reward_fulfilments(p_cycle_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_card jsonb;
  v_reward_key text;
  v_eligible boolean;
  v_snapshot jsonb;
begin
  for v_card in
    select jsonb_array_elements(nexora_competition_private.report_cards(p_cycle_id))
  loop
    foreach v_reward_key in array array[
      'coBrandedTshirts','ledSignBoard','promotionalAdvertising','achievementTrophy'
    ]
    loop
      v_eligible := coalesce((v_card->'rewardEligibility'->>v_reward_key)::boolean,false);
      v_snapshot := jsonb_build_object(
        'salonName',v_card->>'salonName',
        'competitionId',v_card->>'competitionId',
        'currentRank',v_card->>'currentRank',
        'score',v_card->>'score',
        'successfulTransactions',v_card->>'successfulTransactions',
        'gatewayCollectionsPaise',v_card->>'gatewayCollectionsPaise',
        'uniquePayingCustomers',v_card->>'uniquePayingCustomers',
        'verifiedReviews',v_card->>'verifiedReviews',
        'averageRating',v_card->>'averageRating'
      );
      if v_eligible then
        if v_reward_key in ('coBrandedTshirts','ledSignBoard','achievementTrophy') then
          insert into public.nexora_competition_reward_fulfilments(
            cycle_id,entry_id,owner_id,reward_key,status,eligibility_snapshot
          ) values (
            p_cycle_id,(v_card->>'entryId')::uuid,
            (select e.owner_id from public.nexora_competition_entries e where e.id=(v_card->>'entryId')::uuid),
            v_reward_key,'eligible',v_snapshot
          )
          on conflict (owner_id,reward_key)
            where reward_key in ('coBrandedTshirts','ledSignBoard','achievementTrophy')
          do update set
            cycle_id=excluded.cycle_id,
            entry_id=excluded.entry_id,
            eligibility_snapshot=excluded.eligibility_snapshot,
            status=case
              when public.nexora_competition_reward_fulfilments.status in ('approved','preparing','scheduled','dispatched','completed')
                then public.nexora_competition_reward_fulfilments.status
              else 'eligible'
            end,
            updated_at=now();
        else
          insert into public.nexora_competition_reward_fulfilments(
            cycle_id,entry_id,owner_id,reward_key,status,eligibility_snapshot
          ) values (
            p_cycle_id,(v_card->>'entryId')::uuid,
            (select e.owner_id from public.nexora_competition_entries e where e.id=(v_card->>'entryId')::uuid),
            v_reward_key,'eligible',v_snapshot
          )
          on conflict(entry_id,reward_key) do update set
            eligibility_snapshot=excluded.eligibility_snapshot,
            status=case
              when public.nexora_competition_reward_fulfilments.status in ('approved','preparing','scheduled','dispatched','completed')
                then public.nexora_competition_reward_fulfilments.status
              else 'eligible'
            end,
            updated_at=now();
        end if;
      else
        update public.nexora_competition_reward_fulfilments
        set status='not_eligible',updated_at=now()
        where cycle_id=p_cycle_id
          and entry_id=(v_card->>'entryId')::uuid
          and reward_key=v_reward_key
          and status in ('eligible','under_verification','approved','preparing','scheduled');
      end if;
    end loop;
  end loop;
end;
$$;
revoke all on function nexora_competition_private.sync_reward_fulfilments(uuid) from public,anon,authenticated;

create or replace function public.nexora_competition_member_reward_fulfilments(p_cycle_code text default null)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare v_user uuid:=auth.uid(); v_cycle public.nexora_competition_cycles; v_result jsonb;
begin
  if v_user is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into v_cycle
  from public.nexora_competition_cycles c
  where (p_cycle_code is null or c.cycle_code=p_cycle_code)
    and exists (
      select 1 from public.nexora_competition_entries e
      where e.cycle_id=c.id and e.owner_id=v_user and e.status='approved'
    )
  order by c.start_date desc limit 1;
  if v_cycle.id is null then return '[]'::jsonb; end if;
  perform nexora_competition_private.sync_reward_fulfilments(v_cycle.id);
  select coalesce(jsonb_agg(jsonb_build_object(
    'rewardKey',f.reward_key,'status',f.status,'partnerNote',f.partner_note,
    'fulfilmentReference',f.fulfilment_reference,
    'estimatedCompletionDate',f.estimated_completion_date,
    'completedAt',f.completed_at
  ) order by f.created_at),'[]'::jsonb)
  into v_result
  from public.nexora_competition_reward_fulfilments f
  join public.nexora_competition_entries e on e.id=f.entry_id
  where e.owner_id=v_user
    and (f.cycle_id=v_cycle.id or f.reward_key in ('coBrandedTshirts','ledSignBoard','achievementTrophy'));
  return v_result;
end;
$$;

create or replace function public.nexora_competition_admin_list_reward_fulfilments(p_cycle_code text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare v_cycle public.nexora_competition_cycles; v_result jsonb;
begin
  if not nexora_competition_private.is_admin() then raise exception 'NEXORA admin access required' using errcode='42501'; end if;
  select * into v_cycle from public.nexora_competition_cycles where cycle_code=p_cycle_code;
  if v_cycle.id is null then raise exception 'Competition cycle not found'; end if;
  perform nexora_competition_private.sync_reward_fulfilments(v_cycle.id);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.id,'entryId',e.id,'salonName',e.salon_name,
    'competitionId',e.competition_id,'rewardKey',f.reward_key,'status',f.status,
    'eligibilitySnapshot',f.eligibility_snapshot,'adminNote',f.admin_note,
    'partnerNote',f.partner_note,'fulfilmentReference',f.fulfilment_reference,
    'estimatedCompletionDate',f.estimated_completion_date,
    'reviewedAt',f.reviewed_at,'completedAt',f.completed_at
  ) order by e.salon_name,f.reward_key),'[]'::jsonb)
  into v_result
  from public.nexora_competition_reward_fulfilments f
  join public.nexora_competition_entries e on e.id=f.entry_id
  where f.cycle_id=v_cycle.id;
  return v_result;
end;
$$;

create or replace function public.nexora_competition_admin_update_reward_fulfilment(
  p_entry_id uuid,
  p_reward_key text,
  p_status text,
  p_admin_note text default null,
  p_partner_note text default null,
  p_fulfilment_reference text default null,
  p_estimated_completion_date date default null
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare v_entry public.nexora_competition_entries; v_cycle public.nexora_competition_cycles;
        v_eligible boolean; v_fulfilment public.nexora_competition_reward_fulfilments;
begin
  if not nexora_competition_private.is_admin() then raise exception 'NEXORA admin access required' using errcode='42501'; end if;
  if p_reward_key not in ('coBrandedTshirts','ledSignBoard','promotionalAdvertising','achievementTrophy')
     or p_status not in ('eligible','under_verification','approved','preparing','scheduled','dispatched','completed','not_eligible','rejected') then
    raise exception 'Invalid reward or fulfilment status';
  end if;
  select * into v_entry from public.nexora_competition_entries where id=p_entry_id and status='approved';
  if v_entry.id is null then raise exception 'Approved competitor not found'; end if;
  select * into v_cycle from public.nexora_competition_cycles where id=v_entry.cycle_id;
  perform nexora_competition_private.sync_reward_fulfilments(v_cycle.id);
  select coalesce((item->'rewardEligibility'->>p_reward_key)::boolean,false)
    into v_eligible
  from jsonb_array_elements(nexora_competition_private.report_cards(v_cycle.id)) item
  where item->>'entryId'=p_entry_id::text;
  if not v_eligible and p_status not in ('not_eligible','rejected') then
    raise exception 'Reward targets are not currently eligible';
  end if;
  update public.nexora_competition_reward_fulfilments
  set status=p_status,
      admin_note=left(nullif(btrim(coalesce(p_admin_note,'')),''),1500),
      partner_note=left(nullif(btrim(coalesce(p_partner_note,'')),''),1000),
      fulfilment_reference=left(nullif(btrim(coalesce(p_fulfilment_reference,'')),''),200),
      estimated_completion_date=p_estimated_completion_date,
      reviewed_by=auth.uid(),reviewed_at=now(),
      completed_at=case when p_status='completed' then coalesce(completed_at,now()) else null end,
      updated_at=now()
  where entry_id=p_entry_id and reward_key=p_reward_key
  returning * into v_fulfilment;
  if v_fulfilment.id is null then raise exception 'The reward has not reached eligibility yet'; end if;
  return jsonb_build_object(
    'entryId',v_entry.id,'competitionId',v_entry.competition_id,
    'rewardKey',v_fulfilment.reward_key,'status',v_fulfilment.status,
    'partnerNote',v_fulfilment.partner_note,'fulfilmentReference',v_fulfilment.fulfilment_reference,
    'estimatedCompletionDate',v_fulfilment.estimated_completion_date,'completedAt',v_fulfilment.completed_at
  );
end;
$$;

revoke all on function public.nexora_competition_admin_list_cycles() from public;
revoke all on function public.nexora_competition_member_reward_fulfilments(text) from public;
revoke all on function public.nexora_competition_admin_list_reward_fulfilments(text) from public;
revoke all on function public.nexora_competition_admin_update_reward_fulfilment(uuid,text,text,text,text,text,date) from public;
grant execute on function public.nexora_competition_member_reward_fulfilments(text) to authenticated;
grant execute on function public.nexora_competition_admin_list_reward_fulfilments(text) to authenticated;
grant execute on function public.nexora_competition_admin_update_reward_fulfilment(uuid,text,text,text,text,text,date) to authenticated;
revoke all on function public.nexora_competition_update_visibility(text,boolean,jsonb) from public;
grant execute on function public.nexora_competition_admin_list_cycles() to authenticated;
grant execute on function public.nexora_competition_update_visibility(text,boolean,jsonb) to authenticated;

revoke all on function public.nexora_competition_get_current_cycle() from public;
revoke all on function public.nexora_competition_public_directory(text) from public;
revoke all on function public.nexora_competition_member_leaderboard(text) from public;
revoke all on function public.nexora_competition_get_my_entry(text) from public;
revoke all on function public.nexora_competition_register(text,text,text,text,text,text,boolean,boolean,text,jsonb,boolean,boolean,boolean,boolean) from public;
revoke all on function public.nexora_competition_admin_save_cycle(text,text,timestamptz,timestamptz,date,date,text) from public;
revoke all on function public.nexora_competition_admin_list_entries(text) from public;
revoke all on function public.nexora_competition_admin_review_entry(uuid,text,text) from public;
revoke all on function public.nexora_competition_admin_finalize_cycle(text) from public;

grant execute on function public.nexora_competition_get_current_cycle() to anon, authenticated;
grant execute on function public.nexora_competition_public_directory(text) to anon, authenticated;
grant execute on function public.nexora_competition_member_leaderboard(text) to authenticated;
grant execute on function public.nexora_competition_get_my_entry(text) to authenticated;
grant execute on function public.nexora_competition_register(text,text,text,text,text,text,boolean,boolean,text,jsonb,boolean,boolean,boolean,boolean) to authenticated;
grant execute on function public.nexora_competition_admin_save_cycle(text,text,timestamptz,timestamptz,date,date,text) to authenticated;
grant execute on function public.nexora_competition_admin_list_entries(text) to authenticated;
grant execute on function public.nexora_competition_admin_review_entry(uuid,text,text) to authenticated;
grant execute on function public.nexora_competition_admin_finalize_cycle(text) to authenticated;

notify pgrst, 'reload schema';
commit;

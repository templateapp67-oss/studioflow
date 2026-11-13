-- NEXORA Top Salon Jaipur Awards — fixed 90-day competition.
-- Additive migration: keeps the existing Growth Partner referral/reward programme separate.
-- Metrics count only captured NEXORA gateway deposits for completed StudioFlow bookings.
-- All competition dates are calendar dates interpreted in Asia/Kolkata.

begin;

create table if not exists public.top_salon_competition_cycles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9]{4}Q[1-4]$'),
  name text not null default 'NEXORA Top Salon Jaipur Awards',
  city text not null default 'Jaipur',
  timezone text not null default 'Asia/Kolkata',
  registration_open_date date not null,
  registration_close_date date not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft'
    check (status in ('draft','registration_open','registration_closed','active','verification','completed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_metrics_refreshed_at timestamptz,
  check (registration_open_date <= registration_close_date),
  check (registration_close_date < start_date),
  check (end_date = start_date + 89),
  check (city = 'Jaipur'),
  check (timezone = 'Asia/Kolkata')
);

create table if not exists public.top_salon_competition_salon_numbers (
  salon_id uuid primary key references public.salons(id) on delete cascade,
  salon_number bigint generated always as identity unique,
  created_at timestamptz not null default now()
);

create table if not exists public.top_salon_competition_entries (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.top_salon_competition_cycles(id) on delete cascade,
  salon_id uuid not null references public.salons(id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete restrict,
  competition_id text not null unique,
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn')),
  registration_data jsonb not null default '{}'::jsonb check (jsonb_typeof(registration_data)='object'),
  profile_visibility jsonb not null default '{}'::jsonb check (jsonb_typeof(profile_visibility)='object'),
  public_directory_enabled boolean not null default false,
  competitor_profile_enabled boolean not null default false,
  performance_metrics_consent boolean not null default true check (performance_metrics_consent is true),
  rules_accepted boolean not null default true check (rules_accepted is true),
  terms_version text not null default 'top-salon-jaipur-2027-01',
  registered_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, salon_id),
  unique (cycle_id, owner_id)
);

create table if not exists public.top_salon_competition_reports (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.top_salon_competition_cycles(id) on delete cascade,
  entry_id uuid not null references public.top_salon_competition_entries(id) on delete cascade,
  transaction_count integer not null default 0 check (transaction_count >= 0),
  gateway_revenue_paise bigint not null default 0 check (gateway_revenue_paise >= 0),
  unique_customers integer not null default 0 check (unique_customers >= 0),
  verified_reviews integer not null default 0 check (verified_reviews >= 0),
  average_rating numeric(3,2) not null default 0 check (average_rating between 0 and 5),
  competition_score numeric(6,2) not null default 0 check (competition_score between 0 and 100),
  award_eligible boolean not null default false,
  refreshed_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (entry_id)
);

create table if not exists public.top_salon_competition_awards (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.top_salon_competition_cycles(id) on delete cascade,
  entry_id uuid not null references public.top_salon_competition_entries(id) on delete cascade,
  award_rank smallint not null check (award_rank between 1 and 3),
  award_title text not null,
  trophy_status text not null default 'pending' check (trophy_status in ('pending','approved','preparing','dispatched','delivered')),
  promotion_status text not null default 'pending' check (promotion_status in ('pending','approved','scheduled','published','completed','not_applicable')),
  certificate_status text not null default 'pending' check (certificate_status in ('pending','approved','issued','not_applicable')),
  fulfilment_note text,
  finalized_at timestamptz not null default now(),
  finalized_by uuid references auth.users(id) on delete set null,
  unique (cycle_id, award_rank),
  unique (cycle_id, entry_id)
);

create table if not exists public.studioflow_payment_disputes (
  id uuid primary key default gen_random_uuid(),
  dispute_id text not null unique,
  payment_id text not null,
  amount_paise bigint not null default 0 check (amount_paise >= 0),
  status text not null check (status in ('open','won','lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studioflow_payment_disputes_payment_idx
  on public.studioflow_payment_disputes(payment_id,status);

create table if not exists public.top_salon_competition_audit_logs (
  id bigint generated always as identity primary key,
  cycle_id uuid references public.top_salon_competition_cycles(id) on delete set null,
  entry_id uuid references public.top_salon_competition_entries(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- A salon review is only marked verified for the competition when it is tied
-- to a completed StudioFlow booking. Legacy reviews remain visible but unverified.
alter table public.studioflow_reviews
  add column if not exists booking_id uuid references public.studioflow_bookings(id) on delete set null;
create index if not exists top_salon_reviews_booking_idx
  on public.studioflow_reviews(booking_id)
  where booking_id is not null;

create index if not exists top_salon_entries_cycle_status_idx
  on public.top_salon_competition_entries(cycle_id,status);
create index if not exists top_salon_entries_owner_idx
  on public.top_salon_competition_entries(owner_id,cycle_id);
create index if not exists top_salon_reports_cycle_score_idx
  on public.top_salon_competition_reports(cycle_id,competition_score desc);
create index if not exists top_salon_bookings_owner_cycle_idx
  on public.studioflow_bookings(owner_id,starts_at,status);
create index if not exists top_salon_payment_orders_booking_status_idx
  on public.studioflow_payment_orders(booking_id,status,verified_at);

alter table public.top_salon_competition_cycles enable row level security;
alter table public.top_salon_competition_salon_numbers enable row level security;
alter table public.top_salon_competition_entries enable row level security;
alter table public.top_salon_competition_reports enable row level security;
alter table public.top_salon_competition_awards enable row level security;
alter table public.top_salon_competition_audit_logs enable row level security;

-- No direct table read/write is granted to browser roles. Public RPCs below
-- expose only approved, permission-filtered data and aggregate report cards.
revoke all on public.top_salon_competition_cycles from anon, authenticated;
revoke all on public.top_salon_competition_salon_numbers from anon, authenticated;
revoke all on public.top_salon_competition_entries from anon, authenticated;
revoke all on public.top_salon_competition_reports from anon, authenticated;
revoke all on public.top_salon_competition_awards from anon, authenticated;
revoke all on public.top_salon_competition_audit_logs from anon, authenticated;
alter table public.studioflow_payment_disputes enable row level security;
revoke all on public.studioflow_payment_disputes from anon, authenticated;

create or replace function private.top_salon_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(public.is_my_app_admin(), false)
      or coalesce(public.current_admin_role()::text in ('super_admin','admin','site_admin'), false)
$function$;

create or replace function private.top_salon_is_competitor(p_cycle_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.top_salon_competition_entries e
    where e.cycle_id=p_cycle_id and e.owner_id=p_user_id and e.status='approved'
  )
$function$;

create or replace function private.top_salon_refresh_metrics(p_cycle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_cycle public.top_salon_competition_cycles;
  v_start timestamptz;
  v_end timestamptz;
begin
  select * into v_cycle
  from public.top_salon_competition_cycles
  where id=p_cycle_id
  for update;

  if v_cycle.id is null then
    raise exception 'Competition cycle not found';
  end if;
  if v_cycle.status='completed' then
    return;
  end if;

  v_start := v_cycle.start_date::timestamp at time zone 'Asia/Kolkata';
  v_end := (v_cycle.end_date + 1)::timestamp at time zone 'Asia/Kolkata';

  with payment_metrics as (
    select
      b.owner_id,
      count(distinct b.id)::integer as transaction_count,
      coalesce(sum(o.amount_paise),0)::bigint as revenue_paise,
      count(distinct b.customer_id)::integer as customers
    from public.studioflow_bookings b
    join public.studioflow_payment_orders o
      on o.booking_id=b.id
     and o.status='captured'
     and o.verified_at is not null
     and o.currency='INR'
     and o.verified_at >= v_start
     and o.verified_at < v_end
    where b.status='completed'
      and b.starts_at >= v_start
      and b.starts_at < v_end
    group by b.owner_id
  ),
  review_metrics as (
    select
      r.owner_id,
      count(*)::integer as review_count,
      coalesce(avg(r.rating)::numeric,0)::numeric(3,2) as avg_rating
    from public.studioflow_reviews r
    join public.studioflow_bookings b
      on b.id=r.booking_id
     and b.owner_id=r.owner_id
     and b.customer_id=r.customer_id
     and b.status='completed'
    where r.booking_id is not null
      and r.created_at >= v_start
      and r.created_at < v_end
    group by r.owner_id
  ),
  computed as (
    select
      e.id as entry_id,
      e.cycle_id,
      coalesce(p.transaction_count,0) as tx,
      coalesce(p.revenue_paise,0) as revenue,
      coalesce(p.customers,0) as customers,
      coalesce(r.review_count,0) as reviews,
      coalesce(r.avg_rating,0)::numeric(3,2) as rating,
      round(
        40 * least(coalesce(p.transaction_count,0)::numeric/500,1)
        + 30 * least(coalesce(p.revenue_paise,0)::numeric/80000000,1)
        + 20 * least(coalesce(p.customers,0)::numeric/300,1)
        + 5 * least(coalesce(r.review_count,0)::numeric/75,1)
        + 5 * (coalesce(r.avg_rating,0)::numeric/5),
        2
      )::numeric(6,2) as score
    from public.top_salon_competition_entries e
    left join payment_metrics p on p.owner_id=e.owner_id
    left join review_metrics r on r.owner_id=e.owner_id
    where e.cycle_id=p_cycle_id and e.status='approved'
  )
  insert into public.top_salon_competition_reports (
    cycle_id,entry_id,transaction_count,gateway_revenue_paise,
    unique_customers,verified_reviews,average_rating,competition_score,
    award_eligible,refreshed_at,finalized_at
  )
  select
    c.cycle_id,c.entry_id,c.tx,c.revenue,c.customers,c.reviews,c.rating,c.score,
    (c.tx>=50 and c.revenue>=5000000 and c.customers>=30 and c.reviews>=10 and c.rating>=4.30),
    now(),null
  from computed c
  on conflict(entry_id) do update set
    transaction_count=excluded.transaction_count,
    gateway_revenue_paise=excluded.gateway_revenue_paise,
    unique_customers=excluded.unique_customers,
    verified_reviews=excluded.verified_reviews,
    average_rating=excluded.average_rating,
    competition_score=excluded.competition_score,
    award_eligible=excluded.award_eligible,
    refreshed_at=excluded.refreshed_at
  where public.top_salon_competition_reports.finalized_at is null;

  update public.top_salon_competition_cycles
  set last_metrics_refreshed_at=now(),updated_at=now()
  where id=p_cycle_id;
end
$function$;

create or replace function public.top_salon_competition_cycles()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  -- Date-derived transitions prevent the countdown/registration window from
  -- depending on a manual admin click at midnight.
  update public.top_salon_competition_cycles
     set status='registration_closed',updated_at=now()
   where status='registration_open' and v_today>registration_close_date;

  update public.top_salon_competition_cycles
     set status='active',updated_at=now()
   where status in ('registration_open','registration_closed')
     and v_today between start_date and end_date;

  update public.top_salon_competition_cycles
     set status='verification',updated_at=now()
   where status='active' and v_today>end_date;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',c.id,'code',c.code,'name',c.name,'city',c.city,'timezone',c.timezone,
      'registrationOpenDate',c.registration_open_date,
      'registrationCloseDate',c.registration_close_date,
      'startDate',c.start_date,'endDate',c.end_date,'status',c.status,
      'durationDays',90,
      'registrationOpen',c.status='registration_open'
        and v_today between c.registration_open_date and c.registration_close_date,
      'registeredCount',(select count(*) from public.top_salon_competition_entries e where e.cycle_id=c.id and e.status='approved')
    ) order by c.start_date desc)
    from public.top_salon_competition_cycles c
    where c.status<>'draft' and c.status<>'cancelled'
  ),'[]'::jsonb);
end
$function$;

create or replace function public.top_salon_competition_register(
  p_cycle_id uuid,
  p_salon_id uuid,
  p_performance_consent boolean,
  p_rules_accepted boolean,
  p_public_directory boolean default false,
  p_competitor_profile boolean default false,
  p_profile_visibility jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_cycle public.top_salon_competition_cycles;
  v_salon public.salons;
  v_number bigint;
  v_competition_id text;
  v_entry public.top_salon_competition_entries;
  v_visibility jsonb;
begin
  if v_actor is null then raise exception 'Sign in to register for NEXORA Top Salon Jaipur Awards' using errcode='42501'; end if;
  if p_performance_consent is distinct from true or p_rules_accepted is distinct from true then
    raise exception 'Competition rules and report-card visibility consent are required';
  end if;

  select * into v_cycle from public.top_salon_competition_cycles
   where id=p_cycle_id for share;
  if v_cycle.id is null then raise exception 'Competition cycle not found'; end if;
  if v_cycle.status<>'registration_open'
     or v_today < v_cycle.registration_open_date
     or v_today > v_cycle.registration_close_date then
    raise exception 'Registration is not open for this competition cycle';
  end if;

  select * into v_salon
  from public.salons s
  where s.id=p_salon_id
    and s.is_active is true
    and s.deleted_at is null
    and lower(coalesce(s.city,'')) like '%jaipur%'
    and exists (
      select 1 from public.organization_members om
      where om.organization_id=s.organization_id
        and om.user_id=v_actor
        and om.role='owner'
        and om.status='active'
    );
  if v_salon.id is null then
    raise exception 'Choose an active Jaipur salon that belongs to your owner account' using errcode='42501';
  end if;

  -- Current payment ledger records bookings by owner, not by branch/salon.
  -- One owner can therefore register only one salon in a cycle; this avoids
  -- assigning the same online payments to multiple salons.
  if exists (
    select 1 from public.top_salon_competition_entries e
    where e.cycle_id=p_cycle_id and e.owner_id=v_actor and e.salon_id<>p_salon_id
  ) then
    raise exception 'Only one salon per owner can enter a competition cycle. Contact NEXORA to correct the account mapping.';
  end if;

  insert into public.top_salon_competition_salon_numbers(salon_id)
  values (p_salon_id)
  on conflict(salon_id) do nothing;
  select salon_number into v_number
  from public.top_salon_competition_salon_numbers
  where salon_id=p_salon_id;

  v_competition_id := 'NEXORA-JPR-'||lpad(v_number::text,5,'0')||'-'||v_cycle.code;
  v_visibility := jsonb_build_object(
    'showLogo',coalesce((p_profile_visibility->>'showLogo')::boolean,true),
    'showCover',coalesce((p_profile_visibility->>'showCover')::boolean,true),
    'showDescription',coalesce((p_profile_visibility->>'showDescription')::boolean,true),
    'showArea',coalesce((p_profile_visibility->>'showArea')::boolean,true),
    'showAddress',coalesce((p_profile_visibility->>'showAddress')::boolean,false),
    'showServices',coalesce((p_profile_visibility->>'showServices')::boolean,true),
    'showGallery',coalesce((p_profile_visibility->>'showGallery')::boolean,true),
    'showWebsite',coalesce((p_profile_visibility->>'showWebsite')::boolean,true),
    'showContact',coalesce((p_profile_visibility->>'showContact')::boolean,false)
  );

  insert into public.top_salon_competition_entries (
    cycle_id,salon_id,owner_id,competition_id,status,
    registration_data,profile_visibility,public_directory_enabled,
    competitor_profile_enabled,performance_metrics_consent,rules_accepted,terms_version
  ) values (
    p_cycle_id,p_salon_id,v_actor,v_competition_id,'pending',
    jsonb_build_object('salonName',v_salon.name,'city',v_salon.city,'businessType',v_salon.business_type),
    v_visibility,p_public_directory,p_competitor_profile,true,true,
    'top-salon-jaipur-90-day-v1'
  )
  on conflict(cycle_id,salon_id) do update set
    profile_visibility=excluded.profile_visibility,
    public_directory_enabled=excluded.public_directory_enabled,
    competitor_profile_enabled=excluded.competitor_profile_enabled,
    performance_metrics_consent=true,
    rules_accepted=true,
    updated_at=now()
  returning * into v_entry;

  insert into public.top_salon_competition_audit_logs(cycle_id,entry_id,actor_id,action,details)
  values (p_cycle_id,v_entry.id,v_actor,'application_submitted',
    jsonb_build_object('competition_id',v_entry.competition_id,'salon_id',p_salon_id));

  return jsonb_build_object(
    'id',v_entry.id,'competitionId',v_entry.competition_id,'status',v_entry.status,
    'registeredAt',v_entry.registered_at,'message','Application submitted. NEXORA verification is pending.'
  );
exception
  when unique_violation then
    raise exception 'This salon or owner has already registered for this cycle.';
end
$function$;

create or replace function public.top_salon_competition_my_entries()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'entryId',e.id,'cycleId',e.cycle_id,'salonId',e.salon_id,
      'competitionId',e.competition_id,'status',e.status,
      'registeredAt',e.registered_at,'reviewNote',e.review_note,
      'publicDirectoryEnabled',e.public_directory_enabled,
      'competitorProfileEnabled',e.competitor_profile_enabled,
      'profileVisibility',e.profile_visibility,
      'cycle',jsonb_build_object('code',c.code,'name',c.name,'startDate',c.start_date,
        'endDate',c.end_date,'registrationCloseDate',c.registration_close_date,'status',c.status),
      'report',case when r.entry_id is null then null else jsonb_build_object(
        'transactions',r.transaction_count,'gatewayRevenuePaise',r.gateway_revenue_paise,
        'uniqueCustomers',r.unique_customers,'verifiedReviews',r.verified_reviews,
        'averageRating',r.average_rating,'score',r.competition_score,
        'awardEligible',r.award_eligible,'refreshedAt',r.refreshed_at
      ) end
    ) order by c.start_date desc)
    from public.top_salon_competition_entries e
    join public.top_salon_competition_cycles c on c.id=e.cycle_id
    left join public.top_salon_competition_reports r on r.entry_id=e.id
    where e.owner_id=v_actor
  ),'[]'::jsonb);
end
$function$;

create or replace function public.top_salon_competition_competitors(p_cycle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null or not private.top_salon_is_competitor(p_cycle_id,v_actor) then
    raise exception 'Only approved competitors can view competitor report cards' using errcode='42501';
  end if;

  -- Refresh aggregate data at most once a minute while the cycle is active.
  if exists (
    select 1 from public.top_salon_competition_cycles c
    where c.id=p_cycle_id and c.status in ('active','verification')
      and (c.last_metrics_refreshed_at is null or c.last_metrics_refreshed_at<now()-interval '1 minute')
  ) then
    perform private.top_salon_refresh_metrics(p_cycle_id);
  end if;

  return coalesce((
    with ranked as (
      select
        e.id,e.salon_id,e.competition_id,e.profile_visibility,e.competitor_profile_enabled,
        s.name as salon_name,s.area as salon_area,s.logo_url as salon_logo_url,
        s.cover_image_url as salon_cover_url,coalesce(s.description,s.about,s.tagline) as salon_description,
        w.custom_domain as salon_custom_domain,w.slug as salon_slug,
        r.transaction_count,r.gateway_revenue_paise,r.unique_customers,r.verified_reviews,
        r.average_rating,r.competition_score,r.award_eligible,
        rank() over(order by coalesce(r.competition_score,0) desc,
          coalesce(r.transaction_count,0) desc,coalesce(r.gateway_revenue_paise,0) desc,
          coalesce(r.unique_customers,0) desc,coalesce(r.verified_reviews,0) desc,
          coalesce(r.average_rating,0) desc,e.competition_id asc) as position
      from public.top_salon_competition_entries e
      join public.salons s on s.id=e.salon_id
      left join public.top_salon_competition_reports r on r.entry_id=e.id
      left join public.salon_public_websites w on w.salon_id=s.id and w.is_published=true
      where e.cycle_id=p_cycle_id and e.status='approved'
    )
    select jsonb_agg(jsonb_build_object(
      'competitionId',competition_id,'salonName',salon_name,'position',position,
      'score',coalesce(competition_score,0),
      'transactions',coalesce(transaction_count,0),
      'gatewayRevenuePaise',coalesce(gateway_revenue_paise,0),
      'uniqueCustomers',coalesce(unique_customers,0),
      'verifiedReviews',coalesce(verified_reviews,0),
      'averageRating',coalesce(average_rating,0),
      'awardEligible',coalesce(award_eligible,false),
      'salonProfile',case when competitor_profile_enabled then jsonb_build_object(
        'area',case when coalesce((profile_visibility->>'showArea')::boolean,false) then salon_area else null end,
        'logoUrl',case when coalesce((profile_visibility->>'showLogo')::boolean,false) then salon_logo_url else null end,
        'coverImageUrl',case when coalesce((profile_visibility->>'showCover')::boolean,false) then salon_cover_url else null end,
        'description',case when coalesce((profile_visibility->>'showDescription')::boolean,false) then salon_description else null end,
        'websiteUrl',case when coalesce((profile_visibility->>'showWebsite')::boolean,false) and salon_slug is not null then case when salon_custom_domain is not null then case when salon_custom_domain like 'http%' then salon_custom_domain else 'https://'||salon_custom_domain end else '/?site='||salon_slug end else null end
      ) else null end
    ) order by position,competition_id)
    from ranked
    cross join public.top_salon_competition_cycles c
    where c.id=p_cycle_id
  ),'[]'::jsonb);
end
$function$;

create or replace function public.top_salon_competition_public_directory(p_cycle_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'competitionId',e.competition_id,
    'salonName',s.name,
    'businessType',case when coalesce((e.profile_visibility->>'showDescription')::boolean,false) then s.business_type else null end,
    'description',case when coalesce((e.profile_visibility->>'showDescription')::boolean,false) then coalesce(s.description,s.about,s.tagline) else null end,
    'logoUrl',case when coalesce((e.profile_visibility->>'showLogo')::boolean,false) then s.logo_url else null end,
    'coverImageUrl',case when coalesce((e.profile_visibility->>'showCover')::boolean,false) then s.cover_image_url else null end,
    'area',case when coalesce((e.profile_visibility->>'showArea')::boolean,false) then s.area else null end,
    'address',case when coalesce((e.profile_visibility->>'showAddress')::boolean,false) then s.address else null end,
    'contact',case when coalesce((e.profile_visibility->>'showContact')::boolean,false) then coalesce(s.mobile,s.phone,s.whatsapp) else null end,
    'websiteUrl',case when coalesce((e.profile_visibility->>'showWebsite')::boolean,false) and w.slug is not null then case when w.custom_domain is not null then case when w.custom_domain like 'http%' then w.custom_domain else 'https://'||w.custom_domain end else '/?site='||w.slug end else null end,
    'services',case when coalesce((e.profile_visibility->>'showServices')::boolean,false) then (
      select coalesce(jsonb_agg(jsonb_build_object('name',ss.name,'description',ss.description,'price',ss.price,'durationMinutes',ss.duration_minutes) order by ss.display_order),'[]'::jsonb)
      from public.salon_services ss where ss.salon_id=s.id and ss.is_active=true
    ) else '[]'::jsonb end,
    'gallery',case when coalesce((e.profile_visibility->>'showGallery')::boolean,false) then (
      select coalesce(jsonb_agg(jsonb_build_object('url',sm.url,'title',sm.title,'alt',sm.alt_text) order by sm.sort_order),'[]'::jsonb)
      from public.salon_media sm where sm.salon_id=s.id and sm.is_published=true
    ) else '[]'::jsonb end
  ) order by s.name),'[]'::jsonb)
  from public.top_salon_competition_entries e
  join public.salons s on s.id=e.salon_id
  left join public.salon_public_websites w on w.salon_id=s.id and w.is_published=true
  where e.cycle_id=p_cycle_id and e.status='approved' and e.public_directory_enabled=true
$function$;

create or replace function public.top_salon_competition_award_winners(p_cycle_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'awardRank',a.award_rank,
    'awardTitle',a.award_title,
    'competitionId',e.competition_id,
    'salonName',s.name,
    'area',case when e.public_directory_enabled and coalesce((e.profile_visibility->>'showArea')::boolean,false) then s.area else null end,
    'trophyStatus',a.trophy_status,
    'promotionStatus',a.promotion_status,
    'certificateStatus',a.certificate_status,
    'finalizedAt',a.finalized_at
  ) order by a.award_rank),'[]'::jsonb)
  from public.top_salon_competition_awards a
  join public.top_salon_competition_entries e on e.id=a.entry_id
  join public.salons s on s.id=e.salon_id
  where a.cycle_id=p_cycle_id and e.public_directory_enabled=true
$function$;

create or replace function public.top_salon_competition_admin(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid:=auth.uid();
  v_cycle public.top_salon_competition_cycles;
  v_entry public.top_salon_competition_entries;
  v_award public.top_salon_competition_awards;
  v_id uuid;
  v_start date;
  v_end date;
  v_open date;
  v_close date;
  v_code text;
  v_rank integer;
begin
  if v_actor is null or not private.top_salon_is_admin() then
    raise exception 'NEXORA admin access required' using errcode='42501';
  end if;

  if p_action='create_cycle' then
    v_code:=upper(btrim(p_data->>'code'));
    v_open:=(p_data->>'registrationOpenDate')::date;
    v_close:=(p_data->>'registrationCloseDate')::date;
    v_start:=(p_data->>'startDate')::date;
    v_end:=(p_data->>'endDate')::date;
    if v_code !~ '^[0-9]{4}Q[1-4]$' or v_end<>v_start+89 or v_close>=v_start or v_open>v_close then
      raise exception 'Use a cycle code such as 2027Q1, a registration window before start, and exactly 90 calendar days';
    end if;
    insert into public.top_salon_competition_cycles(
      code,name,city,registration_open_date,registration_close_date,start_date,end_date,status,created_by
    ) values (
      v_code,coalesce(nullif(btrim(p_data->>'name'),''),'NEXORA Top Salon Jaipur Awards'),
      'Jaipur',v_open,v_close,v_start,v_end,'draft',v_actor
    ) returning * into v_cycle;
    insert into public.top_salon_competition_audit_logs(cycle_id,actor_id,action,details)
    values(v_cycle.id,v_actor,'cycle_created',to_jsonb(v_cycle));
    return jsonb_build_object('cycleId',v_cycle.id,'code',v_cycle.code,'status',v_cycle.status);
  elsif p_action='open_registration' then
    v_id:=(p_data->>'cycleId')::uuid;
    update public.top_salon_competition_cycles
       set status='registration_open',updated_at=now()
     where id=v_id and (now() at time zone 'Asia/Kolkata')::date between registration_open_date and registration_close_date
     returning * into v_cycle;
    if v_cycle.id is null then raise exception 'Registration can only open inside the configured registration window'; end if;
  elsif p_action='close_registration' then
    v_id:=(p_data->>'cycleId')::uuid;
    update public.top_salon_competition_cycles set status='registration_closed',updated_at=now()
     where id=v_id and status='registration_open' returning * into v_cycle;
    if v_cycle.id is null then raise exception 'Registration cycle is not open'; end if;
  elsif p_action='approve_entry' or p_action='reject_entry' then
    v_id:=(p_data->>'entryId')::uuid;
    update public.top_salon_competition_entries
       set status=case when p_action='approve_entry' then 'approved' else 'rejected' end,
           reviewed_at=now(),reviewed_by=v_actor,review_note=nullif(btrim(p_data->>'reason'),''),updated_at=now()
     where id=v_id and status='pending' returning * into v_entry;
    if v_entry.id is null then raise exception 'Pending competition application not found'; end if;
    if p_action='approve_entry' then
      insert into public.top_salon_competition_reports(cycle_id,entry_id)
      values(v_entry.cycle_id,v_entry.id)
      on conflict(entry_id) do nothing;
    end if;
    insert into public.top_salon_competition_audit_logs(cycle_id,entry_id,actor_id,action,reason)
    values(v_entry.cycle_id,v_entry.id,v_actor,p_action,nullif(btrim(p_data->>'reason'),'')); 
    return jsonb_build_object('entryId',v_entry.id,'status',v_entry.status,'competitionId',v_entry.competition_id);
  elsif p_action='refresh_reports' then
    v_id:=(p_data->>'cycleId')::uuid;
    perform private.top_salon_refresh_metrics(v_id);
    return jsonb_build_object('cycleId',v_id,'refreshedAt',now());
  elsif p_action='finalize_cycle' then
    v_id:=(p_data->>'cycleId')::uuid;
    select * into v_cycle from public.top_salon_competition_cycles where id=v_id for update;
    if v_cycle.id is null then raise exception 'Competition cycle not found'; end if;
    if (now() at time zone 'Asia/Kolkata')::date<=v_cycle.end_date then
      raise exception 'Final awards can only be locked after the 90-day competition end date';
    end if;
    perform private.top_salon_refresh_metrics(v_id);
    with ranked as (
      select e.id as entry_id,
        row_number() over(order by r.competition_score desc,r.transaction_count desc,
          r.gateway_revenue_paise desc,r.unique_customers desc,r.verified_reviews desc,
          r.average_rating desc,e.competition_id asc) as position
      from public.top_salon_competition_entries e
      join public.top_salon_competition_reports r on r.entry_id=e.id
      where e.cycle_id=v_id and e.status='approved' and r.award_eligible=true
    )
    insert into public.top_salon_competition_awards(
      cycle_id,entry_id,award_rank,award_title,finalized_by
    )
    select v_id,entry_id,position,
      case position when 1 then 'NEXORA Growth Champion Trophy + Featured Advertising By NEXORA'
                    when 2 then 'NEXORA Recognition Trophy + Partner Spotlight'
                    when 3 then 'NEXORA Recognition Trophy + Digital Certificate' end,
      v_actor
    from ranked where position<=3
    on conflict(cycle_id,award_rank) do update set
      entry_id=excluded.entry_id,award_title=excluded.award_title,
      finalized_at=now(),finalized_by=v_actor;
    update public.top_salon_competition_cycles set status='completed',updated_at=now() where id=v_id;
    update public.top_salon_competition_reports set finalized_at=now() where cycle_id=v_id;
    insert into public.top_salon_competition_audit_logs(cycle_id,actor_id,action,details)
    values(v_id,v_actor,'cycle_finalized',jsonb_build_object('finalizedAt',now()));
    return jsonb_build_object('cycleId',v_id,'status','completed');
  elsif p_action='list_cycles' then
    return coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'code',c.code,'name',c.name,'status',c.status,
        'registrationOpenDate',c.registration_open_date,'registrationCloseDate',c.registration_close_date,
        'startDate',c.start_date,'endDate',c.end_date,
        'registeredCount',(select count(*) from public.top_salon_competition_entries e where e.cycle_id=c.id),
        'approvedCount',(select count(*) from public.top_salon_competition_entries e where e.cycle_id=c.id and e.status='approved')
      ) order by c.start_date desc)
      from public.top_salon_competition_cycles c
    ),'[]'::jsonb);
  elsif p_action='applications' then
    v_id:=(p_data->>'cycleId')::uuid;
    return coalesce((
      select jsonb_agg(jsonb_build_object(
        'entryId',e.id,'competitionId',e.competition_id,'status',e.status,
        'registeredAt',e.registered_at,'reviewNote',e.review_note,
        'salon',jsonb_build_object('name',s.name,'city',s.city,'area',s.area,
          'category',s.business_type,'logoUrl',s.logo_url,'address',s.address),
        'ownerId',e.owner_id
      ) order by e.registered_at)
      from public.top_salon_competition_entries e
      join public.salons s on s.id=e.salon_id
      where e.cycle_id=v_id
    ),'[]'::jsonb);
  elsif p_action='update_fulfilment' then
    v_id:=(p_data->>'awardId')::uuid;
    update public.top_salon_competition_awards
       set trophy_status=coalesce(nullif(p_data->>'trophyStatus',''),trophy_status),
           promotion_status=coalesce(nullif(p_data->>'promotionStatus',''),promotion_status),
           certificate_status=coalesce(nullif(p_data->>'certificateStatus',''),certificate_status),
           fulfilment_note=nullif(btrim(p_data->>'note'),'')
     where id=v_id returning * into v_award;
    if v_award.id is null then raise exception 'Award fulfilment record not found'; end if;
    insert into public.top_salon_competition_audit_logs(actor_id,action,details)
    values(v_actor,'award_fulfilment_updated',jsonb_build_object('awardId',v_id,'trophyStatus',p_data->>'trophyStatus','promotionStatus',p_data->>'promotionStatus','certificateStatus',p_data->>'certificateStatus'));
    return jsonb_build_object('awardId',v_id,'updated',true);
  else
    raise exception 'Unsupported competition admin action';
  end if;

  insert into public.top_salon_competition_audit_logs(cycle_id,actor_id,action,details)
  values(v_cycle.id,v_actor,p_action,jsonb_build_object('cycleId',v_cycle.id));
  return jsonb_build_object('cycleId',v_cycle.id,'status',v_cycle.status);
end
$function$;

-- Booking-tied review verification. The existing public RPC signature stays
-- intact so website clients do not break; it now requires a completed booking.
create or replace function studioflow_review_private.review_json(r public.studioflow_reviews)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'id',r.id,'name',r.name,'rating',r.rating,'comment',r.comment,
    'serviceName',r.service_name,'imageUrl',r.image_url,'date',r.created_at,
    'isMine',r.customer_id=auth.uid(),'isOwnerReview',r.customer_id=r.owner_id,
    'verified',r.booking_id is not null and exists(
      select 1 from public.studioflow_bookings b
      where b.id=r.booking_id and b.owner_id=r.owner_id
        and b.customer_id=r.customer_id and b.status='completed'
    )
  )
$function$;

create or replace function studioflow_review_private.list_reviews(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  salon uuid;
  actor uuid:=auth.uid();
  result jsonb;
  own jsonb;
  eligible_booking uuid;
begin
  select owner_id into salon from public.studioflow_websites where slug=p_slug;
  if salon is null then raise exception 'Publish the salon website before collecting customer reviews'; end if;

  select b.id into eligible_booking
  from public.studioflow_bookings b
  where b.owner_id=salon and b.customer_id=actor
    and b.status='completed' and b.ends_at<=now()
  order by b.ends_at desc
  limit 1;

  select coalesce(jsonb_agg(studioflow_review_private.review_json(r) order by r.updated_at desc),'[]'::jsonb)
  into result
  from (
    select * from public.studioflow_reviews
    where owner_id=salon
    order by updated_at desc limit 50
  ) r;

  select studioflow_review_private.review_json(r) into own
  from public.studioflow_reviews r
  where owner_id=salon and customer_id=actor;

  return jsonb_build_object(
    'reviews',result,'ownReview',own,
    'canReview',actor is not null and eligible_booking is not null,
    'eligibleBookingId',eligible_booking
  );
end
$function$;

create or replace function studioflow_review_private.submit_review(
  p_slug text,p_name text,p_rating integer,p_comment text,
  p_service_name text default '',p_image_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  salon uuid;
  actor uuid:=auth.uid();
  prefix text;
  image_path text;
  existing public.studioflow_reviews;
  eligible_booking uuid;
begin
  if actor is null then raise exception 'Sign in to submit a review' using errcode='42501'; end if;
  if exists(select 1 from auth.users where id=actor and banned_until>now()) then
    raise exception 'Account unavailable' using errcode='42501';
  end if;
  select owner_id into salon from public.studioflow_websites where slug=p_slug;
  if salon is null then raise exception 'Salon website is unavailable'; end if;

  select b.id into eligible_booking
  from public.studioflow_bookings b
  where b.owner_id=salon and b.customer_id=actor
    and b.status='completed' and b.ends_at<=now()
  order by b.ends_at desc
  limit 1;
  if eligible_booking is null then
    raise exception 'Only customers with a completed appointment can submit a verified salon review' using errcode='42501';
  end if;

  if char_length(btrim(coalesce(p_name,''))) not between 2 and 100
     or p_rating is null or p_rating not between 1 and 5
     or char_length(btrim(coalesce(p_comment,''))) not between 10 and 2000
     or char_length(coalesce(p_service_name,''))>150 then
    raise exception 'Provide your name, a 1–5 star rating and a review of 10–2000 characters';
  end if;

  p_image_url:=nullif(btrim(p_image_url),'');
  if p_image_url is not null then
    prefix:='https://zilwgiuiygqqardzutxi.supabase.co/storage/v1/object/public/studioflow-media/';
    if left(p_image_url,char_length(prefix||actor::text||'/'))<>prefix||actor::text||'/' then
      raise exception 'Upload your own review photo';
    end if;
    image_path:=substr(p_image_url,char_length(prefix)+1);
    if not exists(select 1 from storage.objects where bucket_id='studioflow-media' and name=image_path) then
      raise exception 'Review photo upload is unavailable';
    end if;
  end if;

  select * into existing
  from public.studioflow_reviews
  where owner_id=salon and customer_id=actor;
  if existing.id is not null and existing.updated_at>now()-interval '10 seconds' then
    raise exception 'Please wait a few seconds before updating your review';
  end if;

  insert into public.studioflow_reviews(
    owner_id,customer_id,name,rating,comment,service_name,image_url,booking_id
  ) values (
    salon,actor,btrim(p_name),p_rating,btrim(p_comment),
    btrim(coalesce(p_service_name,'')),p_image_url,eligible_booking
  )
  on conflict(owner_id,customer_id) do update set
    name=excluded.name,rating=excluded.rating,comment=excluded.comment,
    service_name=excluded.service_name,image_url=excluded.image_url,
    booking_id=excluded.booking_id,updated_at=now();

  return studioflow_review_private.list_reviews(p_slug);
end
$function$;

-- Public admin RPC is the guarded SECURITY DEFINER function defined above; it checks the trusted NEXORA admin roster before every action.

-- Keep private helpers inaccessible to browser roles; public RPCs above are the only API surface.
revoke all on function private.top_salon_is_admin() from public,anon,authenticated;
revoke all on function private.top_salon_is_competitor(uuid,uuid) from public,anon,authenticated;
revoke all on function private.top_salon_refresh_metrics(uuid) from public,anon,authenticated;

-- Prevent accidental direct access to raw reports/applications.
revoke all on function public.top_salon_competition_cycles() from public;
revoke all on function public.top_salon_competition_register(uuid,uuid,boolean,boolean,boolean,boolean,jsonb) from public;
revoke all on function public.top_salon_competition_my_entries() from public;
revoke all on function public.top_salon_competition_competitors(uuid) from public;
revoke all on function public.top_salon_competition_public_directory(uuid) from public;
revoke all on function public.top_salon_competition_award_winners(uuid) from public;
revoke all on function public.top_salon_competition_admin(text,jsonb) from public;

grant execute on function public.top_salon_competition_cycles() to anon,authenticated;
grant execute on function public.top_salon_competition_register(uuid,uuid,boolean,boolean,boolean,boolean,jsonb) to authenticated;
grant execute on function public.top_salon_competition_my_entries() to authenticated;
grant execute on function public.top_salon_competition_competitors(uuid) to authenticated;
grant execute on function public.top_salon_competition_public_directory(uuid) to anon,authenticated;
grant execute on function public.top_salon_competition_award_winners(uuid) to anon,authenticated;
grant execute on function public.top_salon_competition_admin(text,jsonb) to authenticated;

commit;

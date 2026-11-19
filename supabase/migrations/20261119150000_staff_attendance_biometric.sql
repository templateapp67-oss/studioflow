-- NEXORA staff attendance: manual punches, shifts, breaks, leave, reports,
-- biometric passkey credentials, and generic biometric-device push integration.
-- Additive only. Does not modify existing staff, bookings, or payment rows.

create table if not exists public.salon_staff_attendance_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Asia/Kolkata',
  grace_minutes integer not null default 10 check (grace_minutes between 0 and 180),
  overtime_after_minutes integer not null default 0 check (overtime_after_minutes between 0 and 600),
  default_shift_start time not null default '10:00',
  default_shift_end time not null default '19:00',
  default_break_minutes integer not null default 60 check (default_break_minutes between 0 and 240),
  updated_at timestamptz not null default now()
);

create table if not exists public.salon_staff_attendance_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  staff_key text not null,
  staff_code text,
  staff_name text not null,
  staff_role text not null default 'Staff',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salon_staff_attendance_profile_key_unique unique (owner_id, staff_key),
  constraint salon_staff_attendance_profile_name_length check (char_length(btrim(staff_name)) between 2 and 120),
  constraint salon_staff_attendance_profile_code_length check (staff_code is null or char_length(btrim(staff_code)) between 1 and 40)
);
create unique index if not exists salon_staff_attendance_profile_code_idx
  on public.salon_staff_attendance_profiles(owner_id, lower(staff_code))
  where staff_code is not null and btrim(staff_code) <> '';
create index if not exists salon_staff_attendance_profiles_owner_active_idx
  on public.salon_staff_attendance_profiles(owner_id, active, staff_name);

create table if not exists public.salon_staff_attendance_shifts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  staff_key text not null,
  weekday smallint not null check (weekday between 0 and 6),
  shift_start time not null,
  shift_end time not null,
  break_minutes integer not null default 60 check (break_minutes between 0 and 240),
  is_weekly_off boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint salon_staff_attendance_shift_staff_fk
    foreign key (owner_id, staff_key)
    references public.salon_staff_attendance_profiles(owner_id, staff_key)
    on delete cascade,
  constraint salon_staff_attendance_shift_day_unique unique(owner_id, staff_key, weekday)
);

create table if not exists public.salon_staff_attendance_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  staff_key text not null,
  attendance_date date not null,
  status text not null default 'present'
    check (status in ('present','late','half_day','absent','on_leave','holiday','weekly_off')),
  check_in timestamptz,
  check_out timestamptz,
  active_break_started_at timestamptz,
  break_minutes integer not null default 0 check (break_minutes between 0 and 1440),
  worked_minutes integer not null default 0 check (worked_minutes between 0 and 2880),
  expected_minutes integer not null default 0 check (expected_minutes between 0 and 1440),
  overtime_minutes integer not null default 0 check (overtime_minutes between 0 and 1440),
  method text not null default 'manual' check (method in ('manual','biometric','device','import')),
  notes text not null default '',
  check_in_lat numeric(9,6),
  check_in_lng numeric(9,6),
  check_in_accuracy_m numeric(8,2),
  check_out_lat numeric(9,6),
  check_out_lng numeric(9,6),
  check_out_accuracy_m numeric(8,2),
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salon_staff_attendance_record_staff_fk
    foreign key (owner_id, staff_key)
    references public.salon_staff_attendance_profiles(owner_id, staff_key)
    on delete cascade,
  constraint salon_staff_attendance_day_unique unique(owner_id, staff_key, attendance_date),
  constraint salon_staff_attendance_time_order check (check_out is null or check_in is not null and check_out >= check_in)
);
create index if not exists salon_staff_attendance_owner_date_idx
  on public.salon_staff_attendance_records(owner_id, attendance_date desc);
create index if not exists salon_staff_attendance_owner_staff_date_idx
  on public.salon_staff_attendance_records(owner_id, staff_key, attendance_date desc);

create table if not exists public.salon_staff_attendance_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  staff_key text not null,
  attendance_id uuid references public.salon_staff_attendance_records(id) on delete set null,
  event_type text not null check (event_type in (
    'check_in','check_out','break_start','break_end','status_set',
    'biometric_enrolled','biometric_revoked','device_punch','leave_created','leave_reviewed'
  )),
  method text not null check (method in ('manual','biometric','device','system')),
  occurred_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  device_id uuid,
  provider_event_id text,
  notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  constraint salon_staff_attendance_event_staff_fk
    foreign key (owner_id, staff_key)
    references public.salon_staff_attendance_profiles(owner_id, staff_key)
    on delete cascade
);
create index if not exists salon_staff_attendance_events_owner_staff_time_idx
  on public.salon_staff_attendance_events(owner_id, staff_key, occurred_at desc);

create table if not exists public.salon_staff_leave_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  staff_key text not null,
  start_date date not null,
  end_date date not null,
  leave_type text not null default 'casual'
    check (leave_type in ('casual','sick','paid','unpaid','emergency','other')),
  reason text not null default '',
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salon_staff_leave_staff_fk
    foreign key (owner_id, staff_key)
    references public.salon_staff_attendance_profiles(owner_id, staff_key)
    on delete cascade,
  constraint salon_staff_leave_date_order check (end_date >= start_date),
  constraint salon_staff_leave_reason_length check (char_length(reason) <= 1000)
);
create index if not exists salon_staff_leave_owner_dates_idx
  on public.salon_staff_leave_requests(owner_id, start_date, end_date, status);

-- WebAuthn public-key credentials and short-lived challenges are only accessed
-- by the server-side Edge Function. Private keys and biometric data never leave
-- the staff member's authenticator.
create table if not exists public.salon_staff_attendance_biometrics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  staff_key text not null,
  credential_id text not null unique,
  public_key_b64 text not null,
  sign_count bigint not null default 0 check (sign_count >= 0),
  transports text[] not null default '{}',
  device_type text not null default 'singleDevice',
  backed_up boolean not null default false,
  friendly_name text not null default 'Staff biometric device',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint salon_staff_biometric_staff_fk
    foreign key (owner_id, staff_key)
    references public.salon_staff_attendance_profiles(owner_id, staff_key)
    on delete cascade
);
create index if not exists salon_staff_attendance_biometrics_owner_staff_idx
  on public.salon_staff_attendance_biometrics(owner_id, staff_key)
  where revoked_at is null;

create table if not exists public.salon_staff_attendance_webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  staff_key text not null,
  purpose text not null check (purpose in ('registration','authentication')),
  challenge text not null,
  rp_id text not null,
  origin text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint salon_staff_webauthn_challenge_staff_fk
    foreign key (owner_id, staff_key)
    references public.salon_staff_attendance_profiles(owner_id, staff_key)
    on delete cascade
);
create index if not exists salon_staff_webauthn_challenges_owner_expiry_idx
  on public.salon_staff_attendance_webauthn_challenges(owner_id, expires_at);

create table if not exists public.salon_staff_attendance_devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null,
  vendor text not null default 'Generic',
  model text not null default '',
  protocol text not null default 'http_push'
    check (protocol in ('http_push','webhook_bridge')),
  api_key_hash text not null unique,
  active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salon_staff_attendance_device_name_length check (char_length(btrim(device_name)) between 2 and 100)
);

create table if not exists public.salon_staff_attendance_device_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.salon_staff_attendance_devices(id) on delete cascade,
  provider_event_id text not null,
  staff_key text not null,
  event_type text not null check (event_type in ('check_in','check_out')),
  occurred_at timestamptz not null,
  attendance_event_id uuid,
  payload_digest text not null,
  received_at timestamptz not null default now(),
  constraint salon_staff_attendance_device_event_unique unique(device_id, provider_event_id),
  constraint salon_staff_attendance_device_event_staff_fk
    foreign key (owner_id, staff_key)
    references public.salon_staff_attendance_profiles(owner_id, staff_key)
    on delete cascade
);

-- Owner-facing operational tables are protected by strict salon ownership RLS.
do $block$
declare
  t text;
begin
  foreach t in array array[
    'salon_staff_attendance_settings',
    'salon_staff_attendance_profiles',
    'salon_staff_attendance_shifts',
    'salon_staff_attendance_records',
    'salon_staff_attendance_events',
    'salon_staff_leave_requests'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_access', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))',
      t || '_owner_access', t
    );
  end loop;
end
$block$;

-- Sensitive service-managed tables are inaccessible to browser roles.
do $block$
declare
  t text;
begin
  foreach t in array array[
    'salon_staff_attendance_biometrics',
    'salon_staff_attendance_webauthn_challenges',
    'salon_staff_attendance_devices',
    'salon_staff_attendance_device_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end
$block$;

grant select, insert, update, delete on public.salon_staff_attendance_settings to authenticated;
grant select, insert, update, delete on public.salon_staff_attendance_profiles to authenticated;
grant select, insert, update, delete on public.salon_staff_attendance_shifts to authenticated;
grant select on public.salon_staff_attendance_records to authenticated;
grant select on public.salon_staff_attendance_events to authenticated;
grant select, insert, update on public.salon_staff_leave_requests to authenticated;

-- One audited punch engine is shared by manual owner actions, verified
-- WebAuthn requests, and device-webhook events. It is callable only by service_role.
create or replace function public.salon_staff_attendance_service_punch(
  p_owner_id uuid,
  p_staff_key text,
  p_action text,
  p_method text,
  p_notes text default '',
  p_lat numeric default null,
  p_lng numeric default null,
  p_accuracy_m numeric default null,
  p_device_id uuid default null,
  p_provider_event_id text default null,
  p_event_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_profile public.salon_staff_attendance_profiles;
  v_record public.salon_staff_attendance_records;
  v_settings public.salon_staff_attendance_settings;
  v_shift public.salon_staff_attendance_shifts;
  v_local_date date;
  v_timezone text;
  v_shift_start time;
  v_shift_end time;
  v_shift_break integer;
  v_grace integer;
  v_overtime_after integer;
  v_expected integer := 0;
  v_shift_span interval;
  v_late integer := 0;
  v_worked integer := 0;
  v_break integer := 0;
  v_break_started timestamptz;
  v_status text := 'present';
  v_event_id uuid;
begin
  if p_owner_id is null or not exists (
    select 1 from public.studioflow_accounts a where a.user_id = p_owner_id
  ) then
    raise exception 'Salon owner account not found' using errcode = '42501';
  end if;

  if p_action is null or p_action not in ('check_in','check_out','break_start','break_end') then
    raise exception 'Unsupported attendance action' using errcode = '22023';
  end if;
  if p_method is null or p_method not in ('manual','biometric','device') then
    raise exception 'Unsupported attendance method' using errcode = '22023';
  end if;
  if p_event_at is null or p_event_at > now() + interval '5 minutes'
     or p_event_at < now() - interval '90 days' then
    raise exception 'Attendance event time is outside the allowed range' using errcode = '22023';
  end if;
  if p_staff_key is null or char_length(btrim(p_staff_key)) not between 1 and 120
     or char_length(coalesce(p_notes,'')) > 1000 then
    raise exception 'Invalid staff key or attendance note' using errcode = '22023';
  end if;
  if (p_lat is not null and (p_lat < -90 or p_lat > 90))
     or (p_lng is not null and (p_lng < -180 or p_lng > 180))
     or (p_accuracy_m is not null and (p_accuracy_m < 0 or p_accuracy_m > 100000)) then
    raise exception 'Invalid attendance location' using errcode = '22023';
  end if;

  select * into v_profile
  from public.salon_staff_attendance_profiles p
  where p.owner_id = p_owner_id and p.staff_key = p_staff_key and p.active = true;
  if v_profile.id is null then
    raise exception 'Active staff member not found in attendance register' using errcode = 'P0002';
  end if;

  select * into v_settings
  from public.salon_staff_attendance_settings s
  where s.owner_id = p_owner_id;
  v_timezone := coalesce(nullif(v_settings.timezone,''), 'Asia/Kolkata');
  v_grace := coalesce(v_settings.grace_minutes, 10);
  v_overtime_after := coalesce(v_settings.overtime_after_minutes, 0);
  v_local_date := (p_event_at at time zone v_timezone)::date;

  -- Find today's record first. Overnight shifts keep their attendance_date
  -- anchored to check-in day; allow their checkout/break-end after midnight.
  select * into v_record
  from public.salon_staff_attendance_records r
  where r.owner_id = p_owner_id and r.staff_key = p_staff_key and r.attendance_date = v_local_date
  for update;

  if p_action in ('check_out','break_end') and (v_record.id is null or v_record.check_in is null) then
    select * into v_record
    from public.salon_staff_attendance_records r
    where r.owner_id = p_owner_id
      and r.staff_key = p_staff_key
      and r.attendance_date < v_local_date
      and r.check_in is not null
      and r.check_out is null
    order by r.attendance_date desc
    limit 1
    for update;
    if v_record.id is not null then
      v_local_date := v_record.attendance_date;
    end if;
  end if;

  if p_action = 'check_in' and exists (
    select 1 from public.salon_staff_attendance_records r
    where r.owner_id = p_owner_id and r.staff_key = p_staff_key
      and r.attendance_date < v_local_date
      and r.check_in is not null and r.check_out is null
  ) then
    raise exception 'Finish the previous shift before starting a new one' using errcode = '22023';
  end if;

  select * into v_shift
  from public.salon_staff_attendance_shifts s
  where s.owner_id = p_owner_id
    and s.staff_key = p_staff_key
    and s.weekday = extract(dow from v_local_date)::smallint;

  v_shift_start := coalesce(v_shift.shift_start, v_settings.default_shift_start, time '10:00');
  v_shift_end := coalesce(v_shift.shift_end, v_settings.default_shift_end, time '19:00');
  v_shift_break := coalesce(v_shift.break_minutes, v_settings.default_break_minutes, 60);
  if found and v_shift.is_weekly_off then
    v_status := 'weekly_off';
  end if;
  if v_shift_start is not null and v_shift_end is not null then
    v_shift_span := v_shift_end - v_shift_start;
    if v_shift_span <= interval '0' then v_shift_span := v_shift_span + interval '24 hours'; end if;
    v_expected := greatest(0, floor(extract(epoch from (v_shift_span - make_interval(mins => v_shift_break))) / 60)::integer);
  end if;

  if p_action = 'check_in' then
    if v_record.id is not null and (v_record.check_in is not null or v_record.status in ('absent','on_leave','holiday','weekly_off')) then
      raise exception 'Attendance is already marked for today' using errcode = '23505';
    end if;
    if v_shift.is_weekly_off then
      raise exception 'This staff member is scheduled for a weekly off today' using errcode = '22023';
    end if;
    if v_shift_start is not null then
      v_late := greatest(0, floor(extract(epoch from (
        p_event_at - ((v_local_date + v_shift_start) at time zone v_timezone)
        - make_interval(mins => v_grace)
      )) / 60)::integer);
    end if;
    v_status := case when v_late > 0 then 'late' else 'present' end;

    insert into public.salon_staff_attendance_records(
      owner_id, staff_key, attendance_date, status, check_in, expected_minutes,
      method, notes, check_in_lat, check_in_lng, check_in_accuracy_m, recorded_by
    ) values (
      p_owner_id, p_staff_key, v_local_date, v_status, p_event_at, v_expected,
      p_method, coalesce(p_notes,''), p_lat, p_lng, p_accuracy_m, p_owner_id
    )
    on conflict(owner_id, staff_key, attendance_date) do update
      set status = excluded.status,
          check_in = excluded.check_in,
          expected_minutes = excluded.expected_minutes,
          method = excluded.method,
          notes = case when excluded.notes = '' then public.salon_staff_attendance_records.notes else excluded.notes end,
          check_in_lat = excluded.check_in_lat,
          check_in_lng = excluded.check_in_lng,
          check_in_accuracy_m = excluded.check_in_accuracy_m,
          recorded_by = excluded.recorded_by,
          updated_at = now()
    returning * into v_record;
  elsif p_action = 'break_start' then
    if v_record.id is null or v_record.check_in is null or v_record.check_out is not null then
      raise exception 'Staff must check in before starting a break' using errcode = '22023';
    end if;
    if p_event_at < v_record.check_in then
      raise exception 'Break start cannot be before check-in' using errcode = '22023';
    end if;
    if v_record.active_break_started_at is not null then
      raise exception 'A break is already running' using errcode = '23505';
    end if;
    update public.salon_staff_attendance_records
      set active_break_started_at = p_event_at, method = p_method, updated_at = now()
      where id = v_record.id returning * into v_record;
  elsif p_action = 'break_end' then
    if v_record.id is null or v_record.active_break_started_at is null then
      raise exception 'There is no active break to finish' using errcode = '22023';
    end if;
    if p_event_at < v_record.active_break_started_at then
      raise exception 'Break end cannot be before break start' using errcode = '22023';
    end if;
    v_break := greatest(0, floor(extract(epoch from (p_event_at - v_record.active_break_started_at)) / 60)::integer);
    update public.salon_staff_attendance_records
      set break_minutes = break_minutes + v_break,
          active_break_started_at = null,
          method = p_method,
          updated_at = now()
      where id = v_record.id returning * into v_record;
  else
    if v_record.id is null or v_record.check_in is null then
      raise exception 'Staff must check in before checking out' using errcode = '22023';
    end if;
    if v_record.check_out is not null then
      raise exception 'Attendance is already checked out' using errcode = '23505';
    end if;
    if p_event_at < v_record.check_in then
      raise exception 'Check-out cannot be before check-in' using errcode = '22023';
    end if;
    if v_record.active_break_started_at is not null then
      raise exception 'Finish the active break before checking out' using errcode = '22023';
    end if;
    v_break := v_record.break_minutes;
    v_worked := greatest(0, floor(extract(epoch from (p_event_at - v_record.check_in)) / 60)::integer - v_break);
    v_status := case
      when v_record.status = 'late' and (v_expected = 0 or v_worked >= v_expected / 2) then 'late'
      when v_expected > 0 and v_worked < v_expected / 2 then 'half_day'
      else 'present'
    end;
    update public.salon_staff_attendance_records
      set check_out = p_event_at,
          worked_minutes = v_worked,
          overtime_minutes = greatest(0, v_worked - v_expected - v_overtime_after),
          status = v_status,
          method = p_method,
          notes = case when coalesce(p_notes,'') = '' then notes else btrim(p_notes) end,
          check_out_lat = p_lat,
          check_out_lng = p_lng,
          check_out_accuracy_m = p_accuracy_m,
          updated_at = now()
      where id = v_record.id returning * into v_record;
  end if;

  insert into public.salon_staff_attendance_events(
    owner_id, staff_key, attendance_id, event_type, method, occurred_at,
    actor_id, device_id, provider_event_id, notes
  ) values (
    p_owner_id, p_staff_key, v_record.id, p_action, p_method, p_event_at,
    p_owner_id, p_device_id, p_provider_event_id, coalesce(p_notes,'')
  ) returning id into v_event_id;

  return jsonb_build_object(
    'ok', true,
    'attendance', to_jsonb(v_record),
    'eventId', v_event_id,
    'lateMinutes', case when p_action = 'check_in' then v_late else null end
  );
end;
$function$;

create or replace function public.salon_staff_attendance_service_mark_status(
  p_owner_id uuid,
  p_staff_key text,
  p_attendance_date date,
  p_status text,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_record public.salon_staff_attendance_records;
  v_id uuid;
begin
  if p_owner_id is null or not exists (
    select 1 from public.studioflow_accounts a where a.user_id = p_owner_id
  ) then
    raise exception 'Salon owner account not found' using errcode = '42501';
  end if;
  if p_status is null or p_attendance_date is null or char_length(coalesce(p_notes,'')) > 1000
     or p_status not in ('absent','on_leave','holiday','weekly_off','half_day','present') then
    raise exception 'Invalid attendance status' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.salon_staff_attendance_profiles p
    where p.owner_id = p_owner_id and p.staff_key = p_staff_key
  ) then
    raise exception 'Staff member not found' using errcode = 'P0002';
  end if;

  insert into public.salon_staff_attendance_records(
    owner_id,staff_key,attendance_date,status,method,notes,recorded_by
  ) values (
    p_owner_id,p_staff_key,p_attendance_date,p_status,'manual',coalesce(p_notes,''),p_owner_id
  )
  on conflict(owner_id,staff_key,attendance_date) do update
    set status = excluded.status,
        notes = case when excluded.notes = '' then public.salon_staff_attendance_records.notes else excluded.notes end,
        method = 'manual',
        recorded_by = p_owner_id,
        updated_at = now()
  returning * into v_record;

  insert into public.salon_staff_attendance_events(
    owner_id,staff_key,attendance_id,event_type,method,actor_id,notes,metadata
  ) values (
    p_owner_id,p_staff_key,v_record.id,'status_set','manual',p_owner_id,
    coalesce(p_notes,''),jsonb_build_object('status',p_status,'date',p_attendance_date)
  );

  return jsonb_build_object('ok',true,'attendance',to_jsonb(v_record));
end;
$function$;

revoke all on function public.salon_staff_attendance_service_punch(uuid,text,text,text,text,numeric,numeric,numeric,uuid,text,timestamptz) from public, anon, authenticated;
revoke all on function public.salon_staff_attendance_service_mark_status(uuid,text,date,text,text) from public, anon, authenticated;
grant execute on function public.salon_staff_attendance_service_punch(uuid,text,text,text,text,numeric,numeric,numeric,uuid,text,timestamptz) to service_role;
grant execute on function public.salon_staff_attendance_service_mark_status(uuid,text,date,text,text) to service_role;

-- No raw biometric templates or fingerprints are stored in this database.
-- Only WebAuthn public keys (no private key / fingerprint image) are persisted.

-- Keep the attendance directory aligned with the active shared salon team.
create or replace function public.salon_staff_attendance_sync_roster(p_roster jsonb)
returns integer
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  affected integer := 0;
begin
  if actor is null or not exists (
    select 1 from public.studioflow_accounts a where a.user_id = actor
  ) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;
  if p_roster is null or jsonb_typeof(p_roster) is distinct from 'array'
     or jsonb_array_length(p_roster) > 200 then
    raise exception 'A non-empty staff roster (maximum 200) is required' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_roster) as x(id text, name text, role text)
    where coalesce(btrim(x.id),'') = '' or char_length(x.id) > 120
       or char_length(btrim(coalesce(x.name,''))) not between 2 and 120
  ) then
    raise exception 'Staff roster contains an invalid ID or name' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_to_recordset(p_roster) as x(id text, name text, role text))
     <> (select count(distinct x.id) from jsonb_to_recordset(p_roster) as x(id text, name text, role text)) then
    raise exception 'Staff roster contains duplicate staff IDs' using errcode = '22023';
  end if;

  insert into public.salon_staff_attendance_profiles(
    owner_id, staff_key, staff_name, staff_role, active
  )
  select actor, x.id, btrim(x.name), coalesce(nullif(btrim(x.role),''),'Staff'), true
  from jsonb_to_recordset(p_roster) as x(id text, name text, role text)
  on conflict(owner_id, staff_key) do update
    set staff_name = excluded.staff_name,
        staff_role = excluded.staff_role,
        active = true,
        updated_at = now();
  get diagnostics affected = row_count;

  update public.salon_staff_attendance_profiles p
  set active = false, updated_at = now()
  where p.owner_id = actor
    and p.active = true
    and not exists (
      select 1 from jsonb_to_recordset(p_roster) as x(id text, name text, role text)
      where x.id = p.staff_key
    );

  return affected;
end;
$function$;
revoke all on function public.salon_staff_attendance_sync_roster(jsonb) from public, anon;
grant execute on function public.salon_staff_attendance_sync_roster(jsonb) to authenticated;

-- Approved leave automatically appears in the attendance calendar. Actual
-- punches are never overwritten by an approved leave request.
create or replace function public.salon_staff_attendance_apply_leave()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  leave_day date;
begin
  if auth.uid() is null or new.owner_id is distinct from auth.uid() then
    raise exception 'Salon owner access required for leave updates' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if old.owner_id is distinct from auth.uid() then
      raise exception 'Salon owner access required for leave updates' using errcode = '42501';
    end if;
    if old.status = 'approved'
       and (new.status <> 'approved' or new.start_date <> old.start_date or new.end_date <> old.end_date) then
      update public.salon_staff_attendance_records r
      set status = 'absent', updated_at = now()
      where r.owner_id = old.owner_id
        and r.staff_key = old.staff_key
        and r.attendance_date between old.start_date and old.end_date
        and r.status = 'on_leave'
        and r.check_in is null;
    end if;
  end if;

  if new.status = 'approved' then
    for leave_day in
      select generate_series(new.start_date, new.end_date, interval '1 day')::date
    loop
      insert into public.salon_staff_attendance_records(
        owner_id, staff_key, attendance_date, status, method, notes, recorded_by
      ) values (
        new.owner_id, new.staff_key, leave_day, 'on_leave', 'manual',
        coalesce(nullif(new.reason,''),'Approved leave'), coalesce(new.reviewed_by, auth.uid())
      )
      on conflict(owner_id, staff_key, attendance_date) do update
        set status = case
              when public.salon_staff_attendance_records.check_in is null
               and public.salon_staff_attendance_records.status in ('on_leave','absent')
              then 'on_leave'
              else public.salon_staff_attendance_records.status
            end,
            notes = case
              when public.salon_staff_attendance_records.check_in is null
              then coalesce(nullif(new.reason,''),'Approved leave')
              else public.salon_staff_attendance_records.notes
            end,
            updated_at = now();
    end loop;
  end if;
  return new;
end;
$function$;

drop trigger if exists salon_staff_attendance_apply_leave_trigger on public.salon_staff_leave_requests;
create trigger salon_staff_attendance_apply_leave_trigger
after insert or update of status, start_date, end_date
on public.salon_staff_leave_requests
for each row execute function public.salon_staff_attendance_apply_leave();
revoke all on function public.salon_staff_attendance_apply_leave() from public, anon, authenticated;

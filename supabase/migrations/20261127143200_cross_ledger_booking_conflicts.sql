-- Serialize normalized and StudioFlow appointment writes without guessing how
-- independently generated staff identifiers correspond. The conservative
-- cross-ledger boundary is one owner: an active normalized appointment blocks
-- overlapping StudioFlow appointments for that owner, regardless of staff.
-- Read the rollout runbook before applying; this is a separate pending migration.
begin;

create or replace function studioflow_private.normalized_booking_active(p_booking_status text,p_status text)
returns boolean language sql immutable set search_path='' as $$
 select lower(coalesce(nullif(btrim(p_booking_status),''),nullif(btrim(p_status),''),'pending'))
   not in ('cancelled','canceled','completed','no_show','expired')
$$;

-- A normalized salon has no owner_id column on the reviewed schema. Do not
-- select a manager or guess among multiple owners: require exactly one active
-- organization owner and require booking.owner_id to agree with it.
create or replace function studioflow_private.normalized_salon_owner(p_salon uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare owners integer; owner_id uuid;
begin
 select count(distinct m.user_id),min(m.user_id::text)::uuid into owners,owner_id
 from public.salons s join public.organization_members m on m.organization_id=s.organization_id
 where s.id=p_salon and s.deleted_at is null and m.status='active' and m.role='owner';
 if owners<>1 then return null; end if;
 return owner_id;
end $$;

-- Normalized dates and times are wall-clock values in the salon timezone;
-- StudioFlow timestamps are absolute instants. Unknown, inconsistent or
-- daylight-transition-adjacent windows are deliberately unrepresentable rather
-- than choosing an ambiguous/nonexistent instant. NULL means fail closed.
create or replace function studioflow_private.normalized_booking_window(
 p_appointment_date date,p_booking_date date,p_start time,p_end time,p_timezone text
) returns tstzrange language plpgsql stable set search_path='' as $$
declare day_value date; zone text; starts timestamptz; ends timestamptz; base_offset interval; probe timestamptz;
begin
 if p_appointment_date is null and p_booking_date is null then return null; end if;
 if p_appointment_date is not null and p_booking_date is not null and p_appointment_date<>p_booking_date then return null; end if;
 if p_start is null or p_end is null or p_end<=p_start or nullif(btrim(p_timezone),'') is null then return null; end if;
 zone:=btrim(p_timezone);
 day_value:=coalesce(p_appointment_date,p_booking_date);
 if not isfinite(day_value) then return null; end if;
 starts:=(day_value+p_start) at time zone zone;
 ends:=(day_value+p_end) at time zone zone;
 if ends<=starts or (starts at time zone zone) is distinct from day_value+p_start
    or (ends at time zone zone) is distinct from day_value+p_end then return null; end if;
 base_offset:=(starts at time zone zone)-(starts at time zone 'UTC');
 foreach probe in array array[starts-interval '36 hours',starts,ends,ends+interval '36 hours'] loop
  if ((probe at time zone zone)-(probe at time zone 'UTC')) is distinct from base_offset then return null; end if;
 end loop;
 return tstzrange(starts,ends,'[)');
exception when invalid_parameter_value or datetime_field_overflow then
 -- Invalid IANA zone or an out-of-range timestamp is not bookable.
 return null;
end $$;

-- The first installation rejects all active legacy rows, whose original
-- timezone/owner cannot be reconstructed safely. After installation the
-- trigger ensures active rows have one validated owner and an instant range.
-- Should a privileged import bypass the trigger, a missing range for a known
-- owner blocks that owner rather than silently making the time available.
create or replace function studioflow_private.normalized_owner_conflict(
 p_owner uuid,p_starts timestamptz,p_ends timestamptz,p_exclude uuid default null
) returns boolean language plpgsql stable security definer set search_path='' as $$
declare conflict_exists boolean;
begin
 if p_owner is null or p_starts is null or p_ends is null or p_ends<=p_starts then return true; end if;
 select exists(
  select 1 from public.bookings b
  where b.owner_id=p_owner and b.id is distinct from p_exclude
   and studioflow_private.normalized_booking_active(b.booking_status,b.status)
   and (b.studioflow_guard_starts_at is null or b.studioflow_guard_ends_at is null
    or b.studioflow_guard_ends_at<=b.studioflow_guard_starts_at
    or (b.studioflow_guard_starts_at<p_ends and b.studioflow_guard_ends_at>p_starts))
 ) into conflict_exists;
 return conflict_exists;
end $$;

create or replace function studioflow_private.canonical_owner_conflict(
 p_owner uuid,p_starts timestamptz,p_ends timestamptz
) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if p_owner is null or p_starts is null or p_ends is null or p_ends<=p_starts then return true; end if;
 return exists(select 1 from public.studioflow_bookings b
  where b.owner_id=p_owner and b.status in ('pending','confirmed')
   and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now())
   and b.starts_at<p_ends and b.ends_at>p_starts);
end $$;

create or replace function studioflow_private.normalized_cross_ledger_slot_free(
 p_salon uuid,p_day date,p_start time,p_end time
) returns boolean language plpgsql stable security definer set search_path='' as $$
declare owner_id uuid; zone text; occupied tstzrange;
begin
 owner_id:=studioflow_private.normalized_salon_owner(p_salon);
 if owner_id is null then return false; end if;
 select timezone into zone from public.salons where id=p_salon;
 if not found then return false; end if;
 occupied:=studioflow_private.normalized_booking_window(p_day,p_day,p_start,p_end,zone);
 if occupied is null then return false; end if;
 return not studioflow_private.canonical_owner_conflict(owner_id,lower(occupied),upper(occupied))
    and not studioflow_private.normalized_owner_conflict(owner_id,lower(occupied),upper(occupied),null);
end $$;

create or replace function studioflow_private.guard_normalized_cross_ledger()
returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid; organization_id uuid; zone text; occupied tstzrange; current_window tstzrange;
begin
 if not studioflow_private.normalized_booking_active(new.booking_status,new.status) then
  -- Never accept caller-supplied snapshots. Preserve a prior instant only
  -- while the salon and wall-clock inputs remain unchanged, including across
  -- cancellation and reactivation after a timezone edit. An edit to those
  -- inputs invalidates it, so a future reactivation derives a new instant.
  if tg_op='UPDATE' and new.salon_id is not distinct from old.salon_id
     and coalesce(new.appointment_date,new.booking_date) is not distinct from coalesce(old.appointment_date,old.booking_date)
     and new.start_time is not distinct from old.start_time and new.end_time is not distinct from old.end_time then
   new.studioflow_guard_starts_at:=old.studioflow_guard_starts_at;
   new.studioflow_guard_ends_at:=old.studioflow_guard_ends_at;
  else
   new.studioflow_guard_starts_at:=null; new.studioflow_guard_ends_at:=null;
  end if;
  return new;
 end if;
 if current_setting('transaction_isolation')<>'read committed' then
  raise exception 'Normalized appointment writes require READ COMMITTED isolation for conflict checks' using errcode='25001';
 end if;
 if new.owner_id is null or new.salon_id is null or new.staff_id is null then
  raise exception 'Normalized appointment requires an owner, salon and specialist' using errcode='22023';
 end if;
 -- Lock the actual rows before inspecting their identity. The companion guards
 -- serialize owner-membership changes and prohibit moving a salon or specialist
 -- with active bookings, including a concurrent insert that has not committed.
 select s.organization_id,s.timezone into organization_id,zone
  from public.salons s where s.id=new.salon_id and s.deleted_at is null for share;
 if not found or organization_id is null then
  raise exception 'Normalized appointment requires an active mapped salon' using errcode='22023';
 end if;
 perform 1 from public.staff st where st.id=new.staff_id and st.salon_id=new.salon_id for share;
 if not found then raise exception 'Normalized specialist is not in the selected salon' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('studioflow-normalized-org:'||organization_id::text,0));
 owner_id:=studioflow_private.normalized_salon_owner(new.salon_id);
 if owner_id is null or owner_id<>new.owner_id then
  raise exception 'Normalized salon must have one matching active owner' using errcode='22023';
 end if;
 -- Even when retaining an earlier instant, do not accept active writes while
 -- the current salon timezone or wall-clock inputs are unrepresentable.
 current_window:=studioflow_private.normalized_booking_window(new.appointment_date,new.booking_date,new.start_time,new.end_time,zone);
 if current_window is null then
  raise exception 'Normalized appointment requires an unambiguous valid date, time range and timezone' using errcode='22023';
 end if;
 if tg_op='UPDATE' and new.salon_id is not distinct from old.salon_id
    and coalesce(new.appointment_date,new.booking_date) is not distinct from coalesce(old.appointment_date,old.booking_date)
    and new.start_time is not distinct from old.start_time and new.end_time is not distinct from old.end_time
    and (old.studioflow_guard_starts_at is null or old.studioflow_guard_ends_at is null
      or old.studioflow_guard_ends_at<=old.studioflow_guard_starts_at) then
  raise exception 'Unverified normalized appointment must be explicitly rescheduled before activation' using errcode='22023';
 end if;
 if tg_op='UPDATE' and new.salon_id is not distinct from old.salon_id
    and coalesce(new.appointment_date,new.booking_date) is not distinct from coalesce(old.appointment_date,old.booking_date)
    and new.start_time is not distinct from old.start_time and new.end_time is not distinct from old.end_time
    and old.studioflow_guard_starts_at is not null
    and old.studioflow_guard_ends_at>old.studioflow_guard_starts_at then
  occupied:=tstzrange(old.studioflow_guard_starts_at,old.studioflow_guard_ends_at,'[)');
 else
  occupied:=current_window;
 end if;
 -- Always overwrite caller-supplied snapshots; they are not an input API.
 new.studioflow_guard_starts_at:=lower(occupied);
 new.studioflow_guard_ends_at:=upper(occupied);
 -- Canonical writers take a SHARED lock on this same owner key after their
 -- existing per-specialist lock. Normalized writes take it EXCLUSIVELY, then
 -- re-read both ledgers under READ COMMITTED after any competitor commits.
 perform pg_advisory_xact_lock(hashtextextended('studioflow-cross-ledger:'||owner_id::text,0));
 if studioflow_private.canonical_owner_conflict(owner_id,lower(occupied),upper(occupied))
    or studioflow_private.normalized_owner_conflict(owner_id,lower(occupied),upper(occupied),new.id) then
  raise exception 'An appointment already occupies this owner time window' using errcode='23P01';
 end if;
 return new;
end $$;

-- A booking's owner cannot silently change when an organization is transferred
-- or gains a second owner. Serialize those changes with inserts, then require
-- active normalized appointments to be resolved before changing ownership.
create or replace function studioflow_private.guard_normalized_owner_membership()
returns trigger language plpgsql security definer set search_path='' as $$
declare old_org uuid; new_org uuid; org uuid;
begin
 if tg_op='UPDATE' and old.organization_id is not distinct from new.organization_id
    and old.user_id is not distinct from new.user_id and old.role is not distinct from new.role
    and old.status is not distinct from new.status then return new; end if;
 if tg_op in ('UPDATE','DELETE') and old.role='owner' and old.status='active' then old_org:=old.organization_id; end if;
 if tg_op in ('INSERT','UPDATE') and new.role='owner' and new.status='active' then new_org:=new.organization_id; end if;
 if old_org is null and new_org is null then
  if tg_op='DELETE' then return old; else return new; end if;
 end if;
 if current_setting('transaction_isolation')<>'read committed' then
  raise exception 'Normalized ownership changes require READ COMMITTED isolation' using errcode='25001';
 end if;
 for org in select distinct x from unnest(array[old_org,new_org]) x where x is not null order by x loop
  perform pg_advisory_xact_lock(hashtextextended('studioflow-normalized-org:'||org::text,0));
 end loop;
 if exists(select 1 from public.bookings b join public.salons s on s.id=b.salon_id
    where s.organization_id in (old_org,new_org) and studioflow_private.normalized_booking_active(b.booking_status,b.status)) then
  raise exception 'Resolve active normalized appointments before changing organization ownership' using errcode='55006';
 end if;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;

create or replace function studioflow_private.guard_normalized_salon_identity()
returns trigger language plpgsql security definer set search_path='' as $$
declare org uuid; new_org uuid;
begin
 if tg_op='UPDATE' then
  if new.id is not distinct from old.id and new.organization_id is not distinct from old.organization_id
     and not (old.deleted_at is null and new.deleted_at is not null) then return new; end if;
  new_org:=new.organization_id;
 end if;
 if current_setting('transaction_isolation')<>'read committed' then
  raise exception 'Normalized salon ownership changes require READ COMMITTED isolation' using errcode='25001';
 end if;
 for org in select distinct x from unnest(array[old.organization_id,new_org]) x where x is not null order by x loop
  perform pg_advisory_xact_lock(hashtextextended('studioflow-normalized-org:'||org::text,0));
 end loop;
 if exists(select 1 from public.bookings b where b.salon_id=old.id
    and studioflow_private.normalized_booking_active(b.booking_status,b.status)) then
  raise exception 'Resolve active normalized appointments before moving or deleting this salon' using errcode='55006';
 end if;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;

create or replace function studioflow_private.guard_normalized_staff_identity()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.id is not distinct from old.id and new.salon_id is not distinct from old.salon_id then return new; end if;
 if current_setting('transaction_isolation')<>'read committed' then
  raise exception 'Normalized specialist moves require READ COMMITTED isolation' using errcode='25001';
 end if;
 if exists(select 1 from public.bookings b where b.staff_id=old.id
    and studioflow_private.normalized_booking_active(b.booking_status,b.status)) then
  raise exception 'Resolve active normalized appointments before moving or deleting this specialist' using errcode='55006';
 end if;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;

revoke all on function studioflow_private.normalized_booking_active(text,text),
 studioflow_private.normalized_salon_owner(uuid),
 studioflow_private.normalized_booking_window(date,date,time,time,text),
 studioflow_private.normalized_owner_conflict(uuid,timestamptz,timestamptz,uuid),
 studioflow_private.canonical_owner_conflict(uuid,timestamptz,timestamptz),
 studioflow_private.normalized_cross_ledger_slot_free(uuid,date,time,time),
 studioflow_private.guard_normalized_cross_ledger(),
 studioflow_private.guard_normalized_owner_membership(),
 studioflow_private.guard_normalized_salon_identity(),
 studioflow_private.guard_normalized_staff_identity() from public,anon,authenticated,service_role;

-- The normalized catalogue is optional on backend-only installs. Do not
-- silently skip a partially installed normalized schema or an existing RPC.
do $install$
declare missing text; original text; patched text; anchor text; installed_guard boolean;
begin
 if to_regprocedure('public.nexora_customer_booking_options(uuid,uuid[],date,uuid)') is null
   and not exists(select 1 from information_schema.columns where table_schema='public' and table_name='bookings'
      and column_name in ('salon_id','staff_id','appointment_date','start_time','end_time','booking_status')) then
  raise notice 'Normalized booking schema is absent; cross-ledger guard not installed.';
  return;
 end if;
 select string_agg(required.t||'.'||required.c,', ' order by required.t,required.c) into missing
 from (values ('bookings','id','uuid'),('bookings','owner_id','uuid'),('bookings','salon_id','uuid'),('bookings','staff_id','uuid'),
   ('bookings','appointment_date','date'),('bookings','booking_date','date'),('bookings','start_time','time'),('bookings','end_time','time'),
   ('bookings','status','text'),('bookings','booking_status','text'),('salons','id','uuid'),('salons','organization_id','uuid'),
   ('salons','timezone','text'),('salons','deleted_at','timestamptz'),('staff','id','uuid'),('staff','salon_id','uuid'),
   ('organization_members','organization_id','uuid'),('organization_members','user_id','uuid'),('organization_members','role','text'),('organization_members','status','text'),
   ('studioflow_bookings','owner_id','uuid'),('studioflow_bookings','stylist_id','text'),('studioflow_bookings','starts_at','timestamptz'),
   ('studioflow_bookings','ends_at','timestamptz'),('studioflow_bookings','status','text'),('studioflow_bookings','hold_expires_at','timestamptz')) required(t,c,typ)
 where not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=required.t and c.column_name=required.c and c.udt_name=required.typ);
 if missing is not null then raise exception 'Cross-ledger booking prerequisites missing or changed: %',missing; end if;
 if to_regprocedure('studioflow_private.guard_booking_conflict()') is null
    or to_regprocedure('studioflow_private.booking_slots(text,jsonb,date,text,uuid)') is null then
  raise exception 'Apply the booking availability repair before the cross-ledger guard';
 end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='bookings'
     and column_name in ('studioflow_guard_starts_at','studioflow_guard_ends_at'))
    and not exists(select 1 from pg_catalog.pg_trigger t where t.tgrelid='public.bookings'::regclass
      and t.tgname='zz_studioflow_normalized_cross_ledger_guard' and not t.tgisinternal
      and t.tgfoid='studioflow_private.guard_normalized_cross_ledger()'::regprocedure) then
  raise exception 'Unexpected pre-existing cross-ledger snapshot columns require review';
 end if;
 execute 'alter table public.bookings add column if not exists studioflow_guard_starts_at timestamptz, add column if not exists studioflow_guard_ends_at timestamptz';
 if (select count(*) from information_schema.columns where table_schema='public' and table_name='bookings'
     and column_name in ('studioflow_guard_starts_at','studioflow_guard_ends_at') and udt_name='timestamptz')<>2 then
  raise exception 'Cross-ledger booking snapshot columns have unexpected types';
 end if;
 -- The ALTER already locks bookings. Lock the other writers while validating
 -- and installing triggers; the runbook requires a traffic/owner-edit freeze.
 execute 'lock table public.studioflow_bookings, public.organization_members, public.salons, public.staff in share row exclusive mode';
 if exists(select 1 from pg_catalog.pg_trigger t where not t.tgisinternal and (
    (t.tgrelid='public.bookings'::regclass and t.tgname='zz_studioflow_normalized_cross_ledger_guard' and t.tgfoid<>'studioflow_private.guard_normalized_cross_ledger()'::regprocedure)
    or (t.tgrelid='public.organization_members'::regclass and t.tgname='studioflow_normalized_owner_membership_guard' and t.tgfoid<>'studioflow_private.guard_normalized_owner_membership()'::regprocedure)
    or (t.tgrelid='public.salons'::regclass and t.tgname='studioflow_normalized_salon_identity_guard' and t.tgfoid<>'studioflow_private.guard_normalized_salon_identity()'::regprocedure)
    or (t.tgrelid='public.staff'::regclass and t.tgname='studioflow_normalized_staff_identity_guard' and t.tgfoid<>'studioflow_private.guard_normalized_staff_identity()'::regprocedure))) then
  raise exception 'Cross-ledger trigger name is already used by an unexpected function';
 end if;
 select exists(select 1 from pg_catalog.pg_trigger t where t.tgrelid='public.bookings'::regclass
   and t.tgname='zz_studioflow_normalized_cross_ledger_guard' and not t.tgisinternal and t.tgenabled in ('O','A')
   and t.tgfoid='studioflow_private.guard_normalized_cross_ledger()'::regprocedure) into installed_guard;
 if not installed_guard and exists(select 1 from public.bookings b
    where studioflow_private.normalized_booking_active(b.booking_status,b.status)) then
  raise exception 'Existing active normalized appointments require owner review and a separately reviewed forward migration before installing the cross-ledger guard';
 end if;
 -- Never manufacture instants or identities for historical appointments.
 -- Replays are permitted only if rows already passed the installed guard.
 if exists(select 1 from public.bookings b where studioflow_private.normalized_booking_active(b.booking_status,b.status)
    and (b.owner_id is null or b.salon_id is null or b.staff_id is null
      or (b.appointment_date is null and b.booking_date is null)
      or (b.appointment_date is not null and b.booking_date is not null and b.appointment_date<>b.booking_date)
      or b.start_time is null or b.end_time is null or b.end_time<=b.start_time
      or b.studioflow_guard_starts_at is null or b.studioflow_guard_ends_at is null
      or b.studioflow_guard_ends_at<=b.studioflow_guard_starts_at
      or studioflow_private.normalized_salon_owner(b.salon_id) is distinct from b.owner_id
      or not exists(select 1 from public.staff st where st.id=b.staff_id and st.salon_id=b.salon_id))) then
  raise exception 'Active normalized appointments have unreviewed identity, time or snapshot data';
 end if;
 if exists(select 1 from public.studioflow_bookings b where b.status is null or b.status not in ('pending','confirmed','completed','cancelled')
    or (b.status in ('pending','confirmed') and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now())
      and (b.owner_id is null or nullif(b.stylist_id,'') is null or b.starts_at is null or b.ends_at is null or b.ends_at<=b.starts_at))) then
  raise exception 'Active StudioFlow appointments have unreviewed identity, status or time data';
 end if;
 if exists(select 1 from public.bookings b where studioflow_private.normalized_booking_active(b.booking_status,b.status)
    and studioflow_private.canonical_owner_conflict(b.owner_id,b.studioflow_guard_starts_at,b.studioflow_guard_ends_at))
    or exists(select 1 from public.bookings a join public.bookings b on a.id<b.id and a.owner_id=b.owner_id
      and a.studioflow_guard_starts_at<b.studioflow_guard_ends_at and a.studioflow_guard_ends_at>b.studioflow_guard_starts_at
      where studioflow_private.normalized_booking_active(a.booking_status,a.status)
       and studioflow_private.normalized_booking_active(b.booking_status,b.status)) then
  raise exception 'Resolve existing cross-ledger or normalized appointment conflicts before installing the guard';
 end if;
 execute 'create index if not exists bookings_studioflow_cross_guard_owner_idx on public.bookings(owner_id,studioflow_guard_starts_at,studioflow_guard_ends_at)';

 -- Do not overwrite a later, unrelated canonical guard if this migration is
 -- replayed against drifted definitions. The earlier repair or our own patched
 -- version must supply both the specialist lock and overlap check.
 select pg_get_functiondef('studioflow_private.guard_booking_conflict()'::regprocedure) into original;
 if position('pg_advisory_xact_lock(hashtextextended(new.owner_id::text||new.stylist_id,0))' in original)=0
    or position('b.starts_at<new.ends_at and b.ends_at>new.starts_at' in original)=0 then
  raise exception 'Unexpected canonical conflict guard: review cross-ledger repair';
 end if;
 execute $definition$
  create or replace function studioflow_private.guard_booking_conflict()
  returns trigger language plpgsql security definer set search_path='' as $function$
  begin
   if new.status not in ('pending','confirmed')
    or (new.status='pending' and new.hold_expires_at is not null and new.hold_expires_at<=now()) then return new; end if;
   if current_setting('transaction_isolation')<>'read committed' then
    raise exception 'Appointment writes require READ COMMITTED isolation for conflict checks' using errcode='25001';
   end if;
   if new.owner_id is null or nullif(new.stylist_id,'') is null or new.starts_at is null
      or new.ends_at is null or new.ends_at<=new.starts_at then
    raise exception 'Appointment requires a specialist and valid time range' using errcode='22023';
   end if;
   perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text||new.stylist_id,0));
   perform pg_advisory_xact_lock_shared(hashtextextended('studioflow-cross-ledger:'||new.owner_id::text,0));
   if exists(select 1 from public.studioflow_bookings b
     where b.id is distinct from new.id and b.owner_id=new.owner_id and b.stylist_id=new.stylist_id
      and b.status in ('pending','confirmed')
      and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now())
      and b.starts_at<new.ends_at and b.ends_at>new.starts_at)
     or studioflow_private.normalized_owner_conflict(new.owner_id,new.starts_at,new.ends_at,null) then
    raise exception 'This specialist already has a booking at that time' using errcode='23P01';
   end if;
   return new;
  end $function$
 $definition$;
 execute 'revoke all on function studioflow_private.guard_booking_conflict() from public,anon,authenticated,service_role';
 execute 'drop trigger if exists zz_studioflow_normalized_cross_ledger_guard on public.bookings';
 execute 'create trigger zz_studioflow_normalized_cross_ledger_guard before insert or update on public.bookings for each row execute function studioflow_private.guard_normalized_cross_ledger()';
 execute 'drop trigger if exists studioflow_normalized_owner_membership_guard on public.organization_members';
 execute 'create trigger studioflow_normalized_owner_membership_guard before insert or update or delete on public.organization_members for each row execute function studioflow_private.guard_normalized_owner_membership()';
 execute 'drop trigger if exists studioflow_normalized_salon_identity_guard on public.salons';
 execute 'create trigger studioflow_normalized_salon_identity_guard before update or delete on public.salons for each row execute function studioflow_private.guard_normalized_salon_identity()';
 execute 'drop trigger if exists studioflow_normalized_staff_identity_guard on public.staff';
 execute 'create trigger studioflow_normalized_staff_identity_guard before update or delete on public.staff for each row execute function studioflow_private.guard_normalized_staff_identity()';

 -- The deployed settlement function takes the specialist lock and returns
 -- refund_required when a captured payment loses its hold. It must also take
 -- the shared owner lock *before* deciding, or a normalized writer can win
 -- after expiry and the later booking trigger would roll back the refund mark.
 -- Use wall-clock expiry after waits: now() is fixed at transaction start.
 if to_regprocedure('studioflow_private.settle_payment(text,text,bigint)') is not null then
  select pg_get_functiondef('studioflow_private.settle_payment(text,text,bigint)'::regprocedure) into original;
  if position('normalized_owner_conflict(b.owner_id,b.starts_at,b.ends_at,null)' in original)=0 then
   anchor:=' perform pg_advisory_xact_lock(hashtextextended(b.owner_id::text||b.stylist_id,0));';
   if position(anchor in original)=0 or position(anchor in substring(original from position(anchor in original)+length(anchor)))>0 then
    raise exception 'Unexpected payment settlement lock definition: review cross-ledger repair';
   end if;
   patched:=replace(original,anchor,anchor||E'\n'||
    ' if current_setting(''transaction_isolation'')<>''read committed'' then raise exception ''Payment settlement requires READ COMMITTED isolation'' using errcode=''25001''; end if;'||E'\n'||
    ' perform pg_advisory_xact_lock_shared(hashtextextended(''studioflow-cross-ledger:''||b.owner_id::text,0));');
   anchor:='or b.hold_expires_at<=now() or exists(select 1 from public.studioflow_bookings other';
   if position(anchor in patched)=0 or position(anchor in substring(patched from position(anchor in patched)+length(anchor)))>0 then
    raise exception 'Unexpected payment settlement conflict definition: review cross-ledger repair';
   end if;
   patched:=replace(patched,anchor,
    'or b.hold_expires_at<=clock_timestamp() or studioflow_private.normalized_owner_conflict(b.owner_id,b.starts_at,b.ends_at,null) or exists(select 1 from public.studioflow_bookings other');
   execute patched;
  elsif position('pg_advisory_xact_lock_shared(hashtextextended(''studioflow-cross-ledger:''||b.owner_id::text,0))' in original)=0
     or position('b.hold_expires_at<=clock_timestamp()' in original)=0
     or position('Payment settlement requires READ COMMITTED isolation' in original)=0 then
   raise exception 'Unexpected partially patched payment settlement: review cross-ledger repair';
  end if;
 elsif to_regprocedure('public.studioflow_settle_payment(text,text,bigint)') is not null then
  raise exception 'Payment settlement wrapper exists without its reviewed private implementation';
 end if;

 -- Align read-only slots with the write guard. Preserve the remaining reviewed
 -- function bodies and existing ACLs; fail the transaction if anchors drift.
 select pg_get_functiondef('studioflow_private.booking_slots(text,jsonb,date,text,uuid)'::regprocedure) into original;
 if position('normalized_owner_conflict' in original)=0 then
  anchor:='   rows:=rows||jsonb_build_array(jsonb_build_object(''time'',to_char(candidate,''HH24:MI'')';
  if position(anchor in original)=0 or position(anchor in substring(original from position(anchor in original)+length(anchor)))>0 then
   raise exception 'Unexpected booking_slots definition: review cross-ledger availability repair';
  end if;
  patched:=replace(original,anchor,
   '   if is_available then is_available:=not studioflow_private.normalized_owner_conflict(w.owner_id,(candidate at time zone ''Asia/Kolkata''),(ending at time zone ''Asia/Kolkata''),null); end if;'||E'\n'||anchor);
  execute patched;
 end if;
 if to_regprocedure('public.nexora_customer_booking_options(uuid,uuid[],date,uuid)') is not null then
  select pg_get_functiondef('public.nexora_customer_booking_options(uuid,uuid[],date,uuid)'::regprocedure) into original;
  if position('normalized_cross_ledger_slot_free' in original)=0 then
   anchor:='      then free:=true; exit; end if;';
   if position(anchor in original)=0 or position(anchor in substring(original from position(anchor in original)+length(anchor)))>0 then
    raise exception 'Unexpected normalized options definition: review cross-ledger availability repair';
   end if;
   patched:=replace(original,anchor,
    '       and studioflow_private.normalized_cross_ledger_slot_free(p_salon_id,p_date,candidate::time,(candidate+make_interval(mins=>duration))::time)'||E'\n'||anchor);
   execute patched;
  end if;
  select pg_get_functiondef('public.nexora_customer_booking_options(uuid,uuid[],date,uuid)'::regprocedure) into original;
  if position('normalized_booking_window(p_date,p_date' in original)=0 then
   anchor:='    service_ids:=studioflow_private.normalized_booking_service_ids(p_salon_id,p_service_ids);';
   if position(anchor in original)=0 or position(anchor in substring(original from position(anchor in original)+length(anchor)))>0 then
    raise exception 'Unexpected normalized timezone definition: review cross-ledger availability repair';
   end if;
   -- Validate before the earlier RPC uses AT TIME ZONE, so an invalid/blank
   -- zone or DST-transition day returns no slots instead of an error/guess.
   patched:=replace(original,anchor,
    '    if studioflow_private.normalized_booking_window(p_date,p_date,''09:00''::time,''10:00''::time,salon.timezone) is null then return jsonb_build_object(''available_slots'',''[]''::jsonb,''available_staff'',''[]''::jsonb); end if;'||E'\n'||anchor);
   patched:=replace(patched,'coalesce(nullif(salon.timezone,'''')','coalesce(nullif(btrim(salon.timezone),'''')');
   execute patched;
  end if;
 end if;
end $install$;

notify pgrst,'reload schema';
commit;

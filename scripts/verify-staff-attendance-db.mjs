import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migration = await readFile(
  'supabase/migrations/20261119150000_staff_attendance_biometric.sql',
  'utf8',
);

const db = new PGlite();
const ownerA = '10000000-0000-4000-8000-000000000001';
const ownerB = '20000000-0000-4000-8000-000000000002';
const deviceKey = 'staff-attendance-device-test-secret-that-is-long-enough';
const deviceKeyHash = createHash('sha256').update(deviceKey).digest('hex');

const one = async (sql, params = []) => {
  const result = await db.query(sql, params);
  return result.rows[0] || null;
};
const setOwner = async (ownerId) => {
  await one("select set_config('request.jwt.claim.sub', $1, false)", [ownerId]);
};
const useRole = async (role) => {
  await db.exec('RESET ROLE');
  await db.exec('SET ROLE ' + role);
};
const expectSqlError = async (fn, message) => {
  let caught = false;
  try { await fn(); } catch { caught = true; }
  assert.equal(caught, true, message || 'Expected SQL operation to fail');
};

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table public.studioflow_accounts (
      user_id uuid primary key references auth.users(id)
    );
    grant usage on schema auth, public to authenticated, service_role;
    grant execute on function auth.uid() to authenticated, service_role;
    grant select on public.studioflow_accounts to authenticated;
  `);

  await db.exec(migration);

  await db.query('insert into auth.users(id) values ($1),($2)', [ownerA, ownerB]);
  await db.query('insert into public.studioflow_accounts(user_id) values ($1),($2)', [ownerA, ownerB]);

  // Owner A creates the attendance roster using the same authenticated path as the UI.
  await setOwner(ownerA);
  await useRole('authenticated');
  await one(
    'select public.salon_staff_attendance_sync_roster($1::jsonb)',
    [JSON.stringify([
      { id: 'staff-day', name: 'Day Shift Staff', role: 'Stylist' },
      { id: 'staff-night', name: 'Night Shift Staff', role: 'Barber' },
      { id: 'staff-half', name: 'Half Day Staff', role: 'Assistant' },
      { id: 'staff-leave', name: 'Leave Staff', role: 'Stylist' },
      { id: 'staff-overlap', name: 'Overlap Leave Staff', role: 'Stylist' },
      { id: 'staff-device', name: 'Device Staff', role: 'Stylist' },
    ])],
  );

  // A second salon receives its own roster. Owner A must not see it.
  await setOwner(ownerB);
  await one(
    'select public.salon_staff_attendance_sync_roster($1::jsonb)',
    [JSON.stringify([{ id: 'other-owner-staff', name: 'Other Owner Staff', role: 'Stylist' }])],
  );
  await setOwner(ownerA);
  const visibleProfiles = await one(
    'select count(*)::int as count from public.salon_staff_attendance_profiles',
  );
  assert.equal(visibleProfiles.count, 6, 'RLS must hide another salon owner\'s staff.');
  const profileDelete = await one("select has_table_privilege('authenticated', 'public.salon_staff_attendance_profiles', 'delete') as allowed");
  assert.equal(profileDelete.allowed, false, 'Browser roles must not physically delete staff profiles and cascade attendance history.');

  // Validate the owner-only table model: browser roles cannot read biometric secrets.
  const sensitiveAccess = await one(
    "select has_table_privilege('authenticated', 'public.salon_staff_attendance_biometrics', 'select') as allowed",
  );
  assert.equal(sensitiveAccess.allowed, false, 'Biometric keys must not be readable by authenticated clients.');

  const localToday = (await one("select (now() at time zone 'Asia/Kolkata')::date::text as day")).day;
  const dateOffset = (days) => {
    const [year, month, day] = localToday.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
  };
  const testDate = dateOffset(-1);
  const overnightDate = dateOffset(-2);
  const todayDate = localToday;
  const dow = async (date) => Number((await one('select extract(dow from $1::date)::int as day', [date])).day);

  await db.query(
    `insert into public.salon_staff_attendance_settings(
      owner_id,timezone,grace_minutes,overtime_after_minutes,
      default_shift_start,default_shift_end,default_break_minutes
    ) values ($1,'Asia/Kolkata',10,0,'09:00','18:00',60)`,
    [ownerA],
  );

  // A normal shift: 15 minutes late, 60-minute break and 15 minutes overtime.
  await db.query(
    `insert into public.salon_staff_attendance_shifts(
      owner_id,staff_key,weekday,shift_start,shift_end,break_minutes
    ) values ($1,'staff-day',$2,'09:00','18:00',60)`,
    [ownerA, await dow(testDate)],
  );
  await useRole('service_role');
  await one(
    `select public.salon_staff_attendance_service_punch(
      $1::uuid,'staff-day','check_in','manual','',null,null,null,null,null,$2::timestamptz
    ) as result`,
    [ownerA, testDate + ' 09:15:00+05:30'],
  );
  await one(
    `select public.salon_staff_attendance_service_punch(
      $1::uuid,'staff-day','break_start','manual','',null,null,null,null,null,$2::timestamptz
    ) as result`,
    [ownerA, testDate + ' 10:15:00+05:30'],
  );
  await one(
    `select public.salon_staff_attendance_service_punch(
      $1::uuid,'staff-day','break_end','manual','',null,null,null,null,null,$2::timestamptz
    ) as result`,
    [ownerA, testDate + ' 11:15:00+05:30'],
  );
  await one(
    `select public.salon_staff_attendance_service_punch(
      $1::uuid,'staff-day','check_out','manual','',null,null,null,null,null,$2::timestamptz
    ) as result`,
    [ownerA, testDate + ' 18:30:00+05:30'],
  );
  const dayRecord = await one(
    `select status,late_minutes,break_minutes,worked_minutes,overtime_minutes
     from public.salon_staff_attendance_records
     where owner_id=$1 and staff_key='staff-day' and attendance_date=$2::date`,
    [ownerA, testDate],
  );
  assert.deepEqual(dayRecord, {
    status: 'late',
    late_minutes: 15,
    break_minutes: 60,
    worked_minutes: 495,
    overtime_minutes: 15,
  }, 'Late, break, worked time and overtime calculation must match the shift.');

  await expectSqlError(
    () => one(
      `select public.salon_staff_attendance_service_punch(
        $1::uuid,'staff-day','check_in','manual','',null,null,null,null,null,$2::timestamptz
      )`,
      [ownerA, testDate + ' 09:16:00+05:30'],
    ),
    'A duplicate check-in must be rejected.',
  );

  // A half-day is calculated when completed work is below half the expected shift.
  await db.query(
    `insert into public.salon_staff_attendance_shifts(
      owner_id,staff_key,weekday,shift_start,shift_end,break_minutes
    ) values ($1,'staff-half',$2,'10:00','18:00',60)`,
    [ownerA, await dow(testDate)],
  );
  await one(
    `select public.salon_staff_attendance_service_punch(
      $1::uuid,'staff-half','check_in','manual','',null,null,null,null,null,$2::timestamptz
    )`,
    [ownerA, testDate + ' 10:00:00+05:30'],
  );
  await one(
    `select public.salon_staff_attendance_service_punch(
      $1::uuid,'staff-half','check_out','manual','',null,null,null,null,null,$2::timestamptz
    )`,
    [ownerA, testDate + ' 12:00:00+05:30'],
  );
  const halfDay = await one(
    `select status,worked_minutes from public.salon_staff_attendance_records
     where owner_id=$1 and staff_key='staff-half' and attendance_date=$2::date`,
    [ownerA, testDate],
  );
  assert.equal(halfDay.status, 'half_day');
  assert.equal(halfDay.worked_minutes, 120);

  // Overnight shift: check-in on the prior date, break and checkout after midnight.
  await db.query(
    `insert into public.salon_staff_attendance_shifts(
      owner_id,staff_key,weekday,shift_start,shift_end,break_minutes
    ) values ($1,'staff-night',$2,'22:00','06:00',30)`,
    [ownerA, await dow(overnightDate)],
  );
  await one(
    `select public.salon_staff_attendance_service_punch(
      $1::uuid,'staff-night','check_in','manual','',null,null,null,null,null,$2::timestamptz
    )`,
    [ownerA, overnightDate + ' 22:00:00+05:30'],
  );
  await one(
    `select public.salon_staff_attendance_service_punch(
      $1::uuid,'staff-night','break_start','manual','',null,null,null,null,null,$2::timestamptz
    )`,
    [ownerA, overnightDate + ' 23:00:00+05:30'],
  );
  await one(
    `select public.salon_staff_attendance_service_punch(
      $1::uuid,'staff-night','break_end','manual','',null,null,null,null,null,$2::timestamptz
    )`,
    [ownerA, dateOffset(-1) + ' 00:30:00+05:30'],
  );
  await one(
    `select public.salon_staff_attendance_service_punch(
      $1::uuid,'staff-night','check_out','manual','',null,null,null,null,null,$2::timestamptz
    )`,
    [ownerA, dateOffset(-1) + ' 06:30:00+05:30'],
  );
  const overnight = await one(
    `select attendance_date::text as attendance_date,status,break_minutes,worked_minutes,overtime_minutes
     from public.salon_staff_attendance_records
     where owner_id=$1 and staff_key='staff-night'`,
    [ownerA],
  );
  assert.equal(overnight.attendance_date, overnightDate);
  assert.equal(overnight.status, 'present');
  assert.equal(overnight.break_minutes, 30);
  assert.equal(overnight.worked_minutes, 480);
  assert.equal(overnight.overtime_minutes, 30);

  // A leave approval skips weekly-off days and creates an audit event for the working day.
  await db.query(
    `insert into public.salon_staff_attendance_shifts(
      owner_id,staff_key,weekday,shift_start,shift_end,break_minutes,is_weekly_off
    ) values ($1,'staff-leave',$2,'10:00','18:00',60,true)`,
    [ownerA, await dow(todayDate)],
  );
  await useRole('authenticated');
  const leave = await one(
    `insert into public.salon_staff_leave_requests(
      owner_id,staff_key,start_date,end_date,leave_type,reason,status,reviewed_at,reviewed_by
    ) values ($1,'staff-leave',$2::date,$3::date,'casual','Test leave','approved',now(),$1)
    returning id`,
    [ownerA, todayDate, dateOffset(1)],
  );
  const leaveRows = await one(
    `select
       count(*) filter (where attendance_date=$2::date and status='on_leave')::int as weekly_off_leave,
       count(*) filter (where attendance_date=$3::date and status='on_leave')::int as working_day_leave
     from public.salon_staff_attendance_records
     where owner_id=$1 and staff_key='staff-leave'`,
    [ownerA, todayDate, dateOffset(1)],
  );
  assert.equal(leaveRows.weekly_off_leave, 0);
  assert.equal(leaveRows.working_day_leave, 1);
  const leaveAudit = await one(
    `select count(*)::int as count from public.salon_staff_attendance_events
     where owner_id=$1 and staff_key='staff-leave' and event_type='leave_reviewed'`,
    [ownerA],
  );
  assert.equal(leaveAudit.count, 1);

  // Overlapping approved leaves keep the on-leave record until the last approval is withdrawn.
  const overlapA = await one(
    `insert into public.salon_staff_leave_requests(
      owner_id,staff_key,start_date,end_date,leave_type,status,reviewed_at,reviewed_by
    ) values ($1,'staff-overlap',$2::date,$2::date,'casual','approved',now(),$1) returning id`,
    [ownerA, dateOffset(1)],
  );
  const overlapB = await one(
    `insert into public.salon_staff_leave_requests(
      owner_id,staff_key,start_date,end_date,leave_type,status,reviewed_at,reviewed_by
    ) values ($1,'staff-overlap',$2::date,$2::date,'sick','approved',now(),$1) returning id`,
    [ownerA, dateOffset(1)],
  );
  await db.query(
    "update public.salon_staff_leave_requests set status='rejected',reviewed_at=now(),reviewed_by=$1 where id=$2",
    [ownerA, overlapA.id],
  );
  let overlapStatus = await one(
    "select status from public.salon_staff_attendance_records where owner_id=$1 and staff_key='staff-overlap' and attendance_date=$2::date",
    [ownerA, dateOffset(1)],
  );
  assert.equal(overlapStatus.status, 'on_leave');
  await db.query(
    "update public.salon_staff_leave_requests set status='rejected',reviewed_at=now(),reviewed_by=$1 where id=$2",
    [ownerA, overlapB.id],
  );
  overlapStatus = await one(
    "select status from public.salon_staff_attendance_records where owner_id=$1 and staff_key='staff-overlap' and attendance_date=$2::date",
    [ownerA, dateOffset(1)],
  );
  assert.equal(overlapStatus.status, 'absent');

  // Owner can mark historical status through the service-only status RPC.
  await useRole('service_role');
  await one(
    `select public.salon_staff_attendance_service_mark_status(
      $1::uuid,'staff-device',$2::date,'absent','manual absence'
    )`,
    [ownerA, dateOffset(-3)],
  );

  const device = await one(
    `insert into public.salon_staff_attendance_devices(
      owner_id,device_name,vendor,model,protocol,api_key_hash
    ) values ($1,'Test reader','Generic','Test model','http_push',$2)
    returning id`,
    [ownerA, deviceKeyHash],
  );
  const eventAt = dateOffset(-1) + ' 12:00:00+05:30';
  const digest = 'a'.repeat(64);
  const deviceResult = await one(
    `select public.salon_staff_attendance_service_device_punch(
      $1::uuid,$2::uuid,'staff-device','provider-event-1','check_in',
      $3::timestamptz,'device test',$4
    ) as result`,
    [ownerA, device.id, eventAt, digest],
  );
  assert.equal(deviceResult.result.accepted, true);
  assert.equal(deviceResult.result.duplicate, false);
  const duplicate = await one(
    `select public.salon_staff_attendance_service_device_punch(
      $1::uuid,$2::uuid,'staff-device','provider-event-1','check_in',
      $3::timestamptz,'device test',$4
    ) as result`,
    [ownerA, device.id, eventAt, digest],
  );
  assert.equal(duplicate.result.duplicate, true);
  await expectSqlError(
    () => one(
      `select public.salon_staff_attendance_service_device_punch(
        $1::uuid,$2::uuid,'staff-device','provider-event-1','check_in',
        $3::timestamptz,'device test',$4
      )`,
      [ownerA, device.id, eventAt, 'b'.repeat(64)],
    ),
    'The same device event ID with changed data must be rejected.',
  );

  const deviceEventCount = await one(
    "select count(*)::int as count from public.salon_staff_attendance_device_events where device_id=$1",
    [device.id],
  );
  assert.equal(deviceEventCount.count, 1);

  // Empty roster sync deactivates profiles but never deletes attendance history.
  await useRole('authenticated');
  await setOwner(ownerA);
  await one('select public.salon_staff_attendance_sync_roster($1::jsonb)', ['[]']);
  const activeProfiles = await one(
    "select count(*)::int as count from public.salon_staff_attendance_profiles where active=true",
  );
  const retainedHistory = await one(
    "select count(*)::int as count from public.salon_staff_attendance_records",
  );
  assert.equal(activeProfiles.count, 0);
  assert.ok(retainedHistory.count >= 5, 'Deactivating the roster must preserve attendance history.');

  await db.close();
  console.log('PASS staff attendance PostgreSQL migration + RLS + manual punches + overnight shifts + leave + device idempotency.');
} catch (error) {
  await db.close();
  console.error('FAIL staff attendance PostgreSQL verification:', error);
  process.exitCode = 1;
}

-- NEXORA Staff CRM authorization hardening.
--
-- Additive function-only migration. It deliberately does NOT alter tables,
-- grants on booking/Android APIs, existing RLS policies, booking rows, or the
-- already-applied domain/storefront migrations.
--
-- Scope rules:
--   * Salon owner: retain existing full CRM behaviour.
--   * Receptionist: read customer contacts only when ALL bookings for that
--     customer in this salon have a non-null branch_id assigned to the staff
--     member. No notes, tasks, activities, or CRM writes.
--   * Manager: read and manage CRM data for those same branch-contained
--     customers only.
--   * Service Provider / missing role / inactive or empty membership: deny.
--
-- Existing manual CRM contacts in crm_contacts have no branch relationship.
-- They remain owner-only until the product stores an explicit branch mapping.
-- Likewise, the existing manual-contact create/update RPC signatures have no
-- branch argument; staff cannot use them without inventing a branch mapping.
--
-- Customer branch containment is intentionally strict. If a customer has
-- even one booking with branch_id IS NULL or in a branch outside the actor's
-- scope, staff cannot see that customer's CRM record or timeline. Owner access
-- is unchanged.

begin;

/* ------------------------------------------------------------------------- */
/* 1. Private authorization helpers                                          */
/* ------------------------------------------------------------------------- */

create or replace function studioflow_android_private.crm_effective_owner(
  p_permission text
)
returns uuid
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  actor uuid := (select auth.uid());
  target_owner uuid;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  -- Owner identity always wins for the owner's own workspace.
  if exists (
    select 1
    from public.studioflow_accounts a
    where a.user_id = actor
  ) then
    return actor;
  end if;

  if p_permission not in ('view_client_contacts', 'manage_crm') then
    raise exception 'CRM permission is not valid' using errcode = '42501';
  end if;

  -- CRM RPCs have no owner_id argument. Resolve the same active membership
  -- used by the staff workspace and never trust an owner id from the client.
  select m.owner_id
    into target_owner
  from public.studioflow_staff_members m
  where m.user_id = actor
    and m.is_active is true
  order by m.created_at asc
  limit 1;

  if target_owner is null
     or not public.studioflow_current_staff_can(target_owner, 'view_client_contacts') then
    raise exception 'CRM customer access denied' using errcode = '42501';
  end if;

  if p_permission = 'manage_crm'
     and not public.studioflow_current_staff_can(target_owner, 'manage_crm') then
    raise exception 'CRM management permission required' using errcode = '42501';
  end if;

  return target_owner;
end;
$function$;

create or replace function studioflow_android_private.crm_customer_in_branch_scope(
  p_owner uuid,
  p_customer uuid
)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select case
    when p_owner is null or p_customer is null then false
    when p_owner = (select auth.uid())
      and exists (
        select 1 from public.studioflow_accounts a where a.user_id = p_owner
      ) then true
    when not public.studioflow_current_staff_can(p_owner, 'view_client_contacts') then false
    else
      -- At least one booking must be in an assigned, active branch.
      exists (
        select 1
        from public.studioflow_bookings b
        where b.owner_id = p_owner
          and b.customer_id = p_customer
          and b.branch_id is not null
          and public.studioflow_is_assigned_branch(p_owner, b.branch_id::text)
      )
      -- A CRM customer is indivisible in the current data model. Do not show
      -- it to a staff member if any same-salon booking is branchless or outside
      -- their assignment; CRM tasks/activities have no branch_id of their own.
      and not exists (
        select 1
        from public.studioflow_bookings b
        where b.owner_id = p_owner
          and b.customer_id = p_customer
          and (
            b.branch_id is null
            or not public.studioflow_is_assigned_branch(p_owner, b.branch_id::text)
          )
      )
  end;
$function$;

revoke all on function studioflow_android_private.crm_effective_owner(text)
  from public, anon, authenticated;
revoke all on function studioflow_android_private.crm_customer_in_branch_scope(uuid, uuid)
  from public, anon, authenticated;
grant execute on function studioflow_android_private.crm_effective_owner(text)
  to postgres, service_role;
grant execute on function studioflow_android_private.crm_customer_in_branch_scope(uuid, uuid)
  to postgres, service_role;

/* ------------------------------------------------------------------------- */
/* 2. Owner contacts: owner full data; staff branch-contained customer data   */
/* ------------------------------------------------------------------------- */

create or replace function studioflow_android_private.owner_contacts()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  actor uuid := (select auth.uid());
  target_owner uuid;
  owner_access boolean := false;
  manager_access boolean := false;
  result jsonb;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  owner_access := exists (
    select 1 from public.studioflow_accounts a where a.user_id = actor
  );

  if owner_access then
    target_owner := actor;
    manager_access := true;
  else
    target_owner := studioflow_android_private.crm_effective_owner('view_client_contacts');
    manager_access := public.studioflow_current_staff_can(target_owner, 'manage_crm');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ids.customer_id,
        'name', coalesce(nullif(p.full_name, ''), last_b.payload->>'clientName', 'Customer'),
        'whatsapp', coalesce(nullif(p.whatsapp_number, ''), nullif(p.phone, ''), last_b.payload->>'clientPhone', ''),
        'dateOfBirth', case when coalesce(pref.birthday_opt_in, false) then p.date_of_birth else null end,
        'birthdayShared', coalesce(pref.birthday_opt_in, false),
        'optIn', coalesce(pref.whatsapp_opt_in, false),
        'consentUpdated', pref.updated_at,
        'blocked', case when manager_access then coalesce(n.do_not_contact, false) else false end,
        'tags', case when manager_access then coalesce(n.tags, '') else '' end,
        'notes', case when manager_access then coalesce(n.notes, '') else '' end,
        'lastVisit', last_b.starts_at,
        'bookings', (
          select count(*)
          from public.studioflow_bookings b
          where b.customer_id = ids.customer_id
            and b.owner_id = target_owner
            and (
              owner_access
              or (
                b.branch_id is not null
                and public.studioflow_is_assigned_branch(target_owner, b.branch_id::text)
              )
            )
        )
      )
      order by coalesce(p.full_name, last_b.payload->>'clientName', 'Customer')
    ),
    '[]'::jsonb
  )
  into result
  from (
    -- Owners retain the historic union with consent-only customers. Staff do
    -- not: a preference row without a booking has no trustworthy branch.
    select b.customer_id
    from public.studioflow_bookings b
    where b.owner_id = target_owner
      and (
        owner_access
        or studioflow_android_private.crm_customer_in_branch_scope(target_owner, b.customer_id)
      )
    group by b.customer_id
    union
    select pref.customer_id
    from public.studioflow_customer_marketing_preferences pref
    where owner_access
      and pref.owner_id = target_owner
  ) ids
  left join public.studioflow_android_profiles p
    on p.customer_id = ids.customer_id
  left join public.studioflow_customer_marketing_preferences pref
    on pref.customer_id = ids.customer_id
   and pref.owner_id = target_owner
  left join public.studioflow_owner_contact_notes n
    on n.customer_id = ids.customer_id
   and n.owner_id = target_owner
  left join lateral (
    select b.payload, b.starts_at
    from public.studioflow_bookings b
    where b.owner_id = target_owner
      and b.customer_id = ids.customer_id
      and (
        owner_access
        or (
          b.branch_id is not null
          and public.studioflow_is_assigned_branch(target_owner, b.branch_id::text)
        )
      )
    order by b.created_at desc
    limit 1
  ) last_b on true;

  return result;
end;
$function$;

/* ------------------------------------------------------------------------- */
/* 3. CRM dashboard: receptionist gets contacts only; manager gets scoped CRM */
/* ------------------------------------------------------------------------- */

create or replace function studioflow_android_private.crm_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  actor uuid := (select auth.uid());
  target_owner uuid;
  owner_access boolean := false;
  manager_access boolean := false;
  contacts jsonb;
  customer_rows jsonb;
  task_rows jsonb;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  owner_access := exists (
    select 1 from public.studioflow_accounts a where a.user_id = actor
  );

  if owner_access then
    target_owner := actor;
    manager_access := true;
  else
    target_owner := studioflow_android_private.crm_effective_owner('view_client_contacts');
    manager_access := public.studioflow_current_staff_can(target_owner, 'manage_crm');
  end if;

  contacts := studioflow_android_private.owner_contacts();

  -- Receptionist: contact directory only. Do not expose private notes,
  -- customer timeline, task names, activity text, revenue, or manual contacts.
  if not manager_access then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', c.value->>'id',
          'name', coalesce(nullif(c.value->>'name', ''), 'Customer'),
          'whatsapp', coalesce(c.value->>'whatsapp', ''),
          'email', (
            select nullif(b.payload->>'clientEmail', '')
            from public.studioflow_bookings b
            where b.owner_id = target_owner
              and b.customer_id = (c.value->>'id')::uuid
              and b.branch_id is not null
              and public.studioflow_is_assigned_branch(target_owner, b.branch_id::text)
              and nullif(b.payload->>'clientEmail', '') is not null
            order by b.created_at desc
            limit 1
          ),
          'dateOfBirth', c.value->'dateOfBirth',
          'birthdayShared', coalesce((c.value->>'birthdayShared')::boolean, false),
          'optIn', coalesce((c.value->>'optIn')::boolean, false),
          'consentUpdated', c.value->'consentUpdated',
          'bookingCount', coalesce(bs.booking_count, 0),
          'lastVisit', bs.last_visit,
          'nextAppointment', bs.next_appointment,
          'isManual', false
        )
        order by lower(coalesce(c.value->>'name', 'customer'))
      ),
      '[]'::jsonb
    )
    into customer_rows
    from jsonb_array_elements(coalesce(contacts, '[]'::jsonb)) c(value)
    left join lateral (
      select
        count(*)::integer as booking_count,
        max(b.starts_at) filter (where lower(b.status) = 'completed') as last_visit,
        min(b.starts_at) filter (
          where b.starts_at >= now()
            and lower(b.status) not in ('cancelled', 'rejected', 'no_show')
        ) as next_appointment
      from public.studioflow_bookings b
      where b.owner_id = target_owner
        and b.customer_id = (c.value->>'id')::uuid
        and b.branch_id is not null
        and public.studioflow_is_assigned_branch(target_owner, b.branch_id::text)
    ) bs on true;

    return jsonb_build_object(
      'customers', coalesce(customer_rows, '[]'::jsonb),
      'tasks', '[]'::jsonb,
      'generatedAt', now()
    );
  end if;

  -- Owner/Manager: contacts already contain only owner-wide data or customers
  -- strictly contained inside this manager's assigned branches.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.value->>'id',
        'name', coalesce(nullif(c.value->>'name', ''), 'Customer'),
        'whatsapp', coalesce(c.value->>'whatsapp', ''),
        'email', (
          select nullif(b.payload->>'clientEmail', '')
          from public.studioflow_bookings b
          where b.owner_id = target_owner
            and b.customer_id = (c.value->>'id')::uuid
            and nullif(b.payload->>'clientEmail', '') is not null
            and (
              owner_access
              or (
                b.branch_id is not null
                and public.studioflow_is_assigned_branch(target_owner, b.branch_id::text)
              )
            )
          order by b.created_at desc
          limit 1
        ),
        'dateOfBirth', c.value->'dateOfBirth',
        'birthdayShared', coalesce((c.value->>'birthdayShared')::boolean, false),
        'optIn', coalesce((c.value->>'optIn')::boolean, false),
        'consentUpdated', c.value->'consentUpdated',
        'blocked', coalesce((c.value->>'blocked')::boolean, false),
        'tags', coalesce(c.value->>'tags', ''),
        'notes', coalesce(c.value->>'notes', ''),
        'bookingCount', coalesce(bs.booking_count, 0),
        'completedBookingCount', coalesce(bs.completed_count, 0),
        'upcomingBookingCount', coalesce(bs.upcoming_count, 0),
        'totalValue', coalesce(bs.total_value, 0),
        'totalPaid', coalesce(bs.total_paid, 0),
        'firstBookingAt', bs.first_booking_at,
        'lastVisit', bs.last_visit,
        'nextAppointment', bs.next_appointment,
        'lastBookingAt', bs.last_booking_at,
        'bookingHistory', coalesce(bh.items, '[]'::jsonb),
        'activities', coalesce(ac.items, '[]'::jsonb),
        'openTaskCount', coalesce(tc.open_count, 0),
        'isManual', coalesce((c.value->>'isManual')::boolean, false)
      )
      order by coalesce(bs.last_booking_at, bs.first_booking_at) desc nulls last,
               lower(coalesce(c.value->>'name', 'customer'))
    ),
    '[]'::jsonb
  )
  into customer_rows
  from jsonb_array_elements(coalesce(contacts, '[]'::jsonb)) as c(value)
  left join lateral (
    select
      count(*)::integer as booking_count,
      (count(*) filter (where lower(b.status) = 'completed'))::integer as completed_count,
      (count(*) filter (where b.starts_at >= now() and lower(b.status) not in ('cancelled', 'rejected', 'no_show')))::integer as upcoming_count,
      coalesce(sum(greatest(coalesce(nullif(b.payload->>'servicePrice', '')::numeric, 0), 0)), 0) as total_value,
      coalesce(sum(greatest(coalesce(nullif(b.payload->>'amountPaid', '')::numeric, 0), 0)), 0) as total_paid,
      min(b.created_at) as first_booking_at,
      max(b.starts_at) filter (where lower(b.status) = 'completed') as last_visit,
      min(b.starts_at) filter (
        where b.starts_at >= now()
          and lower(b.status) not in ('cancelled', 'rejected', 'no_show')
      ) as next_appointment,
      max(b.created_at) as last_booking_at
    from public.studioflow_bookings b
    where b.owner_id = target_owner
      and b.customer_id = (c.value->>'id')::uuid
      and (
        owner_access
        or (
          b.branch_id is not null
          and public.studioflow_is_assigned_branch(target_owner, b.branch_id::text)
        )
      )
  ) bs on true
  left join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'startsAt', b.starts_at,
          'endsAt', b.ends_at,
          'status', b.status,
          'source', b.booking_source,
          'serviceName', coalesce(nullif(b.payload->>'serviceName', ''), 'Salon service'),
          'servicePrice', coalesce(nullif(b.payload->>'servicePrice', '')::numeric, 0),
          'amountPaid', coalesce(nullif(b.payload->>'amountPaid', '')::numeric, 0),
          'paymentStatus', coalesce(b.payload->>'paymentStatus', 'unknown'),
          'stylistName', coalesce(nullif(b.payload->>'stylistName', ''), 'Any available specialist'),
          'instructions', coalesce(b.payload->>'instructions', '')
        ) order by b.starts_at desc
      ),
      '[]'::jsonb
    ) as items
    from (
      select b.*
      from public.studioflow_bookings b
      where b.owner_id = target_owner
        and b.customer_id = (c.value->>'id')::uuid
        and (
          owner_access
          or (
            b.branch_id is not null
            and public.studioflow_is_assigned_branch(target_owner, b.branch_id::text)
          )
        )
      order by b.starts_at desc
      limit 30
    ) b
  ) bh on true
  left join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'type', a.activity_type,
          'channel', a.channel,
          'direction', a.direction,
          'summary', a.summary,
          'details', a.details,
          'createdAt', a.created_at,
          'relatedBookingId', a.related_booking_id,
          'relatedTaskId', a.related_task_id
        ) order by a.created_at desc
      ),
      '[]'::jsonb
    ) as items
    from (
      select a.*
      from studioflow_android_private.crm_activities a
      where a.owner_id = target_owner
        and a.customer_id = (c.value->>'id')::uuid
      order by a.created_at desc
      limit 40
    ) a
  ) ac on true
  left join lateral (
    select count(*)::integer as open_count
    from studioflow_android_private.crm_tasks t
    where t.owner_id = target_owner
      and t.customer_id = (c.value->>'id')::uuid
      and t.status = 'open'
  ) tc on true;

  -- Manual contacts have no branch_id in the schema; preserve them for owners
  -- only. A manager cannot safely infer their branch from a phone number or
  -- customer profile.
  if owner_access then
    customer_rows := coalesce(customer_rows, '[]'::jsonb) || coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id::text,
        'name', m.full_name,
        'whatsapp', m.phone,
        'email', m.email,
        'dateOfBirth', m.date_of_birth,
        'birthdayShared', false,
        'optIn', false,
        'consentUpdated', null,
        'blocked', m.do_not_contact,
        'tags', m.tags,
        'notes', m.notes,
        'isManual', true,
        'customerSource', m.source,
        'bookingCount', 0,
        'completedBookingCount', 0,
        'upcomingBookingCount', 0,
        'totalValue', 0,
        'totalPaid', 0,
        'firstBookingAt', m.created_at,
        'lastVisit', null,
        'nextAppointment', null,
        'lastBookingAt', m.created_at,
        'bookingHistory', '[]'::jsonb,
        'activities', coalesce(ac.items, '[]'::jsonb),
        'openTaskCount', coalesce(tc.open_count, 0)
      ) order by m.created_at desc)
      from studioflow_android_private.crm_contacts m
      left join lateral (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', a.id, 'type', a.activity_type, 'channel', a.channel,
          'direction', a.direction, 'summary', a.summary, 'details', a.details,
          'createdAt', a.created_at, 'relatedBookingId', a.related_booking_id,
          'relatedTaskId', a.related_task_id
        ) order by a.created_at desc), '[]'::jsonb) as items
        from (
          select a.*
          from studioflow_android_private.crm_activities a
          where a.owner_id = target_owner and a.customer_id = m.id
          order by a.created_at desc
          limit 40
        ) a
      ) ac on true
      left join lateral (
        select count(*)::integer as open_count
        from studioflow_android_private.crm_tasks t
        where t.owner_id = target_owner and t.customer_id = m.id and t.status = 'open'
      ) tc on true
      where m.owner_id = target_owner
    ), '[]'::jsonb);
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'customerId', t.customer_id,
        'title', t.title,
        'details', t.details,
        'taskType', t.task_type,
        'status', t.status,
        'dueAt', t.due_at,
        'completedAt', t.completed_at,
        'createdAt', t.created_at
      )
      order by case when t.status = 'open' then 0 else 1 end,
               t.due_at asc,
               t.created_at desc
    ),
    '[]'::jsonb
  )
  into task_rows
  from (
    select t.*
    from studioflow_android_private.crm_tasks t
    where t.owner_id = target_owner
      and (
        owner_access
        or exists (
          select 1
          from jsonb_array_elements(coalesce(contacts, '[]'::jsonb)) c(value)
          where c.value->>'id' = t.customer_id::text
        )
      )
    order by case when t.status = 'open' then 0 else 1 end,
             t.due_at asc,
             t.created_at desc
    limit 300
  ) t;

  return jsonb_build_object(
    'customers', coalesce(customer_rows, '[]'::jsonb),
    'tasks', coalesce(task_rows, '[]'::jsonb),
    'generatedAt', now()
  );
end;
$function$;

/* ------------------------------------------------------------------------- */
/* 4. CRM writes: Manager-only and customer-scope checked on every call        */
/* ------------------------------------------------------------------------- */

create or replace function studioflow_android_private.crm_add_activity(
  p_customer uuid,
  p_activity_type text,
  p_channel text,
  p_direction text,
  p_summary text,
  p_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := (select auth.uid());
  target_owner uuid;
  activity_id uuid;
begin
  target_owner := studioflow_android_private.crm_effective_owner('manage_crm');

  if not studioflow_android_private.crm_customer_in_branch_scope(target_owner, p_customer)
     or (
       target_owner = actor
       and not exists (
         select 1
         from studioflow_android_private.owner_contacts() c(value)
         where c.value->>'id' = p_customer::text
       )
       and not exists (
         select 1 from studioflow_android_private.crm_contacts m
         where m.owner_id = target_owner and m.id = p_customer
       )
     ) then
    raise exception 'Customer is outside your CRM branch scope' using errcode = '42501';
  end if;

  if p_activity_type is null or p_channel is null or p_direction is null
     or p_activity_type not in ('note', 'call', 'whatsapp', 'email', 'meeting', 'other')
     or p_channel not in ('phone', 'whatsapp', 'email', 'in_person', 'internal')
     or p_direction not in ('inbound', 'outbound', 'internal')
     or char_length(btrim(coalesce(p_summary, ''))) not between 1 and 180
     or char_length(coalesce(p_details, '')) > 3000 then
    raise exception 'Invalid CRM activity details' using errcode = '22023';
  end if;

  insert into studioflow_android_private.crm_activities (
    owner_id, customer_id, activity_type, channel, direction,
    summary, details, actor_id
  )
  values (
    target_owner, p_customer, p_activity_type, p_channel, p_direction,
    btrim(p_summary), btrim(coalesce(p_details, '')), actor
  )
  returning id into activity_id;

  return activity_id;
end;
$function$;

create or replace function studioflow_android_private.crm_create_task(
  p_customer uuid,
  p_title text,
  p_details text,
  p_due_at timestamptz,
  p_task_type text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := (select auth.uid());
  target_owner uuid;
  task_id uuid;
begin
  target_owner := studioflow_android_private.crm_effective_owner('manage_crm');

  if not studioflow_android_private.crm_customer_in_branch_scope(target_owner, p_customer)
     or (
       target_owner = actor
       and not exists (
         select 1 from studioflow_android_private.owner_contacts() c(value)
         where c.value->>'id' = p_customer::text
       )
       and not exists (
         select 1 from studioflow_android_private.crm_contacts m
         where m.owner_id = target_owner and m.id = p_customer
       )
     ) then
    raise exception 'Customer is outside your CRM branch scope' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160
     or char_length(coalesce(p_details, '')) > 3000
     or p_due_at is null
     or p_due_at < now() - interval '365 days'
     or p_due_at > now() + interval '5 years'
     or p_task_type is null
     or p_task_type not in ('call', 'whatsapp', 'visit', 'service_follow_up', 'general') then
    raise exception 'Invalid follow-up task details' using errcode = '22023';
  end if;

  insert into studioflow_android_private.crm_tasks (
    owner_id, customer_id, title, details, task_type, due_at, created_by
  )
  values (
    target_owner, p_customer, btrim(p_title), btrim(coalesce(p_details, '')),
    p_task_type, p_due_at, actor
  )
  returning id into task_id;

  insert into studioflow_android_private.crm_activities (
    owner_id, customer_id, activity_type, channel, direction,
    summary, details, related_task_id, actor_id
  )
  values (
    target_owner, p_customer, 'follow_up_created', 'internal', 'internal',
    'Follow-up scheduled: ' || btrim(p_title),
    btrim(coalesce(p_details, '')), task_id, actor
  );

  return task_id;
end;
$function$;

create or replace function studioflow_android_private.crm_update_task(
  p_task uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := (select auth.uid());
  target_owner uuid;
  task_row studioflow_android_private.crm_tasks%rowtype;
begin
  target_owner := studioflow_android_private.crm_effective_owner('manage_crm');

  if p_task is null or p_status is null or p_status not in ('open', 'completed', 'cancelled') then
    raise exception 'Invalid follow-up task update' using errcode = '22023';
  end if;

  select * into task_row
  from studioflow_android_private.crm_tasks t
  where t.id = p_task
    and t.owner_id = target_owner
  for update;

  if not found
     or not studioflow_android_private.crm_customer_in_branch_scope(target_owner, task_row.customer_id) then
    raise exception 'Follow-up task is outside your CRM branch scope' using errcode = '42501';
  end if;

  if task_row.status = p_status then
    return;
  end if;

  update studioflow_android_private.crm_tasks
  set status = p_status,
      completed_at = case when p_status = 'completed' then now() else null end,
      updated_at = now()
  where id = p_task
    and owner_id = target_owner;

  if p_status = 'completed' then
    insert into studioflow_android_private.crm_activities (
      owner_id, customer_id, activity_type, channel, direction,
      summary, details, related_task_id, actor_id
    )
    values (
      target_owner, task_row.customer_id, 'follow_up_completed', 'internal', 'internal',
      'Follow-up completed: ' || task_row.title,
      task_row.details, task_row.id, actor
    );
  end if;
end;
$function$;

create or replace function studioflow_android_private.save_contact_note(
  p_customer uuid,
  p_tags text,
  p_notes text,
  p_blocked boolean
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  target_owner uuid;
begin
  target_owner := studioflow_android_private.crm_effective_owner('manage_crm');

  if not studioflow_android_private.crm_customer_in_branch_scope(target_owner, p_customer)
     or (
       target_owner = (select auth.uid())
       and not exists (
         select 1 from studioflow_android_private.owner_contacts() c(value)
         where c.value->>'id' = p_customer::text
       )
       and not exists (
         select 1 from studioflow_android_private.crm_contacts m
         where m.owner_id = target_owner and m.id = p_customer
       )
     ) then
    raise exception 'Customer is outside your CRM branch scope' using errcode = '42501';
  end if;

  if length(coalesce(p_tags, '')) > 200
     or length(coalesce(p_notes, '')) > 2000
     or p_blocked is null then
    raise exception 'Invalid contact details' using errcode = '22023';
  end if;

  insert into public.studioflow_owner_contact_notes (
    owner_id, customer_id, tags, notes, do_not_contact
  )
  values (
    target_owner, p_customer, btrim(coalesce(p_tags, '')),
    btrim(coalesce(p_notes, '')), p_blocked
  )
  on conflict (owner_id, customer_id) do update
    set tags = excluded.tags,
        notes = excluded.notes,
        do_not_contact = excluded.do_not_contact,
        updated_at = now();
end;
$function$;

/* ------------------------------------------------------------------------- */
/* 5. Defensive assertions: target objects and existing helpers must exist    */
/* ------------------------------------------------------------------------- */

do $assert$
begin
  if to_regprocedure('public.studioflow_current_staff_can(uuid,text)') is null
     or to_regprocedure('public.studioflow_is_assigned_branch(uuid,text)') is null
     or to_regprocedure('studioflow_android_private.crm_dashboard()') is null
     or to_regprocedure('studioflow_android_private.owner_contacts()') is null then
    raise exception 'CRM branch hardening prerequisites are missing';
  end if;
end;
$assert$;

commit;

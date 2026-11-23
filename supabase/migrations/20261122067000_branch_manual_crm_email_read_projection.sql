-- Preserve manual CRM email in Manager reads for explicitly branch-mapped contacts.
begin;
CREATE OR REPLACE FUNCTION studioflow_android_private.owner_contacts()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      case when owner_access then
        jsonb_build_object(
          'id', ids.customer_id,
          'name', coalesce(nullif(m.full_name,''), nullif(p.full_name, ''), last_b.payload->>'clientName', 'Customer'),
          'whatsapp', coalesce(nullif(m.phone,''), nullif(p.whatsapp_number, ''), nullif(p.phone, ''), last_b.payload->>'clientPhone', ''),
          'dateOfBirth', case when m.id is not null then m.date_of_birth when coalesce(pref.birthday_opt_in, false) then p.date_of_birth else null end,
          'birthdayShared', coalesce(pref.birthday_opt_in, false),
          'optIn', coalesce(pref.whatsapp_opt_in, false),
          'consentUpdated', pref.updated_at,
          'blocked', coalesce(m.do_not_contact,n.do_not_contact,false),
          'tags', coalesce(m.tags,n.tags,''),
          'notes', coalesce(m.notes,n.notes,''),
          'lastVisit', last_b.starts_at,
          'isManual',m.id is not null,
          'customerSource',m.source,
          'branchId',m.branch_id,
          'bookings', (
            select count(*) from public.studioflow_bookings b
            where b.customer_id = ids.customer_id and b.owner_id = target_owner
          )
        )
      when manager_access then
        jsonb_build_object(
          'id', ids.customer_id,
          'name', coalesce(nullif(m.full_name,''), nullif(p.full_name, ''), last_b.payload->>'clientName', 'Customer'),
          'whatsapp', coalesce(nullif(m.phone,''), nullif(p.whatsapp_number, ''), nullif(p.phone, ''), last_b.payload->>'clientPhone', ''),
          'email', coalesce(nullif(m.email,''), nullif(last_b.payload->>'clientEmail','')) ,
          'dateOfBirth', case when m.id is not null then m.date_of_birth when coalesce(pref.birthday_opt_in, false) then p.date_of_birth else null end,
          'birthdayShared', coalesce(pref.birthday_opt_in, false),
          'optIn', coalesce(pref.whatsapp_opt_in, false),
          'consentUpdated', pref.updated_at,
          'blocked', coalesce(m.do_not_contact,n.do_not_contact,false),
          'tags', coalesce(m.tags,n.tags,''),
          'notes', coalesce(m.notes,n.notes,''),
          'lastVisit', last_b.starts_at,
          'isManual',m.id is not null,
          'customerSource',m.source,
          'branchId',m.branch_id,
          'bookings', (
            select count(*) from public.studioflow_bookings b
            where b.customer_id = ids.customer_id
              and b.owner_id = target_owner
              and b.branch_id is not null
              and public.studioflow_is_assigned_branch(target_owner, b.branch_id::text)
          )
        )
      else
        -- Receptionist: contact details only. No DOB, consent metadata,
        -- private notes, tags or block state.
        jsonb_build_object(
          'id', ids.customer_id,
          'name', coalesce(nullif(m.full_name,''), nullif(p.full_name, ''), last_b.payload->>'clientName', 'Customer'),
          'whatsapp', coalesce(nullif(m.phone,''), nullif(p.whatsapp_number, ''), nullif(p.phone, ''), last_b.payload->>'clientPhone', ''),
          'email', coalesce(nullif(m.email,''),nullif(last_b.payload->>'clientEmail', '')),
          'isManual',m.id is not null,
          'customerSource',m.source,
          'branchId',m.branch_id,
          'isManual',m.id is not null,
          'customerSource',m.source,
          'branchId',m.branch_id,
          'bookings', (
            select count(*) from public.studioflow_bookings b
            where b.customer_id = ids.customer_id
              and b.owner_id = target_owner
              and b.branch_id is not null
              and public.studioflow_is_assigned_branch(target_owner, b.branch_id::text)
          )
        )
      end
      order by coalesce(m.full_name,p.full_name,last_b.payload->>'clientName','Customer')
    ),
    '[]'::jsonb
  )
  into result
  from (
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
    where owner_access and pref.owner_id = target_owner
    union
    select m.id
    from studioflow_android_private.crm_contacts m
    where not owner_access and m.owner_id=target_owner and m.branch_id is not null
      and public.studioflow_is_assigned_branch(target_owner,m.branch_id::text)
  ) ids
  left join studioflow_android_private.crm_contacts m
    on m.owner_id=target_owner and m.id=ids.customer_id
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
$function$
;
CREATE OR REPLACE FUNCTION studioflow_android_private.crm_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  if not manager_access then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', c.value->>'id',
        'name', c.value->>'name',
        'whatsapp', c.value->>'whatsapp',
        'email', c.value->>'email',
        'bookingCount', coalesce((c.value->>'bookings')::integer, 0),
        'isManual', coalesce((c.value->>'isManual')::boolean,false),
        'branchId', c.value->>'branchId',
        'customerSource', c.value->>'customerSource'
      )
      order by lower(coalesce(c.value->>'name', 'customer'))
    ), '[]'::jsonb)
    into customer_rows
    from jsonb_array_elements(coalesce(contacts, '[]'::jsonb)) c(value);

    return jsonb_build_object(
      'customers', coalesce(customer_rows, '[]'::jsonb),
      'tasks', '[]'::jsonb,
      'generatedAt', now()
    );
  end if;

  select coalesce(jsonb_agg(
    c.value || jsonb_build_object(
      'email', coalesce(
        nullif(c.value->>'email',''),
        (
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
        )
      ),
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
      'isManual', coalesce((c.value->>'isManual')::boolean,false),
        'branchId', c.value->>'branchId',
        'customerSource', c.value->>'customerSource'
    )
    order by coalesce(bs.last_booking_at, bs.first_booking_at) desc nulls last,
             lower(coalesce(c.value->>'name', 'customer'))
  ), '[]'::jsonb)
  into customer_rows
  from jsonb_array_elements(coalesce(contacts, '[]'::jsonb)) c(value)
  left join lateral (
    select
      count(*)::integer as booking_count,
      (count(*) filter (where lower(b.status) = 'completed'))::integer as completed_count,
      (count(*) filter (
        where b.starts_at >= now()
          and lower(b.status) not in ('cancelled', 'rejected', 'no_show')
      ))::integer as upcoming_count,
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
    select coalesce(jsonb_agg(jsonb_build_object(
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
    ) order by b.starts_at desc), '[]'::jsonb) as items
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
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id,
      'type', a.activity_type,
      'channel', a.channel,
      'direction', a.direction,
      'summary', a.summary,
      'details', a.details,
      'createdAt', a.created_at,
      'relatedBookingId', a.related_booking_id,
      'relatedTaskId', a.related_task_id
    ) order by a.created_at desc), '[]'::jsonb) as items
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

  -- Manual contact rows have no branch_id and remain owner-only.
  if owner_access then
    customer_rows := coalesce(customer_rows, '[]'::jsonb) || coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id::text,
        'name', m.full_name,
        'whatsapp', m.phone,
        'branchId', m.branch_id,
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
          select a.* from studioflow_android_private.crm_activities a
          where a.owner_id = target_owner and a.customer_id = m.id
          order by a.created_at desc limit 40
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'customerId', t.customer_id,
    'title', t.title,
    'details', t.details,
    'taskType', t.task_type,
    'status', t.status,
    'dueAt', t.due_at,
    'completedAt', t.completed_at,
    'createdAt', t.created_at
  ) order by case when t.status = 'open' then 0 else 1 end,
               t.due_at asc, t.created_at desc), '[]'::jsonb)
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
             t.due_at asc, t.created_at desc
    limit 300
  ) t;

  return jsonb_build_object(
    'customers', coalesce(customer_rows, '[]'::jsonb),
    'tasks', coalesce(task_rows, '[]'::jsonb),
    'generatedAt', now()
  );
end;
$function$
;
commit;

-- Branch mapping for manual CRM contacts. NULL branch_id remains owner-only.
begin;

-- Composite uniqueness is required for an FK that guarantees the branch belongs
-- to the same salon as the manual contact.
create unique index if not exists branches_site_id_id_scope_uk
  on public.branches(site_id,id);

alter table studioflow_android_private.crm_contacts
  add column if not exists branch_id uuid;

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='crm_contacts_owner_branch_fk'
      and conrelid='studioflow_android_private.crm_contacts'::regclass
  ) then
    alter table studioflow_android_private.crm_contacts
      add constraint crm_contacts_owner_branch_fk
      foreign key(owner_id,branch_id)
      references public.branches(site_id,id)
      on delete restrict;
  end if;
end;
$migration$;

create index if not exists crm_contacts_owner_branch_created_idx
  on studioflow_android_private.crm_contacts(owner_id,branch_id,created_at desc)
  where branch_id is not null;

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
    when p_owner=(select auth.uid())
      and exists(select 1 from public.studioflow_accounts a where a.user_id=p_owner) then true
    when not public.studioflow_current_staff_can(p_owner,'view_client_contacts') then false
    else
      exists (
        select 1 from studioflow_android_private.crm_contacts m
        where m.owner_id=p_owner and m.id=p_customer
          and m.branch_id is not null
          and public.studioflow_is_assigned_branch(p_owner,m.branch_id::text)
      )
      or (
        exists (
          select 1 from public.studioflow_bookings b
          where b.owner_id=p_owner and b.customer_id=p_customer
            and b.branch_id is not null
            and public.studioflow_is_assigned_branch(p_owner,b.branch_id::text)
        )
        and not exists (
          select 1 from public.studioflow_bookings b
          where b.owner_id=p_owner and b.customer_id=p_customer
            and (b.branch_id is null or not public.studioflow_is_assigned_branch(p_owner,b.branch_id::text))
        )
      )
  end;
$function$;

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

-- Existing 5-argument create RPC remains owner-compatible. The 6-argument
-- overload enables a Manager to create a contact only inside an assigned branch.
CREATE OR REPLACE FUNCTION studioflow_android_private.crm_create_contact(p_full_name text, p_phone text, p_email text, p_source text, p_date_of_birth date, p_branch_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor uuid := auth.uid();
  digits text := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  normalized text;
  clean_email text := lower(btrim(coalesce(p_email,'')));
  contact_id uuid;
  target_owner uuid;
begin
  target_owner:=studioflow_android_private.crm_effective_owner('manage_crm');
  if target_owner is null then raise exception 'CRM management access required' using errcode='42501'; end if;
  if target_owner<>actor and (
    p_branch_id is null
    or not public.studioflow_is_assigned_branch(target_owner,p_branch_id::text)
  ) then
    raise exception 'Managers must assign the contact to one of their active branches' using errcode='42501';
  end if;
  if p_branch_id is not null and not exists (
    select 1 from public.branches b
    where b.id=p_branch_id and b.site_id=target_owner and b.is_active
  ) then
    raise exception 'Choose an active branch belonging to this salon' using errcode='42501';
  end if;

  if char_length(digits)=10 then digits:='91'||digits; end if;
  normalized:=case
    when char_length(digits)=12 and left(digits,2)='91' then right(digits,10)
    else digits
  end;

  if char_length(btrim(coalesce(p_full_name,''))) not between 2 and 120
     or char_length(digits) not between 11 and 15
     or (clean_email<>'' and (
       char_length(clean_email)>254
       or position('@' in clean_email)<=1
       or position('.' in split_part(clean_email,'@',2))<=1
     )) then
    raise exception 'Enter a valid customer name, phone number and email' using errcode='22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(studioflow_android_private.owner_contacts()) c(value)
    where case
      when char_length(regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g'))=12
        and left(regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g'),2)='91'
      then right(regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g'),10)
      else regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g')
    end=normalized
  ) then
    raise exception 'A customer with this WhatsApp number already exists. Select the existing customer instead.' using errcode='23505';
  end if;

  if exists (
    select 1
    from studioflow_android_private.crm_contacts c
    where c.owner_id=target_owner
      and case
        when char_length(regexp_replace(c.phone,'[^0-9]','','g'))=12
          and left(regexp_replace(c.phone,'[^0-9]','','g'),2)='91'
        then right(regexp_replace(c.phone,'[^0-9]','','g'),10)
        else regexp_replace(c.phone,'[^0-9]','','g')
      end=normalized
  ) then
    raise exception 'A CRM contact with this phone number already exists.' using errcode='23505';
  end if;

  insert into studioflow_android_private.crm_contacts(
    owner_id,branch_id,full_name,phone,email,date_of_birth,source,created_by
  ) values (
    target_owner,p_branch_id,btrim(p_full_name),digits,nullif(clean_email,''),
    p_date_of_birth,
    case when p_source in ('walk_in','phone','referral','social','imported','other') then p_source else 'other' end,
    actor
  ) returning id into contact_id;

  return contact_id;
end;
$function$
;

-- Existing 8-argument update RPC remains owner-compatible. The 9-argument
-- overload allows the Manager write path while preserving strict branch scope.
CREATE OR REPLACE FUNCTION studioflow_android_private.crm_update_contact(p_customer uuid, p_full_name text, p_phone text, p_email text, p_date_of_birth date, p_tags text, p_notes text, p_blocked boolean, p_branch_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor uuid := auth.uid();
  digits text := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  normalized text;
  clean_email text := lower(btrim(coalesce(p_email,'')));
  target_owner uuid;
begin
  target_owner:=studioflow_android_private.crm_effective_owner('manage_crm');
  if not studioflow_android_private.crm_customer_in_branch_scope(target_owner,p_customer) then
    raise exception 'Manual CRM contact is outside your branch scope' using errcode='42501';
  end if;
  if target_owner<>actor and (
    p_branch_id is null
    or not public.studioflow_is_assigned_branch(target_owner,p_branch_id::text)
  ) then
    raise exception 'Managers must keep contacts within their assigned branches' using errcode='42501';
  end if;
  if p_branch_id is not null and not exists (
    select 1 from public.branches b
    where b.id=p_branch_id and b.site_id=target_owner and b.is_active
      and (target_owner=actor or public.studioflow_is_assigned_branch(target_owner,b.id::text))
  ) then
    raise exception 'Choose an active branch assigned to this salon workspace' using errcode='42501';
  end if;

  if char_length(digits)=10 then digits:='91'||digits; end if;
  normalized:=case
    when char_length(digits)=12 and left(digits,2)='91' then right(digits,10)
    else digits
  end;

  if char_length(btrim(coalesce(p_full_name,''))) not between 2 and 120
     or char_length(digits) not between 11 and 15
     or char_length(coalesce(p_tags,''))>200
     or char_length(coalesce(p_notes,''))>2000
     or p_blocked is null
     or (clean_email<>'' and (
       char_length(clean_email)>254
       or position('@' in clean_email)<=1
       or position('.' in split_part(clean_email,'@',2))<=1
     )) then
    raise exception 'Invalid customer details' using errcode='22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(studioflow_android_private.owner_contacts()) c(value)
    where case
      when char_length(regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g'))=12
        and left(regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g'),2)='91'
      then right(regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g'),10)
      else regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g')
    end=normalized
  ) then
    raise exception 'A booking customer already uses this WhatsApp number.' using errcode='23505';
  end if;

  if exists (
    select 1
    from studioflow_android_private.crm_contacts c
    where c.owner_id=target_owner and c.id<>p_customer
      and case
        when char_length(regexp_replace(c.phone,'[^0-9]','','g'))=12
          and left(regexp_replace(c.phone,'[^0-9]','','g'),2)='91'
        then right(regexp_replace(c.phone,'[^0-9]','','g'),10)
        else regexp_replace(c.phone,'[^0-9]','','g')
      end=normalized
  ) then
    raise exception 'Another CRM contact already uses this phone number.' using errcode='23505';
  end if;

  update studioflow_android_private.crm_contacts
  set full_name=btrim(p_full_name),
      phone=digits,
      email=nullif(clean_email,''),
      date_of_birth=p_date_of_birth,
      tags=btrim(coalesce(p_tags,'')),
      notes=btrim(coalesce(p_notes,'')),
      do_not_contact=p_blocked,
      branch_id=p_branch_id,
      updated_at=now()
  where id=p_customer and owner_id=target_owner;

  if not found then
    raise exception 'Manual CRM contact unavailable' using errcode='42501';
  end if;
end;
$function$
;

create or replace function public.studioflow_owner_crm_create_contact(
  p_full_name text,p_phone text,p_email text,p_source text,p_date_of_birth date,p_branch_id uuid
)
returns uuid
language sql
set search_path to ''
as $function$
  select studioflow_android_private.crm_create_contact(
    p_full_name,p_phone,p_email,p_source,p_date_of_birth,p_branch_id
  )
$function$;

create or replace function public.studioflow_owner_crm_update_contact(
  p_customer uuid,p_full_name text,p_phone text,p_email text,p_date_of_birth date,
  p_tags text,p_notes text,p_blocked boolean,p_branch_id uuid
)
returns void
language sql
set search_path to ''
as $function$
  select studioflow_android_private.crm_update_contact(
    p_customer,p_full_name,p_phone,p_email,p_date_of_birth,p_tags,p_notes,p_blocked,p_branch_id
  )
$function$;

revoke all on function studioflow_android_private.crm_create_contact(text,text,text,text,date,uuid) from public,anon;
revoke all on function studioflow_android_private.crm_update_contact(uuid,text,text,text,date,text,text,boolean,uuid) from public,anon;
grant execute on function studioflow_android_private.crm_create_contact(text,text,text,text,date,uuid) to authenticated;
grant execute on function studioflow_android_private.crm_update_contact(uuid,text,text,text,date,text,text,boolean,uuid) to authenticated;

revoke all on function public.studioflow_owner_crm_create_contact(text,text,text,text,date,uuid) from public,anon;
revoke all on function public.studioflow_owner_crm_update_contact(uuid,text,text,text,date,text,text,boolean,uuid) from public,anon;
grant execute on function public.studioflow_owner_crm_create_contact(text,text,text,text,date,uuid) to authenticated;
grant execute on function public.studioflow_owner_crm_update_contact(uuid,text,text,text,date,text,text,boolean,uuid) to authenticated;

commit;


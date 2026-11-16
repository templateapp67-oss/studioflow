-- Secure guest booking adapter for the NEXORA WhatsApp Business webhook.
-- Public salon APIs remain session-bound; only the trusted Edge Function service role
-- can find a phone-based customer and create a WhatsApp-originated reservation.

create schema if not exists studioflow_whatsapp_private;
revoke all on schema studioflow_whatsapp_private from public, anon, authenticated;
grant usage on schema studioflow_whatsapp_private to service_role;

create unique index if not exists studioflow_bookings_whatsapp_idempotency_uidx
  on public.studioflow_bookings(owner_id, external_idempotency_key)
  where external_idempotency_key is not null;

create or replace function studioflow_whatsapp_private.find_customer(p_phone text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_customer_id uuid;
begin
  if length(v_digits) not between 10 and 15 then
    return null;
  end if;

  select u.id
    into v_customer_id
    from auth.users u
    left join public.profiles p on p.id = u.id
   where regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g') = v_digits
      or regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = v_digits
      or regexp_replace(coalesce(p.phone_number, ''), '[^0-9]', '', 'g') = v_digits
      or regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g') = v_digits
      or regexp_replace(coalesce(p.whatsapp_number, ''), '[^0-9]', '', 'g') = v_digits
      or regexp_replace(coalesce(p.mobile, ''), '[^0-9]', '', 'g') = v_digits
   order by case
      when regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g') = v_digits then 0
      else 1
   end
   limit 1;

  return v_customer_id;
end;
$$;

revoke all on function studioflow_whatsapp_private.find_customer(text) from public, anon, authenticated;
grant execute on function studioflow_whatsapp_private.find_customer(text) to service_role;

create or replace function studioflow_whatsapp_private.book_guest(
  p_owner uuid,
  p_slug text,
  p_services jsonb,
  p_date date,
  p_time text,
  p_stylist text,
  p_name text,
  p_phone text,
  p_instructions text,
  p_request uuid,
  p_customer_id uuid,
  p_branch uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.studioflow_websites;
  customer_ok boolean;
  active_branch_count integer := 0;
  actual_branch uuid := p_branch;
  branch_slots jsonb;
  candidate jsonb;
  chosen_stylist text;
  menu jsonb;
  service_total numeric;
  total_minutes integer;
  service_names text;
  booking_start timestamptz;
  booking_end timestamptz;
  booking_id uuid := gen_random_uuid();
  request_fingerprint text;
  existing_request public.studioflow_android_requests;
  existing_booking public.studioflow_bookings;
  phone_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  service_count integer;
  matched_service_count integer;
  clean_name text := btrim(coalesce(p_name, ''));
  clean_instructions text := left(btrim(coalesce(p_instructions, '')), 1000);
begin
  if p_owner is null or p_customer_id is null or p_request is null then
    raise exception 'Booking identity is incomplete' using errcode = '22023';
  end if;
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{2,62}$' then
    raise exception 'Salon website is invalid' using errcode = '22023';
  end if;
  if p_services is null or jsonb_typeof(p_services) is distinct from 'array'
     or jsonb_array_length(p_services) not between 1 and 10 then
    raise exception 'Choose between 1 and 10 services' using errcode = '22023';
  end if;
  if length(clean_name) not between 2 and 150 or length(phone_digits) not between 10 and 15 then
    raise exception 'Customer name or WhatsApp number is invalid' using errcode = '22023';
  end if;
  if p_date is null
     or p_date < (now() at time zone 'Asia/Kolkata')::date
     or p_date > (now() at time zone 'Asia/Kolkata')::date + 90
     or coalesce(p_time, '') !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]
    raise exception 'Choose a valid future date and time' using errcode = '22023';
  end if;

  select *
    into w
    from public.studioflow_websites
   where owner_id = p_owner
     and slug = p_slug;
  if w.owner_id is null then
    raise exception 'This salon website is not published for this owner' using errcode = '42501';
  end if;

  select exists (
    select 1
      from auth.users u
      left join public.profiles p on p.id = u.id
     where u.id = p_customer_id
       and (
         regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g') = phone_digits
         or regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = phone_digits
         or regexp_replace(coalesce(p.phone_number, ''), '[^0-9]', '', 'g') = phone_digits
         or regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g') = phone_digits
         or regexp_replace(coalesce(p.whatsapp_number, ''), '[^0-9]', '', 'g') = phone_digits
         or regexp_replace(coalesce(p.mobile, ''), '[^0-9]', '', 'g') = phone_digits
       )
  ) into customer_ok;
  if not coalesce(customer_ok, false) then
    raise exception 'Customer WhatsApp identity could not be verified' using errcode = '42501';
  end if;

  select count(*)::integer
    into active_branch_count
    from public.branches
   where site_id = p_owner
     and is_active = true;

  if actual_branch is not null then
    if not exists (
      select 1 from public.branches
       where id = actual_branch and site_id = p_owner and is_active = true
    ) then
      raise exception 'Selected salon location is not active' using errcode = '22023';
    end if;
  elsif active_branch_count > 1 then
    raise exception 'Choose a salon location before booking' using errcode = '22023';
  elsif active_branch_count = 1 then
    select id into actual_branch
      from public.branches
     where site_id = p_owner and is_active = true
     order by created_at
     limit 1;
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_services) as service_item
     where jsonb_typeof(service_item) <> 'string'
  ) then
    raise exception 'Service IDs must be text values' using errcode = '22023';
  end if;

  select count(distinct service_item.value)
    into service_count
    from jsonb_array_elements_text(p_services) as service_item(value);
  if service_count <> jsonb_array_length(p_services) then
    raise exception 'Choose different services only' using errcode = '22023';
  end if;

  if actual_branch is not null then
    select public.studioflow_branch_android_slots(
      p_slug, p_services, p_date, coalesce(nullif(p_stylist, ''), 'any'), actual_branch
    ) into branch_slots;
  else
    select public.studioflow_android_slots(
      p_slug, p_services, p_date, coalesce(nullif(p_stylist, ''), 'any')
    ) into branch_slots;
  end if;

  select slot
    into candidate
    from jsonb_array_elements(coalesce(branch_slots, '[]'::jsonb)) as slot
   where slot->>'time' = p_time
     and coalesce((slot->>'available')::boolean, true)
     and (
       coalesce(p_stylist, 'any') in ('any', 'any_available', 'any-specialist')
       or slot->>'stylistId' = p_stylist
     )
   limit 1;

  if candidate is null then
    raise exception 'That time is no longer available. Please choose another time.' using errcode = 'P0001';
  end if;

  chosen_stylist := candidate->>'stylistId';
  if coalesce(chosen_stylist, '') = '' then
    raise exception 'No specialist is available at that time' using errcode = 'P0001';
  end if;

  select
      jsonb_agg(s order by s->>'id'),
      sum((s->>'price')::numeric),
      sum((s->>'durationMinutes')::integer),
      string_agg(s->>'name', ' + ' order by s->>'id'),
      count(*)::integer
    into menu, service_total, total_minutes, service_names, matched_service_count
    from jsonb_array_elements(w.content->'services') as s
   where p_services ? (s->>'id');

  if matched_service_count <> jsonb_array_length(p_services)
     or coalesce(total_minutes, 0) < 1
     or coalesce(total_minutes, 0) > 720
     or coalesce(service_total, -1) < 0 then
    raise exception 'One of the selected services is no longer available' using errcode = 'P0001';
  end if;

  request_fingerprint := md5(jsonb_build_array(
    p_owner, p_slug, p_services, p_date, p_time, chosen_stylist,
    clean_name, phone_digits, clean_instructions, actual_branch
  )::text);

  perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text || p_request::text, 8));
  select * into existing_request
    from public.studioflow_android_requests
   where customer_id = p_customer_id
     and request_id = p_request;

  if existing_request.booking_id is not null then
    if existing_request.fingerprint <> request_fingerprint then
      raise exception 'Booking request changed. Please start a new request.' using errcode = 'P0001';
    end if;
    select * into existing_booking
      from public.studioflow_bookings
     where id = existing_request.booking_id
       and owner_id = p_owner;
    if existing_booking.id is null then
      raise exception 'Previous booking record is unavailable' using errcode = 'P0001';
    end if;
    return existing_booking.payload;
  end if;

  booking_start := (p_date + p_time::time) at time zone 'Asia/Kolkata';
  booking_end := booking_start + total_minutes * interval '1 minute';
  if booking_start <= now() or booking_start > now() + interval '90 days' then
    raise exception 'Choose a future appointment within 90 days' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner::text || chosen_stylist, 0));
  if exists (
    select 1
      from public.studioflow_bookings other
     where other.owner_id = p_owner
       and other.stylist_id = chosen_stylist
       and other.status in ('pending', 'confirmed')
       and (other.status = 'confirmed' or other.hold_expires_at is null or other.hold_expires_at > now())
       and other.starts_at < booking_end
       and other.ends_at > booking_start
  ) then
    raise exception 'This time was just booked. Please choose another slot.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.studioflow_bookings
     where owner_id = p_owner
       and external_idempotency_key = 'whatsapp:' || p_request::text
  ) then
    raise exception 'This WhatsApp booking request was already processed' using errcode = 'P0001';
  end if;

  insert into public.studioflow_bookings (
    id, owner_id, customer_id, stylist_id, starts_at, ends_at,
    status, hold_expires_at, payload, branch_id, booking_source, external_idempotency_key
  ) values (
    booking_id, p_owner, p_customer_id, chosen_stylist, booking_start, booking_end,
    'pending', now() + interval '15 minutes',
    jsonb_build_object(
      'id', booking_id,
      'clientName', clean_name,
      'clientPhone', p_phone,
      'serviceId', p_services->>0,
      'serviceIds', p_services,
      'serviceName', service_names,
      'servicePrice', service_total,
      'serviceItems', menu,
      'durationMinutes', total_minutes,
      'stylistId', chosen_stylist,
      'stylistName', coalesce(candidate->>'stylistName', ''),
      'date', p_date,
      'time', p_time,
      'instructions', clean_instructions,
      'status', 'pending',
      'paymentStatus', 'pay_at_salon',
      'amountPaid', 0,
      'source', 'whatsapp',
      'bookingSource', 'whatsapp',
      'branchId', actual_branch,
      'createdAt', now()
    ),
    actual_branch, 'whatsapp', 'whatsapp:' || p_request::text
  );

  insert into public.studioflow_android_requests(customer_id, request_id, fingerprint, booking_id)
  values (p_customer_id, p_request, request_fingerprint, booking_id);

  return (select payload from public.studioflow_bookings where id = booking_id);
end;
$$;

revoke all on function studioflow_whatsapp_private.book_guest(uuid, text, jsonb, date, text, text, text, text, text, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function studioflow_whatsapp_private.book_guest(uuid, text, jsonb, date, text, text, text, text, text, uuid, uuid, uuid) to service_role;

comment on function studioflow_whatsapp_private.book_guest(uuid, text, jsonb, date, text, text, text, text, text, uuid, uuid, uuid)
is 'Creates a WhatsApp-originated pending salon reservation for a verified WhatsApp phone identity. Callable only by trusted Edge Functions using service_role.';
 then
    raise exception 'Choose a valid future date and time' using errcode = '22023';
  end if;

  select *
    into w
    from public.studioflow_websites
   where owner_id = p_owner
     and slug = p_slug;
  if w.owner_id is null then
    raise exception 'This salon website is not published for this owner' using errcode = '42501';
  end if;

  select exists (
    select 1
      from auth.users u
      left join public.profiles p on p.id = u.id
     where u.id = p_customer_id
       and (
         regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g') = phone_digits
         or regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = phone_digits
         or regexp_replace(coalesce(p.phone_number, ''), '[^0-9]', '', 'g') = phone_digits
         or regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g') = phone_digits
         or regexp_replace(coalesce(p.whatsapp_number, ''), '[^0-9]', '', 'g') = phone_digits
         or regexp_replace(coalesce(p.mobile, ''), '[^0-9]', '', 'g') = phone_digits
       )
  ) into customer_ok;
  if not coalesce(customer_ok, false) then
    raise exception 'Customer WhatsApp identity could not be verified' using errcode = '42501';
  end if;

  select count(*)::integer
    into active_branch_count
    from public.branches
   where site_id = p_owner
     and is_active = true;

  if actual_branch is not null then
    if not exists (
      select 1 from public.branches
       where id = actual_branch and site_id = p_owner and is_active = true
    ) then
      raise exception 'Selected salon location is not active' using errcode = '22023';
    end if;
  elsif active_branch_count > 1 then
    raise exception 'Choose a salon location before booking' using errcode = '22023';
  elsif active_branch_count = 1 then
    select id into actual_branch
      from public.branches
     where site_id = p_owner and is_active = true
     order by created_at
     limit 1;
  end if;

  select count(distinct item)
    into service_count
    from jsonb_array_elements_text(p_services) as item;
  if service_count <> jsonb_array_length(p_services) then
    raise exception 'Choose different services only' using errcode = '22023';
  end if;

  if actual_branch is not null then
    select public.studioflow_branch_android_slots(
      p_slug, p_services, p_date, coalesce(nullif(p_stylist, ''), 'any'), actual_branch
    ) into branch_slots;
  else
    select public.studioflow_android_slots(
      p_slug, p_services, p_date, coalesce(nullif(p_stylist, ''), 'any')
    ) into branch_slots;
  end if;

  select slot
    into candidate
    from jsonb_array_elements(coalesce(branch_slots, '[]'::jsonb)) as slot
   where slot->>'time' = p_time
     and coalesce((slot->>'available')::boolean, true)
     and (
       coalesce(p_stylist, 'any') in ('any', 'any_available', 'any-specialist')
       or slot->>'stylistId' = p_stylist
     )
   limit 1;

  if candidate is null then
    raise exception 'That time is no longer available. Please choose another time.' using errcode = 'P0001';
  end if;

  chosen_stylist := candidate->>'stylistId';
  if coalesce(chosen_stylist, '') = '' then
    raise exception 'No specialist is available at that time' using errcode = 'P0001';
  end if;

  select
      jsonb_agg(s order by s->>'id'),
      sum((s->>'price')::numeric),
      sum((s->>'durationMinutes')::integer),
      string_agg(s->>'name', ' + ' order by s->>'id'),
      count(*)::integer
    into menu, service_total, total_minutes, service_names, matched_service_count
    from jsonb_array_elements(w.content->'services') as s
   where p_services ? (s->>'id');

  if matched_service_count <> jsonb_array_length(p_services)
     or coalesce(total_minutes, 0) < 1
     or coalesce(total_minutes, 0) > 720
     or coalesce(service_total, -1) < 0 then
    raise exception 'One of the selected services is no longer available' using errcode = 'P0001';
  end if;

  request_fingerprint := md5(jsonb_build_array(
    p_owner, p_slug, p_services, p_date, p_time, chosen_stylist,
    clean_name, phone_digits, clean_instructions, actual_branch
  )::text);

  perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text || p_request::text, 8));
  select * into existing_request
    from public.studioflow_android_requests
   where customer_id = p_customer_id
     and request_id = p_request;

  if existing_request.booking_id is not null then
    if existing_request.fingerprint <> request_fingerprint then
      raise exception 'Booking request changed. Please start a new request.' using errcode = 'P0001';
    end if;
    select * into existing_booking
      from public.studioflow_bookings
     where id = existing_request.booking_id
       and owner_id = p_owner;
    if existing_booking.id is null then
      raise exception 'Previous booking record is unavailable' using errcode = 'P0001';
    end if;
    return existing_booking.payload;
  end if;

  booking_start := (p_date + p_time::time) at time zone 'Asia/Kolkata';
  booking_end := booking_start + total_minutes * interval '1 minute';
  if booking_start <= now() or booking_start > now() + interval '90 days' then
    raise exception 'Choose a future appointment within 90 days' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner::text || chosen_stylist, 0));
  if exists (
    select 1
      from public.studioflow_bookings other
     where other.owner_id = p_owner
       and other.stylist_id = chosen_stylist
       and other.status in ('pending', 'confirmed')
       and (other.status = 'confirmed' or other.hold_expires_at is null or other.hold_expires_at > now())
       and other.starts_at < booking_end
       and other.ends_at > booking_start
  ) then
    raise exception 'This time was just booked. Please choose another slot.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.studioflow_bookings
     where owner_id = p_owner
       and external_idempotency_key = 'whatsapp:' || p_request::text
  ) then
    raise exception 'This WhatsApp booking request was already processed' using errcode = 'P0001';
  end if;

  insert into public.studioflow_bookings (
    id, owner_id, customer_id, stylist_id, starts_at, ends_at,
    status, hold_expires_at, payload, branch_id, booking_source, external_idempotency_key
  ) values (
    booking_id, p_owner, p_customer_id, chosen_stylist, booking_start, booking_end,
    'pending', now() + interval '15 minutes',
    jsonb_build_object(
      'id', booking_id,
      'clientName', clean_name,
      'clientPhone', p_phone,
      'serviceId', p_services->>0,
      'serviceIds', p_services,
      'serviceName', service_names,
      'servicePrice', service_total,
      'serviceItems', menu,
      'durationMinutes', total_minutes,
      'stylistId', chosen_stylist,
      'stylistName', coalesce(candidate->>'stylistName', ''),
      'date', p_date,
      'time', p_time,
      'instructions', clean_instructions,
      'status', 'pending',
      'paymentStatus', 'pay_at_salon',
      'amountPaid', 0,
      'source', 'whatsapp',
      'bookingSource', 'whatsapp',
      'branchId', actual_branch,
      'createdAt', now()
    ),
    actual_branch, 'whatsapp', 'whatsapp:' || p_request::text
  );

  insert into public.studioflow_android_requests(customer_id, request_id, fingerprint, booking_id)
  values (p_customer_id, p_request, request_fingerprint, booking_id);

  return (select payload from public.studioflow_bookings where id = booking_id);
end;
$$;

revoke all on function studioflow_whatsapp_private.book_guest(uuid, text, jsonb, date, text, text, text, text, text, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function studioflow_whatsapp_private.book_guest(uuid, text, jsonb, date, text, text, text, text, text, uuid, uuid, uuid) to service_role;

comment on function studioflow_whatsapp_private.book_guest(uuid, text, jsonb, date, text, text, text, text, text, uuid, uuid, uuid)
is 'Creates a WhatsApp-originated pending salon reservation for a verified WhatsApp phone identity. Callable only by trusted Edge Functions using service_role.';

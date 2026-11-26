-- Additive repair; leave previously applied migration versions unchanged.
-- SECURITY INVOKER facades need EXECUTE on their private helper as service_role.
grant usage on schema studioflow_private to service_role;
grant execute on function studioflow_private.nexora_whatsapp_token_key() to service_role;
grant execute on function studioflow_private.nexora_whatsapp_meta_secret(text) to service_role;

-- Include the phone number captured by StudioFlow's customer signup in
-- the private phone lookup used by NEXORA's WhatsApp booking flow.
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
  if length(v_digits) not between 10 and 15 then return null; end if;

  select u.id into v_customer_id
  from auth.users u
  left join public.profiles p on p.id = u.id
  where regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g') = v_digits
     or regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = v_digits
     or regexp_replace(coalesce(p.phone_number, ''), '[^0-9]', '', 'g') = v_digits
     or regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g') = v_digits
     or regexp_replace(coalesce((to_jsonb(p)->>'whatsapp_number'), ''), '[^0-9]', '', 'g') = v_digits
     or regexp_replace(coalesce((to_jsonb(p)->>'mobile'), ''), '[^0-9]', '', 'g') = v_digits
     or exists (
       select 1
       from public.studioflow_android_profiles ap
       where ap.customer_id = u.id
         and (
           regexp_replace(coalesce(ap.phone, ''), '[^0-9]', '', 'g') = v_digits
           or regexp_replace(coalesce(ap.whatsapp_number, ''), '[^0-9]', '', 'g') = v_digits
         )
     )
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

CREATE OR REPLACE FUNCTION studioflow_whatsapp_private.book_guest(p_owner uuid, p_slug text, p_services jsonb, p_date date, p_time text, p_stylist text, p_name text, p_phone text, p_instructions text, p_request uuid, p_customer_id uuid, p_branch uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  w public.studioflow_websites;
  customer_ok boolean;
  branch_count integer := 0;
  actual_branch uuid := p_branch;
  available_slots jsonb;
  candidate jsonb;
  chosen_stylist text;
  menu jsonb;
  service_total numeric;
  total_minutes integer;
  service_names text;
  matched_service_count integer;
  service_count integer;
  booking_start timestamptz;
  booking_end timestamptz;
  booking_id uuid := gen_random_uuid();
  request_fingerprint text;
  existing_request public.studioflow_android_requests;
  existing_booking public.studioflow_bookings;
  phone_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  clean_name text := btrim(coalesce(p_name, ''));
  clean_instructions text := left(btrim(coalesce(p_instructions, '')), 1000);
  time_value time;
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
     or p_time is null
     or length(p_time) <> 5
     or substring(p_time, 3, 1) <> ':'
     or substring(p_time, 1, 2) !~ '^[0-2][0-9]$'
     or substring(p_time, 4, 2) !~ '^[0-5][0-9]$'
     or substring(p_time, 1, 2)::integer > 23 then
    raise exception 'Choose a valid future date and time' using errcode = '22023';
  end if;
  time_value := p_time::time;

  select * into w
  from public.studioflow_websites
  where owner_id = p_owner and slug = p_slug;
  if w.owner_id is null then
    raise exception 'This salon website is not published for this owner' using errcode = '42501';
  end if;

  select exists (
    select 1
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.studioflow_android_profiles ap on ap.customer_id = u.id
    where u.id = p_customer_id
      and (
        regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g') = phone_digits
        or regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = phone_digits
        or regexp_replace(coalesce(p.phone_number, ''), '[^0-9]', '', 'g') = phone_digits
        or regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g') = phone_digits
        or regexp_replace(coalesce((to_jsonb(p)->>'whatsapp_number'), ''), '[^0-9]', '', 'g') = phone_digits
        or regexp_replace(coalesce((to_jsonb(p)->>'mobile'), ''), '[^0-9]', '', 'g') = phone_digits
        or regexp_replace(coalesce(ap.phone, ''), '[^0-9]', '', 'g') = phone_digits
        or regexp_replace(coalesce(ap.whatsapp_number, ''), '[^0-9]', '', 'g') = phone_digits
      )
  ) into customer_ok;
  if not coalesce(customer_ok, false) then
    raise exception 'Customer WhatsApp identity could not be verified' using errcode = '42501';
  end if;

  select count(*)::integer into branch_count
  from public.branches
  where site_id = p_owner and is_active = true;

  if actual_branch is not null then
    if not exists (
      select 1 from public.branches
      where id = actual_branch and site_id = p_owner and is_active = true
    ) then
      raise exception 'Selected salon location is not active' using errcode = '22023';
    end if;
  elsif branch_count > 1 then
    raise exception 'Choose a salon location before booking' using errcode = '22023';
  elsif branch_count = 1 then
    select id into actual_branch
    from public.branches
    where site_id = p_owner and is_active = true
    order by created_at
    limit 1;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_services) as service_item(value)
    where jsonb_typeof(service_item.value) <> 'string'
  ) then
    raise exception 'Service IDs must be text values' using errcode = '22023';
  end if;

  select count(distinct service_item.value)::integer into service_count
  from jsonb_array_elements_text(p_services) as service_item(value);
  if service_count <> jsonb_array_length(p_services) then
    raise exception 'Choose different services only' using errcode = '22023';
  end if;

  if actual_branch is not null then
    select public.studioflow_branch_android_slots(
      p_slug, p_services, p_date, coalesce(nullif(p_stylist, ''), 'any'), actual_branch
    ) into available_slots;
  else
    select public.studioflow_android_slots(
      p_slug, p_services, p_date, coalesce(nullif(p_stylist, ''), 'any')
    ) into available_slots;
  end if;

  select slot.value into candidate
  from jsonb_array_elements(coalesce(available_slots, '[]'::jsonb)) as slot(value)
  where slot.value->>'time' = p_time
    and coalesce((slot.value->>'available')::boolean, true)
    and (
      coalesce(p_stylist, 'any') in ('any', 'any_available', 'any-specialist')
      or slot.value->>'stylistId' = p_stylist
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
    jsonb_agg(service_item.value order by service_item.value->>'id'),
    sum((service_item.value->>'price')::numeric),
    sum((service_item.value->>'durationMinutes')::integer),
    string_agg(service_item.value->>'name', ' + ' order by service_item.value->>'id'),
    count(*)::integer
  into menu, service_total, total_minutes, service_names, matched_service_count
  from jsonb_array_elements(w.content->'services') as service_item(value)
  where p_services ? (service_item.value->>'id');

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
  where customer_id = p_customer_id and request_id = p_request;

  if existing_request.booking_id is not null then
    if existing_request.fingerprint <> request_fingerprint then
      raise exception 'Booking request changed. Please start a new request.' using errcode = 'P0001';
    end if;
    select * into existing_booking
    from public.studioflow_bookings
    where id = existing_request.booking_id and owner_id = p_owner;
    if existing_booking.id is null then
      raise exception 'Previous booking record is unavailable' using errcode = 'P0001';
    end if;
    return existing_booking.payload;
  end if;

  booking_start := (p_date + time_value) at time zone 'Asia/Kolkata';
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
$function$
;

create or replace function public.studioflow_whatsapp_register_payment_link(
  p_owner uuid,
  p_booking uuid,
  p_order text,
  p_amount bigint,
  p_payment_link_id text,
  p_payment_link_url text,
  p_expire_by bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.studioflow_bookings;
  o public.studioflow_payment_orders;
  expected_amount bigint;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Trusted WhatsApp service role required' using errcode = '42501';
  end if;
  if coalesce(p_order, '') = '' or coalesce(p_payment_link_id, '') = ''
     or coalesce(p_payment_link_url, '') = '' or p_amount is null or p_amount < 100 then
    raise exception 'Payment link details are incomplete' using errcode = '22023';
  end if;

  -- Follow settlement/cancellation lock order: payment row, then booking.
  select * into o from public.studioflow_payment_orders where booking_id = p_booking for update;

  select * into b
    from public.studioflow_bookings
   where id = p_booking and owner_id = p_owner
   for update;
  if b.id is null or b.booking_source <> 'whatsapp' then
    raise exception 'WhatsApp booking not found for this salon' using errcode = '42501';
  end if;
  if b.status <> 'pending' or b.hold_expires_at is null or b.hold_expires_at <= now() then
    raise exception 'Booking hold expired; create a new booking request' using errcode = 'P0001';
  end if;

  expected_amount := ceil((b.payload->>'servicePrice')::numeric * 100 * 0.25)::bigint;
  if p_amount <> expected_amount or expected_amount < 100 then
    raise exception 'Payment link amount does not match the required 25 percent advance' using errcode = '22023';
  end if;

  select * into o from public.studioflow_payment_orders where booking_id = b.id;
  if o.status = 'captured' or o.payment_id is not null then
    return jsonb_build_object(
      'booking_id', b.id,
      'status', o.status,
      'payment_id', o.payment_id,
      'already_paid', true
    );
  end if;

  if o.payment_link_id is not null and o.payment_link_status = 'created' then
    return to_jsonb(o); -- Preserve the active link if two workers race.
  end if;

  if o.booking_id is null then
    insert into public.studioflow_payment_orders(
      booking_id, order_id, amount_paise, currency, status,
      payment_link_id, payment_link_url, payment_link_status
    ) values (
      b.id, p_order, p_amount, 'INR', 'created',
      p_payment_link_id, p_payment_link_url, 'created'
    )
    returning * into o;
  else
    update public.studioflow_payment_orders
       set order_id = p_order,
           amount_paise = p_amount,
           payment_link_id = p_payment_link_id,
           payment_link_url = p_payment_link_url,
           payment_link_status = 'created'
     where booking_id = b.id
       and status = 'created'
       and payment_id is null
    returning * into o;

    if o.booking_id is null then
      select * into o from public.studioflow_payment_orders where booking_id = b.id;
      if o.payment_link_id is distinct from p_payment_link_id then
        raise exception 'Another payment link is already being created for this booking' using errcode = 'P0001';
      end if;
    end if;
  end if;

  return to_jsonb(o);
end;
$$;

revoke all on function public.studioflow_whatsapp_register_payment_link(uuid, uuid, text, bigint, text, text, bigint) from public, anon, authenticated;
grant execute on function public.studioflow_whatsapp_register_payment_link(uuid, uuid, text, bigint, text, text, bigint) to service_role;

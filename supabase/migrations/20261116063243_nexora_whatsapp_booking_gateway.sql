-- Trusted server-side facade for multi-branch WhatsApp bookings and
-- payment-link registration. Public browser roles cannot call these functions.

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
   where regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g') = v_digits
      or exists (
        select 1 from public.profiles p
         where p.id = u.id
           and (
             regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = v_digits
             or regexp_replace(coalesce(p.phone_number, ''), '[^0-9]', '', 'g') = v_digits
             or regexp_replace(coalesce(p.whatsapp, ''), '[^0-9]', '', 'g') = v_digits
             or regexp_replace(coalesce(p.whatsapp_number, ''), '[^0-9]', '', 'g') = v_digits
             or regexp_replace(coalesce(p.mobile, ''), '[^0-9]', '', 'g') = v_digits
           )
      )
      or exists (
        select 1 from public.studioflow_android_profiles ap
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

create or replace function public.studioflow_whatsapp_book_guest(
  p_owner uuid,
  p_customer uuid,
  p_slug text,
  p_request jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_services jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Trusted WhatsApp service role required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_request->'serviceIds') = 'array' then
    v_services := p_request->'serviceIds';
  elsif nullif(p_request->>'serviceId', '') is not null then
    v_services := jsonb_build_array(p_request->>'serviceId');
  else
    raise exception 'Select at least one service' using errcode = '22023';
  end if;

  return studioflow_whatsapp_private.book_guest(
    p_owner,
    p_slug,
    v_services,
    (p_request->>'date')::date,
    p_request->>'time',
    coalesce(nullif(p_request->>'stylistId', ''), 'any'),
    p_request->>'clientName',
    p_request->>'clientPhone',
    coalesce(p_request->>'instructions', ''),
    (p_request->>'requestId')::uuid,
    p_customer,
    nullif(p_request->>'branchId', '')::uuid
  );
end;
$$;

revoke all on function public.studioflow_whatsapp_book_guest(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.studioflow_whatsapp_book_guest(uuid, uuid, text, jsonb) to service_role;

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

  select * into o from public.studioflow_payment_orders where booking_id = b.id for update;
  if o.status = 'captured' or o.payment_id is not null then
    return jsonb_build_object(
      'booking_id', b.id,
      'status', o.status,
      'payment_id', o.payment_id,
      'already_paid', true
    );
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

comment on function public.studioflow_whatsapp_book_guest(uuid, uuid, text, jsonb)
is 'Server-only WhatsApp guest booking facade. Uses branch-aware live availability and the canonical StudioFlow bookings table.';
comment on function public.studioflow_whatsapp_register_payment_link(uuid, uuid, text, bigint, text, text, bigint)
is 'Server-only registration of a Razorpay Payment Link against a WhatsApp booking with the mandatory 25 percent deposit.';

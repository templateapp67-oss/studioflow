-- Keep WhatsApp cancellation lock order consistent with payment settlement.
CREATE OR REPLACE FUNCTION public.nexora_whatsapp_cancel_pending(p_owner uuid, p_booking uuid, p_phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  b public.studioflow_bookings;
  o public.studioflow_payment_orders;
  phone_digits text := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if p_owner is null or p_booking is null or length(phone_digits) not between 10 and 15 then
    raise exception 'Invalid cancellation request' using errcode='22023';
  end if;

  -- Lock the payment order first, matching studioflow_private.settle_payment.
  -- A consistent lock order avoids booking/payment deadlocks during a paid-vs-cancel race.
  select * into o
  from public.studioflow_payment_orders
  where booking_id=p_booking
  for update;

  select * into b
  from public.studioflow_bookings
  where id=p_booking and owner_id=p_owner and booking_source='whatsapp'
  for update;
  if b.id is null then
    raise exception 'WhatsApp booking not found' using errcode='P0002';
  end if;
  if regexp_replace(coalesce(b.payload->>'clientPhone',''),'[^0-9]','','g') <> phone_digits then
    raise exception 'Customer phone does not match this booking' using errcode='42501';
  end if;
  if b.status='cancelled' then
    select * into o from public.studioflow_payment_orders where booking_id=b.id;
    return jsonb_build_object('cancelled',true,'bookingId',b.id,'paymentLinkId',o.payment_link_id,'alreadyCancelled',true);
  end if;
  if b.status <> 'pending' then
    raise exception 'Only unpaid WhatsApp booking requests can be cancelled here' using errcode='P0001';
  end if;

  if o.status='captured' then
    raise exception 'This booking has a verified payment. Contact the salon for help.' using errcode='P0001';
  end if;

  update public.studioflow_bookings
  set status='cancelled',
      hold_expires_at=null,
      payload=payload || jsonb_build_object('status','cancelled','cancelledAt',now(),'cancellationSource','whatsapp')
  where id=b.id;

  return jsonb_build_object(
    'cancelled',true,
    'bookingId',b.id,
    'paymentLinkId',o.payment_link_id,
    'paymentLinkStatus',o.payment_link_status
  );
end;
$function$
;

revoke all on function public.nexora_whatsapp_cancel_pending(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.nexora_whatsapp_cancel_pending(uuid,uuid,text) to service_role;
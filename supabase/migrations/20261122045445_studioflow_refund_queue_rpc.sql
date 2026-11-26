-- Restore the server-side refund queue RPCs consumed by studioflow-payments.
-- Function-only, additive migration: no existing bookings or payment orders are
-- changed while this migration is applied. Execution is restricted to the
-- Supabase service role used by the payment Edge Function.

begin;

create or replace function public.studioflow_expire_unpaid_holds()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  changed_rows integer := 0;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Trusted payment service role required' using errcode = '42501';
  end if;

  -- Expire only pending reservations whose hold deadline has passed and that
  -- do not have a recorded payment. Captured/refund states are never touched.
  update public.studioflow_bookings b
     set status = 'cancelled',
         payload = coalesce(b.payload, '{}'::jsonb) || jsonb_build_object(
           'status', 'cancelled',
           'paymentStatus', 'expired',
           'reservationExpiredAt', now()
         )
   where b.status = 'pending'
     and b.hold_expires_at is not null
     and b.hold_expires_at <= now()
     and not exists (
       select 1
       from public.studioflow_payment_orders o
       where o.booking_id = b.id
         and (
           o.payment_id is not null
           or o.status in ('captured', 'refund_required', 'refunding', 'refunded', 'refund_failed')
         )
     );

  get diagnostics changed_rows = row_count;
  return changed_rows;
end;
$function$;

create or replace function public.studioflow_claim_refunds(
  p_limit integer default 10
)
returns table (
  order_id text,
  payment_id text,
  amount_paise bigint
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  safe_limit integer := greatest(1, least(coalesce(p_limit, 10), 50));
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Trusted payment service role required' using errcode = '42501';
  end if;

  -- Claim atomically. SKIP LOCKED allows multiple workers without returning
  -- the same payment twice. Only confirmed refund_required rows with a real
  -- payment reference and valid INR amount enter the provider refund queue.
  return query
  with candidates as (
    select o.booking_id
    from public.studioflow_payment_orders o
    where o.status = 'refund_required'
      and o.payment_id is not null
      and o.amount_paise >= 100
      and o.currency = 'INR'
    order by o.verified_at nulls first, o.created_at, o.order_id
    limit safe_limit
    for update skip locked
  ),
  claimed as (
    update public.studioflow_payment_orders o
       set status = 'refunding',
           refund_status = 'required',
           refund_error = null
      from candidates c
     where o.booking_id = c.booking_id
       and o.status = 'refund_required'
       and o.payment_id is not null
    returning o.order_id, o.payment_id, o.amount_paise
  )
  select c.order_id, c.payment_id, c.amount_paise
  from claimed c;
end;
$function$;

revoke all on function public.studioflow_expire_unpaid_holds()
  from public, anon, authenticated;
revoke all on function public.studioflow_claim_refunds(integer)
  from public, anon, authenticated;
grant execute on function public.studioflow_expire_unpaid_holds()
  to service_role;
grant execute on function public.studioflow_claim_refunds(integer)
  to service_role;

do $assert$
begin
  if to_regprocedure('public.studioflow_expire_unpaid_holds()') is null
     or to_regprocedure('public.studioflow_claim_refunds(integer)') is null
     or to_regclass('public.studioflow_payment_orders') is null
     or to_regclass('public.studioflow_bookings') is null then
    raise exception 'StudioFlow refund queue prerequisites are missing';
  end if;
end;
$assert$;

commit;


create or replace function public.studioflow_customer_features_admin(p_action text,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg jsonb;g public.studioflow_package_gifts;items jsonb;d record;result jsonb:='[]';
begin
 if p_action='config' then
  select settings into cfg from studioflow_private.customer_feature_config where id=true for update;
  if not(cfg ? 'vapid') and p_data ? 'vapid' then update studioflow_private.customer_feature_config set settings=settings||jsonb_build_object('vapid',p_data->'vapid') where id=true returning settings into cfg;end if;return cfg;
 elsif p_action='register_order' then
  update public.studioflow_package_gifts set order_id=coalesce(order_id,p_data->>'order') where id=(p_data->>'id')::uuid and buyer_id=(p_data->>'actor')::uuid and status='pending' returning * into g;
  if g.id is null then raise exception 'Gift order is unavailable';end if;return to_jsonb(g);
 elsif p_action='settle_gift' then
  select * into g from public.studioflow_package_gifts where order_id=p_data->>'order' for update;
  if g.id is null or g.amount_paise<>(p_data->>'amount')::bigint then raise exception 'Gift payment mismatch';end if;
  if g.status in ('paid','redeemed') then if g.payment_id<>p_data->>'payment' then raise exception 'Payment reference mismatch';end if;return to_jsonb(g);end if;
  if g.status<>'pending' then raise exception 'Gift is not payable';end if;
  update public.studioflow_package_gifts set status='paid',paid_at=now(),payment_id=p_data->>'payment',voucher_code='NXG-'||upper(encode(extensions.gen_random_bytes(16),'hex')),email_status='pending',email_retry_at=now() where id=g.id returning * into g;return to_jsonb(g);
 elsif p_action='redeem_gift' then
  update public.studioflow_package_gifts set status='redeemed',redeemed_at=now() where voucher_code=upper(btrim(p_data->>'code')) and owner_id=(p_data->>'actor')::uuid and status='paid' returning * into g;
  if g.id is null then raise exception 'Voucher is not active at your salon';end if;return jsonb_build_object('package',g.service_name,'status',g.status);
 elsif p_action='queue' then
  insert into studioflow_private.web_push_deliveries(subscription_id,booking_id,starts_at,minutes_before)
   select s.id,b.id,b.starts_at,v.minutes from public.studioflow_bookings b join public.studioflow_web_push_subscriptions s on s.customer_id=b.customer_id and s.active join public.studioflow_customer_preferences p on p.customer_id=b.customer_id and p.notifications_enabled cross join (values(60),(1440)) v(minutes)
   where b.status='confirmed' and b.starts_at>now() and b.starts_at-make_interval(mins=>v.minutes) between now()-interval '5 minutes' and now() and b.created_at<=b.starts_at-make_interval(mins=>v.minutes) and s.created_at<=b.starts_at on conflict do nothing;
  for d in select x.*,s.subscription from studioflow_private.web_push_deliveries x join public.studioflow_web_push_subscriptions s on s.id=x.subscription_id and s.active join public.studioflow_bookings b on b.id=x.booking_id and b.customer_id=s.customer_id and b.status='confirmed' and b.starts_at=x.starts_at join public.studioflow_customer_preferences p on p.customer_id=b.customer_id and p.notifications_enabled where x.status<>'sent' and x.attempts<5 and (x.locked_until is null or x.locked_until<now()) and b.starts_at>now() order by x.starts_at limit 40 for update of x skip locked loop
   update studioflow_private.web_push_deliveries set attempts=attempts+1,locked_until=now()+interval '5 minutes' where id=d.id;result:=result||jsonb_build_array(jsonb_build_object('id',d.id,'subscriptionId',d.subscription_id,'subscription',d.subscription,'booking',d.booking_id,'startsAt',d.starts_at,'minutes',d.minutes_before));
  end loop;return result;
 elsif p_action='push_result' then
  update studioflow_private.web_push_deliveries set status=case when (p_data->>'sent')::boolean then 'sent' else 'pending' end,sent_at=case when (p_data->>'sent')::boolean then now() else null end,locked_until=case when (p_data->>'sent')::boolean then null else now()+interval '5 minutes' end where id=(p_data->>'id')::uuid;
  if coalesce((p_data->>'expired')::boolean,false) then update public.studioflow_web_push_subscriptions set active=false where id=(p_data->>'subscriptionId')::uuid;end if;return '{}';
 elsif p_action='gift_queue' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into items from (select * from public.studioflow_package_gifts where status='paid' and email_status in ('pending','retry') and email_attempts<10 and coalesce(email_retry_at,now())<=now() order by paid_at limit 10 for update skip locked) x;
  update public.studioflow_package_gifts set email_attempts=email_attempts+1,email_retry_at=now()+interval '5 minutes' where id in (select (value->>'id')::uuid from jsonb_array_elements(items));return items;
 elsif p_action='email_result' then
  update public.studioflow_package_gifts set email_status=case when (p_data->>'sent')::boolean then 'sent' else 'retry' end,email_retry_at=now()+interval '15 minutes' where id=(p_data->>'id')::uuid;return '{}';
 elsif p_action='pending_gifts' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into items from (select * from public.studioflow_package_gifts where status='pending' and order_id is not null and created_at between now()-interval '2 days' and now()-interval '1 minute' order by created_at limit 10) x;return items;
 end if;
 raise exception 'Unsupported operation';
end $$;

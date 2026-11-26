-- Customer web push and paid package gifts. Existing loyalty/favorites remain authoritative.
create table if not exists studioflow_private.customer_feature_config(id boolean primary key default true check(id),settings jsonb not null default '{}'::jsonb);
alter table studioflow_private.customer_feature_config enable row level security;
revoke all on studioflow_private.customer_feature_config from public,anon,authenticated;
insert into studioflow_private.customer_feature_config(id,settings) values(true,jsonb_build_object('workerToken',encode(extensions.gen_random_bytes(32),'hex'))) on conflict do nothing;
create table if not exists public.studioflow_web_push_subscriptions(id uuid primary key default gen_random_uuid(),customer_id uuid not null references auth.users(id) on delete cascade,endpoint text not null unique check(length(endpoint)<2048),subscription jsonb not null,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.studioflow_web_push_subscriptions enable row level security;
revoke all on public.studioflow_web_push_subscriptions from anon,authenticated;
grant select on public.studioflow_web_push_subscriptions to authenticated;
create policy "own_push_subscriptions" on public.studioflow_web_push_subscriptions for select to authenticated using(customer_id=(select auth.uid()));
create index on public.studioflow_web_push_subscriptions(customer_id) where active;
create table if not exists studioflow_private.web_push_deliveries(id uuid primary key default gen_random_uuid(),subscription_id uuid not null references public.studioflow_web_push_subscriptions(id) on delete cascade,booking_id uuid not null references public.studioflow_bookings(id) on delete cascade,starts_at timestamptz not null,minutes_before int not null check(minutes_before in (60,1440)),status text not null default 'pending',attempts int not null default 0,locked_until timestamptz,sent_at timestamptz,unique(subscription_id,booking_id,starts_at,minutes_before));
alter table studioflow_private.web_push_deliveries enable row level security;
revoke all on studioflow_private.web_push_deliveries from public,anon,authenticated;
create table if not exists public.studioflow_package_gifts(id uuid primary key default gen_random_uuid(),buyer_id uuid not null references auth.users(id),owner_id uuid not null references public.studioflow_accounts(user_id),salon_slug text not null,service_id text not null,service_name text not null,salon_name text not null,recipient_email text not null,amount_paise bigint not null check(amount_paise>=100),request_id uuid not null,status text not null default 'pending' check(status in ('pending','paid','redeemed','refunded')),order_id text unique,payment_id text unique,voucher_code text unique,email_status text not null default 'waiting',email_attempts int not null default 0,email_retry_at timestamptz,created_at timestamptz not null default now(),paid_at timestamptz,redeemed_at timestamptz,unique(buyer_id,request_id));
alter table public.studioflow_package_gifts enable row level security;
revoke all on public.studioflow_package_gifts from anon,authenticated;
grant select on public.studioflow_package_gifts to authenticated;
create policy "gift_buyer_or_salon" on public.studioflow_package_gifts for select to authenticated using(buyer_id=(select auth.uid()) or owner_id=(select auth.uid()));
create index on public.studioflow_package_gifts(buyer_id,created_at desc);
create index on public.studioflow_package_gifts(status,email_status,created_at);

create or replace function studioflow_android_private.push_subscription(p_data jsonb,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();v_endpoint text:=p_data->>'endpoint';
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501';end if;
 if v_endpoint is null or length(v_endpoint)>2047 or v_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com|web\.push\.apple\.com)/' then raise exception 'Unsupported push endpoint';end if;
 if not p_active then update public.studioflow_web_push_subscriptions set active=false,updated_at=now() where customer_id=actor and studioflow_web_push_subscriptions.endpoint=v_endpoint;return;end if;
 if coalesce(p_data->'keys'->>'p256dh','') !~ '^[A-Za-z0-9_-]{80,120}$' or coalesce(p_data->'keys'->>'auth','') !~ '^[A-Za-z0-9_-]{20,30}$' then raise exception 'Invalid push subscription';end if;
 insert into public.studioflow_web_push_subscriptions(customer_id,endpoint,subscription) values(actor,v_endpoint,p_data) on conflict(endpoint) do update set customer_id=actor,subscription=excluded.subscription,active=true,updated_at=now();
 insert into public.studioflow_customer_preferences(customer_id,theme,language,notifications_enabled) values(actor,'light','en',true) on conflict(customer_id) do update set notifications_enabled=true;
end $$;
revoke all on function studioflow_android_private.push_subscription(jsonb,boolean) from public,anon;
grant execute on function studioflow_android_private.push_subscription(jsonb,boolean) to authenticated;
create or replace function public.studioflow_web_push_subscription(p_subscription jsonb,p_active boolean default true) returns void language sql security invoker set search_path='' as $$select studioflow_android_private.push_subscription(p_subscription,p_active)$$;
revoke all on function public.studioflow_web_push_subscription(jsonb,boolean) from public,anon;
grant execute on function public.studioflow_web_push_subscription(jsonb,boolean) to authenticated;

create or replace function studioflow_android_private.prepare_gift(p_slug text,p_service text,p_email text,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();w public.studioflow_websites;s jsonb;g public.studioflow_package_gifts;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_request is null or p_email is null or length(p_email)>254 or p_email !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then raise exception 'Enter a valid recipient email';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,664));
 select * into g from public.studioflow_package_gifts where buyer_id=actor and request_id=p_request;
 if found then if g.salon_slug<>p_slug or g.service_id<>p_service or g.recipient_email<>lower(btrim(p_email)) then raise exception 'Purchase details changed. Start a new gift.';end if;return to_jsonb(g);end if;
 if (select count(*) from public.studioflow_package_gifts where buyer_id=actor and created_at>now()-interval '1 day')>=15 then raise exception 'Daily gift purchase limit reached';end if;
 select * into w from public.studioflow_websites where slug=p_slug and slug not like 'studioflow-qa-%';
 select value into s from jsonb_array_elements(coalesce(w.content->'services','[]')) where value->>'id'=p_service and (value->>'name'||' '||coalesce(value->>'category','')) ~* '(package|combo|bundle|festiv)';
 if s is null or coalesce((s->>'price')::numeric,0)<1 or (s->>'price')::numeric>1000000 then raise exception 'Package is not available for gifting';end if;
 insert into public.studioflow_package_gifts(buyer_id,owner_id,salon_slug,service_id,service_name,salon_name,recipient_email,amount_paise,request_id) values(actor,w.owner_id,w.slug,p_service,s->>'name',w.content->'profile'->>'businessName',lower(btrim(p_email)),round((s->>'price')::numeric*100),p_request) returning * into g;return to_jsonb(g);
end $$;
revoke all on function studioflow_android_private.prepare_gift(text,text,text,uuid) from public,anon;
grant execute on function studioflow_android_private.prepare_gift(text,text,text,uuid) to authenticated;
create or replace function public.studioflow_prepare_gift(p_slug text,p_service text,p_email text,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$select studioflow_android_private.prepare_gift(p_slug,p_service,p_email,p_request)$$;
revoke all on function public.studioflow_prepare_gift(text,text,text,uuid) from public,anon;
grant execute on function public.studioflow_prepare_gift(text,text,text,uuid) to authenticated;

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
  for d in select x.*,s.subscription from studioflow_private.web_push_deliveries x join public.studioflow_web_push_subscriptions s on s.id=x.subscription_id and s.active join public.studioflow_bookings b on b.id=x.booking_id and b.status='confirmed' and b.starts_at=x.starts_at join public.studioflow_customer_preferences p on p.customer_id=b.customer_id and p.notifications_enabled where x.status<>'sent' and x.attempts<5 and (x.locked_until is null or x.locked_until<now()) and b.starts_at>now() order by x.starts_at limit 40 for update of x skip locked loop
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
revoke all on function public.studioflow_customer_features_admin(text,jsonb) from public,anon,authenticated;
grant execute on function public.studioflow_customer_features_admin(text,jsonb) to service_role;
create or replace function studioflow_private.dispatch_customer_features() returns void language plpgsql security definer set search_path='' as $$
declare token text;
begin
 select settings->>'workerToken' into token from studioflow_private.customer_feature_config where id=true;
 perform net.http_post(url:='https://zilwgiuiygqqardzutxi.supabase.co/functions/v1/studioflow-customer-services',headers:=jsonb_build_object('Content-Type','application/json','x-worker-token',token),body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=50000);
end $$;
revoke all on function studioflow_private.dispatch_customer_features() from public,anon,authenticated;
select cron.schedule('studioflow-customer-reminders','* * * * *','select studioflow_private.dispatch_customer_features();');

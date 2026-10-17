-- Existing StudioFlow project: salon-scoped points and server-issued reward vouchers.
create table if not exists public.studioflow_customer_reward_claims (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references auth.users(id),
 owner_id uuid not null references public.studioflow_accounts(user_id),
 reward_id text not null, reward_title text not null, reward_terms jsonb not null,
 points_spent integer not null check(points_spent>0),
 coupon_code text not null unique, request_id uuid not null,
 status text not null default 'active' check(status in ('active','used')),
 created_at timestamptz not null default now(), used_at timestamptz,
 unique(customer_id,request_id)
);
create index if not exists studioflow_customer_reward_claims_customer_owner on public.studioflow_customer_reward_claims(customer_id,owner_id,created_at desc);
create index if not exists studioflow_customer_reward_claims_owner on public.studioflow_customer_reward_claims(owner_id,created_at desc);
alter table public.studioflow_customer_reward_claims enable row level security;
revoke all on public.studioflow_customer_reward_claims from anon,authenticated;
grant select on public.studioflow_customer_reward_claims to authenticated;
drop policy if exists reward_claim_participants on public.studioflow_customer_reward_claims;
create policy reward_claim_participants on public.studioflow_customer_reward_claims for select to authenticated using ((select auth.uid())=customer_id or (select auth.uid())=owner_id);

create or replace function studioflow_android_private.visit_earnings(p_owner uuid,p_customer uuid) returns bigint
language sql stable security definer set search_path='' as $$
 select coalesce(sum(greatest(0,coalesce((a.draft->'loyaltyConfig'->>'pointsPerVisit')::int,50))+floor((b.payload->>'servicePrice')::numeric/100)*greatest(0,coalesce((a.draft->'loyaltyConfig'->>'pointsPerHundredSpent')::int,10))),0)::bigint
 from public.studioflow_bookings b join public.studioflow_accounts a on a.user_id=b.owner_id
 where b.customer_id=p_customer and b.owner_id=p_owner and b.status='completed';
$$;
revoke all on function studioflow_android_private.visit_earnings(uuid,uuid) from public,anon,authenticated;

create or replace function studioflow_android_private.reward_earnings(p_owner uuid,p_customer uuid) returns bigint
language sql stable security definer set search_path='' as $$
 select studioflow_android_private.visit_earnings(p_owner,p_customer)+coalesce((select sum(points) from public.studioflow_customer_referrals where inviter_id=p_customer and owner_id=p_owner),0)::bigint;
$$;
revoke all on function studioflow_android_private.reward_earnings(uuid,uuid) from public,anon,authenticated;

create or replace function studioflow_android_private.rewards_dashboard() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); w record; earned bigint; spent bigint; balance bigint; thresholds jsonb; tier text; next_tier text; next_at bigint; tier_at bigint; wallets jsonb:='[]'; vouchers jsonb:='[]'; ledger jsonb; claims jsonb; r jsonb; threshold record;
begin
 for w in select s.owner_id,s.slug,s.content,a.draft from public.studioflow_websites s join public.studioflow_accounts a on a.user_id=s.owner_id where s.slug not like 'studioflow-qa-%' and coalesce((s.content->'loyaltyConfig'->>'programEnabled')::boolean,false) order by s.published_at desc loop
  earned:=case when actor is null then 0 else studioflow_android_private.reward_earnings(w.owner_id,actor) end;
  select coalesce(sum(points_spent),0) into spent from public.studioflow_customer_reward_claims where customer_id=actor and owner_id=w.owner_id;
  balance:=greatest(0,earned-spent);
  thresholds:=coalesce(w.draft->'loyaltyConfig'->'tierThresholds','{"bronze":0,"silver":300,"gold":800,"platinum":1800}'::jsonb);
  tier:='Member';next_tier:=null;next_at:=null;tier_at:=0;
  for threshold in select key,value::text::bigint as minimum from jsonb_each(thresholds) where value::text ~ '^\d+$' order by value::text::bigint loop
   if earned>=threshold.minimum then tier:=initcap(threshold.key);tier_at:=threshold.minimum;elsif next_tier is null then next_tier:=initcap(threshold.key);next_at:=threshold.minimum;end if;
  end loop;
  wallets:=wallets||jsonb_build_array(jsonb_build_object('slug',w.slug,'salon',w.content->'profile'->>'businessName','points',balance,'earned',earned,'spent',spent,'tier',tier,'tierAt',tier_at,'nextTier',next_tier,'nextAt',next_at,'description','Completed visits and qualified referrals, less issued vouchers.'));
  for r in select value from jsonb_array_elements(coalesce(w.content->'loyaltyConfig'->'rewards','[]')) where value->>'isActive'='true' and value->>'requiredPoints' ~ '^\d+$' and (value->>'requiredPoints')::bigint between 1 and 1000000 loop
   vouchers:=vouchers||jsonb_build_array((r-'couponCodePrefix')||jsonb_build_object('slug',w.slug,'salon',w.content->'profile'->>'businessName','balance',balance));
  end loop;
 end loop;
 select coalesce(jsonb_agg(e order by e->>'created_at' desc),'[]') into ledger from (select q.e from (
  select jsonb_build_object('id',b.id,'slug',site.slug,'salon',site.content->'profile'->>'businessName','title','Completed Service Visit','description',b.payload->>'serviceName','points',greatest(0,coalesce((a.draft->'loyaltyConfig'->>'pointsPerVisit')::int,50))+floor((b.payload->>'servicePrice')::numeric/100)*greatest(0,coalesce((a.draft->'loyaltyConfig'->>'pointsPerHundredSpent')::int,10)),'created_at',b.starts_at,'type','earned') e
  from public.studioflow_bookings b join public.studioflow_websites site on site.owner_id=b.owner_id join public.studioflow_accounts a on a.user_id=b.owner_id where b.customer_id=actor and b.status='completed' and site.slug not like 'studioflow-qa-%' and coalesce((site.content->'loyaltyConfig'->>'programEnabled')::boolean,false)
  union all select jsonb_build_object('id','ref-'||r.booking_id,'slug',site.slug,'salon',site.content->'profile'->>'businessName','title','Referral Bonus','description','Friend completed their first paid visit','points',r.points,'created_at',r.awarded_at,'type','referral') from public.studioflow_customer_referrals r join public.studioflow_websites site on site.owner_id=r.owner_id where r.inviter_id=actor and r.awarded_at is not null
  union all select jsonb_build_object('id',c.id,'slug',site.slug,'salon',site.content->'profile'->>'businessName','title','Voucher Redeemed','description',c.reward_title,'points',-c.points_spent,'created_at',c.created_at,'type','redeemed') from public.studioflow_customer_reward_claims c left join public.studioflow_websites site on site.owner_id=c.owner_id where c.customer_id=actor
  ) q order by q.e->>'created_at' desc limit 100
 ) entries;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'slug',site.slug,'salon',site.content->'profile'->>'businessName','title',c.reward_title,'terms',c.reward_terms,'points',c.points_spent,'code',c.coupon_code,'status',c.status,'created_at',c.created_at) order by c.created_at desc),'[]') into claims from public.studioflow_customer_reward_claims c left join public.studioflow_websites site on site.owner_id=c.owner_id where c.customer_id=actor;
 return jsonb_build_object('wallets',wallets,'vouchers',vouchers,'ledger',ledger,'claims',claims,'signedIn',actor is not null);
end $$;
revoke all on function studioflow_android_private.rewards_dashboard() from public,anon,authenticated;
grant execute on function studioflow_android_private.rewards_dashboard() to anon,authenticated;
create or replace function public.studioflow_customer_rewards_dashboard() returns jsonb language sql stable security invoker set search_path='' as $$select studioflow_android_private.rewards_dashboard()$$;
revoke all on function public.studioflow_customer_rewards_dashboard() from public;
grant execute on function public.studioflow_customer_rewards_dashboard() to anon,authenticated;

create or replace function studioflow_android_private.redeem_reward(p_slug text,p_reward text,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); w public.studioflow_websites; r jsonb; cost integer; available bigint; claim public.studioflow_customer_reward_claims;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_request is null then raise exception 'Request ID required';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,451));
 select * into claim from public.studioflow_customer_reward_claims where customer_id=actor and request_id=p_request;
 if found then if claim.reward_id<>p_reward or not exists(select 1 from public.studioflow_websites where slug=p_slug and owner_id=claim.owner_id) then raise exception 'Request already used';end if;return jsonb_build_object('id',claim.id,'code',claim.coupon_code,'status',claim.status);end if;
 select * into w from public.studioflow_websites where slug=p_slug and slug not like 'studioflow-qa-%' for share;
 if not found or not coalesce((w.content->'loyaltyConfig'->>'programEnabled')::boolean,false) then raise exception 'Salon loyalty program is unavailable';end if;
 select value into r from jsonb_array_elements(coalesce(w.content->'loyaltyConfig'->'rewards','[]')) where value->>'id'=p_reward and value->>'isActive'='true';
 if r is null or coalesce(r->>'requiredPoints','') !~ '^\d+$' then raise exception 'Reward unavailable';end if;
 cost:=(r->>'requiredPoints')::integer;if cost<1 or cost>1000000 then raise exception 'Reward unavailable';end if;
 select studioflow_android_private.reward_earnings(w.owner_id,actor)-coalesce(sum(points_spent),0) into available from public.studioflow_customer_reward_claims where customer_id=actor and owner_id=w.owner_id;
 if available<cost then raise exception 'Not enough points at this salon';end if;
 insert into public.studioflow_customer_reward_claims(customer_id,owner_id,reward_id,reward_title,reward_terms,points_spent,coupon_code,request_id) values(actor,w.owner_id,p_reward,r->>'title',r-'couponCodePrefix',cost,'NX-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,14)),p_request) returning * into claim;
 return jsonb_build_object('id',claim.id,'code',claim.coupon_code,'status',claim.status);
end $$;
revoke all on function studioflow_android_private.redeem_reward(text,text,uuid) from public,anon,authenticated;
grant execute on function studioflow_android_private.redeem_reward(text,text,uuid) to authenticated;
create or replace function public.studioflow_customer_redeem_reward(p_slug text,p_reward text,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$select studioflow_android_private.redeem_reward(p_slug,p_reward,p_request)$$;
revoke all on function public.studioflow_customer_redeem_reward(text,text,uuid) from public,anon;
grant execute on function public.studioflow_customer_redeem_reward(text,text,uuid) to authenticated;

create or replace function studioflow_android_private.use_reward(p_claim uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 update public.studioflow_customer_reward_claims set status='used',used_at=now() where id=p_claim and owner_id=auth.uid() and status='active';
 if not found then raise exception 'Voucher not active or not owned by your salon' using errcode='42501';end if;
end $$;
revoke all on function studioflow_android_private.use_reward(uuid) from public,anon,authenticated;
grant execute on function studioflow_android_private.use_reward(uuid) to authenticated;
create or replace function public.studioflow_owner_use_reward(p_claim uuid) returns void language sql security invoker set search_path='' as $$select studioflow_android_private.use_reward(p_claim)$$;
revoke all on function public.studioflow_owner_use_reward(uuid) from public,anon;
grant execute on function public.studioflow_owner_use_reward(uuid) to authenticated;

-- Maintain the existing app header API, now including voucher deductions.
create or replace function studioflow_android_private.rewards() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return studioflow_android_private.rewards_dashboard()->'wallets';
end $$;

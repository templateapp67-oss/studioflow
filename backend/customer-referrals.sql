-- Customer invitations are separate from growth-partner referrals.
create table if not exists public.studioflow_customer_referrals (
 invitee_id uuid primary key references auth.users(id),
 inviter_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 booking_id uuid unique references public.studioflow_bookings(id),
 owner_id uuid references public.studioflow_accounts(user_id),
 points integer not null default 0 check(points in (0,200)),
 awarded_at timestamptz,
 check(invitee_id<>inviter_id),
 check((awarded_at is null and points=0 and booking_id is null and owner_id is null) or
       (awarded_at is not null and points=200 and booking_id is not null and owner_id is not null))
);
create index if not exists studioflow_customer_referrals_inviter on public.studioflow_customer_referrals(inviter_id,owner_id);
alter table public.studioflow_customer_referrals enable row level security;
revoke all on public.studioflow_customer_referrals from public,anon,authenticated;
-- No direct row reads: the summary API omits other customers' identities.
create or replace function studioflow_android_private.validate_customer_ref(p_code text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.studioflow_android_profiles p join auth.users u on u.id=p.customer_id
 where p.referral_code=upper(btrim(p_code)) and u.deleted_at is null and coalesce(u.is_anonymous,false)=false);
$$;
create or replace function public.studioflow_customer_validate_ref(p_code text) returns boolean
language sql stable security invoker set search_path='' as $$select studioflow_android_private.validate_customer_ref(p_code)$$;
revoke all on function studioflow_android_private.validate_customer_ref(text),public.studioflow_customer_validate_ref(text) from public,anon,authenticated;
grant execute on function studioflow_android_private.validate_customer_ref(text),public.studioflow_customer_validate_ref(text) to anon,authenticated;

create or replace function studioflow_android_private.attach_customer_ref(p_actor uuid,p_code text) returns text
language plpgsql security definer set search_path='' as $$
declare inviter uuid; prior uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,452));
 select p.customer_id into inviter from public.studioflow_android_profiles p join auth.users u on u.id=p.customer_id where p.referral_code=upper(btrim(p_code)) and u.deleted_at is null and not coalesce(u.is_anonymous,false);
 if inviter is null then raise exception 'Referral code is invalid or unavailable';end if;
 if inviter=p_actor then raise exception 'You cannot use your own referral code';end if;
 if exists(select 1 from auth.users a join auth.users b on lower(b.email)=lower(a.email) where a.id=p_actor and b.id=inviter) then raise exception 'Self referrals are not eligible';end if;
 select inviter_id into prior from public.studioflow_customer_referrals where invitee_id=p_actor;
 if prior is not null then
  if prior=inviter then return 'already_saved';end if;
  raise exception 'A referral is already saved for this account';
 end if;
 if exists(select 1 from public.studioflow_bookings where customer_id=p_actor) then raise exception 'Referral must be saved before your first real booking';end if;
 if not exists(select 1 from auth.users where id=p_actor and deleted_at is null and not coalesce(is_anonymous,false)) then raise exception 'A permanent customer account is required';end if;
 insert into public.studioflow_customer_referrals(invitee_id,inviter_id) values(p_actor,inviter);
 insert into public.studioflow_android_profiles(customer_id,full_name,referred_by) select id,left(coalesce(raw_user_meta_data->>'full_name',''),150),inviter from auth.users where id=p_actor
 on conflict(customer_id) do update set referred_by=excluded.referred_by;
 return 'saved';
end $$;
revoke all on function studioflow_android_private.attach_customer_ref(uuid,text) from public,anon,authenticated;
create or replace function studioflow_android_private.claim_customer_ref(p_code text) returns text
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return studioflow_android_private.attach_customer_ref(auth.uid(),p_code);
end $$;
create or replace function public.studioflow_customer_claim_ref(p_code text) returns text
language sql security invoker set search_path='' as $$select studioflow_android_private.claim_customer_ref(p_code)$$;
revoke all on function studioflow_android_private.claim_customer_ref(text),public.studioflow_customer_claim_ref(text) from public,anon,authenticated;
grant execute on function studioflow_android_private.claim_customer_ref(text),public.studioflow_customer_claim_ref(text) to authenticated;

-- Auth metadata captures attribution even when email confirmation opens on another device.
create or replace function studioflow_android_private.capture_signup_ref() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if coalesce(new.raw_user_meta_data->>'customer_referral_code','') ~ '^[A-Za-z0-9-]{6,32}$' then
  begin perform studioflow_android_private.attach_customer_ref(new.id,new.raw_user_meta_data->>'customer_referral_code');
  exception when raise_exception then null; -- Invalid optional codes cannot block account creation.
  end;
 end if;
 return new;
end $$;
revoke all on function studioflow_android_private.capture_signup_ref() from public,anon,authenticated;
drop trigger if exists studioflow_customer_signup_ref on auth.users;
create trigger studioflow_customer_signup_ref after insert on auth.users for each row execute function studioflow_android_private.capture_signup_ref();

create or replace function studioflow_android_private.award_customer_ref() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status<>'completed' or old.status<>'confirmed' or new.ends_at>now()
 or coalesce(new.payload->>'demo','false')='true' or coalesce((new.payload->>'servicePrice')::numeric,0)<=0
 or coalesce((new.payload->>'amountPaid')::numeric,0)<=0 then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended(new.customer_id::text,452));
 -- Only the first completed real visit qualifies. Both accounts must have confirmed emails.
 if exists(select 1 from public.studioflow_bookings b where b.customer_id=new.customer_id and b.status='completed' and b.id<>new.id) then return new;end if;
 update public.studioflow_customer_referrals r set booking_id=new.id,owner_id=new.owner_id,points=200,awarded_at=now()
 where r.invitee_id=new.customer_id and r.awarded_at is null and r.created_at<=new.created_at and r.inviter_id<>new.owner_id and new.customer_id<>new.owner_id
 and exists(select 1 from public.studioflow_websites s where s.owner_id=new.owner_id and coalesce((s.content->'loyaltyConfig'->>'programEnabled')::boolean,false))
 and exists(select 1 from auth.users a join auth.users b on b.id=r.inviter_id where a.id=r.invitee_id and a.email_confirmed_at is not null and b.email_confirmed_at is not null and a.deleted_at is null and b.deleted_at is null and lower(a.email)<>lower(b.email) and not coalesce(a.is_anonymous,false) and not coalesce(b.is_anonymous,false));
 return new;
end $$;
revoke all on function studioflow_android_private.award_customer_ref() from public,anon,authenticated;
drop trigger if exists studioflow_customer_referral_award on public.studioflow_bookings;
create trigger studioflow_customer_referral_award after update of status on public.studioflow_bookings for each row execute function studioflow_android_private.award_customer_ref();

create or replace function studioflow_android_private.customer_ref_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return jsonb_build_object('joined',(select count(*) from public.studioflow_customer_referrals where inviter_id=auth.uid()),'qualified',(select count(*) from public.studioflow_customer_referrals where inviter_id=auth.uid() and awarded_at is not null),'points',(select coalesce(sum(points),0) from public.studioflow_customer_referrals where inviter_id=auth.uid()),'attribution',(select case when awarded_at is null then 'saved' else 'qualified' end from public.studioflow_customer_referrals where invitee_id=auth.uid()));
end $$;
create or replace function public.studioflow_customer_referral_summary() returns jsonb
language sql stable security invoker set search_path='' as $$select studioflow_android_private.customer_ref_summary()$$;
revoke all on function studioflow_android_private.customer_ref_summary(),public.studioflow_customer_referral_summary() from public,anon,authenticated;
grant execute on function studioflow_android_private.customer_ref_summary(),public.studioflow_customer_referral_summary() to authenticated;

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


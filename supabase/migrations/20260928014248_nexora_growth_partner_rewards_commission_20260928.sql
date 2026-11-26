-- Real Growth Partner qualification, commission and reward-claim backend.
begin;

create table if not exists public.growth_partner_referred_shops (
  id uuid primary key default gen_random_uuid(),
  partner_user_id uuid not null references public.growth_partners(user_id) on delete cascade,
  salon_id uuid references public.salons(id) on delete set null,
  shop_name text not null, owner_name text, owner_phone text, address text,
  kyc_status text not null default 'pending' check (kyc_status in ('pending','approved','rejected')),
  qr_activated_at timestamptz, verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  rejection_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(partner_user_id,salon_id)
);

create table if not exists public.growth_partner_qr_daily_transactions (
  id uuid primary key default gen_random_uuid(),
  referred_shop_id uuid not null references public.growth_partner_referred_shops(id) on delete cascade,
  transaction_date date not null, qr_amount_paise bigint not null check (qr_amount_paise>=0),
  refunded_amount_paise bigint not null default 0 check (refunded_amount_paise>=0),
  settlement_status text not null default 'pending' check (settlement_status in ('pending','settled','reversed')),
  recorded_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
  unique(referred_shop_id,transaction_date), check(refunded_amount_paise<=qr_amount_paise)
);

create table if not exists public.growth_partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_user_id uuid not null references public.growth_partners(user_id) on delete cascade,
  referred_shop_id uuid not null references public.growth_partner_referred_shops(id) on delete cascade,
  transaction_date date not null, company_commission_paise bigint not null check(company_commission_paise>=0),
  partner_commission_paise bigint not null check(partner_commission_paise>=0),
  status text not null default 'pending' check(status in ('pending','cleared','paid','reversed')),
  created_at timestamptz not null default now(), unique(referred_shop_id,transaction_date)
);

create table if not exists public.growth_partner_reward_milestones (
  qualifying_shops integer primary key check(qualifying_shops>0),
  claim_unlock_verified_shops integer not null check(claim_unlock_verified_shops>qualifying_shops),
  reward_name text not null, maximum_value_paise bigint not null check(maximum_value_paise>=0), active boolean not null default true
);
insert into public.growth_partner_reward_milestones(qualifying_shops,claim_unlock_verified_shops,reward_name,maximum_value_paise) values
 (25,26,'Professional Welcome Package',1750000),(50,51,'Work Tablet Package',1750000),(100,101,'Laptop',3500000),(250,251,'Electric Scooter Contribution',10500000),(500,501,'Approved Latest iPhone',17500000),(750,751,'Royal Enfield Motorcycle Contribution',35000000),(1000,1001,'Brezza Purchase Contribution',55000000)
on conflict(qualifying_shops) do update set claim_unlock_verified_shops=excluded.claim_unlock_verified_shops,reward_name=excluded.reward_name,maximum_value_paise=excluded.maximum_value_paise;

create table if not exists public.growth_partner_reward_claims (
  id uuid primary key default gen_random_uuid(), partner_user_id uuid not null references public.growth_partners(user_id) on delete cascade,
  qualifying_shops integer not null references public.growth_partner_reward_milestones(qualifying_shops),
  status text not null default 'verification_pending' check(status in ('not_eligible','verification_pending','documents_required','under_review','approved','product_ordered','dispatched','delivered','rejected','appeal_submitted')),
  notes text, reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(partner_user_id,qualifying_shops)
);

create index if not exists idx_gp_shops_partner on public.growth_partner_referred_shops(partner_user_id,verification_status);
create index if not exists idx_gp_qr_shop_day on public.growth_partner_qr_daily_transactions(referred_shop_id,transaction_date desc);
create index if not exists idx_gp_commissions_partner on public.growth_partner_commissions(partner_user_id,status,transaction_date desc);
create index if not exists idx_gp_claims_partner on public.growth_partner_reward_claims(partner_user_id,status);

alter table public.growth_partner_referred_shops enable row level security;
alter table public.growth_partner_qr_daily_transactions enable row level security;
alter table public.growth_partner_commissions enable row level security;
alter table public.growth_partner_reward_milestones enable row level security;
alter table public.growth_partner_reward_claims enable row level security;
create policy gp_shops_read on public.growth_partner_referred_shops for select to authenticated using(partner_user_id=(select auth.uid()) or (select public.is_my_app_admin()));
create policy gp_qr_read on public.growth_partner_qr_daily_transactions for select to authenticated using(exists(select 1 from public.growth_partner_referred_shops s where s.id=referred_shop_id and (s.partner_user_id=(select auth.uid()) or (select public.is_my_app_admin()))));
create policy gp_commission_read on public.growth_partner_commissions for select to authenticated using(partner_user_id=(select auth.uid()) or (select public.is_my_app_admin()));
create policy gp_milestones_read on public.growth_partner_reward_milestones for select to authenticated using(true);
create policy gp_claims_read on public.growth_partner_reward_claims for select to authenticated using(partner_user_id=(select auth.uid()) or (select public.is_my_app_admin()));
create policy gp_claims_partner_insert on public.growth_partner_reward_claims for insert to authenticated with check(partner_user_id=(select auth.uid()));
revoke all on public.growth_partner_referred_shops,public.growth_partner_qr_daily_transactions,public.growth_partner_commissions,public.growth_partner_reward_milestones,public.growth_partner_reward_claims from public,anon;
grant select on public.growth_partner_referred_shops,public.growth_partner_qr_daily_transactions,public.growth_partner_commissions,public.growth_partner_reward_milestones,public.growth_partner_reward_claims to authenticated;
grant insert on public.growth_partner_reward_claims to authenticated;

create or replace function public.gp_qualifying_shop_count(p_partner uuid)
returns integer language sql stable security invoker set search_path=pg_catalog,public as $$
 select count(*)::int from public.growth_partner_referred_shops s where s.partner_user_id=p_partner and s.verification_status='verified' and s.kyc_status='approved' and exists(select 1 from public.growth_partner_qr_daily_transactions q where q.referred_shop_id=s.id and q.settlement_status='settled' and q.qr_amount_paise-q.refunded_amount_paise>=100000 group by q.referred_shop_id having count(*) filter(where q.qr_amount_paise-q.refunded_amount_paise>=100000)>=15)
$$;

create or replace function public.get_my_partner_dashboard()
returns jsonb language plpgsql stable security invoker set search_path=pg_catalog,public as $$
declare actor uuid:=auth.uid(); verified_count int; qualified_count int; next_row record;
begin
 if actor is null or not exists(select 1 from public.growth_partners where user_id=actor and is_active) then raise exception 'Growth Partner access required' using errcode='42501'; end if;
 select count(*) into verified_count from public.growth_partner_referred_shops where partner_user_id=actor and verification_status='verified';
 qualified_count:=public.gp_qualifying_shop_count(actor);
 select * into next_row from public.growth_partner_reward_milestones where active and qualifying_shops>qualified_count order by qualifying_shops limit 1;
 return jsonb_build_object('verified_shops',verified_count,'qualifying_shops',qualified_count,'in_qualification_cycle',(select count(*) from public.growth_partner_referred_shops where partner_user_id=actor and verification_status='verified' and kyc_status='approved')-qualified_count,'rejected_shops',(select count(*) from public.growth_partner_referred_shops where partner_user_id=actor and verification_status='rejected'),'next_milestone',case when next_row is null then null else next_row.qualifying_shops end,'remaining_qualifying_shops',case when next_row is null then 0 else greatest(next_row.qualifying_shops-qualified_count,0) end,'plus_one_required',case when next_row is null then null else next_row.claim_unlock_verified_shops end,'rules',jsonb_build_object('daily_qr_paise',100000,'company_commission_bps',1000,'qualification_days',15,'reward_processing_days','16-30'));
end $$;

create or replace function public.get_my_partner_reward_dashboard()
returns jsonb language plpgsql stable security invoker set search_path=pg_catalog,public as $$
declare actor uuid:=auth.uid(); q int;
begin
 if actor is null or not exists(select 1 from public.growth_partners where user_id=actor) then raise exception 'Growth Partner access required' using errcode='42501'; end if;
 q:=public.gp_qualifying_shop_count(actor);
 return jsonb_build_object('qualifying_shops',q,'verified_shops',(select count(*) from public.growth_partner_referred_shops where partner_user_id=actor and verification_status='verified'),'milestones',(select coalesce(jsonb_agg(jsonb_build_object('qualifying_shops',m.qualifying_shops,'claim_unlock_verified_shops',m.claim_unlock_verified_shops,'reward_name',m.reward_name,'maximum_value_paise',m.maximum_value_paise,'eligible',q>=m.qualifying_shops and (select count(*) from public.growth_partner_referred_shops s where s.partner_user_id=actor and s.verification_status='verified')>=m.claim_unlock_verified_shops,'claim_status',c.status) order by m.qualifying_shops),'[]'::jsonb) from public.growth_partner_reward_milestones m left join public.growth_partner_reward_claims c on c.partner_user_id=actor and c.qualifying_shops=m.qualifying_shops where m.active));
end $$;

create or replace function public.review_growth_partner_application(p_user_id uuid,p_status text,p_referral_code text default null,p_note text default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare code text:=upper(btrim(coalesce(p_referral_code,'')));
begin
 if not (select public.is_my_app_admin()) then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_status not in ('approved','rejected') then raise exception 'Invalid application decision' using errcode='22023'; end if;
 update public.growth_partner_applications set status=p_status,kyc_status=p_status,review_note=nullif(btrim(p_note),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where user_id=p_user_id;
 if not found then raise exception 'Application not found' using errcode='22023'; end if;
 if p_status='approved' then if code !~ '^[A-Z0-9]{6,12}$' then code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)); end if; insert into public.growth_partners(user_id,referral_code,is_active) values(p_user_id,code,true) on conflict(user_id) do update set referral_code=excluded.referral_code,is_active=true,updated_at=now(); end if;
 return jsonb_build_object('user_id',p_user_id,'status',p_status,'referral_code',case when p_status='approved' then code else null end);
end $$;

revoke all on function public.gp_qualifying_shop_count(uuid),public.get_my_partner_dashboard(),public.get_my_partner_reward_dashboard(),public.review_growth_partner_application(uuid,text,text,text) from public,anon;
grant execute on function public.get_my_partner_dashboard(),public.get_my_partner_reward_dashboard(),public.review_growth_partner_application(uuid,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;

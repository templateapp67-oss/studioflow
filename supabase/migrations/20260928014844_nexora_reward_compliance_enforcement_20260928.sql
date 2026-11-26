-- Enforce the published non-cash reward programme rules at database level.
begin;

alter table public.growth_partner_referred_shops add column if not exists fraud_status text not null default 'pending' check(fraud_status in ('pending','clear','flagged','rejected'));
alter table public.growth_partner_reward_claims add column if not exists fraud_status text not null default 'pending' check(fraud_status in ('pending','clear','flagged','rejected'));
alter table public.growth_partner_reward_claims add column if not exists documentation_status text not null default 'pending' check(documentation_status in ('pending','complete','rejected'));
alter table public.growth_partner_reward_claims add column if not exists tax_status text not null default 'pending' check(tax_status in ('pending','complete','not_required','rejected'));
alter table public.growth_partner_reward_claims add column if not exists reward_mode text not null default 'non_cash' check(reward_mode='non_cash');

drop policy if exists gp_claims_partner_insert on public.growth_partner_reward_claims;
revoke insert on public.growth_partner_reward_claims from authenticated;

create or replace function public.gp_shop_qualifies(p_shop_id uuid)
returns boolean language sql stable security invoker set search_path=pg_catalog,public as $$
  with qualifying_days as (
    select q.transaction_date,
           q.transaction_date - (row_number() over (order by q.transaction_date))::int as streak_group
    from public.growth_partner_qr_daily_transactions q
    join public.growth_partner_commissions c on c.referred_shop_id=q.referred_shop_id and c.transaction_date=q.transaction_date
    join public.growth_partner_referred_shops s on s.id=q.referred_shop_id
    where q.referred_shop_id=p_shop_id
      and s.kyc_status='approved' and s.verification_status='verified' and s.qr_activated_at is not null and s.fraud_status='clear'
      and q.settlement_status='settled' and q.qr_amount_paise-q.refunded_amount_paise>=100000
      and c.company_commission_paise>=10000 and c.status in ('cleared','paid')
  )
  select exists(select 1 from qualifying_days group by streak_group having count(*)>=15)
$$;

create or replace function public.gp_qualifying_shop_count(p_partner uuid)
returns integer language sql stable security invoker set search_path=pg_catalog,public as $$
  select count(*)::int from public.growth_partner_referred_shops s where s.partner_user_id=p_partner and public.gp_shop_qualifies(s.id)
$$;

create or replace function public.admin_record_growth_partner_qr_transaction(
  p_referred_shop_id uuid,p_transaction_date date,p_qr_amount_paise bigint,p_refunded_amount_paise bigint default 0,p_settlement_status text default 'settled'
) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare shop public.growth_partner_referred_shops%rowtype; net_amount bigint; company_amount bigint;
begin
  if not (select public.is_my_app_admin()) then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_transaction_date is null or p_transaction_date>current_date or p_qr_amount_paise<0 or p_refunded_amount_paise<0 or p_refunded_amount_paise>p_qr_amount_paise or p_settlement_status not in ('pending','settled','reversed') then raise exception 'Invalid QR transaction' using errcode='22023'; end if;
  select * into shop from public.growth_partner_referred_shops where id=p_referred_shop_id for update;
  if not found then raise exception 'Referred shop not found' using errcode='22023'; end if;
  net_amount:=p_qr_amount_paise-p_refunded_amount_paise; company_amount:=case when p_settlement_status='settled' then floor(net_amount*0.10)::bigint else 0 end;
  insert into public.growth_partner_qr_daily_transactions(referred_shop_id,transaction_date,qr_amount_paise,refunded_amount_paise,settlement_status,recorded_by) values(p_referred_shop_id,p_transaction_date,p_qr_amount_paise,p_refunded_amount_paise,p_settlement_status,auth.uid()) on conflict(referred_shop_id,transaction_date) do update set qr_amount_paise=excluded.qr_amount_paise,refunded_amount_paise=excluded.refunded_amount_paise,settlement_status=excluded.settlement_status,recorded_by=excluded.recorded_by;
  insert into public.growth_partner_commissions(partner_user_id,referred_shop_id,transaction_date,company_commission_paise,partner_commission_paise,status) values(shop.partner_user_id,p_referred_shop_id,p_transaction_date,company_amount,0,case when p_settlement_status='settled' then 'cleared' else 'reversed' end) on conflict(referred_shop_id,transaction_date) do update set company_commission_paise=excluded.company_commission_paise,partner_commission_paise=excluded.partner_commission_paise,status=excluded.status;
  return jsonb_build_object('referred_shop_id',p_referred_shop_id,'transaction_date',p_transaction_date,'net_qr_paise',net_amount,'company_commission_paise',company_amount,'qualifies_today',net_amount>=100000 and company_amount>=10000 and p_settlement_status='settled');
end $$;

create or replace function public.request_my_growth_partner_reward_claim(p_qualifying_shops integer)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare actor uuid:=auth.uid(); qualified int; verified int; milestone public.growth_partner_reward_milestones%rowtype; claim_id uuid;
begin
  if actor is null or not exists(select 1 from public.growth_partners where user_id=actor and is_active) then raise exception 'Growth Partner access required' using errcode='42501'; end if;
  select * into milestone from public.growth_partner_reward_milestones where qualifying_shops=p_qualifying_shops and active;
  if not found then raise exception 'Unknown reward milestone' using errcode='22023'; end if;
  qualified:=public.gp_qualifying_shop_count(actor); select count(*) into verified from public.growth_partner_referred_shops where partner_user_id=actor and verification_status='verified' and kyc_status='approved' and fraud_status='clear';
  if qualified<milestone.qualifying_shops then raise exception 'Qualifying shops pending' using errcode='22023'; end if;
  if verified<milestone.claim_unlock_verified_shops then raise exception 'Milestone plus-one verified shop pending' using errcode='22023'; end if;
  insert into public.growth_partner_reward_claims(partner_user_id,qualifying_shops,status,reward_mode) values(actor,p_qualifying_shops,'verification_pending','non_cash') on conflict(partner_user_id,qualifying_shops) do update set updated_at=now() returning id into claim_id;
  return jsonb_build_object('claim_id',claim_id,'status','verification_pending','reward_mode','non_cash','message','Reward is subject to fraud, tax and documentation verification. Cash conversion is not available.');
end $$;

revoke all on function public.gp_shop_qualifies(uuid),public.gp_qualifying_shop_count(uuid),public.admin_record_growth_partner_qr_transaction(uuid,date,bigint,bigint,text),public.request_my_growth_partner_reward_claim(integer) from public,anon;
grant execute on function public.admin_record_growth_partner_qr_transaction(uuid,date,bigint,bigint,text),public.request_my_growth_partner_reward_claim(integer) to authenticated;
notify pgrst,'reload schema';
commit;

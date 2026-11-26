-- Claim processing window: qualification completes at Day 15; processing/delivery is Day 16–30.
begin;

alter table public.growth_partner_reward_claims
  add column if not exists eligibility_completed_at timestamptz,
  add column if not exists processing_starts_at timestamptz,
  add column if not exists processing_deadline_at timestamptz;

alter table public.growth_partner_reward_claims
  drop constraint if exists growth_partner_reward_claims_processing_window_check;
alter table public.growth_partner_reward_claims
  add constraint growth_partner_reward_claims_processing_window_check check (
    (eligibility_completed_at is null and processing_starts_at is null and processing_deadline_at is null)
    or (eligibility_completed_at is not null and processing_starts_at >= eligibility_completed_at and processing_deadline_at >= processing_starts_at)
  );

create or replace function public.request_my_growth_partner_reward_claim(p_qualifying_shops integer)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare actor uuid:=auth.uid(); qualified int; verified int; milestone public.growth_partner_reward_milestones%rowtype; claim_id uuid; completed_at timestamptz:=now();
begin
  if actor is null or not exists(select 1 from public.growth_partners where user_id=actor and is_active) then raise exception 'Growth Partner access required' using errcode='42501'; end if;
  select * into milestone from public.growth_partner_reward_milestones where qualifying_shops=p_qualifying_shops and active;
  if not found then raise exception 'Unknown reward milestone' using errcode='22023'; end if;
  qualified:=public.gp_qualifying_shop_count(actor);
  select count(*) into verified from public.growth_partner_referred_shops where partner_user_id=actor and verification_status='verified' and kyc_status='approved' and fraud_status='clear';
  if qualified<milestone.qualifying_shops then raise exception 'Qualifying shops pending' using errcode='22023'; end if;
  if verified<milestone.claim_unlock_verified_shops then raise exception 'Milestone plus-one verified shop pending' using errcode='22023'; end if;
  insert into public.growth_partner_reward_claims(partner_user_id,qualifying_shops,status,reward_mode,eligibility_completed_at,processing_starts_at,processing_deadline_at)
  values(actor,p_qualifying_shops,'verification_pending','non_cash',completed_at,completed_at,completed_at+interval '14 days')
  on conflict(partner_user_id,qualifying_shops) do update set updated_at=now()
  returning id into claim_id;
  return jsonb_build_object('claim_id',claim_id,'status','verification_pending','reward_mode','non_cash','eligibility_completed_at',completed_at,'processing_starts_at',completed_at,'processing_deadline_at',completed_at+interval '14 days','message','Day 16–30 processing window starts after successful 15-day qualification and remains subject to settlement, KYC, fraud, tax and document verification.');
end $$;

revoke all on function public.request_my_growth_partner_reward_claim(integer) from public,anon;
grant execute on function public.request_my_growth_partner_reward_claim(integer) to authenticated;
notify pgrst,'reload schema';
commit;

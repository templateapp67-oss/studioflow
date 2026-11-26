begin;
create or replace function public.get_my_partner_dashboard()
returns jsonb language plpgsql stable security invoker set search_path=pg_catalog,public as $$
declare actor uuid:=auth.uid(); total_count int; verified_count int; qualified_count int; rejected_count int; cycle_count int; current_milestone int; next_row record; claim_status text;
begin
  if actor is null or not exists(select 1 from public.growth_partners where user_id=actor and is_active) then raise exception 'Growth Partner access required' using errcode='42501'; end if;
  select count(*),count(*) filter(where verification_status='verified'),count(*) filter(where verification_status='rejected') into total_count,verified_count,rejected_count from public.growth_partner_referred_shops where partner_user_id=actor;
  qualified_count:=public.gp_qualifying_shop_count(actor); cycle_count:=greatest(verified_count-qualified_count,0); select max(qualifying_shops) into current_milestone from public.growth_partner_reward_milestones where active and qualifying_shops<=qualified_count;
  select * into next_row from public.growth_partner_reward_milestones where active and qualifying_shops>qualified_count order by qualifying_shops limit 1;
  select status into claim_status from public.growth_partner_reward_claims where partner_user_id=actor order by qualifying_shops desc limit 1;
  return jsonb_build_object('total_shops_onboarded',total_count,'verified_shops',verified_count,'qualifying_shops',qualified_count,'shops_in_15_day_cycle',cycle_count,'rejected_shops',rejected_count,'current_milestone',current_milestone,'next_milestone',case when next_row is null then null else next_row.qualifying_shops end,'remaining_qualifying_shops',case when next_row is null then 0 else greatest(next_row.qualifying_shops-qualified_count,0) end,'plus_one_required',case when next_row is null then null else next_row.claim_unlock_verified_shops end,'plus_one_complete',case when next_row is null then true else verified_count>=next_row.claim_unlock_verified_shops end,'current_eligible_reward',case when current_milestone is null then null else (select reward_name from public.growth_partner_reward_milestones where qualifying_shops=current_milestone) end,'claim_status',claim_status,'rules',jsonb_build_object('daily_genuine_qr_paise',100000,'company_commission_bps',1000,'daily_company_commission_paise',10000,'consecutive_days',15,'processing_window_days','Day 16–30'));
end $$;
revoke all on function public.get_my_partner_dashboard() from public,anon;
grant execute on function public.get_my_partner_dashboard() to authenticated;
notify pgrst,'reload schema';
commit;

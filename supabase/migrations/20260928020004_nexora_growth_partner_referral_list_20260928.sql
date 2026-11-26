begin;
create or replace function public.get_my_partner_referrals(p_limit integer default 100,p_offset integer default 0)
returns jsonb language plpgsql stable security invoker set search_path=pg_catalog,public as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.growth_partners where user_id=actor) then raise exception 'Growth Partner access required' using errcode='42501'; end if;
 return jsonb_build_object('total',(select count(*) from public.growth_partner_referred_shops where partner_user_id=actor),'items',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (select s.id,s.shop_name,s.owner_name,s.owner_phone,s.address,s.kyc_status,s.qr_activated_at,s.verification_status,s.rejection_reason,s.fraud_status,s.duplicate_status,s.operational_status,s.created_at,(select q.qr_amount_paise-q.refunded_amount_paise from public.growth_partner_qr_daily_transactions q where q.referred_shop_id=s.id order by q.transaction_date desc limit 1) as latest_daily_qr_paise,(select c.company_commission_paise from public.growth_partner_commissions c where c.referred_shop_id=s.id order by c.transaction_date desc limit 1) as latest_company_commission_paise,(select q.settlement_status from public.growth_partner_qr_daily_transactions q where q.referred_shop_id=s.id order by q.transaction_date desc limit 1) as latest_settlement_status,public.gp_shop_qualifies(s.id) as qualification_complete from public.growth_partner_referred_shops s where s.partner_user_id=actor order by s.created_at desc limit greatest(1,least(coalesce(p_limit,100),200)) offset greatest(coalesce(p_offset,0),0)) r));
end $$;
revoke all on function public.get_my_partner_referrals(integer,integer) from public,anon;
grant execute on function public.get_my_partner_referrals(integer,integer) to authenticated;
notify pgrst,'reload schema';
commit;

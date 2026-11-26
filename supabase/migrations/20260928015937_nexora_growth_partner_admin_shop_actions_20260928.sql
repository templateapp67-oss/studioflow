begin;
create or replace function public.admin_upsert_growth_partner_shop(p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare shop_id uuid; partner_id uuid; result uuid;
begin
 if not (select public.is_my_app_admin()) then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Invalid shop payload' using errcode='22023'; end if;
 begin shop_id:=nullif(p_payload->>'id','')::uuid; partner_id:=nullif(p_payload->>'partner_user_id','')::uuid; exception when invalid_text_representation then raise exception 'Invalid shop identifier' using errcode='22023'; end;
 if partner_id is null or nullif(btrim(p_payload->>'shop_name'),'') is null or not exists(select 1 from public.growth_partners where user_id=partner_id) then raise exception 'Invalid shop payload' using errcode='22023'; end if;
 if shop_id is null then
  insert into public.growth_partner_referred_shops(partner_user_id,salon_id,shop_name,owner_name,owner_phone,address) values(partner_id,nullif(p_payload->>'salon_id','')::uuid,btrim(p_payload->>'shop_name'),nullif(btrim(p_payload->>'owner_name'),''),nullif(btrim(p_payload->>'owner_phone'),''),nullif(btrim(p_payload->>'address'),'')) returning id into result;
 else
  update public.growth_partner_referred_shops set shop_name=coalesce(nullif(btrim(p_payload->>'shop_name'),''),shop_name),owner_name=coalesce(nullif(btrim(p_payload->>'owner_name'),''),owner_name),owner_phone=coalesce(nullif(btrim(p_payload->>'owner_phone'),''),owner_phone),address=coalesce(nullif(btrim(p_payload->>'address'),''),address),updated_at=now() where id=shop_id returning id into result;
  if result is null then raise exception 'Shop not found' using errcode='22023'; end if;
 end if;
 return jsonb_build_object('id',result);
end $$;

create or replace function public.admin_review_growth_partner_shop(p_shop_id uuid,p_kyc_status text,p_verification_status text,p_fraud_status text,p_duplicate_status text,p_operational_status text,p_qr_activated_at timestamptz default null,p_reason text default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if not (select public.is_my_app_admin()) then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_kyc_status not in ('pending','approved','rejected') or p_verification_status not in ('pending','verified','rejected') or p_fraud_status not in ('pending','clear','flagged','rejected') or p_duplicate_status not in ('pending','clear','duplicate','rejected') or p_operational_status not in ('pending','active','closed','temporary','rejected') then raise exception 'Invalid review values' using errcode='22023'; end if;
 perform set_config('app.change_reason',coalesce(nullif(btrim(p_reason),''),'Admin shop review'),true);
 update public.growth_partner_referred_shops set kyc_status=p_kyc_status,verification_status=p_verification_status,fraud_status=p_fraud_status,duplicate_status=p_duplicate_status,operational_status=p_operational_status,qr_activated_at=coalesce(p_qr_activated_at,qr_activated_at),rejection_reason=case when p_verification_status='rejected' then nullif(btrim(p_reason),'') else null end,updated_at=now() where id=p_shop_id;
 if not found then raise exception 'Shop not found' using errcode='22023'; end if;
 return jsonb_build_object('id',p_shop_id,'verification_status',p_verification_status);
end $$;

create or replace function public.mark_my_growth_partner_notification_read(p_notification_id uuid)
returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
begin update public.growth_partner_notifications set read_at=coalesce(read_at,now()) where id=p_notification_id and user_id=auth.uid(); return found; end $$;
revoke all on function public.admin_upsert_growth_partner_shop(jsonb),public.admin_review_growth_partner_shop(uuid,text,text,text,text,text,timestamptz,text),public.mark_my_growth_partner_notification_read(uuid) from public,anon;
grant execute on function public.admin_upsert_growth_partner_shop(jsonb),public.admin_review_growth_partner_shop(uuid,text,text,text,text,text,timestamptz,text),public.mark_my_growth_partner_notification_read(uuid) to authenticated;
notify pgrst,'reload schema';
commit;

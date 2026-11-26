-- Only an inviter can see the names and progress of their own referred members.
create or replace function studioflow_android_private.customer_ref_members(p_offset integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare entries jsonb; more boolean;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'Invalid page';end if;
 select coalesce(jsonb_agg(jsonb_build_object('name',coalesce(nullif(btrim(p.full_name),''),nullif(left(btrim(u.raw_user_meta_data->>'full_name'),150),''),'Nexora member'),'joinedAt',r.created_at,'status',case when r.awarded_at is not null then 'qualified' when u.email_confirmed_at is null then 'awaiting_email' else 'joined' end,'points',r.points) order by r.created_at desc,r.invitee_id),'[]') into entries
 from (select * from public.studioflow_customer_referrals where inviter_id=auth.uid() order by created_at desc,invitee_id offset p_offset limit 20) r
 join auth.users u on u.id=r.invitee_id left join public.studioflow_android_profiles p on p.customer_id=r.invitee_id;
 select exists(select 1 from public.studioflow_customer_referrals where inviter_id=auth.uid() offset (p_offset+20)) into more;
 return jsonb_build_object('members',entries,'hasMore',more);
end $$;
create or replace function public.studioflow_customer_referral_members(p_offset integer default 0) returns jsonb
language sql stable security invoker set search_path='' as $$select studioflow_android_private.customer_ref_members(p_offset)$$;
revoke all on function studioflow_android_private.customer_ref_members(integer),public.studioflow_customer_referral_members(integer) from public,anon,authenticated;
grant execute on function studioflow_android_private.customer_ref_members(integer),public.studioflow_customer_referral_members(integer) to authenticated;

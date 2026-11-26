alter table public.nexora_job_push_config add column firebase_service_account jsonb,add column firebase_web_config jsonb,add column firebase_vapid_key text;
alter table public.nexora_job_push_subscriptions add column transport text not null default 'webpush' check(transport in ('webpush','fcm')),add column platform text not null default 'web' check(platform in ('web','android')),add column fcm_token text;
create unique index nexora_job_fcm_token on public.nexora_job_push_subscriptions(fcm_token) where fcm_token is not null;
create or replace function public.nexora_job_claim_push(p_limit integer default 25) returns jsonb language sql security invoker set search_path='' as $$
 with ready as (
  select d.id from public.nexora_job_push_deliveries d
  where d.attempts<5 and ((d.status='pending' and d.next_attempt_at<=now()) or (d.status='sending' and d.lease_until<now()))
  order by d.created_at for update skip locked limit least(greatest(p_limit,1),50)
 ), claimed as (
  update public.nexora_job_push_deliveries d set status='sending',attempts=attempts+1,lease_until=now()+interval '2 minutes'
  from ready r where d.id=r.id returning d.*
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'attempts',c.attempts,'notification_id',n.id,'title',n.title,'message',n.message,'link',n.link,'is_read',n.is_read,'subscription_id',s.id,'user_id',s.user_id,'transport',s.transport,'platform',s.platform,'fcm_token',s.fcm_token,'endpoint',s.endpoint,'p256dh',s.p256dh,'auth_key',s.auth_key,'suspended',exists(select 1 from public.nexora_job_accounts a where a.user_id=s.user_id and a.suspended))), '[]'::jsonb)
 from claimed c join public.nexora_job_notifications n on n.id=c.notification_id join public.nexora_job_push_subscriptions s on s.id=c.subscription_id and s.user_id=n.user_id;
$$;
revoke all on function public.nexora_job_claim_push(integer) from public,anon,authenticated;
grant execute on function public.nexora_job_claim_push(integer) to service_role;
notify pgrst,'reload schema';

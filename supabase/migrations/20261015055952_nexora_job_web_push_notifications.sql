-- Portal-only Web Push infrastructure; secrets are generated server-side.
create table public.nexora_job_push_config (
 id boolean primary key default true check(id),
 public_key text, private_key text,
 dispatch_token text not null default (gen_random_uuid()::text||gen_random_uuid()::text)
);
insert into public.nexora_job_push_config(id) values(true);
alter table public.nexora_job_push_config enable row level security;
revoke all on public.nexora_job_push_config from public,anon,authenticated;
grant select,insert,update on public.nexora_job_push_config to service_role;

create table public.nexora_job_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(length(endpoint)<=4000),
 p256dh text not null, auth_key text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index nexora_job_push_subscriptions_user on public.nexora_job_push_subscriptions(user_id);
alter table public.nexora_job_push_subscriptions enable row level security;
revoke all on public.nexora_job_push_subscriptions from public,anon,authenticated;
grant select,insert,update,delete on public.nexora_job_push_subscriptions to service_role;

create table public.nexora_job_push_deliveries (
 id uuid primary key default gen_random_uuid(),
 notification_id uuid not null references public.nexora_job_notifications(id) on delete cascade,
 subscription_id uuid not null references public.nexora_job_push_subscriptions(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','sending','sent','failed')),
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 lease_until timestamptz,
 last_status integer,
 created_at timestamptz not null default now(),
 unique(notification_id,subscription_id)
);
create index nexora_job_push_pending on public.nexora_job_push_deliveries(next_attempt_at) where status in ('pending','sending');
alter table public.nexora_job_push_deliveries enable row level security;
revoke all on public.nexora_job_push_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.nexora_job_push_deliveries to service_role;

create function nexora_jobs_private.enqueue_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.nexora_job_push_deliveries(notification_id,subscription_id)
 select NEW.id,s.id from public.nexora_job_push_subscriptions s where s.user_id=NEW.user_id
 and not exists(select 1 from public.nexora_job_accounts a where a.user_id=NEW.user_id and a.suspended)
 on conflict do nothing;
 return NEW;
end$$;
revoke all on function nexora_jobs_private.enqueue_push() from public,anon,authenticated;
create trigger nexora_job_enqueue_push after insert on public.nexora_job_notifications for each row execute function nexora_jobs_private.enqueue_push();

-- Service role only; invoker uses its own restricted table grants.
create function public.nexora_job_claim_push(p_limit integer default 25) returns jsonb language sql security invoker set search_path='' as $$
 with ready as (
  select d.id from public.nexora_job_push_deliveries d
  where d.attempts<5 and ((d.status='pending' and d.next_attempt_at<=now()) or (d.status='sending' and d.lease_until<now()))
  order by d.created_at for update skip locked limit least(greatest(p_limit,1),50)
 ), claimed as (
  update public.nexora_job_push_deliveries d set status='sending',attempts=attempts+1,lease_until=now()+interval '2 minutes'
  from ready r where d.id=r.id returning d.*
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'attempts',c.attempts,'notification_id',n.id,'title',n.title,'message',n.message,'link',n.link,'is_read',n.is_read,'subscription_id',s.id,'user_id',s.user_id,'endpoint',s.endpoint,'p256dh',s.p256dh,'auth_key',s.auth_key,'suspended',exists(select 1 from public.nexora_job_accounts a where a.user_id=s.user_id and a.suspended))), '[]'::jsonb)
 from claimed c join public.nexora_job_notifications n on n.id=c.notification_id join public.nexora_job_push_subscriptions s on s.id=c.subscription_id and s.user_id=n.user_id;
$$;
revoke all on function public.nexora_job_claim_push(integer) from public,anon,authenticated;
grant execute on function public.nexora_job_claim_push(integer) to service_role;

create table public.nexora_job_match_alerts (
 job_id uuid not null references public.nexora_job_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(job_id,user_id)
);
alter table public.nexora_job_match_alerts enable row level security;
revoke all on public.nexora_job_match_alerts from public,anon,authenticated;
create index nexora_job_match_alerts_user on public.nexora_job_match_alerts(user_id);
create function nexora_jobs_private.notify_job_match() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if NEW.status<>'published' or NEW.moderation_status<>'approved' or NEW.application_deadline<current_date then return NEW;end if;
 with new_matches as (
  insert into public.nexora_job_match_alerts(job_id,user_id)
  select NEW.id,c.user_id from public.nexora_job_candidates c
  where c.alerts_enabled and c.job_profile_category_ids && NEW.required_category_ids and c.user_id<>NEW.employer_id
  and not exists(select 1 from public.nexora_job_accounts a where a.user_id=c.user_id and a.suspended)
  on conflict do nothing returning user_id
 )
 insert into public.nexora_job_notifications(user_id,title,message,link)
 select user_id,'New matching salon job',NEW.title||' at '||NEW.salon_name||' · '||NEW.city,'?job='||NEW.id::text from new_matches;
 return NEW;
end$$;
revoke all on function nexora_jobs_private.notify_job_match() from public,anon,authenticated;
create trigger nexora_job_match_alert after insert or update of status,moderation_status on public.nexora_job_posts for each row execute function nexora_jobs_private.notify_job_match();

-- Cron invokes the dispatcher only when due work exists. No token in cron command text.
create function nexora_jobs_private.dispatch_push() returns bigint language plpgsql security definer set search_path='' as $$
declare request_id bigint; token text;
begin
 update public.nexora_job_push_deliveries set status='failed',lease_until=null where status='sending' and lease_until<now() and attempts>=5;
 if not exists(select 1 from public.nexora_job_push_deliveries where attempts<5 and ((status='pending' and next_attempt_at<=now()) or (status='sending' and lease_until<now()))) then return null;end if;
 select dispatch_token into token from public.nexora_job_push_config where id;
 select net.http_post(url:='https://zilwgiuiygqqardzutxi.supabase.co/functions/v1/nexora-job-push/dispatch',headers:=jsonb_build_object('Content-Type','application/json','x-nexora-push-secret',token),body:='{}'::jsonb,timeout_milliseconds:=10000) into request_id;
 return request_id;
end$$;
revoke all on function nexora_jobs_private.dispatch_push() from public,anon,authenticated;
select cron.schedule('nexora-job-push-delivery','* * * * *','select nexora_jobs_private.dispatch_push()');
notify pgrst,'reload schema';

create schema nexora_welcome_private;
revoke all on schema nexora_welcome_private from public,anon,authenticated;
create table nexora_welcome_private.jobs(
 customer_id uuid primary key references auth.users(id),phone text not null check(phone ~ '^\+91[1-9][0-9]{9}$'),
 status text not null default 'pending' check(status in ('pending','processing','retry','accepted','failed','unknown','suppressed')),
 attempts int not null default 0,provider_message_id text,last_error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),next_attempt_at timestamptz not null default now()
);
create index nexora_welcome_jobs_pending on nexora_welcome_private.jobs(status,next_attempt_at);
create index nexora_welcome_jobs_phone on nexora_welcome_private.jobs(phone,created_at desc);
create table nexora_welcome_private.worker_config(id boolean primary key default true check(id),enabled boolean not null default false,secret_id uuid not null,token_hash text not null);
alter table nexora_welcome_private.jobs enable row level security;
alter table nexora_welcome_private.worker_config enable row level security;
revoke all on all tables in schema nexora_welcome_private from public,anon,authenticated;
do $$ declare token text:=encode(extensions.gen_random_bytes(32),'hex'); secret_id uuid; begin
 select vault.create_secret(token,'studioflow_welcome_worker_token','Private welcome worker authentication') into secret_id;
 insert into nexora_welcome_private.worker_config(secret_id,token_hash) values(secret_id,encode(extensions.digest(token,'sha256'),'hex'));
end $$;
create function nexora_welcome_private.queue_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.raw_user_meta_data ? 'customer_referral_code' and new.raw_user_meta_data->>'whatsapp_welcome_opt_in'='true' and new.raw_user_meta_data->>'whatsapp_number' ~ '^\+91[1-9][0-9]{9}$' then
  insert into nexora_welcome_private.jobs(customer_id,phone) values(new.id,new.raw_user_meta_data->>'whatsapp_number') on conflict do nothing;
 end if;return new;
end $$;
revoke all on function nexora_welcome_private.queue_signup() from public,anon,authenticated;
create trigger studioflow_welcome_signup after insert on auth.users for each row execute function nexora_welcome_private.queue_signup();

create function studioflow_android_private.welcome_status() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return coalesce((select jsonb_build_object('status',status) from nexora_welcome_private.jobs where customer_id=auth.uid()),'{"status":"not_requested"}'::jsonb);
end $$;
create function public.studioflow_customer_welcome_status() returns jsonb language sql stable security invoker set search_path='' as $$select studioflow_android_private.welcome_status()$$;
revoke all on function studioflow_android_private.welcome_status(),public.studioflow_customer_welcome_status() from public,anon,authenticated;
grant execute on function studioflow_android_private.welcome_status(),public.studioflow_customer_welcome_status() to authenticated;

create function nexora_welcome_private.verify_worker(p_token text) returns boolean language sql stable security definer set search_path='' as $$
 select length(p_token)=64 and exists(select 1 from nexora_welcome_private.worker_config where token_hash=encode(extensions.digest(p_token,'sha256'),'hex'));
$$;
create function public.studioflow_welcome_verify_worker(p_token text) returns boolean language sql stable security invoker set search_path='' as $$select nexora_welcome_private.verify_worker(p_token)$$;
create function nexora_welcome_private.activate_worker() returns void language sql security definer set search_path='' as $$update nexora_welcome_private.worker_config set enabled=true$$;
create function public.studioflow_welcome_activate_worker() returns void language sql security invoker set search_path='' as $$select nexora_welcome_private.activate_worker()$$;
create function nexora_welcome_private.claim(p_customer uuid,p_limit integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare job record;result jsonb:='[]';
begin
 if p_limit not between 1 and 10 then raise exception 'Invalid batch';end if;
 update nexora_welcome_private.jobs set status='unknown',last_error='stale_processing_no_automatic_retry',updated_at=now() where status='processing' and updated_at<now()-interval '5 minutes';
 for job in select j.customer_id,j.phone,u.raw_user_meta_data,p.referral_code from nexora_welcome_private.jobs j join auth.users u on u.id=j.customer_id join public.studioflow_android_profiles p on p.customer_id=j.customer_id
 where (p_customer is null or j.customer_id=p_customer) and j.status in ('pending','retry') and j.attempts<3 and j.next_attempt_at<=now() and u.email_confirmed_at is not null and u.deleted_at is null and not coalesce(u.is_anonymous,false)
 order by j.created_at limit p_limit for update of j skip locked loop
  if not pg_try_advisory_xact_lock(hashtextextended(job.phone,762)) then continue;end if;
  if exists(select 1 from nexora_welcome_private.jobs j where j.phone=job.phone and j.customer_id<>job.customer_id and j.attempts>0 and j.created_at>now()-interval '24 hours') then
   update nexora_welcome_private.jobs set status='suppressed',last_error='phone_daily_limit',updated_at=now() where customer_id=job.customer_id;continue;
  end if;
  update nexora_welcome_private.jobs set status='processing',attempts=attempts+1,updated_at=now() where customer_id=job.customer_id;
  result:=result||jsonb_build_array(jsonb_build_object('customer_id',job.customer_id,'phone',job.phone,'name',left(coalesce(nullif(job.raw_user_meta_data->>'full_name',''),'Customer'),150),'referral_code',job.referral_code));
 end loop;return result;
end $$;
create function public.studioflow_welcome_claim(p_customer uuid default null,p_limit integer default 10) returns jsonb language sql security invoker set search_path='' as $$select nexora_welcome_private.claim(p_customer,p_limit)$$;
create function nexora_welcome_private.complete(p_customer uuid,p_status text,p_message text,p_error text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_status not in ('accepted','retry','failed','unknown') then raise exception 'Invalid result';end if;
 if p_status='accepted' and coalesce(length(p_message),0) not between 1 and 250 then raise exception 'Provider message ID required';end if;
 update nexora_welcome_private.jobs set status=p_status,provider_message_id=left(p_message,250),last_error=left(p_error,100),updated_at=now(),next_attempt_at=now()+interval '2 minutes' where customer_id=p_customer and status='processing';
end $$;
create function public.studioflow_welcome_complete(p_customer uuid,p_status text,p_message text,p_error text) returns void language sql security invoker set search_path='' as $$select nexora_welcome_private.complete(p_customer,p_status,p_message,p_error)$$;
grant usage on schema nexora_welcome_private to service_role;
revoke all on function nexora_welcome_private.verify_worker(text),public.studioflow_welcome_verify_worker(text),nexora_welcome_private.activate_worker(),public.studioflow_welcome_activate_worker(),nexora_welcome_private.claim(uuid,integer),public.studioflow_welcome_claim(uuid,integer),nexora_welcome_private.complete(uuid,text,text,text),public.studioflow_welcome_complete(uuid,text,text,text) from public,anon,authenticated;
grant execute on function nexora_welcome_private.verify_worker(text),public.studioflow_welcome_verify_worker(text),nexora_welcome_private.activate_worker(),public.studioflow_welcome_activate_worker(),nexora_welcome_private.claim(uuid,integer),public.studioflow_welcome_claim(uuid,integer),nexora_welcome_private.complete(uuid,text,text,text),public.studioflow_welcome_complete(uuid,text,text,text) to service_role;

create function nexora_welcome_private.dispatch() returns bigint language plpgsql security definer set search_path='' as $$
declare token text; request_id bigint;
begin
 if not exists(select 1 from nexora_welcome_private.worker_config where enabled) then return null;end if;
 select v.decrypted_secret into token from vault.decrypted_secrets v join nexora_welcome_private.worker_config c on c.secret_id=v.id;
 select net.http_post(url:='https://zilwgiuiygqqardzutxi.supabase.co/functions/v1/studioflow-welcome-whatsapp',headers:=jsonb_build_object('Content-Type','application/json','x-worker-token',token),body:='{}'::jsonb,timeout_milliseconds:=30000) into request_id;
 return request_id;
end $$;
revoke all on function nexora_welcome_private.dispatch() from public,anon,authenticated;
select cron.schedule('studioflow-welcome-whatsapp','* * * * *','select nexora_welcome_private.dispatch()');

-- Realtime carries only invalidation stamps. Portal records remain behind existing RLS.
create table public.nexora_job_live_revision (
 scope text primary key,
 user_id uuid references auth.users(id) on delete cascade,
 revision uuid not null default gen_random_uuid(),
 changed_at timestamptz not null default now(),
 check ((scope='public' and user_id is null) or scope='user:'||user_id::text)
);
alter table public.nexora_job_live_revision enable row level security;
revoke all on public.nexora_job_live_revision from public,anon,authenticated;
grant select on public.nexora_job_live_revision to anon,authenticated;
grant all on public.nexora_job_live_revision to service_role;
create policy live_revision_read on public.nexora_job_live_revision for select to anon,authenticated
using (scope='public' or user_id=(select auth.uid()));
create policy live_revision_service on public.nexora_job_live_revision for all to service_role using(true) with check(true);
insert into public.nexora_job_live_revision(scope) values('public');

create function nexora_jobs_private.touch_live_revision() returns trigger
language plpgsql security definer set search_path='' as $$
declare item jsonb; previous jsonb; uid uuid; owner_id uuid; public_change boolean;
begin
 item:=case when TG_OP='DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
 previous:=case when TG_OP='INSERT' then '{}'::jsonb else to_jsonb(OLD) end;
 public_change:=TG_TABLE_NAME in ('nexora_job_posts','nexora_job_categories','nexora_job_employers','nexora_job_public_salons')
 or (TG_TABLE_NAME='nexora_job_candidates' and (coalesce((item->>'discoverable')::boolean,false) or coalesce((previous->>'discoverable')::boolean,false)));
 if public_change then
  insert into public.nexora_job_live_revision(scope) values('public') on conflict(scope) do update set revision=gen_random_uuid(),changed_at=now();
 end if;
 for uid in select distinct v::uuid from unnest(array[item->>'user_id',item->>'candidate_id',item->>'employer_id',previous->>'user_id',previous->>'candidate_id',previous->>'employer_id']) v where v is not null loop
  insert into public.nexora_job_live_revision(scope,user_id) values('user:'||uid::text,uid) on conflict(scope) do update set revision=gen_random_uuid(),changed_at=now();
 end loop;
 if TG_TABLE_NAME='nexora_job_applications' then
  select employer_id into owner_id from public.nexora_job_posts where id=(item->>'job_id')::uuid;
  if owner_id is not null then insert into public.nexora_job_live_revision(scope,user_id) values('user:'||owner_id::text,owner_id) on conflict(scope) do update set revision=gen_random_uuid(),changed_at=now();end if;
 end if;
 return null;
end$$;
revoke all on function nexora_jobs_private.touch_live_revision() from public,anon,authenticated;

do $$declare tab text;begin
 foreach tab in array array['posts','categories','candidates','employers','public_salons','applications','invitations','interviews','saved','notifications','assistance','verifications','accounts'] loop
  execute format('create trigger nexora_job_live_revision after insert or update or delete on public.%I for each row execute function nexora_jobs_private.touch_live_revision()', 'nexora_job_'||tab);
 end loop;
end$$;
alter publication supabase_realtime add table public.nexora_job_live_revision;

-- Enqueue one asynchronous dispatch per statement rather than wait for the minute cron.
-- Keep cron as the durable retry path. HTTP work starts only after transaction commit.
create function nexora_jobs_private.dispatch_new_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from new_deliveries) then
  begin perform nexora_jobs_private.dispatch_push();exception when others then null;end;
 end if;
 return null;
end$$;
revoke all on function nexora_jobs_private.dispatch_new_push() from public,anon,authenticated;
create trigger nexora_job_dispatch_new_push after insert on public.nexora_job_push_deliveries
referencing new table as new_deliveries for each statement execute function nexora_jobs_private.dispatch_new_push();

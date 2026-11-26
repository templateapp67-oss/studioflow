create or replace function nexora_jobs_private.touch_live_revision() returns trigger
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
 for uid in select distinct v::uuid from unnest(array[item->>'user_id',item->>'candidate_id',item->>'employer_id',previous->>'user_id',previous->>'candidate_id',previous->>'employer_id']) v where v is not null and exists(select 1 from auth.users where id=v::uuid) loop
  insert into public.nexora_job_live_revision(scope,user_id) values('user:'||uid::text,uid) on conflict(scope) do update set revision=gen_random_uuid(),changed_at=now();
 end loop;
 if TG_TABLE_NAME='nexora_job_applications' then
  select employer_id into owner_id from public.nexora_job_posts where id=(item->>'job_id')::uuid;
  if owner_id is not null then insert into public.nexora_job_live_revision(scope,user_id) values('user:'||owner_id::text,owner_id) on conflict(scope) do update set revision=gen_random_uuid(),changed_at=now();end if;
 end if;
 return null;
end$$;
alter table public.nexora_job_live_revision drop constraint nexora_job_live_revision_check;
alter table public.nexora_job_live_revision add constraint nexora_job_live_revision_check check ((scope='public' and user_id is null) or (user_id is not null and scope='user:'||user_id::text));

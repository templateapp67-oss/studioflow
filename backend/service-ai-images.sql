-- Private generation ledger: no client table access and no client key access.
create table studioflow_private.service_ai_image_jobs(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),request_id uuid not null,status text not null default 'pending' check(status in ('pending','complete','failed')),images jsonb not null default '[]',error_message text not null default '',created_at timestamptz not null default now(),unique(owner_id,request_id));
alter table studioflow_private.service_ai_image_jobs enable row level security;
revoke all on studioflow_private.service_ai_image_jobs from public,anon,authenticated;
create index service_ai_image_jobs_created on studioflow_private.service_ai_image_jobs(created_at);
create or replace function studioflow_private.service_ai_images_claim(p_owner uuid,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j studioflow_private.service_ai_image_jobs; provider_key text;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Trusted server required' using errcode='42501';end if;
 if not exists(select 1 from public.studioflow_accounts where user_id=p_owner) then raise exception 'Salon owner required';end if;
 perform pg_advisory_xact_lock(hashtext('studioflow_service_ai_images'));
 select * into j from studioflow_private.service_ai_image_jobs where owner_id=p_owner and request_id=p_request;
 if found then
 if j.status='pending' and j.created_at<now()-interval '10 minutes' then update studioflow_private.service_ai_image_jobs set status='failed',error_message='Previous generation timed out. You may start a new set.' where id=j.id returning * into j;end if;
 return jsonb_build_object('proceed',false,'id',j.id,'status',j.status,'images',j.images,'error',j.error_message);end if;
 if (select count(*) from studioflow_private.service_ai_image_jobs where owner_id=p_owner and created_at>now()-interval '24 hours')>=4 or (select count(*) from studioflow_private.service_ai_image_jobs where created_at>now()-interval '24 hours')>=30 then raise exception 'Daily image generation limit reached. Try again tomorrow.';end if;
 if exists(select 1 from studioflow_private.service_ai_image_jobs where owner_id=p_owner and created_at>now()-interval '60 seconds') then raise exception 'Please wait a minute before generating another set.';end if;
 select decrypted_secret into provider_key from vault.decrypted_secrets where name='nexora_service_images_openai';
 if coalesce(provider_key,'')='' then raise exception 'AI image service is not configured';end if;
 insert into studioflow_private.service_ai_image_jobs(owner_id,request_id) values(p_owner,p_request) returning * into j;
 return jsonb_build_object('proceed',true,'id',j.id,'apiKey',provider_key);
end $$;
create or replace function studioflow_private.service_ai_images_finish(p_owner uuid,p_job uuid,p_images jsonb,p_error text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Trusted server required' using errcode='42501';end if;
 update studioflow_private.service_ai_image_jobs set status=case when jsonb_array_length(p_images)=3 then 'complete' else 'failed' end,images=p_images,error_message=left(coalesce(p_error,''),300) where id=p_job and owner_id=p_owner and status='pending';
 return found;
end $$;
create or replace function public.studioflow_service_ai_images_claim(p_owner uuid,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$select studioflow_private.service_ai_images_claim(p_owner,p_request)$$;
create or replace function public.studioflow_service_ai_images_finish(p_owner uuid,p_job uuid,p_images jsonb,p_error text) returns boolean language sql security invoker set search_path='' as $$select studioflow_private.service_ai_images_finish(p_owner,p_job,p_images,p_error)$$;
revoke all on function studioflow_private.service_ai_images_claim(uuid,uuid),studioflow_private.service_ai_images_finish(uuid,uuid,jsonb,text),public.studioflow_service_ai_images_claim(uuid,uuid),public.studioflow_service_ai_images_finish(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant usage on schema studioflow_private to service_role;
grant execute on function studioflow_private.service_ai_images_claim(uuid,uuid),studioflow_private.service_ai_images_finish(uuid,uuid,jsonb,text),public.studioflow_service_ai_images_claim(uuid,uuid),public.studioflow_service_ai_images_finish(uuid,uuid,jsonb,text) to service_role;

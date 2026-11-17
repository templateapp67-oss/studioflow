-- Notify authorized portal admins when a job enters the actionable review queue.
-- Existing RLS/guard_post remains the authority for all moderation decisions.
create function nexora_jobs_private.notify_job_review() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and auth.uid()<>NEW.employer_id and not nexora_jobs_private.is_admin() then
  raise exception 'Job owner or administrator required' using errcode='42501';
 end if;
 if NEW.status<>'published' or NEW.moderation_status<>'pending' then return NEW;end if;
 if TG_OP='UPDATE' then
  if OLD.status='published' and OLD.moderation_status='pending' then return NEW;end if;
 end if;
 insert into public.nexora_job_notifications(user_id,title,message,link)
 select u.id,'Job awaiting approval',NEW.title||' · '||NEW.salon_name||' is awaiting review. Open Job approvals in the Admin Panel.','#admin'
 from auth.users u
 where u.raw_app_meta_data->>'job_portal_role'='admin'
 and not exists(select 1 from public.nexora_job_accounts a where a.user_id=u.id and a.suspended);
 return NEW;
end$$;
revoke all on function nexora_jobs_private.notify_job_review() from public,anon,authenticated;
create trigger nexora_job_admin_review_alert after insert or update on public.nexora_job_posts
 for each row execute function nexora_jobs_private.notify_job_review();

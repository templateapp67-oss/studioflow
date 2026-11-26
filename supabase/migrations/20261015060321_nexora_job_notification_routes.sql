create function nexora_jobs_private.notification_route() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if NEW.link='#dashboard' then
  NEW.link:='#dashboard?tab='||case NEW.title
   when 'New application' then 'hiring'
   when 'Application received' then 'applications'
   when 'Application status updated' then 'applications'
   when 'Invitation to apply' then 'alerts'
   when 'Interview update' then 'interviews'
   when 'Verification update' then 'verification'
   when 'Job moderation update' then 'hiring'
   when 'Assisted hiring update' then 'assistance'
   else 'notifications' end;
 end if;
 return NEW;
end$$;
revoke all on function nexora_jobs_private.notification_route() from public,anon,authenticated;
create trigger nexora_job_notification_route before insert on public.nexora_job_notifications for each row execute function nexora_jobs_private.notification_route();

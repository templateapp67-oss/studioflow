-- Tighten anonymous access to a trigger-only SECURITY DEFINER function
-- and pin the social-video limit trigger to an empty search_path.

begin;

-- This function is attached to owner_editor_state by an AFTER trigger. It is
-- not a browser RPC; PostgreSQL checks trigger-function EXECUTE at CREATE
-- TRIGGER time, not for each row firing. Keep the existing authenticated and
-- service_role ACLs while removing inherited PUBLIC/anonymous execution.
revoke execute on function public.sync_owner_template_catalogue()
  from public, anon;
grant execute on function public.sync_owner_template_catalogue()
  to authenticated, service_role;

-- All relation references in this trigger are schema-qualified.
alter function public.check_max_salon_social_videos()
  set search_path = '';

do $$
begin
  if has_function_privilege('anon','public.sync_owner_template_catalogue()','EXECUTE') then
    raise exception 'Anonymous execution of sync_owner_template_catalogue must be denied';
  end if;
  if not has_function_privilege('authenticated','public.sync_owner_template_catalogue()','EXECUTE') then
    raise exception 'Authenticated execution of sync_owner_template_catalogue must be retained';
  end if;
  if not has_function_privilege('service_role','public.sync_owner_template_catalogue()','EXECUTE') then
    raise exception 'service_role execution of sync_owner_template_catalogue must be retained';
  end if;
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'check_max_salon_social_videos'
      and p.proconfig @> array['search_path=""']
  ) then
    raise exception 'check_max_salon_social_videos must use an empty search_path';
  end if;
end
$$;

commit;

-- Ensure authenticated users can execute studioflow_android_profile()
-- while keeping public and anon roles denied (fail-closed).

grant usage on schema studioflow_android_private to authenticated;

revoke all on function public.studioflow_android_profile() from public, anon;
grant execute on function public.studioflow_android_profile() to authenticated;

revoke all on function studioflow_android_private.profile() from public, anon;
grant execute on function studioflow_android_private.profile() to authenticated;

notify pgrst, 'reload schema';

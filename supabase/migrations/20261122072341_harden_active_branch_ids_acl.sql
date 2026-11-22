-- Keep the branch-list helper internal to already-authorized staff RPCs.
-- All callers are postgres-owned SECURITY DEFINER entry points:
--   * staff_scope validates an active membership for auth.uid() and p_owner;
--   * invite_create / member_update_access require the salon owner;
--   * invite_accept validates the pending token and invited account;
--   * invite_lookup is a bearer-token flow with a minimal response.
-- The helper itself must not be a browser-callable SECURITY DEFINER endpoint.
begin;

alter function public.studioflow_active_branch_ids(uuid, text[])
  security invoker;

revoke all on function public.studioflow_active_branch_ids(uuid, text[])
  from public, anon, authenticated;

grant execute on function public.studioflow_active_branch_ids(uuid, text[])
  to postgres, service_role;

commit;

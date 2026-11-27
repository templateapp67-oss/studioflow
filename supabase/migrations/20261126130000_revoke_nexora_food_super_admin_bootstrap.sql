-- =============================================================================
-- Security hardening (2026-11-26): revoke the standing super_admin grant that
-- 20261011080053_nexora_food_shared_backend.sql bootstrapped for the personal
-- account templateapp67@gmail.com.
--
-- Applied migrations are never edited, so the historical INSERT stays in that
-- file. This migration removes exactly that grant: the super_admin role
-- row(s) for the auth user(s) registered with that email, nothing else. The
-- account keeps its customer role (which the same migration granted to every
-- auth user). Going forward, super_admin must be granted explicitly by an
-- existing super_admin or by the operator, never by a baked-in migration.
--
-- Idempotent and safe to re-run:
--   * deletes only rows matching (user_id, role) for the bootstrap email;
--   * writes a compensating audit entry ONLY when a row was actually removed
--     (a second run removes nothing and logs nothing);
--   * is a no-op when the email or the super_admin row is absent.
--
-- Retain behind the protected manual production migration workflow, exactly
-- like the other release-pending migration in this repository. This file is
-- not applied automatically.
-- =============================================================================

do $$
declare
  target record;
begin
  for target in
    select id from auth.users where lower(email) = 'templateapp67@gmail.com'
  loop
    delete from public.nexora_food_user_roles
     where user_id = target.id
       and role = 'super_admin';

    if found then
      insert into public.nexora_food_admin_audit_logs
        (actor_id, action, entity, entity_id, before, after, reason)
      values (
        target.id,
        'revoke-super-admin-bootstrap',
        'nexora_food_user_roles',
        target.id::text,
        jsonb_build_object('role', 'super_admin'),
        null,
        'Revoked the standing super_admin grant bootstrapped by 20261011080053_nexora_food_shared_backend for this personal account; super_admin must be granted explicitly going forward.'
      );
    end if;
  end loop;
end $$;

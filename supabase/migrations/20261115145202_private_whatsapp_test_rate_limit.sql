-- Rename the initial test-only rate-limit RPC so it is clearly server-private.
-- The original migration is intentionally still safe for fresh installs; this
-- forward migration also upgrades projects where that earlier version ran.
do $migration$
begin
  if to_regprocedure('public.studioflow_whatsapp_test_rate_limit(uuid,text,integer)') is not null
     and to_regprocedure('public.private_whatsapp_test_rate_limit(uuid,text,integer)') is null then
    execute 'alter function public.studioflow_whatsapp_test_rate_limit(uuid,text,integer) rename to private_whatsapp_test_rate_limit';
  end if;
end
$migration$;

-- The QR-reward dashboard variant omitted the partner identity card expected
-- by the frontend. Add the caller's stored code without rotating or deriving it.
begin;
do $migration$
declare definition text;
  original_return text := 'return jsonb_build_object(''total_shops_onboarded''';
  patched_return text := $replacement$return jsonb_build_object('partner', (
    select jsonb_build_object(
      'referral_code', gp.referral_code,
      'is_active', gp.is_active,
      'partner_since', gp.created_at
    ) from public.growth_partners gp where gp.user_id = auth.uid()
  )) || jsonb_build_object('total_shops_onboarded'$replacement$;
begin
  if to_regprocedure('public.get_my_partner_dashboard()') is null then return; end if;
  select pg_get_functiondef('public.get_my_partner_dashboard()'::regprocedure) into definition;
  -- Other dashboard variants already include partner data. Patch only the
  -- observed reward variant and keep its metrics, grants and invoker execution.
  if strpos(definition, original_return) > 0 then
    execute replace(definition, original_return, patched_return);
  end if;
end;
$migration$;
notify pgrst, 'reload schema';
commit;

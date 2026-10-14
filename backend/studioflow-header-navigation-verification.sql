begin;
do $$
declare actor uuid; draft jsonb; rev integer; result jsonb; menu jsonb:='[{"id":"services","enabled":true},{"id":"home","enabled":true},{"id":"packages","enabled":false},{"id":"gallery","enabled":true},{"id":"about","enabled":true},{"id":"contact","enabled":true},{"id":"bookings","enabled":true}]';next_theme text;
begin
 select a.user_id,a.draft,a.revision into actor,draft,rev from public.studioflow_accounts a join public.studioflow_websites w on w.owner_id=a.user_id order by w.published_at desc limit 1;
 if actor is null then raise exception 'No workspace available';end if;
 select id into next_theme from public.studioflow_templates where active and id<>draft->'profile'->>'businessType' limit 1;
 perform set_config('request.jwt.claim.sub',actor::text,true);execute 'set local role authenticated';
 draft:=jsonb_set(draft,'{profile,headerNavigation}',menu);
 result:=public.studioflow_save_workspace(draft,rev);rev:=(result->>'revision')::integer;
 if result->'draft'->'profile'->'headerNavigation' is distinct from menu then raise exception 'Menu settings did not persist';end if;
 if not exists(select 1 from public.studioflow_websites where owner_id=actor and content->'profile'->'headerNavigation'=menu) then raise exception 'Published menu did not synchronize';end if;
 draft:=jsonb_set(draft,'{profile,businessType}',to_jsonb(next_theme));result:=public.studioflow_save_workspace(draft,rev);
 if result->'draft'->'profile'->'headerNavigation' is distinct from menu then raise exception 'Template switch lost navigation';end if;
 execute 'set local role anon';perform set_config('request.jwt.claim.sub','',true);
 if not exists(select 1 from public.studioflow_websites where owner_id=actor and content->'profile'->'headerNavigation'=menu) then raise exception 'Anonymous storefront received stale menu';end if;
 execute 'set local role postgres';
end $$;
rollback;
select 'PASS: menu enabled states/order persist in Supabase, synchronize to published storefront and survive template switches (test changes rolled back)' as verification;

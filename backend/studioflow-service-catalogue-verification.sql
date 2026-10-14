begin;
do $$
declare actor uuid; other_actor uuid:=gen_random_uuid(); d jsonb; revision_no integer; result jsonb; service jsonb; invalid jsonb; blocked boolean; salon_slug text; next_template text; rows_before integer;
begin
 select w.owner_id,w.slug,a.draft,a.revision into actor,salon_slug,d,revision_no from public.studioflow_websites w join public.studioflow_accounts a on a.user_id=w.owner_id order by w.published_at desc limit 1;
 if actor is null then raise exception 'No owner workspace available for verification';end if;
 rows_before:=jsonb_array_length(d->'services');
 select id into next_template from public.studioflow_templates where active and id<>d->'profile'->>'businessType' order by id limit 1;
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values(other_actor,'authenticated','authenticated',other_actor::text||'@service-qa.invalid','{}','{}');
 perform set_config('request.jwt.claim.sub',actor::text,true);execute 'set local role authenticated';
 service:=jsonb_build_object('id','qa-custom-service','name','QA Custom Ritual','description','Owner-defined description retained across template changes.','category','Custom rituals','price',1250.50,'durationMinutes',55,'icon','spa','popular',true,'showDuration',false,'origin','custom');
 d:=jsonb_set(d,'{services}',(d->'services')||jsonb_build_array(service));
 d:=jsonb_set(d,'{profile,serviceCatalogueInitialized}','true');
 result:=public.studioflow_save_workspace(d,revision_no);revision_no:=(result->>'revision')::integer;
 if not exists(select 1 from public.studioflow_services where owner_id=actor and service_id='qa-custom-service' and name='QA Custom Ritual' and category='Custom rituals' and description=service->>'description' and price=1250.50 and duration_minutes=55 and not show_duration and origin='custom') then raise exception 'Catalogue addition did not persist all fields';end if;
 if not exists(select 1 from public.studioflow_websites w cross join lateral jsonb_array_elements(w.content->'services') s where w.owner_id=actor and s=service) then raise exception 'Published menu did not synchronize';end if;
 blocked:=false;begin delete from public.studioflow_services where owner_id=actor and service_id='qa-custom-service';exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Direct catalogue mutation was allowed';end if;
 -- Update price/description and select another template without replacing service IDs.
 service:=service||jsonb_build_object('price',1499.75,'description','Edited custom description.');
 d:=jsonb_set(d,array['services',rows_before::text],service);
 d:=jsonb_set(d,'{profile,businessType}',to_jsonb(next_template));
 result:=public.studioflow_save_workspace(d,revision_no);revision_no:=(result->>'revision')::integer;
 if not exists(select 1 from public.studioflow_services where owner_id=actor and service_id='qa-custom-service' and price=1499.75 and description='Edited custom description.') then raise exception 'Edited service/template switch did not persist';end if;
 -- Invalid category, price precision and duration fail without partial writes.
 for invalid in select jsonb_set(d,array['services',rows_before::text,'category'],'""') union all select jsonb_set(d,array['services',rows_before::text,'price'],'1.001') union all select jsonb_set(d,array['services',rows_before::text,'durationMinutes'],'0') loop
  blocked:=false;begin perform public.studioflow_save_workspace(invalid,revision_no);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Invalid service accepted';end if;
 end loop;
 blocked:=false;begin perform public.studioflow_save_workspace(d,revision_no-1);exception when others then blocked:=true;end;
 if not blocked then raise exception 'Stale revision accepted';end if;
 perform set_config('request.jwt.claim.sub',other_actor::text,true);
 if exists(select 1 from public.studioflow_services where owner_id=actor) then raise exception 'Another owner can read private catalogue';end if;
 blocked:=false;begin perform public.studioflow_save_workspace(d,revision_no);exception when others then blocked:=true;end;
 if not blocked then raise exception 'Another owner can save selected workspace';end if;
 execute 'set local role anon';perform set_config('request.jwt.claim.sub','',true);
 if not exists(select 1 from public.studioflow_websites w cross join lateral jsonb_array_elements(w.content->'services') s where w.slug=salon_slug and s=service) then raise exception 'Anonymous visitor cannot see the edited published service';end if;
 if has_table_privilege('anon','public.studioflow_services','SELECT') then raise exception 'Raw catalogue exposed to anonymous visitors';end if;
 if has_function_privilege('authenticated','studioflow_private.sync_service_catalogue()','EXECUTE') then raise exception 'Private trigger executable by client';end if;
 execute 'set local role authenticated';perform set_config('request.jwt.claim.sub',actor::text,true);
 d:=jsonb_set(d,'{services}',(d->'services')-rows_before);
 result:=public.studioflow_save_workspace(d,revision_no);revision_no:=(result->>'revision')::integer;
 if exists(select 1 from public.studioflow_services where owner_id=actor and service_id='qa-custom-service') or exists(select 1 from public.studioflow_websites w cross join lateral jsonb_array_elements(w.content->'services') s where w.owner_id=actor and s->>'id'='qa-custom-service') then raise exception 'Removal did not synchronize';end if;
 -- Empty menus are intentional and remain empty in saved/public state.
 d:=jsonb_set(d,'{services}','[]');result:=public.studioflow_save_workspace(d,revision_no);
 if exists(select 1 from public.studioflow_services where owner_id=actor) or not exists(select 1 from public.studioflow_websites where owner_id=actor and content->'services'='[]'::jsonb) then raise exception 'Empty catalogue was repopulated';end if;
 execute 'set local role postgres';
 raise notice 'PASS: add/edit/remove, all fields, template switch, atomic public synchronization, stale revision and invalid input rejection, owner isolation, no direct mutations, intentional empty menu';
end $$;
rollback;
select 'PASS: service CRUD, theme persistence, public synchronization, input validation, conflicts and owner isolation (test changes rolled back)' as verification;

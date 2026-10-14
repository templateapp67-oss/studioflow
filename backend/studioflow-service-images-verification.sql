begin;
do $$
declare actor uuid; other_actor uuid:=gen_random_uuid(); d jsonb; revision_no integer; result jsonb; service jsonb; invalid jsonb; blocked boolean; salon_slug text; next_template text; rows_before integer; image_one text; image_two text; foreign_image text; missing_image text; prefix constant text:='https://zilwgiuiygqqardzutxi.supabase.co/storage/v1/object/public/studioflow-media/';
begin
 select w.owner_id,w.slug,a.draft,a.revision into actor,salon_slug,d,revision_no from public.studioflow_websites w join public.studioflow_accounts a on a.user_id=w.owner_id order by w.published_at desc limit 1;
 if actor is null then raise exception 'No owner workspace available for verification';end if;
 rows_before:=jsonb_array_length(d->'services');
 select id into next_template from public.studioflow_templates where active and id<>d->'profile'->>'businessType' order by id limit 1;
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values(other_actor,'authenticated','authenticated',other_actor::text||'@service-qa.invalid','{}','{}');
 missing_image:=actor::text||'/services/'||gen_random_uuid()::text||'.jpg';
 image_one:=actor::text||'/services/'||gen_random_uuid()::text||'.jpg';image_two:=actor::text||'/services/'||gen_random_uuid()::text||'.png';foreign_image:=other_actor::text||'/services/'||gen_random_uuid()::text||'.jpg';
 insert into storage.objects(bucket_id,name,metadata) values('studioflow-media',image_one,'{"mimetype":"image/jpeg"}'),('studioflow-media',image_two,'{"mimetype":"image/png"}'),('studioflow-media',foreign_image,'{"mimetype":"image/jpeg"}');
 perform set_config('request.jwt.claim.sub',actor::text,true);execute 'set local role authenticated';
 service:=jsonb_build_object('id','qa-custom-service','name','QA Custom Ritual','description','Owner-defined description retained across template changes.','category','Custom rituals','price',1250.50,'durationMinutes',55,'icon','spa','popular',true,'showDuration',false,'origin','custom','imageUrl',prefix||image_one,'imagePath',image_one);
 d:=jsonb_set(d,'{services}',(d->'services')||jsonb_build_array(service));
 d:=jsonb_set(d,'{profile,serviceCatalogueInitialized}','true');
 result:=public.studioflow_save_workspace(d,revision_no);revision_no:=(result->>'revision')::integer;
 if not exists(select 1 from public.studioflow_services where owner_id=actor and service_id='qa-custom-service' and name='QA Custom Ritual' and category='Custom rituals' and description=service->>'description' and price=1250.50 and duration_minutes=55 and not show_duration and origin='custom' and image_path=image_one and image_url=prefix||image_one) then raise exception 'Catalogue addition did not persist all fields';end if;
 if not exists(select 1 from public.studioflow_websites w cross join lateral jsonb_array_elements(w.content->'services') s where w.owner_id=actor and s=service) then raise exception 'Published menu did not synchronize';end if;
 blocked:=false;begin delete from public.studioflow_services where owner_id=actor and service_id='qa-custom-service';exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Direct catalogue mutation was allowed';end if;
 -- Update price/description and select another template without replacing service IDs.
 service:=service||jsonb_build_object('price',1499.75,'description','Edited custom description.','imagePath',image_two,'imageUrl',prefix||image_two);
 d:=jsonb_set(d,array['services',rows_before::text],service);
 d:=jsonb_set(d,'{profile,businessType}',to_jsonb(next_template));
 result:=public.studioflow_save_workspace(d,revision_no);revision_no:=(result->>'revision')::integer;
 if not exists(select 1 from public.studioflow_services where owner_id=actor and service_id='qa-custom-service' and price=1499.75 and description='Edited custom description.' and image_path=image_two and image_url=prefix||image_two) then raise exception 'Edited service/template switch did not persist';end if;
 -- Reject another owner's photo, missing uploads, mismatched pairs and unsafe URLs.
 for invalid in
  select jsonb_set(d,array['services',rows_before::text],service||jsonb_build_object('imagePath',foreign_image,'imageUrl',prefix||foreign_image))
  union all select jsonb_set(d,array['services',rows_before::text],service||jsonb_build_object('imagePath',missing_image,'imageUrl',prefix||missing_image))
  union all select jsonb_set(d,array['services',rows_before::text,'imagePath'],'""')
  union all select jsonb_set(d,array['services',rows_before::text,'imageUrl'],'"javascript:alert(1)"')
 loop
  blocked:=false;begin perform public.studioflow_save_workspace(invalid,revision_no);exception when others then blocked:=true;end;
  if not blocked then raise exception 'Invalid or foreign image accepted';end if;
 end loop;
 blocked:=false;begin insert into storage.objects(bucket_id,name,metadata) values('studioflow-media',other_actor::text||'/services/'||gen_random_uuid()::text||'.jpg','{"mimetype":"image/jpeg"}');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Storage permits upload to another owner folder';end if;
 if exists(select 1 from storage.objects where bucket_id='studioflow-media' and name=foreign_image) then raise exception 'Storage exposes another owner private object row';end if;
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
 service:=service||jsonb_build_object('imageUrl','','imagePath','');
 d:=jsonb_set(d,array['services',rows_before::text],service);
 result:=public.studioflow_save_workspace(d,revision_no);revision_no:=(result->>'revision')::integer;
 if not exists(select 1 from public.studioflow_services where owner_id=actor and service_id='qa-custom-service' and image_path is null and image_url is null) then raise exception 'Image removal did not clear catalogue';end if;
 if not exists(select 1 from public.studioflow_websites w cross join lateral jsonb_array_elements(w.content->'services') s where w.owner_id=actor and s=service) then raise exception 'Image removal did not update published card';end if;
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
select 'PASS: service images save/replace/remove, all fields, theme persistence, public synchronization, foreign-image rejection, storage ownership and catalogue isolation (test changes rolled back)' as verification;

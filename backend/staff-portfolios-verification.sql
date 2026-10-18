begin;
do $$
declare actor uuid; d jsonb; revision int; result jsonb; projected jsonb; staff_id text:='staff-qa-'||gen_random_uuid()::text;
begin
 select a.user_id,a.draft,a.revision into actor,d,revision from public.studioflow_accounts a join public.studioflow_websites w on w.owner_id=a.user_id limit 1;
 if actor is null then raise exception 'No published test target';end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 d:=jsonb_set(d,'{stylists}',(d->'stylists')||jsonb_build_array(jsonb_build_object('id',staff_id,'name','QA portfolio specialist','role','Specialist','assignedServices',jsonb_build_array(d->'services'->0->>'id'),'phone','PRIVATE_TEST','commissionRate',15,'schedule','[]'::jsonb,'accessRole','PRIVATE_TEST','workGallery',jsonb_build_array(jsonb_build_object('id','allowed','imageUrl','https://example.com/allowed.jpg','caption','QA consented work','consented',true),jsonb_build_object('id','hidden','imageUrl','https://example.com/hidden.jpg','consented',false)))));
 result:=studioflow_private.save_workspace(d,revision);
 if not exists(select 1 from jsonb_array_elements(result->'draft'->'stylists') s where s->>'id'=staff_id and s->'workGallery'->0->>'caption'='QA consented work') then raise exception 'Staff not persisted';end if;
 select s into projected from public.studioflow_websites w cross join lateral jsonb_array_elements(w.content->'stylists') s where w.owner_id=actor and s->>'id'=staff_id;
 if projected is null or jsonb_array_length(projected->'workGallery')<>1 or projected->'workGallery'->0->>'id'<>'allowed' then raise exception 'Gallery projection failed';end if;
 if projected ?| array['phone','schedule','commissionRate','accessRole','assignedServices'] then raise exception 'Private staff fields leaked';end if;
 if projected->'expertiseServiceIds'<>jsonb_build_array(d->'services'->0->>'id') then raise exception 'Expertise mapping failed';end if;
 raise notice 'PASS: staff create/save and public website synchronization, consent filtering, exact service expertise and private staff field removal. QA changes rolled back.';
end $$;
rollback;

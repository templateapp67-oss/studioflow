begin;
do $$declare owner uuid; target text; menu jsonb; original_count integer; after_count integer;begin
 if (select count(*) from studioflow_private.starter_package_catalogues where jsonb_array_length(packages)=5)<>14 then raise exception 'Not all templates have five packages';end if;
 if exists(select 1 from public.studioflow_websites w where (select count(*) from jsonb_array_elements(w.content->'services') s where concat(s->>'category',' ',s->>'name')~*'package|combo|bundle')<5) then raise exception 'Published package section still empty';end if;
 if exists(select 1 from public.studioflow_websites w cross join lateral jsonb_array_elements(w.content->'services') s where concat(s->>'category',' ',s->>'name')~*'package|combo|bundle' and not exists(select 1 from public.studioflow_services c where c.owner_id=w.owner_id and c.service_id=s->>'id')) then raise exception 'Published package IDs missing from saved service catalogue';end if;
 if has_function_privilege('authenticated','studioflow_private.seed_starter_packages(jsonb,jsonb)','EXECUTE') then raise exception 'Private seed helper exposed';end if;
 select user_id,draft->'services' into owner,menu from public.studioflow_accounts where draft->'profile'->>'businessType' is not null limit 1;
 select s->>'id' into target from jsonb_array_elements(menu) s where s->>'id' like 'template-pkg-%' limit 1;
 select count(*) into original_count from jsonb_array_elements(menu) s where concat(s->>'category',' ',s->>'name')~*'package|combo|bundle';
 update public.studioflow_accounts set draft=jsonb_set(draft,'{services}',(select jsonb_agg(case when s->>'id'=target then s||'{"price":999,"description":"QA edited package"}'::jsonb else s end) from jsonb_array_elements(menu) s)),revision=revision+1 where user_id=owner;
 if not exists(select 1 from public.studioflow_services where owner_id=owner and service_id=target and price=999 and description='QA edited package') then raise exception 'Package edit did not synchronize';end if;
 update public.studioflow_accounts set draft=jsonb_set(draft,'{services}',(select jsonb_agg(s) from jsonb_array_elements(draft->'services') s where s->>'id'<>target)),revision=revision+1 where user_id=owner;
 update public.studioflow_accounts set draft=draft,revision=revision+1 where user_id=owner;
 select count(*) into after_count from public.studioflow_accounts a cross join lateral jsonb_array_elements(a.draft->'services') s where a.user_id=owner and concat(s->>'category',' ',s->>'name')~*'package|combo|bundle';
 if after_count<>original_count-1 or exists(select 1 from public.studioflow_services where owner_id=owner and service_id=target) then raise exception 'Deleted package resurfaced';end if;
end $$;
select 'PASS: 14 template catalogues × five packages, all published menus filled, canonical service IDs synchronized, private seed helper, real owner edit/delete persistence; fixtures rolled back' as verification;
rollback;

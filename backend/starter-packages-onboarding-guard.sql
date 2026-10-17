create or replace function studioflow_private.initialize_starter_packages() returns trigger language plpgsql security definer set search_path='' as $$
declare template text:=coalesce(new.draft->'profile'->>'businessType',new.template_id,'hair_salon'); candidates jsonb; menu jsonb;
begin
 if auth.uid() is not null and auth.uid()<>new.user_id then raise exception 'Own workspace required' using errcode='42501';end if;
 if new.draft->'profile'->>'businessType' is null then return new;end if;
 if coalesce(new.draft->'profile'->>'serviceCatalogueInitialized','false')<>'true' and jsonb_array_length(coalesce(new.draft->'services','[]'))=0 then return new;end if;
 if new.draft->'profile'->>'packageCatalogueInitialized'='true' then return new;end if;
 select packages into candidates from studioflow_private.starter_package_catalogues where template_id=template;
 if candidates is null then return new;end if;
 menu:=studioflow_private.seed_starter_packages(coalesce(new.draft->'services','[]'),candidates);
 new.draft:=jsonb_set(jsonb_set(new.draft,'{profile}',coalesce(new.draft->'profile','{}')||jsonb_build_object('packageCatalogueInitialized',true)),'{services}',menu);
 return new;
end $$;

update public.studioflow_accounts a set draft=(a.draft-'profile')||jsonb_build_object('services','[]'::jsonb),revision=revision+1,updated_at=now() where a.template_id is null and a.draft->'profile'='{"packageCatalogueInitialized":true}'::jsonb and not exists(select 1 from public.studioflow_websites where owner_id=a.user_id) and not exists(select 1 from jsonb_array_elements(a.draft->'services') s where s->>'id' not like 'template-pkg-%');

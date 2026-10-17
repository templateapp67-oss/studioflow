-- Repair only the exact unrelated seeded assignments when neither exists in the published menu.
-- [] is the existing unrestricted-services representation used by the booking engine.
update public.studioflow_accounts a
set draft=jsonb_set(a.draft,'{stylists}',(
 select jsonb_agg(case when e->'assignedServices'='["Luxury Spa Pedicure","Gel Polish Overlay"]'::jsonb
 and not exists(select 1 from public.studioflow_websites w cross join lateral jsonb_array_elements(w.content->'services') s where w.owner_id=a.user_id and s->>'name' in ('Luxury Spa Pedicure','Gel Polish Overlay'))
 then jsonb_set(e,'{assignedServices}','[]') else e end order by ord)
 from jsonb_array_elements(a.draft->'stylists') with ordinality items(e,ord)
)), revision=revision+1, updated_at=now()
where exists(select 1 from public.studioflow_websites w where w.owner_id=a.user_id and w.slug not like 'studioflow-qa-%')
and exists(select 1 from jsonb_array_elements(a.draft->'stylists') e where e->'assignedServices'='["Luxury Spa Pedicure","Gel Polish Overlay"]'::jsonb);

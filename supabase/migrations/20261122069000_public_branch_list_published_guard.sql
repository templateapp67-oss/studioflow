-- A public branch lookup must have the same publication gate as the
-- storefront projection: never expose branch details for future/unpublished sites.
begin;

create or replace function public.studioflow_public_branches(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $function$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',b.id,'siteId',b.site_id,'name',b.name,'city',b.city,
      'address',b.address,'phone',b.phone,'isActive',b.is_active,
      'operatingHours',b.operating_hours,
      'serviceIds',coalesce((
        select jsonb_agg(published.value->>'id' order by published.ordinality)
        from jsonb_array_elements(coalesce(w.content->'services','[]'::jsonb))
             with ordinality published(value,ordinality)
        where not exists (
          select 1 from public.studioflow_services s
          where s.owner_id=b.site_id and s.service_id=published.value->>'id'
            and coalesce(cardinality(s.branch_ids),0)>0
            and not (b.id=any(s.branch_ids))
        )
      ),'[]'::jsonb)
    ) order by b.created_at,b.id
  ),'[]'::jsonb)
  from public.studioflow_websites w
  join public.branches b on b.site_id=w.owner_id and b.is_active
  where w.slug=p_slug
    and w.published_at <= now();
$function$;

revoke all on function public.studioflow_public_branches(text) from public;
grant execute on function public.studioflow_public_branches(text) to anon, authenticated, service_role;

commit;

-- Preserve private staff fields; publish only consented work photos and catalogue expertise IDs.
CREATE OR REPLACE FUNCTION studioflow_private.website_content(d jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object(
  'profile',(d->'profile')-'email',
  'services',coalesce(d->'services','[]'::jsonb),
  'stylists',(select coalesce(jsonb_agg((s-'schedule'-'commissionRate'-'accessRole'-'assignedServices'-'phone'-'workGallery'-'expertiseServiceIds')||jsonb_build_object('expertiseServiceIds',(select coalesce(jsonb_agg(svc->>'id'),'[]'::jsonb) from jsonb_array_elements(coalesce(d->'services','[]'::jsonb)) svc where jsonb_array_length(coalesce(s->'assignedServices','[]'::jsonb))=0 or coalesce(s->'assignedServices','[]'::jsonb) ? (svc->>'id') or coalesce(s->'assignedServices','[]'::jsonb) ? (svc->>'name')),'workGallery',(select coalesce(jsonb_agg(jsonb_build_object('id',photo->>'id','imageUrl',photo->>'imageUrl','caption',photo->>'caption','serviceId',photo->>'serviceId','consented',true)),'[]'::jsonb) from (select value photo from jsonb_array_elements(coalesce(s->'workGallery','[]'::jsonb)) where value->'consented'='true'::jsonb and value->>'imageUrl' ~ '^https://' limit 12) permitted))),'[]'::jsonb) from jsonb_array_elements(coalesce(d->'stylists','[]'::jsonb)) s where coalesce(s->>'status','Available')<>'Inactive'),
  'gallery',coalesce(d->'extras'->'gallery','[]'::jsonb),
  'policies',coalesce(d->'extras'->'policies','{}'::jsonb),
  'branding',jsonb_build_object('platformName',d->'extras'->'whiteLabel'->>'platformName','supportEmail',d->'extras'->'whiteLabel'->>'supportEmail','poweredBy',coalesce(d->'extras'->'whiteLabel'->'poweredBy','false'::jsonb),'faviconUrl',d->'extras'->'whiteLabel'->>'faviconUrl'),
  'loyaltyConfig',jsonb_build_object('programEnabled',coalesce(d->'loyaltyConfig'->'programEnabled','false'::jsonb),'rewards',(select coalesce(jsonb_agg(r-'couponCodePrefix'),'[]'::jsonb) from jsonb_array_elements(coalesce(d->'loyaltyConfig'->'rewards','[]'::jsonb)) r where r->'isActive'='true'::jsonb))
 );
$function$
;


-- Sample promotions belong only to reusable templates, never to a published owner's salon.
update public.studioflow_templates
set config=jsonb_set(config,'{customerDemoOffer}',jsonb_build_object(
 'enabled',true,'selectedServiceId',config->'services'->0->>'id',
 'discountPercent',20,'headline','Sample 20% OFF',
 'customOfferText','Sample offer for website demonstration only',
 'lastMinute',true),true)
where active and jsonb_array_length(coalesce(config->'services','[]'::jsonb))>0
and not (config ? 'customerDemoOffer');

create or replace function public.studioflow_customer_catalog() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'templates',(select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.config->>'title','shortName',t.config->>'shortName','tagline',t.config->>'tagline','coverImageUrl',t.config->>'coverImageUrl','defaultCity',t.config->>'defaultCity','themePreset',t.config->>'themePreset','subCategories',coalesce(t.config->'subCategories','[]'::jsonb),'services',coalesce(t.config->'services','[]'::jsonb),'stylists',(select coalesce(jsonb_agg(jsonb_build_object('id',s->>'id','name',s->>'name','role',s->>'role','avatarUrl',s->>'avatarUrl','specialties',coalesce(s->'specialties','[]'::jsonb))),'[]'::jsonb) from jsonb_array_elements(coalesce(t.config->'stylists','[]'::jsonb)) s),'demoOffer',t.config->'customerDemoOffer') order by t.id),'[]'::jsonb) from public.studioflow_templates t where t.active),
 'salons',(select coalesce(jsonb_agg(jsonb_build_object('slug',w.slug,'owner_id',w.owner_id,'content',w.content) order by w.published_at desc),'[]'::jsonb) from public.studioflow_websites w where w.slug not like 'studioflow-qa-%')
 );
$$;
revoke all on function public.studioflow_customer_catalog() from public;
grant execute on function public.studioflow_customer_catalog() to anon,authenticated,service_role;


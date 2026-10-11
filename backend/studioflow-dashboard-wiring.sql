-- Build public content from the same saved workspace used by every editor.
-- No CRM, customer records or internal staff settings are published.
create or replace function studioflow_private.website_content(d jsonb) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object(
  'profile',(d->'profile')-'email',
  'services',coalesce(d->'services','[]'::jsonb),
  'stylists',(select coalesce(jsonb_agg(s-'schedule'-'commissionRate'-'accessRole'-'assignedServices'-'phone'),'[]'::jsonb) from jsonb_array_elements(coalesce(d->'stylists','[]'::jsonb)) s where coalesce(s->>'status','Available')<>'Inactive'),
  'gallery',coalesce(d->'extras'->'gallery','[]'::jsonb),
  'policies',coalesce(d->'extras'->'policies','{}'::jsonb),
  'branding',jsonb_build_object('platformName',d->'extras'->'whiteLabel'->>'platformName','supportEmail',d->'extras'->'whiteLabel'->>'supportEmail','poweredBy',coalesce(d->'extras'->'whiteLabel'->'poweredBy','false'::jsonb),'faviconUrl',d->'extras'->'whiteLabel'->>'faviconUrl'),
  'loyaltyConfig',jsonb_build_object('programEnabled',coalesce(d->'loyaltyConfig'->'programEnabled','false'::jsonb),'rewards',(select coalesce(jsonb_agg(r-'couponCodePrefix'),'[]'::jsonb) from jsonb_array_elements(coalesce(d->'loyaltyConfig'->'rewards','[]'::jsonb)) r where r->'isActive'='true'::jsonb))
 );
$$;
revoke all on function studioflow_private.website_content(jsonb) from public,anon,authenticated;
create or replace function studioflow_private.save_workspace(p_draft jsonb,p_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb; item jsonb;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if jsonb_typeof(p_draft) is distinct from 'object' or jsonb_typeof(p_draft->'profile') is distinct from 'object' or jsonb_typeof(p_draft->'services') is distinct from 'array' or jsonb_typeof(p_draft->'stylists') is distinct from 'array' then raise exception 'Invalid workspace data'; end if;
 if pg_column_size(p_draft)>15000000 then raise exception 'Workspace is too large. Upload smaller images.'; end if;
 if jsonb_array_length(p_draft->'services')>500 or jsonb_array_length(p_draft->'stylists')>500 then raise exception 'Maximum 500 services or specialists per workspace'; end if;
 for item in select value from jsonb_array_elements(p_draft->'services') loop
  if jsonb_typeof(item) is distinct from 'object' or coalesce(btrim(item->>'id'),'')='' or coalesce(btrim(item->>'name'),'')='' then raise exception 'Each service needs a unique ID and name'; end if;
  if jsonb_typeof(item->'price') is distinct from 'number' or jsonb_typeof(item->'durationMinutes') is distinct from 'number' then raise exception 'Service price and duration must be numbers'; end if;
  if (item->>'price')::numeric<0 or (item->>'price')::numeric>10000000 or (item->>'durationMinutes')::numeric<1 or (item->>'durationMinutes')::numeric>720 or (item->>'durationMinutes')::numeric<>trunc((item->>'durationMinutes')::numeric) then raise exception 'Service price must be nonnegative; duration must be 1–720 whole minutes'; end if;
 end loop;
 if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(p_draft->'services')) then raise exception 'Service IDs must be unique'; end if;
 for item in select value from jsonb_array_elements(p_draft->'stylists') loop
  if jsonb_typeof(item) is distinct from 'object' or coalesce(btrim(item->>'id'),'')='' or coalesce(btrim(item->>'name'),'')='' then raise exception 'Each specialist needs a unique ID and name'; end if;
  if item ? 'assignedServices' and jsonb_typeof(item->'assignedServices') is distinct from 'array' then raise exception 'Specialist services must be a list'; end if;
  if item ? 'schedule' and jsonb_typeof(item->'schedule') is distinct from 'array' then raise exception 'Specialist schedule must be a list'; end if;
 end loop;
 if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(p_draft->'stylists')) then raise exception 'Specialist IDs must be unique'; end if;
 if p_draft->'extras' ? 'bookingLeadHours' then
  if jsonb_typeof(p_draft->'extras'->'bookingLeadHours') is distinct from 'number' then raise exception 'Booking lead time must be a number'; end if;
  if (p_draft->'extras'->>'bookingLeadHours')::numeric<0 or (p_draft->'extras'->>'bookingLeadHours')::numeric>2160 then raise exception 'Booking lead time must be 0–2160 hours'; end if;
 end if;
 update public.studioflow_accounts set draft=p_draft, template_id=p_draft->'profile'->>'businessType',revision=revision+1,updated_at=now() where user_id=actor and revision=p_revision returning to_jsonb(studioflow_accounts.*) into result;
 if result is null then raise exception 'Workspace changed in another tab. Reload before saving.' using errcode='P0001'; end if;
 -- Mirror business identity into the existing shared account profile.
 update public.profiles set full_name=p_draft->'profile'->>'ownerName',salon_name=p_draft->'profile'->>'businessName',phone_number=p_draft->'profile'->>'phone',phone=p_draft->'profile'->>'phone',whatsapp=p_draft->'profile'->>'whatsapp',city=p_draft->'profile'->>'city',postal_code=p_draft->'profile'->>'postalCode',updated_at=now() where id=actor;
 perform public.update_my_onboarding_progress('start_template');
 -- Keep the existing published URL; renaming requires explicit Publish.
 update public.studioflow_websites w set content=jsonb_set(studioflow_private.website_content(p_draft),'{profile,subdomain}',to_jsonb(w.slug)),published_at=now() where owner_id=actor;
 return result;
end $$;
create or replace function public.studioflow_save_workspace(p_draft jsonb,p_revision integer) returns jsonb language sql security invoker set search_path='' as $$select studioflow_private.save_workspace(p_draft,p_revision)$$;

create or replace function studioflow_private.publish() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); d jsonb; slug text; result jsonb; safe_staff jsonb;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select draft into d from public.studioflow_accounts where user_id=actor for update;
 slug:=lower(btrim(d->'profile'->>'subdomain'));
 if slug is null or slug !~ '^[a-z0-9][a-z0-9-]{2,62}$' then raise exception 'Website address must be 3–63 lowercase letters, numbers or hyphens.'; end if;
 if coalesce(btrim(d->'profile'->>'businessName'),'')='' or coalesce(btrim(d->'profile'->>'phone'),'')='' or jsonb_array_length(d->'services')=0 then raise exception 'Add a business name, phone and at least one service before publishing.'; end if;
 select coalesce(jsonb_agg(s-'schedule'-'commissionRate'-'accessRole'-'assignedServices'-'phone'), '[]'::jsonb) into safe_staff from jsonb_array_elements(d->'stylists') s where coalesce(s->>'status','Available')<>'Inactive';
 insert into public.studioflow_websites(owner_id,slug,content) values(actor,slug,studioflow_private.website_content(d))
 on conflict(owner_id) do update set slug=excluded.slug,content=excluded.content,published_at=now() returning to_jsonb(studioflow_websites.*) into result;
 update public.partner_referrals set website_created_at=coalesce(website_created_at,now()),website_published_at=now(),last_activity_at=now(),updated_at=now() where referred_user_id=actor;
 perform public.update_my_onboarding_progress('complete_template');
 return result;
end $$;
create or replace function public.studioflow_publish() returns jsonb language sql security invoker set search_path='' as $$select studioflow_private.publish()$$;


update public.studioflow_websites w set content=jsonb_set(studioflow_private.website_content(a.draft),'{profile,subdomain}',to_jsonb(w.slug)) from public.studioflow_accounts a where a.user_id=w.owner_id;

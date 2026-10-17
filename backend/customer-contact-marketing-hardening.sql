create or replace function studioflow_android_private.prepare_campaign(p_title text,p_body text,p_customers uuid[]) returns uuid
language plpgsql security definer set search_path='' as $$
declare campaign uuid; target uuid; contacts jsonb:=studioflow_android_private.owner_contacts(); c jsonb;
begin
 if length(btrim(p_title)) not between 1 and 100 or length(btrim(p_body)) not between 1 and 3500 or p_title is null or p_body is null or coalesce(cardinality(p_customers),0) not between 1 and 500 then raise exception 'Enter title, message and 1–500 opted-in recipients';end if;
 if not exists(select 1 from public.studioflow_websites where owner_id=auth.uid()) then raise exception 'Publish your salon website first';end if;
 insert into public.studioflow_owner_campaigns(owner_id,title,body) values(auth.uid(),btrim(p_title),btrim(p_body)) returning id into campaign;
 foreach target in array p_customers loop
  select value into c from jsonb_array_elements(contacts) where value->>'id'=target::text;
  if c is null or c->>'optIn'<>'true' or c->>'blocked'='true' or regexp_replace(c->>'whatsapp','[^0-9]','','g') !~ '^[1-9][0-9]{9,14}$' then raise exception 'A selected contact has no valid number or marketing permission';end if;
  insert into public.studioflow_owner_campaign_recipients(campaign_id,customer_id) values(campaign,target) on conflict do nothing;
 end loop;
 return campaign;
end $$;

create index if not exists studioflow_marketing_preferences_owner on public.studioflow_customer_marketing_preferences(owner_id,customer_id);
create index if not exists studioflow_campaign_owner_created on public.studioflow_owner_campaigns(owner_id,created_at desc);
create index if not exists studioflow_bookings_owner_customer_created on public.studioflow_bookings(owner_id,customer_id,created_at desc);

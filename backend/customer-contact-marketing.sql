create table public.studioflow_customer_marketing_preferences(
 customer_id uuid not null references auth.users(id),owner_id uuid not null references public.studioflow_accounts(user_id),
 whatsapp_opt_in boolean not null default false,birthday_opt_in boolean not null default false,updated_at timestamptz not null default now(),primary key(customer_id,owner_id)
);
alter table public.studioflow_customer_marketing_preferences enable row level security;
revoke all on public.studioflow_customer_marketing_preferences from public,anon,authenticated;
create table public.studioflow_owner_contact_notes(
 owner_id uuid not null references public.studioflow_accounts(user_id),customer_id uuid not null references auth.users(id),
 tags text not null default '',notes text not null default '',do_not_contact boolean not null default false,updated_at timestamptz not null default now(),primary key(owner_id,customer_id)
);
alter table public.studioflow_owner_contact_notes enable row level security;
revoke all on public.studioflow_owner_contact_notes from public,anon,authenticated;
create table public.studioflow_owner_campaigns(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.studioflow_accounts(user_id),title text not null,body text not null,created_at timestamptz not null default now()
);
create table public.studioflow_owner_campaign_recipients(
 id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.studioflow_owner_campaigns(id),customer_id uuid not null references auth.users(id),opened_at timestamptz,unique(campaign_id,customer_id)
);
alter table public.studioflow_owner_campaigns enable row level security;
alter table public.studioflow_owner_campaign_recipients enable row level security;
revoke all on public.studioflow_owner_campaigns,public.studioflow_owner_campaign_recipients from public,anon,authenticated;

-- Internal owner projection. DOB is shared only by explicit birthday permission.
create function studioflow_android_private.owner_contacts() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
 if actor is null or not exists(select 1 from public.studioflow_accounts where user_id=actor) then raise exception 'Salon owner access required' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',ids.customer_id,'name',coalesce(nullif(p.full_name,''),last_b.payload->>'clientName','Customer'),'whatsapp',coalesce(nullif(p.whatsapp_number,''),nullif(p.phone,''),last_b.payload->>'clientPhone',''),'dateOfBirth',case when coalesce(pref.birthday_opt_in,false) then p.date_of_birth else null end,'birthdayShared',coalesce(pref.birthday_opt_in,false),'optIn',coalesce(pref.whatsapp_opt_in,false),'consentUpdated',pref.updated_at,'blocked',coalesce(n.do_not_contact,false),'tags',coalesce(n.tags,''),'notes',coalesce(n.notes,''),'lastVisit',last_b.starts_at,'bookings',(select count(*) from public.studioflow_bookings b where b.customer_id=ids.customer_id and b.owner_id=actor)) order by coalesce(p.full_name,last_b.payload->>'clientName','Customer')),'[]') into result
 from (select customer_id from public.studioflow_bookings where owner_id=actor union select customer_id from public.studioflow_customer_marketing_preferences where owner_id=actor) ids
 left join public.studioflow_android_profiles p on p.customer_id=ids.customer_id
 left join public.studioflow_customer_marketing_preferences pref on pref.customer_id=ids.customer_id and pref.owner_id=actor
 left join public.studioflow_owner_contact_notes n on n.customer_id=ids.customer_id and n.owner_id=actor
 left join lateral(select payload,starts_at from public.studioflow_bookings b where b.owner_id=actor and b.customer_id=ids.customer_id order by created_at desc limit 1) last_b on true;
 return result;
end $$;
create function public.studioflow_owner_contacts() returns jsonb language sql stable security invoker set search_path='' as $$select studioflow_android_private.owner_contacts()$$;
revoke all on function studioflow_android_private.owner_contacts(),public.studioflow_owner_contacts() from public,anon,authenticated;
grant execute on function studioflow_android_private.owner_contacts(),public.studioflow_owner_contacts() to authenticated;

create function studioflow_android_private.marketing_preferences() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('slug',s.slug,'salon',s.content->'profile'->>'businessName','optIn',coalesce(p.whatsapp_opt_in,false),'birthdayShared',coalesce(p.birthday_opt_in,false)) order by s.slug),'[]') from public.studioflow_websites s left join public.studioflow_customer_marketing_preferences p on p.owner_id=s.owner_id and p.customer_id=auth.uid() where s.slug not like 'studioflow-qa-%');
end $$;
create function public.studioflow_customer_marketing_preferences() returns jsonb language sql stable security invoker set search_path='' as $$select studioflow_android_private.marketing_preferences()$$;
create function studioflow_android_private.save_marketing_preference(p_slug text,p_opt_in boolean,p_birthday boolean) returns void
language plpgsql security definer set search_path='' as $$
declare owner uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select owner_id into owner from public.studioflow_websites where slug=p_slug;
 if owner is null then raise exception 'Salon is unavailable';end if;
 if p_opt_in is null or p_birthday is null then raise exception 'Choose your preference';end if;
 insert into public.studioflow_customer_marketing_preferences(customer_id,owner_id,whatsapp_opt_in,birthday_opt_in) values(auth.uid(),owner,p_opt_in,p_opt_in and p_birthday)
 on conflict(customer_id,owner_id) do update set whatsapp_opt_in=excluded.whatsapp_opt_in,birthday_opt_in=excluded.birthday_opt_in,updated_at=now();
end $$;
create function public.studioflow_customer_save_marketing_preference(p_slug text,p_opt_in boolean,p_birthday boolean) returns void language sql security invoker set search_path='' as $$select studioflow_android_private.save_marketing_preference(p_slug,p_opt_in,p_birthday)$$;
revoke all on function studioflow_android_private.marketing_preferences(),public.studioflow_customer_marketing_preferences(),studioflow_android_private.save_marketing_preference(text,boolean,boolean),public.studioflow_customer_save_marketing_preference(text,boolean,boolean) from public,anon,authenticated;
grant execute on function studioflow_android_private.marketing_preferences(),public.studioflow_customer_marketing_preferences(),studioflow_android_private.save_marketing_preference(text,boolean,boolean),public.studioflow_customer_save_marketing_preference(text,boolean,boolean) to authenticated;

create function studioflow_android_private.save_contact_note(p_customer uuid,p_tags text,p_notes text,p_blocked boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from jsonb_array_elements(studioflow_android_private.owner_contacts()) c where (c->>'id')::uuid=p_customer) then raise exception 'Customer unavailable' using errcode='42501';end if;
 if length(p_tags)>200 or length(p_notes)>2000 or p_blocked is null then raise exception 'Invalid contact details';end if;
 insert into public.studioflow_owner_contact_notes(owner_id,customer_id,tags,notes,do_not_contact) values(auth.uid(),p_customer,btrim(coalesce(p_tags,'')),btrim(coalesce(p_notes,'')),p_blocked)
 on conflict(owner_id,customer_id) do update set tags=excluded.tags,notes=excluded.notes,do_not_contact=excluded.do_not_contact,updated_at=now();
end $$;
create function public.studioflow_owner_save_contact(p_customer uuid,p_tags text,p_notes text,p_blocked boolean) returns void language sql security invoker set search_path='' as $$select studioflow_android_private.save_contact_note(p_customer,p_tags,p_notes,p_blocked)$$;
revoke all on function studioflow_android_private.save_contact_note(uuid,text,text,boolean),public.studioflow_owner_save_contact(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function studioflow_android_private.save_contact_note(uuid,text,text,boolean),public.studioflow_owner_save_contact(uuid,text,text,boolean) to authenticated;

create function studioflow_android_private.prepare_campaign(p_title text,p_body text,p_customers uuid[]) returns uuid
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
create function public.studioflow_owner_prepare_campaign(p_title text,p_body text,p_customers uuid[]) returns uuid language sql security invoker set search_path='' as $$select studioflow_android_private.prepare_campaign(p_title,p_body,p_customers)$$;
create function studioflow_android_private.campaigns() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'body',c.body,'createdAt',c.created_at,'recipients',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',coalesce(p.full_name,'Customer'),'openedAt',r.opened_at)),'[]') from public.studioflow_owner_campaign_recipients r left join public.studioflow_android_profiles p on p.customer_id=r.customer_id where r.campaign_id=c.id)) order by c.created_at desc),'[]') from (select * from public.studioflow_owner_campaigns where owner_id=auth.uid() order by created_at desc limit 20) c);
end $$;
create function public.studioflow_owner_campaigns() returns jsonb language sql stable security invoker set search_path='' as $$select studioflow_android_private.campaigns()$$;
create function studioflow_android_private.open_campaign_draft(p_recipient uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare campaign public.studioflow_owner_campaigns; recipient public.studioflow_owner_campaign_recipients; c jsonb; salon text; slug text; phone text; body text;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select * into recipient from public.studioflow_owner_campaign_recipients where id=p_recipient;
 select * into campaign from public.studioflow_owner_campaigns where id=recipient.campaign_id and owner_id=auth.uid();
 if campaign.id is null then raise exception 'Campaign unavailable' using errcode='42501';end if;
 select value into c from jsonb_array_elements(studioflow_android_private.owner_contacts()) where value->>'id'=recipient.customer_id::text;
 phone:=regexp_replace(c->>'whatsapp','[^0-9]','','g');
 if c is null or c->>'optIn'<>'true' or c->>'blocked'='true' or phone !~ '^[1-9][0-9]{9,14}$' then raise exception 'Contact opted out, blocked or missing a valid number';end if;
 if length(phone)=10 then phone:='91'||phone;end if;
 select s.slug,s.content->'profile'->>'businessName' into slug,salon from public.studioflow_websites s where owner_id=auth.uid();
 if slug is null then raise exception 'Publish your salon website first';end if;
 body:=replace(replace(replace(campaign.body,'{name}',c->>'name'),'{salon}',coalesce(salon,'Your salon')),'{booking_link}','https://nexora-one-white-label.templateapp67.chatgpt.site/?app=1&site='||slug)||E'\n\nManage preferences: https://nexora-one-white-label.templateapp67.chatgpt.site/?app=1&tab=profile'||E'\nReply STOP to opt out.';
 update public.studioflow_owner_campaign_recipients set opened_at=now() where id=p_recipient;
 return jsonb_build_object('phone',phone,'text',body);
end $$;
create function public.studioflow_owner_open_campaign_draft(p_recipient uuid) returns jsonb language sql security invoker set search_path='' as $$select studioflow_android_private.open_campaign_draft(p_recipient)$$;
revoke all on function studioflow_android_private.prepare_campaign(text,text,uuid[]),public.studioflow_owner_prepare_campaign(text,text,uuid[]),studioflow_android_private.campaigns(),public.studioflow_owner_campaigns(),studioflow_android_private.open_campaign_draft(uuid),public.studioflow_owner_open_campaign_draft(uuid) from public,anon,authenticated;
grant execute on function studioflow_android_private.prepare_campaign(text,text,uuid[]),public.studioflow_owner_prepare_campaign(text,text,uuid[]),studioflow_android_private.campaigns(),public.studioflow_owner_campaigns(),studioflow_android_private.open_campaign_draft(uuid),public.studioflow_owner_open_campaign_draft(uuid) to authenticated;

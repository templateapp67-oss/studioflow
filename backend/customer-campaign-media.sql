alter table public.studioflow_owner_campaigns add column image_url text not null default '';
alter table public.studioflow_owner_campaign_recipients add column delivery_status text not null default 'ready' check(delivery_status in ('ready','processing','accepted','failed','unknown','skipped'));
alter table public.studioflow_owner_campaign_recipients add column delivery_claim uuid;
alter table public.studioflow_owner_campaign_recipients add column attempted_at timestamptz;
alter table public.studioflow_owner_campaign_recipients add column provider_message_id text;
alter table public.studioflow_owner_campaign_recipients add column delivery_error text;
create index studioflow_campaign_delivery_ready on public.studioflow_owner_campaign_recipients(campaign_id,delivery_status);
create function studioflow_android_private.attach_campaign_ad(p_campaign uuid,p_url text) returns void language plpgsql security definer set search_path='' as $$
declare path text;prefix constant text:='https://zilwgiuiygqqardzutxi.supabase.co/storage/v1/object/public/studioflow-media/';
begin
 if auth.uid() is null or not exists(select 1 from public.studioflow_owner_campaigns where id=p_campaign and owner_id=auth.uid()) then raise exception 'Campaign unavailable' using errcode='42501';end if;
 if exists(select 1 from public.studioflow_owner_campaign_recipients where campaign_id=p_campaign and delivery_status<>'ready') then raise exception 'An active campaign image cannot be changed';end if;
 if left(p_url,length(prefix))<>prefix then raise exception 'Upload the ready ad image first';end if;path:=substr(p_url,length(prefix)+1);
 if split_part(path,'/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='studioflow-media' and name=path and metadata->>'mimetype' in ('image/png','image/jpeg')) then raise exception 'Use your own uploaded ad image' using errcode='42501';end if;
 update public.studioflow_owner_campaigns set image_url=p_url where id=p_campaign and owner_id=auth.uid();
end $$;
create function public.studioflow_owner_attach_campaign_ad(p_campaign uuid,p_url text) returns void language sql security invoker set search_path='' as $$select studioflow_android_private.attach_campaign_ad(p_campaign,p_url)$$;
revoke all on function studioflow_android_private.attach_campaign_ad(uuid,text),public.studioflow_owner_attach_campaign_ad(uuid,text) from public,anon,authenticated;
grant execute on function studioflow_android_private.attach_campaign_ad(uuid,text),public.studioflow_owner_attach_campaign_ad(uuid,text) to authenticated;
create or replace function studioflow_android_private.campaigns() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'body',c.body,'imageUrl',c.image_url,'createdAt',c.created_at,'recipients',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',coalesce(p.full_name,'Customer'),'openedAt',r.opened_at,'deliveryStatus',r.delivery_status,'deliveryError',r.delivery_error)),'[]') from public.studioflow_owner_campaign_recipients r left join public.studioflow_android_profiles p on p.customer_id=r.customer_id where r.campaign_id=c.id)) order by c.created_at desc),'[]') from (select * from public.studioflow_owner_campaigns where owner_id=auth.uid() order by created_at desc limit 20)c);
end $$;
-- Worker RPCs are executable only by the trusted Edge Function service role.
create function studioflow_android_private.claim_campaign(p_owner uuid,p_campaign uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb:='[]';c public.studioflow_owner_campaigns;r record;phone text;claim uuid;salon text;slug text;msg text;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Worker only' using errcode='42501';end if;
 select * into c from public.studioflow_owner_campaigns where id=p_campaign and owner_id=p_owner for update;
 if c.id is null or c.image_url='' then raise exception 'Prepare a campaign with an uploaded ad image first';end if;
 if (select count(*) from public.studioflow_owner_campaign_recipients queued join public.studioflow_owner_campaigns m on m.id=queued.campaign_id where m.owner_id=p_owner and queued.attempted_at>now()-interval '1 hour')>=500 then raise exception 'Hourly campaign limit reached. Try later.';end if;
 select s.slug,s.content->'profile'->>'businessName' into slug,salon from public.studioflow_websites s where owner_id=p_owner;if slug is null then raise exception 'Published salon required';end if;
 update public.studioflow_owner_campaign_recipients set delivery_status='unknown',delivery_error='Previous request outcome unknown; check provider before sending again' where campaign_id=p_campaign and delivery_status='processing' and attempted_at<now()-interval '10 minutes';
 for r in select x.*,p.full_name,coalesce(nullif(p.whatsapp_number,''),p.phone,'') as phone,coalesce(pref.whatsapp_opt_in,false) opt_in,coalesce(n.do_not_contact,false) blocked from public.studioflow_owner_campaign_recipients x left join public.studioflow_android_profiles p on p.customer_id=x.customer_id left join public.studioflow_customer_marketing_preferences pref on pref.customer_id=x.customer_id and pref.owner_id=p_owner left join public.studioflow_owner_contact_notes n on n.customer_id=x.customer_id and n.owner_id=p_owner where x.campaign_id=p_campaign and x.delivery_status='ready' order by x.id limit 10 for update of x skip locked loop
  phone:=regexp_replace(r.phone,'[^0-9]','','g');
  if not r.opt_in or r.blocked or phone !~ '^[1-9][0-9]{9,14}$' then update public.studioflow_owner_campaign_recipients set delivery_status='skipped',delivery_error='Permission withdrawn, blocked or number unavailable' where id=r.id;continue;end if;
  if length(phone)=10 then phone:='91'||phone;end if;claim:=gen_random_uuid();
  update public.studioflow_owner_campaign_recipients set delivery_status='processing',delivery_claim=claim,attempted_at=now() where id=r.id;
  msg:=replace(replace(replace(c.body,'{name}',coalesce(nullif(r.full_name,''),'Customer')),'{salon}',coalesce(salon,'Your salon')),'{booking_link}','https://nexora-one-white-label.templateapp67.chatgpt.site/?app=1&site='||slug);
  result:=result||jsonb_build_array(jsonb_build_object('id',r.id,'claim',claim,'phone',phone,'name',coalesce(nullif(r.full_name,''),'Customer'),'salon',salon,'text',msg,'image',c.image_url,'bookingUrl','https://nexora-one-white-label.templateapp67.chatgpt.site/?app=1&site='||slug));
 end loop;return result;
end $$;
create function studioflow_android_private.finish_campaign(p_owner uuid,p_recipient uuid,p_claim uuid,p_status text,p_message text,p_error text) returns void language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' or p_status not in ('accepted','failed','unknown','skipped') then raise exception 'Worker only' using errcode='42501';end if;
 update public.studioflow_owner_campaign_recipients r set delivery_status=p_status,provider_message_id=left(p_message,300),delivery_error=left(p_error,200) from public.studioflow_owner_campaigns c where r.campaign_id=c.id and c.owner_id=p_owner and r.id=p_recipient and r.delivery_claim=p_claim and r.delivery_status='processing';
end $$;
create function public.studioflow_campaign_claim(p_owner uuid,p_campaign uuid) returns jsonb language sql security invoker set search_path='' as $$select studioflow_android_private.claim_campaign(p_owner,p_campaign)$$;
create function public.studioflow_campaign_finish(p_owner uuid,p_recipient uuid,p_claim uuid,p_status text,p_message text,p_error text) returns void language sql security invoker set search_path='' as $$select studioflow_android_private.finish_campaign(p_owner,p_recipient,p_claim,p_status,p_message,p_error)$$;
revoke all on function studioflow_android_private.claim_campaign(uuid,uuid),public.studioflow_campaign_claim(uuid,uuid),studioflow_android_private.finish_campaign(uuid,uuid,uuid,text,text,text),public.studioflow_campaign_finish(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function studioflow_android_private.claim_campaign(uuid,uuid),public.studioflow_campaign_claim(uuid,uuid),studioflow_android_private.finish_campaign(uuid,uuid,uuid,text,text,text),public.studioflow_campaign_finish(uuid,uuid,uuid,text,text,text) to service_role;
create function studioflow_android_private.campaign_delivery_allowed(p_owner uuid,p_recipient uuid,p_claim uuid) returns boolean language sql stable security definer set search_path='' as $$select coalesce(auth.jwt()->>'role','')='service_role' and exists(select 1 from public.studioflow_owner_campaign_recipients r join public.studioflow_owner_campaigns c on c.id=r.campaign_id join public.studioflow_customer_marketing_preferences p on p.customer_id=r.customer_id and p.owner_id=c.owner_id left join public.studioflow_owner_contact_notes n on n.customer_id=r.customer_id and n.owner_id=c.owner_id where r.id=p_recipient and r.delivery_claim=p_claim and r.delivery_status='processing' and c.owner_id=p_owner and p.whatsapp_opt_in and not coalesce(n.do_not_contact,false))$$;
create function public.studioflow_campaign_allowed(p_owner uuid,p_recipient uuid,p_claim uuid) returns boolean language sql stable security invoker set search_path='' as $$select studioflow_android_private.campaign_delivery_allowed(p_owner,p_recipient,p_claim)$$;
revoke all on function studioflow_android_private.campaign_delivery_allowed(uuid,uuid,uuid),public.studioflow_campaign_allowed(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function studioflow_android_private.campaign_delivery_allowed(uuid,uuid,uuid),public.studioflow_campaign_allowed(uuid,uuid,uuid) to service_role;

create or replace function studioflow_android_private.open_campaign_draft(p_recipient uuid) returns jsonb
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
 if campaign.image_url<>'' then body:=body||E'\n\nAd image: '||campaign.image_url;end if;
 return jsonb_build_object('phone',phone,'text',body);
end $$;

grant usage on schema studioflow_android_private to service_role;

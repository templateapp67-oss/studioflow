create or replace function studioflow_android_private.claim_campaign(p_owner uuid,p_campaign uuid) returns jsonb language plpgsql security definer set search_path='' as $$
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

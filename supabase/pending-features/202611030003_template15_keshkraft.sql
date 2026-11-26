-- Template 15: additive adapters over the existing workspace, bookings and rewards.
-- No tables dropped, no RLS disabled, no other template records updated.
begin;
create or replace function studioflow_private.mens_service(s jsonb)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(s->>'mensTemplateId'='mens_hair_studio' and s->>'category' in ('Men''s Haircuts','Men''s Hair Colour')
 and not coalesce((s->>'mensHidden')::boolean,false)
 and coalesce(s->>'name','') !~* 'women|woman|female|unisex|kids?|child|beard|shav|facial|spa\M|treatment|scalp massage|makeup|bridal|nail|wax'
 and coalesce(s->>'description','') !~* 'women|woman|female|unisex|kids?|child|beard|shav|facial|spa\M|treatment|scalp massage|makeup|bridal|nail|wax',false)
$$;
revoke all on function studioflow_private.mens_service(jsonb) from public,anon,authenticated;

create or replace function public.studioflow_mens_slots(p_slug text,p_service_id text,p_date date,p_stylist_id text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare w public.studioflow_websites; d jsonb; c jsonb; svc jsonb; staff jsonb; h jsonb; slot jsonb; result jsonb:='[]'; finish time; begin_time time;
begin
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.content->'profile'->>'businessType' is distinct from 'mens_hair_studio' then return '[]'; end if;
 select draft into d from public.studioflow_accounts where user_id=w.owner_id;
 c:=coalesce(d->'profile'->'mensStudio','{}');
 select s into svc from jsonb_array_elements(w.content->'services') s where s->>'id'=p_service_id and studioflow_private.mens_service(s);
 if svc is null or p_date is null or p_date<(now() at time zone 'Asia/Kolkata')::date or p_date>(now() at time zone 'Asia/Kolkata')::date+90 or coalesce(c->'holidays','[]') ? p_date::text then return '[]'; end if;
 select x into h from jsonb_array_elements(coalesce(c->'hours','[]')) x where x->>'day'=trim(to_char(p_date,'Day'));
 -- Missing hours fail closed for Template 15, rather than inventing a schedule.
 if h is null or not coalesce((h->>'enabled')::boolean,false) then return '[]'; end if;
 for staff in select s from jsonb_array_elements(coalesce(d->'stylists','[]')) s
 where s->>'businessType'='mens_hair_studio' and coalesce((s->>'mensMaleOnly')::boolean,false)
 and coalesce(s->>'role','') !~* 'women|woman|female|unisex|kids?|child|beard|shav|facial|spa\M|treatment|makeup|bridal|nail|wax'
 and s->>'status'='Available' and (p_stylist_id in ('any','any_available','any-specialist') or s->>'id'=p_stylist_id)
 loop
  if exists(select 1 from jsonb_array_elements(coalesce(c->'leave','[]')) l where l->>'staffId'=staff->>'id' and p_date between (l->>'from')::date and (l->>'to')::date) then continue;end if;
  for slot in select x from jsonb_array_elements(studioflow_private.availability(p_slug,p_service_id,p_date,staff->>'id')) x where coalesce((x->>'available')::boolean,false)
  loop
   begin_time:=(slot->>'time')::time;finish:=(p_date+begin_time+(svc->>'durationMinutes')::int*interval '1 minute')::time;
   if begin_time<(h->>'fromTime')::time or finish>(h->>'toTime')::time or finish<=begin_time then continue;end if;
   if exists(select 1 from jsonb_array_elements(coalesce(c->'breaks','[]')) b where b->>'staffId'=staff->>'id' and begin_time<(b->>'toTime')::time and finish>(b->>'fromTime')::time) then continue;end if;
   result:=result||jsonb_build_array(slot||jsonb_build_object('stylistId',staff->>'id'));
  end loop;
 end loop;
 return (select coalesce(jsonb_agg(x order by x->>'time'),'[]') from (select distinct on (v->>'time') v as x from jsonb_array_elements(result) v order by v->>'time',v->>'stylistId') q);
end $$;
revoke all on function public.studioflow_mens_slots(text,text,date,text) from public,anon,authenticated;
grant execute on function public.studioflow_mens_slots(text,text,date,text) to anon,authenticated;

create or replace function public.studioflow_mens_coupon_quote(p_slug text,p_services jsonb,p_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.studioflow_websites; o jsonb; total numeric; eligible numeric; discount numeric; day text:=to_char(now() at time zone 'Asia/Kolkata','YYYY-MM-DD');
begin
 if auth.uid() is null then raise exception 'Sign in to apply a coupon' using errcode='42501';end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.content->'profile'->>'businessType' is distinct from 'mens_hair_studio' then raise exception 'Men''s studio unavailable';end if;
 if jsonb_typeof(p_services) is distinct from 'array' or jsonb_array_length(p_services)<>1 then raise exception 'Choose one men''s service';end if;
 select s into o from jsonb_array_elements(w.content->'services') s where s->>'id'=p_services->>0 and studioflow_private.mens_service(s);
 if o is null then raise exception 'Service unavailable';end if;total:=(o->>'price')::numeric;
 select x into o from jsonb_array_elements(coalesce(w.content->'profile'->'mensStudio'->'offers','[]')) x where upper(btrim(x->>'code'))=upper(btrim(p_code));
 if o is null then return studioflow_private.coupon_quote(p_slug,p_services,p_code);end if;
 if not coalesce((o->>'active')::boolean,false) or not coalesce((o->>'approved')::boolean,false) then raise exception 'Offer is inactive or awaiting admin approval';end if;
 if (nullif(o->>'from','') is not null and o->>'from'>day) or (nullif(o->>'to','') is not null and o->>'to'<day) then raise exception 'Offer is outside its validity dates';end if;
 if not coalesce(o->'serviceIds','[]') ? (p_services->>0) then raise exception 'Coupon is not eligible for this service';end if;
 if exists(select 1 from public.studioflow_bookings b where b.owner_id=w.owner_id and b.customer_id=auth.uid() and upper(b.payload->>'couponCode')=upper(btrim(p_code)) and (b.status in ('confirmed','completed') or b.status='pending' and (b.hold_expires_at is null or b.hold_expires_at>now()))) then raise exception 'Coupon already used or reserved on another booking';end if;
 if (o->>'discount')::numeric<=0 then raise exception 'Invalid discount';end if;
 if o->>'type'='percent' and (o->>'discount')::numeric<=100 then discount:=round(total*(o->>'discount')::numeric/100,2);
 elsif o->>'type'='flat' then discount:=least(total,(o->>'discount')::numeric);
 else raise exception 'Invalid discount';end if;
 if total-discount<4 then raise exception 'Discounted total is too low';end if;
 return jsonb_build_object('code',upper(btrim(p_code)),'title',o->>'title','originalPrice',total,'discountAmount',discount,'finalPrice',total-discount,'advanceAmount',ceil((total-discount)*25)/100,'mensOfferId',o->>'id');
end $$;
revoke all on function public.studioflow_mens_coupon_quote(text,jsonb,text) from public,anon,authenticated;
grant execute on function public.studioflow_mens_coupon_quote(text,jsonb,text) to authenticated;

-- A trigger guards EVERY existing booking entry point, not just the new UI.
create or replace function studioflow_private.mens_booking_guard()
returns trigger language plpgsql security definer set search_path='' as $$
declare w public.studioflow_websites; s jsonb;
begin
 select * into w from public.studioflow_websites where owner_id=new.owner_id;
 if w.content->'profile'->>'businessType' is distinct from 'mens_hair_studio' then return new;end if;
 if tg_op='UPDATE' and new.starts_at=old.starts_at and new.ends_at=old.ends_at and new.stylist_id=old.stylist_id and new.payload->>'serviceId'=old.payload->>'serviceId' then return new;end if;
 if jsonb_array_length(coalesce(new.payload->'addOnIds','[]'))>0 then raise exception 'Additional categories are not available in this men''s studio';end if;
 select x into s from jsonb_array_elements(w.content->'services') x where x->>'id'=new.payload->>'serviceId' and studioflow_private.mens_service(x);
 if s is null then raise exception 'Only men''s haircuts and men''s hair colour can be booked';end if;
 if new.ends_at<>new.starts_at+(s->>'durationMinutes')::int*interval '1 minute' then raise exception 'Service duration changed. Choose another slot';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text||new.stylist_id,0));
 if exists(select 1 from public.studioflow_bookings b where b.owner_id=new.owner_id and b.id<>new.id and b.stylist_id=new.stylist_id and (b.status='confirmed' or b.status='pending' and (b.hold_expires_at is null or b.hold_expires_at>now())) and b.starts_at<new.ends_at and b.ends_at>new.starts_at) then raise exception 'This slot has just been booked';end if;
 if not exists(select 1 from jsonb_array_elements(public.studioflow_mens_slots(w.slug,s->>'id',(new.starts_at at time zone 'Asia/Kolkata')::date,new.stylist_id)) x where x->>'time'=to_char(new.starts_at at time zone 'Asia/Kolkata','HH24:MI')) then raise exception 'Barber or salon is unavailable at this time';end if;
 return new;
end $$;
revoke all on function studioflow_private.mens_booking_guard() from public,anon,authenticated;
drop trigger if exists template15_mens_booking_guard on public.studioflow_bookings;
create trigger template15_mens_booking_guard before insert or update of starts_at,ends_at,stylist_id on public.studioflow_bookings for each row execute function studioflow_private.mens_booking_guard();
create unique index if not exists studioflow_mens_booking_request on public.studioflow_bookings(owner_id,customer_id,(payload->>'mensRequestId')) where payload ? 'mensRequestId';

create or replace function public.studioflow_mens_book(p_slug text,p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.studioflow_websites; selected jsonb; result jsonb; quote jsonb; existing public.studioflow_bookings; code text:=btrim(coalesce(p_request->>'couponCode','')); request_id uuid; ids jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in to book' using errcode='42501';end if;
 request_id:=(p_request->>'requestId')::uuid;if request_id is null then raise exception 'Request ID is required';end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.content->'profile'->>'businessType' is distinct from 'mens_hair_studio' then raise exception 'Men''s studio unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended(w.owner_id::text||auth.uid()::text,15));
 select * into existing from public.studioflow_bookings where owner_id=w.owner_id and customer_id=auth.uid() and payload->>'mensRequestId'=request_id::text;
 if existing.id is not null then
  if existing.payload->>'serviceId' is distinct from p_request->>'serviceId' or existing.payload->>'date' is distinct from p_request->>'date' or existing.payload->>'time' is distinct from p_request->>'time' or coalesce(existing.payload->>'couponCode','') is distinct from upper(code) then raise exception 'Request changed. Start a new reservation';end if;
  return existing.payload;
 end if;
 if jsonb_array_length(coalesce(p_request->'addOnIds','[]'))>0 then raise exception 'Choose one men''s service per booking';end if;
 ids:=jsonb_build_array(p_request->>'serviceId');
 select x into selected from jsonb_array_elements(public.studioflow_mens_slots(p_slug,p_request->>'serviceId',(p_request->>'date')::date,p_request->>'stylistId')) x where x->>'time'=p_request->>'time';
 if selected is null then raise exception 'This slot has just been booked or is unavailable. Choose another time';end if;
 if code<>'' then
  quote:=public.studioflow_mens_coupon_quote(p_slug,ids,code);
  if (p_request->>'couponExpectedTotal')::numeric is distinct from (quote->>'finalPrice')::numeric then raise exception 'Price changed. Reapply the coupon';end if;
  -- Existing loyalty vouchers keep their shared atomic redemption/hold path.
  if not quote ? 'mensOfferId' then
   result:=studioflow_private.coupon_book(p_slug,p_request||jsonb_build_object('stylistId',selected->>'stylistId'));
   update public.studioflow_bookings set payload=payload||jsonb_build_object('mensRequestId',request_id) where id=(result->>'id')::uuid returning payload into result;
   return result;
  end if;
 end if;
 result:=studioflow_private.book(p_slug,(p_request-'servicePrice'-'discountAmount'-'coupon'-'originalPrice')||jsonb_build_object('stylistId',selected->>'stylistId'));
 result:=result||jsonb_build_object('mensRequestId',request_id,'couponCode',upper(code));
 if quote is not null then result:=result||jsonb_build_object('coupon',quote,'originalPrice',quote->'originalPrice','discountAmount',quote->'discountAmount','servicePrice',quote->'finalPrice');end if;
 update public.studioflow_bookings set payload=result where id=(result->>'id')::uuid;
 return result;
end $$;
revoke all on function public.studioflow_mens_book(text,jsonb) from public,anon,authenticated;
grant execute on function public.studioflow_mens_book(text,jsonb) to authenticated;

-- Snapshot earning rules at eligible completion. Later rule edits or removing
-- a service cannot duplicate or retroactively change already earned points.
create or replace function studioflow_private.mens_points_snapshot()
returns trigger language plpgsql security definer set search_path='' as $$
declare d jsonb;
begin
 select draft into d from public.studioflow_accounts where user_id=new.owner_id;
 if d->'profile'->>'businessType' is distinct from 'mens_hair_studio' then return new;end if;
 if old.payload ? 'mensPointsEarned' then new.payload:=new.payload||jsonb_build_object('mensPointsEarned',old.payload->'mensPointsEarned');
 elsif new.status='completed' and new.payload->>'paymentStatus'='paid_full' and (new.payload->>'amountPaid')::numeric>=(new.payload->>'servicePrice')::numeric and coalesce((d->'loyaltyConfig'->>'programEnabled')::boolean,false) and exists(select 1 from jsonb_array_elements(d->'services') x where x->>'id'=new.payload->>'serviceId' and studioflow_private.mens_service(x)) then
 new.payload:=new.payload||jsonb_build_object('mensPointsEarned',floor((new.payload->>'servicePrice')::numeric/100)*coalesce((d->'loyaltyConfig'->>'pointsPerHundredSpent')::numeric,1));
 end if;
 return new;
end $$;
revoke all on function studioflow_private.mens_points_snapshot() from public,anon,authenticated;
drop trigger if exists template15_mens_points_snapshot on public.studioflow_bookings;
create trigger template15_mens_points_snapshot before update of status,payload on public.studioflow_bookings for each row execute function studioflow_private.mens_points_snapshot();

-- Reuse existing bookings as the single source of earned points. One row per
-- booking means re-completing/refreshing can never credit a booking twice.
create or replace function studioflow_private.mens_points(p_owner uuid,p_customer uuid)
returns integer language sql stable security definer set search_path='' as $$
 select greatest(0,coalesce((select sum((b.payload->>'mensPointsEarned')::numeric) from public.studioflow_bookings b where b.owner_id=p_owner and b.customer_id=p_customer and b.status='completed' and b.payload->>'paymentStatus'='paid_full' and (b.payload->>'amountPaid')::numeric>=(b.payload->>'servicePrice')::numeric),0)-coalesce((select sum(points_spent) from public.studioflow_customer_reward_claims where owner_id=p_owner and customer_id=p_customer),0))::integer
$$;
revoke all on function studioflow_private.mens_points(uuid,uuid) from public,anon,authenticated;
create or replace function public.studioflow_mens_rewards(p_slug text,p_reward text default null,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.studioflow_websites; d jsonb; reward jsonb; claim public.studioflow_customer_reward_claims; points integer;
begin
 if auth.uid() is null then raise exception 'Sign in to view rewards' using errcode='42501';end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.content->'profile'->>'businessType' is distinct from 'mens_hair_studio' then raise exception 'Men''s studio unavailable';end if;
 select draft into d from public.studioflow_accounts where user_id=w.owner_id;
 perform pg_advisory_xact_lock(hashtextextended(w.owner_id::text||auth.uid()::text,15));
 points:=studioflow_private.mens_points(w.owner_id,auth.uid());
 if p_reward is not null then
  if p_request is null then raise exception 'Reward request ID required';end if;
  select * into claim from public.studioflow_customer_reward_claims where customer_id=auth.uid() and request_id=p_request;
  if claim.id is not null then return jsonb_build_object('balance',points,'voucher',to_jsonb(claim));end if;
  if not coalesce((d->'loyaltyConfig'->>'programEnabled')::boolean,false) then raise exception 'Loyalty program is disabled';end if;
  select x into reward from jsonb_array_elements(coalesce(d->'loyaltyConfig'->'rewards','[]')) x where x->>'id'=p_reward and coalesce((x->>'isActive')::boolean,false);
  if reward is null or (reward->>'requiredPoints')::integer<=0 or points<(reward->>'requiredPoints')::integer or reward->>'rewardType'<>'flat_discount' then raise exception 'Reward unavailable or insufficient points';end if;
  insert into public.studioflow_customer_reward_claims(customer_id,owner_id,reward_id,reward_title,reward_terms,points_spent,coupon_code,request_id)
  values(auth.uid(),w.owner_id,p_reward,reward->>'title',reward||jsonb_build_object('expiresAt',now()+interval '90 days'),(reward->>'requiredPoints')::int,'KESH-'||upper(replace(gen_random_uuid()::text,'-','')),p_request) returning * into claim;
  points:=studioflow_private.mens_points(w.owner_id,auth.uid());
 end if;
 return jsonb_build_object('balance',points,'voucher',case when claim.id is null then null else to_jsonb(claim) end,'claims',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]') from public.studioflow_customer_reward_claims r where r.owner_id=w.owner_id and r.customer_id=auth.uid()));
end $$;
revoke all on function public.studioflow_mens_rewards(text,text,uuid) from public,anon,authenticated;
grant execute on function public.studioflow_mens_rewards(text,text,uuid) to authenticated;

-- Protect the shared reward redemption API too, so unpaid bookings cannot be
-- used to mint vouchers through an older customer surface.
create or replace function studioflow_private.mens_reward_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.studioflow_websites w where w.owner_id=new.owner_id and w.content->'profile'->>'businessType'='mens_hair_studio') then
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text||new.customer_id::text,15));
  if new.points_spent>studioflow_private.mens_points(new.owner_id,new.customer_id) then raise exception 'Insufficient paid completed booking points';end if;
 end if;
 return new;
end $$;
revoke all on function studioflow_private.mens_reward_guard() from public,anon,authenticated;
drop trigger if exists template15_mens_reward_guard on public.studioflow_customer_reward_claims;
create trigger template15_mens_reward_guard before insert on public.studioflow_customer_reward_claims for each row execute function studioflow_private.mens_reward_guard();
insert into public.studioflow_templates(id,title,config,active) values('mens_hair_studio','KeshKraft Men''s Hair Studio','{"id":"mens_hair_studio","title":"KeshKraft Men''s Hair Studio","shortName":"Men''s Haircut & Hair Colour Studio","tagline":"Expert men''s haircuts and professional hair colour services. Choose your style and book your appointment online.","about":"Precision haircuts. Considered colour. A dedicated men-only studio for your individual style.","icon":"content_cut","layoutStyle":"mens_olive_editorial","paletteLabel":"Charcoal, Deep Olive, Warm Beige & Matte Bronze","themePreset":"vintage_brass","subCategories":["Men''s Haircuts","Men''s Hair Colour"],"defaultCity":"Udaipur, Rajasthan","defaultAddress":"Studio address to be confirmed","defaultPostalCode":"313001","phone":"","whatsapp":"","ownerName":"Arjun Rathore","ownerRole":"Men''s Haircut Specialist","ownerPhotoUrl":"/templates/15/barber-1.svg","coverImageUrl":"/templates/15/hero.webp","instagramHandle":"","themeStyle":{"heroBackground":"bg-[#161817]","heroTextColor":"text-[#f3eee5]","cardBorder":"border-[#b08a61]","cardBackground":"bg-[#20231f]","cardRadius":"rounded-xl","accentColor":"text-[#b08a61]","accentBg":"bg-[#353d2c]","badgeBg":"bg-[#353d2c]","badgeText":"text-[#f3eee5]","buttonBg":"bg-[#b08a61]","buttonText":"text-[#161817]","priceColor":"text-[#b08a61]","isDark":true,"headerBanner":"bg-[#353d2c]"},"services":[{"id":"mens-1","name":"Classic Men''s Haircut","category":"Men''s Haircuts","price":450,"durationMinutes":40,"description":"A personalised classic men''s haircut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-2","name":"Modern Men''s Haircut","category":"Men''s Haircuts","price":650,"durationMinutes":40,"description":"A personalised modern men''s haircut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-3","name":"Low Fade Haircut","category":"Men''s Haircuts","price":600,"durationMinutes":40,"description":"A personalised low fade haircut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-4","name":"Mid Fade Haircut","category":"Men''s Haircuts","price":600,"durationMinutes":40,"description":"A personalised mid fade haircut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-5","name":"High Fade Haircut","category":"Men''s Haircuts","price":650,"durationMinutes":40,"description":"A personalised high fade haircut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-6","name":"Skin Fade Haircut","category":"Men''s Haircuts","price":750,"durationMinutes":40,"description":"A personalised skin fade haircut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-7","name":"Taper Fade Haircut","category":"Men''s Haircuts","price":650,"durationMinutes":40,"description":"A personalised taper fade haircut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-8","name":"Crew Cut","category":"Men''s Haircuts","price":400,"durationMinutes":40,"description":"A personalised crew cut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-9","name":"Buzz Cut","category":"Men''s Haircuts","price":300,"durationMinutes":20,"description":"A personalised buzz cut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-10","name":"Textured Crop","category":"Men''s Haircuts","price":650,"durationMinutes":40,"description":"A personalised textured crop with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-11","name":"French Crop","category":"Men''s Haircuts","price":650,"durationMinutes":40,"description":"A personalised french crop with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-12","name":"Undercut","category":"Men''s Haircuts","price":700,"durationMinutes":40,"description":"A personalised undercut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-13","name":"Side Part Haircut","category":"Men''s Haircuts","price":500,"durationMinutes":40,"description":"A personalised side part haircut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-14","name":"Slick Back Haircut","category":"Men''s Haircuts","price":600,"durationMinutes":40,"description":"A personalised slick back haircut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-15","name":"Pompadour Haircut","category":"Men''s Haircuts","price":850,"durationMinutes":40,"description":"A personalised pompadour haircut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-16","name":"Quiff Haircut","category":"Men''s Haircuts","price":750,"durationMinutes":40,"description":"A personalised quiff haircut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-17","name":"Long Men''s Haircut","category":"Men''s Haircuts","price":900,"durationMinutes":60,"description":"A personalised long men''s haircut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/long.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-18","name":"Medium Men''s Haircut","category":"Men''s Haircuts","price":700,"durationMinutes":40,"description":"A personalised medium men''s haircut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-19","name":"Scissor Cut","category":"Men''s Haircuts","price":650,"durationMinutes":40,"description":"A personalised scissor cut with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-20","name":"Men''s Hair Trim","category":"Men''s Haircuts","price":300,"durationMinutes":40,"description":"A personalised men''s hair trim with careful shape, precision detailing and a finish suited to your hair texture.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/fade.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-21","name":"Men''s Global Hair Colour","category":"Men''s Hair Colour","price":1800,"durationMinutes":90,"description":"Professional men''s global hair colour with shade advice and a natural-looking finish. Colour suitability and sensitivity checks before application.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/colour.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-22","name":"Men''s Grey Hair Coverage","category":"Men''s Hair Colour","price":1100,"durationMinutes":60,"description":"Professional men''s grey hair coverage with shade advice and a natural-looking finish. Colour suitability and sensitivity checks before application.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/colour.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-23","name":"Men''s Root Touch-Up","category":"Men''s Hair Colour","price":850,"durationMinutes":45,"description":"Professional men''s root touch-up with shade advice and a natural-looking finish. Colour suitability and sensitivity checks before application.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/colour.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-24","name":"Men''s Hair Highlights","category":"Men''s Hair Colour","price":2200,"durationMinutes":120,"description":"Professional men''s hair highlights with shade advice and a natural-looking finish. Colour suitability and sensitivity checks before application.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/colour.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-25","name":"Men''s Fashion Hair Colour","category":"Men''s Hair Colour","price":2800,"durationMinutes":150,"description":"Professional men''s fashion hair colour with shade advice and a natural-looking finish. Colour suitability and sensitivity checks before application.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/colour.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-26","name":"Men''s Natural Black Colour","category":"Men''s Hair Colour","price":1000,"durationMinutes":60,"description":"Professional men''s natural black colour with shade advice and a natural-looking finish. Colour suitability and sensitivity checks before application.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/colour.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-27","name":"Men''s Brown Hair Colour","category":"Men''s Hair Colour","price":1500,"durationMinutes":90,"description":"Professional men''s brown hair colour with shade advice and a natural-looking finish. Colour suitability and sensitivity checks before application.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/colour.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-28","name":"Men''s Ash Brown Colour","category":"Men''s Hair Colour","price":1900,"durationMinutes":90,"description":"Professional men''s ash brown colour with shade advice and a natural-looking finish. Colour suitability and sensitivity checks before application.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/colour.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-29","name":"Men''s Burgundy Hair Colour","category":"Men''s Hair Colour","price":2000,"durationMinutes":90,"description":"Professional men''s burgundy hair colour with shade advice and a natural-looking finish. Colour suitability and sensitivity checks before application.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/colour.webp","mensTemplateId":"mens_hair_studio"},{"id":"mens-30","name":"Men''s Hair Colour Consultation","category":"Men''s Hair Colour","price":300,"durationMinutes":20,"description":"Professional men''s hair colour consultation with shade advice and a natural-looking finish. Colour suitability and sensitivity checks before application.","icon":"content_cut","origin":"template","imageUrl":"/templates/15/colour.webp","mensTemplateId":"mens_hair_studio"}],"stylists":[{"id":"mens-barber-1","name":"Arjun Rathore","role":"Men''s Haircut Specialist","avatarUrl":"/templates/15/barber-1.svg","specialties":["Precision fades","Scissor cuts","Men''s Hair Colour"],"rating":0,"experienceYears":8,"businessType":"mens_hair_studio","status":"Available","assignedServices":["mens-1","mens-2","mens-3","mens-4","mens-5","mens-6","mens-7","mens-8","mens-9","mens-10","mens-11","mens-12","mens-13","mens-14","mens-15","mens-16","mens-17","mens-18","mens-19","mens-20","mens-21","mens-22","mens-23","mens-24","mens-25","mens-26","mens-27","mens-28","mens-29","mens-30"],"schedule":[{"day":"Monday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Tuesday","enabled":false,"fromTime":"10:00","toTime":"20:00"},{"day":"Wednesday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Thursday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Friday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Saturday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Sunday","enabled":true,"fromTime":"10:00","toTime":"20:00"}],"mensMaleOnly":true},{"id":"mens-barber-2","name":"Kabir Mehta","role":"Men''s Colour Expert","avatarUrl":"/templates/15/barber-2.svg","specialties":["Men''s Hair Colour","Highlights","Grey coverage"],"rating":0,"experienceYears":10,"businessType":"mens_hair_studio","status":"Available","assignedServices":["mens-1","mens-2","mens-3","mens-4","mens-5","mens-6","mens-7","mens-8","mens-9","mens-10","mens-11","mens-12","mens-13","mens-14","mens-15","mens-16","mens-17","mens-18","mens-19","mens-20","mens-21","mens-22","mens-23","mens-24","mens-25","mens-26","mens-27","mens-28","mens-29","mens-30"],"schedule":[{"day":"Monday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Tuesday","enabled":false,"fromTime":"10:00","toTime":"20:00"},{"day":"Wednesday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Thursday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Friday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Saturday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Sunday","enabled":true,"fromTime":"10:00","toTime":"20:00"}],"mensMaleOnly":true},{"id":"mens-barber-3","name":"Dev Sharma","role":"Men''s Haircut Specialist","avatarUrl":"/templates/15/barber-3.svg","specialties":["Precision fades","Scissor cuts","Men''s Hair Colour"],"rating":0,"experienceYears":6,"businessType":"mens_hair_studio","status":"Available","assignedServices":["mens-1","mens-2","mens-3","mens-4","mens-5","mens-6","mens-7","mens-8","mens-9","mens-10","mens-11","mens-12","mens-13","mens-14","mens-15","mens-16","mens-17","mens-18","mens-19","mens-20","mens-21","mens-22","mens-23","mens-24","mens-25","mens-26","mens-27","mens-28","mens-29","mens-30"],"schedule":[{"day":"Monday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Tuesday","enabled":false,"fromTime":"10:00","toTime":"20:00"},{"day":"Wednesday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Thursday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Friday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Saturday","enabled":true,"fromTime":"10:00","toTime":"20:00"},{"day":"Sunday","enabled":true,"fromTime":"10:00","toTime":"20:00"}],"mensMaleOnly":true}]}'::jsonb,true) on conflict(id) do nothing;
commit;

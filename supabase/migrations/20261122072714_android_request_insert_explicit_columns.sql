-- Use an explicit column list for the Android booking idempotency record.
-- The physical column order can differ between restored schemas; the contract
-- is customer_id, request_id, fingerprint, booking_id regardless of ordinal.
begin;

create or replace function studioflow_android_private.book(
  p_slug text,
  p_services jsonb,
  p_date date,
  p_time text,
  p_stylist text,
  p_name text,
  p_phone text,
  p_instructions text,
  p_request uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  w public.studioflow_websites;
  result jsonb;
  existing public.studioflow_android_requests;
  finger text;
  slot jsonb;
  menu jsonb;
  total numeric;
  minutes int;
  bid uuid:=gen_random_uuid();
  start_at timestamptz;
  staff_name text;
  names text;
  selected_branch text:=nullif(current_setting('studioflow.branch_id',true),'');
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode='42501';
  end if;
  if p_request is null or p_stylist is null or p_time is null or p_date is null or p_name is null or p_phone is null then
    raise exception 'Complete booking details';
  end if;
  if length(btrim(p_name)) not between 2 and 150
     or length(regexp_replace(p_phone,'[^0-9]','','g')) not between 10 and 15
     or length(coalesce(p_instructions,''))>1000 then
    raise exception 'Enter valid contact details';
  end if;
  if exists(select 1 from auth.users where id=auth.uid() and banned_until>now()) then
    raise exception 'Account unavailable' using errcode='42501';
  end if;

  finger:=md5(jsonb_build_array(p_slug,p_services,p_date,p_time,p_stylist,p_name,p_phone,p_instructions)::text);
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,8));
  select * into existing
  from public.studioflow_android_requests
  where customer_id=auth.uid() and request_id=p_request;
  if existing.booking_id is not null then
    if existing.fingerprint<>finger then
      raise exception 'Request changed; choose the slot again';
    end if;
    return(select to_jsonb(b) from public.studioflow_bookings b where id=existing.booking_id);
  end if;
  if(select count(*) from public.studioflow_bookings
     where customer_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then
    raise exception 'Too many bookings; try again later';
  end if;

  select * into w from public.studioflow_websites where slug=p_slug;
  if w.owner_id is null then raise exception 'Salon is not published'; end if;
  if not studioflow_private.service_catalogue_available_at_branch(
    w.owner_id,p_services,selected_branch::uuid
  ) then
    raise exception 'One or more selected services are not offered at this location' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(w.owner_id::text||p_stylist,0));
  select v into slot
  from jsonb_array_elements(studioflow_android_private.slots(p_slug,p_services,p_date,p_stylist)) v
  where v->>'time'=p_time and v->>'stylistId'=p_stylist;
  if slot is null then raise exception 'Slot unavailable. Choose another time.'; end if;

  select jsonb_agg(s),sum((s->>'price')::numeric),sum((s->>'durationMinutes')::int),
         string_agg(s->>'name',' + ' order by s->>'id')
    into menu,total,minutes,names
  from jsonb_array_elements(w.content->'services') s
  where p_services ? (s->>'id');
  select e->>'name' into staff_name
  from jsonb_array_elements(w.content->'stylists') e
  where e->>'id'=p_stylist;
  start_at:=(p_date+p_time::time) at time zone 'Asia/Kolkata';

  insert into public.studioflow_bookings(
    id,owner_id,customer_id,stylist_id,starts_at,ends_at,status,hold_expires_at,payload
  )
  values(
    bid,w.owner_id,auth.uid(),p_stylist,start_at,start_at+minutes*interval '1 minute',
    'pending',now()+interval '15 minutes',
    jsonb_build_object(
      'id',bid,'clientName',btrim(p_name),'clientPhone',btrim(p_phone),
      'clientEmail',(select email from auth.users where id=auth.uid()),
      'serviceId',p_services->>0,'serviceName',names,'servicePrice',total,
      'serviceItems',menu,'durationMinutes',minutes,'stylistId',p_stylist,
      'stylistName',staff_name,'date',p_date,'time',p_time,
      'instructions',coalesce(p_instructions,''),'status','pending',
      'paymentStatus','pay_at_salon','amountPaid',0,'source','nexora_android','createdAt',now()
    )
  );

  insert into public.studioflow_android_requests(
    customer_id,request_id,fingerprint,booking_id
  ) values(auth.uid(),p_request,finger,bid);

  return(select to_jsonb(b) from public.studioflow_bookings b where id=bid);
end
$function$;

commit;


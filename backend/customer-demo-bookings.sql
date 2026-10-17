-- Demo records never enter real booking/payment/reward tables or block staff slots.
create table if not exists public.studioflow_demo_bookings (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references auth.users(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade, request_id uuid not null,
 status text not null default 'confirmed' check(status in ('confirmed','cancelled')),
 payload jsonb not null check(payload->>'demo'='true' and (payload->>'servicePrice')::numeric=0 and (payload->>'amountPaid')::numeric=0),
 created_at timestamptz not null default now(), unique(customer_id,request_id)
);
create index if not exists studioflow_demo_customer_created on public.studioflow_demo_bookings(customer_id,created_at desc);
alter table public.studioflow_demo_bookings enable row level security;
revoke all on public.studioflow_demo_bookings from anon,authenticated;
grant select on public.studioflow_demo_bookings to authenticated;
grant update(status) on public.studioflow_demo_bookings to authenticated;
create policy demo_read_own on public.studioflow_demo_bookings for select to authenticated using((select auth.uid())=customer_id);
create policy demo_cancel_own on public.studioflow_demo_bookings for update to authenticated using((select auth.uid())=customer_id) with check((select auth.uid())=customer_id and status='cancelled');
create or replace function studioflow_android_private.demo_book(p_slug text,p_services jsonb,p_date date,p_time text,p_stylist text,p_name text,p_phone text,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.studioflow_websites; prior public.studioflow_demo_bookings; chosen jsonb; items jsonb; names text; list_price numeric; minutes int; staff_name text;
begin
 if auth.uid() is null then raise exception 'Sign in to save a demo booking' using errcode='42501';end if;
 if p_request is null or p_name is null or length(btrim(p_name)) not between 2 and 150 or length(regexp_replace(coalesce(p_phone,''),'[^0-9]','','g')) not between 10 and 15 then raise exception 'Enter valid booking details';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,17));
 select * into prior from public.studioflow_demo_bookings where customer_id=auth.uid() and request_id=p_request;
 if prior.id is not null then return to_jsonb(prior);end if;
 if(select count(*) from public.studioflow_demo_bookings where customer_id=auth.uid() and created_at>now()-interval '1 hour')>=20 then raise exception 'Demo limit reached. Try later.';end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null then raise exception 'Salon unavailable';end if;
 select v into chosen from jsonb_array_elements(studioflow_android_private.slots(p_slug,p_services,p_date,p_stylist)) v where v->>'time'=p_time and v->>'stylistId'=p_stylist;
 if chosen is null then raise exception 'Choose an available demo time';end if;
 select jsonb_agg(s),string_agg(s->>'name',' + '),sum((s->>'price')::numeric),sum((s->>'durationMinutes')::int) into items,names,list_price,minutes from jsonb_array_elements(w.content->'services') s where p_services ? (s->>'id');
 select s->>'name' into staff_name from jsonb_array_elements(w.content->'stylists') s where s->>'id'=p_stylist;
 insert into public.studioflow_demo_bookings(customer_id,owner_id,request_id,payload) values(auth.uid(),w.owner_id,p_request,jsonb_build_object('demo',true,'source','nexora_demo','serviceId',p_services->>0,'serviceItems',items,'serviceName',names,'servicePrice',0,'listPrice',list_price,'durationMinutes',minutes,'date',p_date,'time',p_time,'stylistId',p_stylist,'stylistName',staff_name,'clientName',btrim(p_name),'clientPhone',btrim(p_phone),'amountPaid',0,'paymentStatus','demo_no_payment','status','confirmed')) returning * into prior;
 return to_jsonb(prior);
end $$;
create or replace function public.studioflow_demo_book(p_slug text,p_services jsonb,p_date date,p_time text,p_stylist text,p_name text,p_phone text,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$select studioflow_android_private.demo_book(p_slug,p_services,p_date,p_time,p_stylist,p_name,p_phone,p_request)$$;
revoke all on function studioflow_android_private.demo_book(text,jsonb,date,text,text,text,text,uuid),public.studioflow_demo_book(text,jsonb,date,text,text,text,text,uuid) from public,anon;
grant execute on function studioflow_android_private.demo_book(text,jsonb,date,text,text,text,text,uuid),public.studioflow_demo_book(text,jsonb,date,text,text,text,text,uuid) to authenticated;

-- Cached lookups of public business addresses. No customer location is stored.
create schema if not exists studioflow_maps_private;
revoke all on schema studioflow_maps_private from public,anon,authenticated;
grant usage on schema studioflow_maps_private to service_role;
create table studioflow_maps_private.locations (
 kind text not null check(kind in ('salon','template')), source_id text not null,
 source_hash text not null, status text not null check(status in ('pending','ready','unavailable')),
 latitude double precision,longitude double precision,display_name text,
 claim_token uuid,updated_at timestamptz not null default now(),primary key(kind,source_id),
 check(latitude is null or latitude between -85 and 85),check(longitude is null or longitude between -180 and 180)
);
alter table studioflow_maps_private.locations enable row level security;
create table studioflow_maps_private.request_window(id boolean primary key default true check(id),last_request timestamptz not null);
alter table studioflow_maps_private.request_window enable row level security;
insert into studioflow_maps_private.request_window values(true,'2000-01-01');
revoke all on all tables in schema studioflow_maps_private from public,anon,authenticated;

create function studioflow_maps_private.claim(p_kind text,p_key text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q text; accuracy text; h text; postal text; cached studioflow_maps_private.locations; last_time timestamptz; token uuid;
begin
 if p_kind='salon' then
  select case when length(btrim(coalesce(content->'profile'->>'address','')))>=5 then btrim(content->'profile'->>'address') else btrim(content->'profile'->>'city') end,
   case when length(btrim(coalesce(content->'profile'->>'address','')))>=5 then 'address' else 'city' end
  into q,accuracy from public.studioflow_websites where slug=p_key and slug not like 'studioflow-qa-%';
  select coalesce(nullif(substring(content->'profile'->>'postalCode' from '([1-9][0-9]{5})'),''),substring(content->'profile'->>'address' from '([1-9][0-9]{5})')) into postal from public.studioflow_websites where slug=p_key and slug not like 'studioflow-qa-%';
  if postal is not null then q:=postal||', India';accuracy:='area';end if;
 elsif p_kind='template' then
  select config->>'defaultCity','city' into q,accuracy from public.studioflow_templates where id=p_key and active;
 else return jsonb_build_object('status','missing'); end if;
 if q is null or length(btrim(q))<2 then return jsonb_build_object('status','missing');end if;
 h:=md5(p_kind||'|'||p_key||'|'||q);
 perform pg_catalog.pg_advisory_xact_lock(746127905);
 select * into cached from studioflow_maps_private.locations where kind=p_kind and source_id=p_key;
 if cached.source_hash=h then
  if cached.status='ready' then return jsonb_build_object('status','ready','latitude',cached.latitude,'longitude',cached.longitude,'displayName',cached.display_name,'accuracy',accuracy);end if;
  if cached.status='unavailable' and cached.updated_at>now()-interval '24 hours' then return jsonb_build_object('status','unavailable');end if;
  if cached.status='pending' and cached.updated_at>now()-interval '30 seconds' then return jsonb_build_object('status','busy','retryAfterMs',1500);end if;
 end if;
 select last_request into last_time from studioflow_maps_private.request_window where id=true for update;
 if last_time>clock_timestamp()-interval '1200 milliseconds' then return jsonb_build_object('status','busy','retryAfterMs',1500);end if;
 update studioflow_maps_private.request_window set last_request=clock_timestamp() where id=true;
 token:=gen_random_uuid();
 insert into studioflow_maps_private.locations(kind,source_id,source_hash,status,claim_token) values(p_kind,p_key,h,'pending',token)
 on conflict(kind,source_id) do update set source_hash=h,status='pending',latitude=null,longitude=null,display_name=null,claim_token=token,updated_at=now();
 return jsonb_build_object('status','lookup','query',q,'accuracy',accuracy,'token',token);
end $$;
create function studioflow_maps_private.complete(p_kind text,p_key text,p_token uuid,p_lat double precision,p_lon double precision,p_display text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if p_lat is not null and (p_lon is null or not(p_lat between -85 and 85) or not(p_lon between -180 and 180)) then raise exception 'Invalid coordinates';end if;
 update studioflow_maps_private.locations set status=case when p_lat is null then 'unavailable' else 'ready' end,
 latitude=p_lat,longitude=p_lon,display_name=left(p_display,1000),claim_token=null,updated_at=now()
 where kind=p_kind and source_id=p_key and status='pending' and claim_token=p_token;
 return found;
end $$;
create function public.studioflow_map_claim(p_kind text,p_key text) returns jsonb language sql security invoker set search_path='' as $$select studioflow_maps_private.claim(p_kind,p_key)$$;
create function public.studioflow_map_complete(p_kind text,p_key text,p_token uuid,p_lat double precision,p_lon double precision,p_display text) returns boolean language sql security invoker set search_path='' as $$select studioflow_maps_private.complete(p_kind,p_key,p_token,p_lat,p_lon,p_display)$$;
revoke all on function studioflow_maps_private.claim(text,text),studioflow_maps_private.complete(text,text,uuid,double precision,double precision,text),public.studioflow_map_claim(text,text),public.studioflow_map_complete(text,text,uuid,double precision,double precision,text) from public,anon,authenticated;
grant execute on function studioflow_maps_private.claim(text,text),studioflow_maps_private.complete(text,text,uuid,double precision,double precision,text),public.studioflow_map_claim(text,text),public.studioflow_map_complete(text,text,uuid,double precision,double precision,text) to service_role;

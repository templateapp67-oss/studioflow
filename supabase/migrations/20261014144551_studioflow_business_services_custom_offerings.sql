-- Owner workspace JSON remains authoritative. This relational catalogue is a
-- transactionally synchronized projection, never a second independent write path.
create table public.studioflow_services (
 owner_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
 service_id text not null check(length(btrim(service_id)) between 1 and 200),
 name text not null check(length(btrim(name)) between 1 and 160),
 description text not null default '' check(length(description)<=2000),
 category text not null check(length(btrim(category)) between 1 and 100),
 price numeric(12,2) not null check(price between 0 and 10000000),
 duration_minutes integer not null check(duration_minutes between 1 and 720),
 icon text not null default 'spa',
 popular boolean not null default false,
 show_duration boolean not null default true,
 origin text check(origin in ('custom','template')),
 position integer not null check(position>=0),
 updated_at timestamptz not null default now(),
 primary key(owner_id,service_id)
);
comment on table public.studioflow_services is 'Business Services & Custom Service Offerings: synchronized from owner workspace saves; public menus use published website content.';
alter table public.studioflow_services enable row level security;
revoke all on public.studioflow_services from public,anon,authenticated;
grant select on public.studioflow_services to authenticated;
create policy studioflow_services_owner_read on public.studioflow_services
 for select to authenticated using(owner_id=(select auth.uid()));

create function studioflow_private.sync_service_catalogue() returns trigger
language plpgsql security definer set search_path='' as $$
declare menu jsonb:=coalesce(new.draft->'services','[]'::jsonb); item jsonb;
begin
 -- Trigger entry only: callers cannot execute this private function directly.
 if auth.uid() is not null and auth.uid()<>new.user_id then
  raise exception 'You can only change your own service catalogue' using errcode='42501';
 end if;
 if jsonb_typeof(menu) is distinct from 'array' or jsonb_array_length(menu)>500 then raise exception 'Service catalogue must be a list of up to 500 services';end if;
 if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(menu)) then raise exception 'Service IDs must be unique';end if;
 for item in select value from jsonb_array_elements(menu) loop
  if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'id') is distinct from 'string' or length(btrim(item->>'id')) not between 1 and 200 then raise exception 'Each service needs a unique ID';end if;
  if jsonb_typeof(item->'name') is distinct from 'string' or length(btrim(item->>'name')) not between 1 and 160 then raise exception 'Service name must be 1–160 characters';end if;
  if jsonb_typeof(item->'category') is distinct from 'string' or length(btrim(item->>'category')) not between 1 and 100 then raise exception 'Service category must be 1–100 characters';end if;
  if jsonb_typeof(item->'description') is distinct from 'string' or length(item->>'description')>2000 then raise exception 'Service description must be text of up to 2000 characters';end if;
  if jsonb_typeof(item->'price') is distinct from 'number' or jsonb_typeof(item->'durationMinutes') is distinct from 'number' then raise exception 'Price and duration must be numbers';end if;
  if (item->>'price')::numeric not between 0 and 10000000 or (item->>'price')::numeric<>round((item->>'price')::numeric,2) then raise exception 'Price must be 0–10000000 INR with up to two decimal places';end if;
  if (item->>'durationMinutes')::numeric not between 1 and 720 or (item->>'durationMinutes')::numeric<>trunc((item->>'durationMinutes')::numeric) then raise exception 'Duration must be 1–720 whole minutes';end if;
  if item ? 'origin' and (jsonb_typeof(item->'origin') is distinct from 'string' or item->>'origin' not in ('custom','template')) then raise exception 'Invalid service origin';end if;
  if item ? 'popular' and jsonb_typeof(item->'popular') is distinct from 'boolean' then raise exception 'Featured service must be true or false';end if;
  if item ? 'showDuration' and jsonb_typeof(item->'showDuration') is distinct from 'boolean' then raise exception 'Show duration must be true or false';end if;
 end loop;
 insert into public.studioflow_services(owner_id,service_id,name,description,category,price,duration_minutes,icon,popular,show_duration,origin,position)
 select new.user_id,s->>'id',s->>'name',s->>'description',s->>'category',(s->>'price')::numeric,(s->>'durationMinutes')::integer,coalesce(s->>'icon','spa'),coalesce((s->>'popular')::boolean,false),coalesce((s->>'showDuration')::boolean,true),s->>'origin',(ordinality-1)::integer
 from jsonb_array_elements(menu) with ordinality as entries(s,ordinality)
 on conflict(owner_id,service_id) do update set name=excluded.name,description=excluded.description,category=excluded.category,price=excluded.price,duration_minutes=excluded.duration_minutes,icon=excluded.icon,popular=excluded.popular,show_duration=excluded.show_duration,origin=excluded.origin,position=excluded.position,updated_at=now();
 delete from public.studioflow_services where owner_id=new.user_id and not exists(select 1 from jsonb_array_elements(menu) s where s->>'id'=service_id);
 return new;
end $$;
revoke all on function studioflow_private.sync_service_catalogue() from public,anon,authenticated;
create trigger studioflow_service_catalogue_sync after insert or update of draft on public.studioflow_accounts
 for each row when(new.draft ? 'services') execute function studioflow_private.sync_service_catalogue();

-- Backfill existing valid saved services without changing workspace revisions,
-- template selections, published content or any owner-entered fields.
insert into public.studioflow_services(owner_id,service_id,name,description,category,price,duration_minutes,icon,popular,show_duration,origin,position)
select a.user_id,s->>'id',s->>'name',s->>'description',s->>'category',(s->>'price')::numeric,(s->>'durationMinutes')::integer,coalesce(s->>'icon','spa'),coalesce((s->>'popular')::boolean,false),coalesce((s->>'showDuration')::boolean,true),s->>'origin',(ordinality-1)::integer
from public.studioflow_accounts a cross join lateral jsonb_array_elements(coalesce(a.draft->'services','[]'::jsonb)) with ordinality as entries(s,ordinality);

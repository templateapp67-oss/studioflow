-- Media paths are owner-scoped. URLs and file paths are saved atomically
-- with the existing service catalogue and public website snapshot.
alter table public.studioflow_services
 add column image_url text check(image_url is null or length(image_url)<=2048),
 add column image_path text check(image_path is null or length(image_path)<=1024),
 add constraint studioflow_service_image_pair check((image_url is null)=(image_path is null));

create or replace function studioflow_private.sync_service_catalogue() returns trigger
language plpgsql security definer set search_path='' as $$
declare menu jsonb:=coalesce(new.draft->'services','[]'::jsonb); item jsonb; image_path text; image_url text; prefix constant text:='https://zilwgiuiygqqardzutxi.supabase.co/storage/v1/object/public/studioflow-media/';
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
  image_path:=nullif(item->>'imagePath','');image_url:=nullif(item->>'imageUrl','');
  if item ? 'imagePath' and jsonb_typeof(item->'imagePath') is distinct from 'string' then raise exception 'Service image path must be text';end if;
  if item ? 'imageUrl' and jsonb_typeof(item->'imageUrl') is distinct from 'string' then raise exception 'Service image URL must be text';end if;
  if (image_path is null)<>(image_url is null) then raise exception 'Upload a service photo to save its URL and path together';end if;
  if image_path is not null then
   if length(image_path)>1024 or length(image_url)>2048 or left(image_path,length(new.user_id::text||'/services/'))<>new.user_id::text||'/services/' or image_path !~ '^[a-f0-9-]+/services/[a-f0-9-]+\.(jpg|png|webp)$' or image_url<>prefix||image_path then raise exception 'Upload your own service photo';end if;
   if not exists(select 1 from storage.objects where bucket_id='studioflow-media' and name=image_path and coalesce(metadata->>'mimetype','') in ('image/jpeg','image/png','image/webp')) then raise exception 'Service photo upload is unavailable';end if;
  end if;
  if item ? 'origin' and (jsonb_typeof(item->'origin') is distinct from 'string' or item->>'origin' not in ('custom','template')) then raise exception 'Invalid service origin';end if;
  if item ? 'popular' and jsonb_typeof(item->'popular') is distinct from 'boolean' then raise exception 'Featured service must be true or false';end if;
  if item ? 'showDuration' and jsonb_typeof(item->'showDuration') is distinct from 'boolean' then raise exception 'Show duration must be true or false';end if;
 end loop;
 insert into public.studioflow_services(owner_id,service_id,name,description,category,price,duration_minutes,icon,popular,show_duration,origin,position,image_url,image_path)
 select new.user_id,s->>'id',s->>'name',s->>'description',s->>'category',(s->>'price')::numeric,(s->>'durationMinutes')::integer,coalesce(s->>'icon','spa'),coalesce((s->>'popular')::boolean,false),coalesce((s->>'showDuration')::boolean,true),s->>'origin',(ordinality-1)::integer,nullif(s->>'imageUrl',''),nullif(s->>'imagePath','')
 from jsonb_array_elements(menu) with ordinality as entries(s,ordinality)
 on conflict(owner_id,service_id) do update set name=excluded.name,description=excluded.description,category=excluded.category,price=excluded.price,duration_minutes=excluded.duration_minutes,icon=excluded.icon,popular=excluded.popular,show_duration=excluded.show_duration,origin=excluded.origin,position=excluded.position,image_url=excluded.image_url,image_path=excluded.image_path,updated_at=now();
 delete from public.studioflow_services where owner_id=new.user_id and not exists(select 1 from jsonb_array_elements(menu) s where s->>'id'=service_id);
 return new;
end $$;
revoke all on function studioflow_private.sync_service_catalogue() from public,anon,authenticated;

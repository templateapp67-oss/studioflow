-- 202610300005_iron_ink_social_videos.sql
create table if not exists public.salon_social_videos (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  platform text not null check (platform in ('youtube','instagram','facebook')),
  url text not null check (url ~* '^https://(www\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be|instagram\.com|facebook\.com|fb\.watch)/'),
  title text not null default '' check (char_length(title) <= 120),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.salon_social_videos enable row level security;

create policy salon_social_videos_owner_all on public.salon_social_videos
  for all to authenticated
  using (salon_id = (select auth.uid()))
  with check (salon_id = (select auth.uid()));

create policy salon_social_videos_public_read on public.salon_social_videos
  for select to anon, authenticated
  using (is_active);

create or replace function public.check_max_salon_social_videos()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.salon_social_videos where salon_id = new.salon_id) >= 12 then
    raise exception 'A salon can have at most 12 social videos';
  end if;
  return new;
end;
$$;

create or replace function public.get_salon_social_videos(p_slug text)
returns setof public.salon_social_videos
language sql
security definer set search_path = ''
stable
as $$
  select v.*
  from public.salon_social_videos v
  join public.studioflow_websites w on w.owner_id = v.salon_id
  where w.slug = p_slug and v.is_active
  order by v.sort_order asc, v.created_at asc;
$$;

grant execute on function public.get_salon_social_videos(text) to anon, authenticated;

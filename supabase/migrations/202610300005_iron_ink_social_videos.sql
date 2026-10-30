-- Template 12 · Iron & Ink — "Social videos" (Reels & Shorts gallery).
--
-- Owner-managed YouTube Shorts/videos, Instagram Reels and Facebook Reels.
-- salon_id is the existing StudioFlow owner tenant key (auth.uid()). Owner
-- writes are RLS-scoped to their own salon; the public storefront reads active
-- rows only, via get_salon_social_videos(slug).
--
-- Safe to re-run (idempotent). Requires the StudioFlow base schema
-- (public.studioflow_accounts, public.studioflow_websites) and auth.
begin;

create table if not exists public.salon_social_videos (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  platform text not null check (platform in ('youtube','instagram','facebook')),
  -- Stores the canonical https URL rebuilt by the app (never raw user input).
  url text not null check (
    char_length(url) between 12 and 500
    and position(' ' in url) = 0
    and url ~* '^https://([a-z0-9-]+\.)*(youtube\.com|youtube-nocookie\.com|youtu\.be|instagram\.com|facebook\.com|fb\.watch)(/|$)'
    and url !~* '^https://[^/]*@'
  ),
  title text not null default '' check (char_length(title) <= 120),
  sort_order integer not null default 0 check (sort_order between 0 and 999),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The platform must match the allow-listed host of the stored URL.
  constraint salon_social_videos_platform_host_check check (
    (platform = 'youtube' and url ~* '^https://([a-z0-9-]+\.)*(youtube\.com|youtube-nocookie\.com|youtu\.be)(/|$)')
    or (platform = 'instagram' and url ~* '^https://([a-z0-9-]+\.)*instagram\.com(/|$)')
    or (platform = 'facebook' and url ~* '^https://([a-z0-9-]+\.)*(facebook\.com|fb\.watch)(/|$)')
  )
);

create index if not exists salon_social_videos_salon_order_idx
  on public.salon_social_videos(salon_id, sort_order, created_at);
create unique index if not exists salon_social_videos_salon_url_idx
  on public.salon_social_videos(salon_id, url);

-- updated_at -----------------------------------------------------------------
create or replace function public.salon_social_videos_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.salon_social_videos_touch() from public, anon, authenticated;

drop trigger if exists salon_social_videos_touch on public.salon_social_videos;
create trigger salon_social_videos_touch
  before update on public.salon_social_videos
  for each row execute function public.salon_social_videos_touch();

-- Hard cap of 12 videos per salon (mirrors MAX_SALON_SOCIAL_VIDEOS in the app).
create or replace function public.salon_social_videos_limit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.salon_social_videos
       where salon_id = new.salon_id and id <> new.id) >= 12 then
    raise exception 'A salon can publish at most 12 social videos'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.salon_social_videos_limit() from public, anon, authenticated;

drop trigger if exists salon_social_videos_limit on public.salon_social_videos;
create trigger salon_social_videos_limit
  before insert on public.salon_social_videos
  for each row execute function public.salon_social_videos_limit();

-- RLS ------------------------------------------------------------------------
alter table public.salon_social_videos enable row level security;
revoke all on public.salon_social_videos from anon, authenticated;
grant select on public.salon_social_videos to anon, authenticated;
grant insert, update, delete on public.salon_social_videos to authenticated;

-- Owner: full control of their own rows only. No policy uses USING (true).
drop policy if exists salon_social_videos_owner_all on public.salon_social_videos;
create policy salon_social_videos_owner_all on public.salon_social_videos
  for all to authenticated
  using (salon_id = (select auth.uid()))
  with check (salon_id = (select auth.uid()));

-- Public: read active rows only.
drop policy if exists salon_social_videos_public_read on public.salon_social_videos;
create policy salon_social_videos_public_read on public.salon_social_videos
  for select to anon, authenticated
  using (is_active);

-- Public read API: resolves the salon by slug and returns active rows only.
create or replace function public.get_salon_social_videos(p_slug text)
returns table (
  id uuid,
  platform text,
  url text,
  title text,
  sort_order integer,
  is_active boolean,
  created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select v.id, v.platform, v.url, v.title, v.sort_order, v.is_active, v.created_at
  from public.salon_social_videos v
  join public.studioflow_websites w on w.owner_id = v.salon_id
  where w.slug = lower(btrim(p_slug))
    and v.is_active
  order by v.sort_order asc, v.created_at asc
  limit 12
$$;
revoke all on function public.get_salon_social_videos(text) from public;
grant execute on function public.get_salon_social_videos(text) to anon, authenticated;

commit;

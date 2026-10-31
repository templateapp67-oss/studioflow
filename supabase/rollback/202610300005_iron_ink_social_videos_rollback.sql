-- Rollback for 202610300005_iron_ink_social_videos.sql.
-- Drops the Reels & Shorts table, its triggers, policies and public RPC.
begin;

drop function if exists public.get_salon_social_videos(text);

drop trigger if exists salon_social_videos_limit on public.salon_social_videos;
drop trigger if exists salon_social_videos_touch on public.salon_social_videos;

drop table if exists public.salon_social_videos;

drop function if exists public.salon_social_videos_limit();
drop function if exists public.salon_social_videos_touch();

commit;

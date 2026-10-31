-- 202610300005_iron_ink_social_videos_rollback.sql
drop function if exists public.get_salon_social_videos(text);
drop table if exists public.salon_social_videos cascade;

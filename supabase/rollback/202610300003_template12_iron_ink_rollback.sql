-- Rollback for 202610300003_template12_iron_ink.sql.
-- Drops only Template 12 ink_* data, policies and functions. Public storage
-- buckets are removed only if empty; uploaded owner/customer images are kept.
begin;

-- Remove Template 12 trigger dependencies before dropping their functions.
do $$ declare t text; begin
 foreach t in array array['ink_studio_settings','ink_categories','ink_artists','ink_portfolio','ink_pricing_plans','ink_bookings','ink_availability','ink_blocked_dates','ink_testimonials','ink_faqs','ink_aftercare','ink_blog_posts','ink_enquiries','ink_onboarding','ink_notifications'] loop
  if to_regclass('public.'||t) is not null then
   execute format('drop trigger if exists %I on public.%I',t||'_touch',t);
  end if;
 end loop;
 if to_regclass('public.ink_bookings') is not null then
  drop trigger if exists ink_bookings_validate on public.ink_bookings;
  drop trigger if exists ink_bookings_notify on public.ink_bookings;
 end if;
 if to_regclass('public.ink_enquiries') is not null then
  drop trigger if exists ink_enquiries_rate_limit on public.ink_enquiries;
 end if;
end $$;

-- Remove API functions before dropping their dependencies.
drop function if exists public.seed_template12(uuid);
drop function if exists public.submit_ink_enquiry(uuid,text,text,text,text);
drop function if exists public.get_template12_site_by_slug(text);
drop function if exists public.get_template12_site(uuid);
drop function if exists public.create_booking(uuid,text,text,text,uuid,uuid,date,time,date,numeric,text,text,text[]);
drop function if exists public.get_available_slots(uuid,uuid,date,integer);
drop function if exists studioflow_ink_private.validate_booking_write();
drop function if exists studioflow_ink_private.rate_limit_enquiry();
drop function if exists studioflow_ink_private.notify_booking_insert();
drop function if exists studioflow_ink_private.touch_updated_at();

-- Remove only the Template 12 realtime table membership.
do $$ begin
 if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ink_bookings') then
  execute 'alter publication supabase_realtime drop table public.ink_bookings';
 end if;
end $$;

-- Bucket access policies are specific to Template 12.
drop policy if exists ink_references_anon_upload on storage.objects;
drop policy if exists ink_references_owner_read on storage.objects;
drop policy if exists ink_references_owner_delete on storage.objects;
do $$ declare b text; begin
 foreach b in array array['ink-logos','ink-gallery','ink-artists','ink-blog'] loop
  execute format('drop policy if exists %I on storage.objects',b||'_public_read');
  execute format('drop policy if exists %I on storage.objects',b||'_owner_insert');
  execute format('drop policy if exists %I on storage.objects',b||'_owner_update');
  execute format('drop policy if exists %I on storage.objects',b||'_owner_delete');
 end loop;
end $$;
-- Keep buckets containing files so this rollback never destroys uploaded media.
delete from storage.buckets b where b.id in ('ink-logos','ink-gallery','ink-artists','ink-references','ink-blog')
 and not exists(select 1 from storage.objects o where o.bucket_id=b.id);

-- Drop only Iron & Ink tables; child tables first.
drop table if exists public.ink_notifications;
drop table if exists public.ink_onboarding;
drop table if exists public.ink_enquiries;
drop table if exists public.ink_blog_posts;
drop table if exists public.ink_aftercare;
drop table if exists public.ink_faqs;
drop table if exists public.ink_testimonials;
drop table if exists public.ink_blocked_dates;
drop table if exists public.ink_availability;
drop table if exists public.ink_bookings;
drop table if exists public.ink_pricing_plans;
drop table if exists public.ink_portfolio;
drop table if exists public.ink_artists;
drop table if exists public.ink_categories;
drop table if exists public.ink_studio_settings;
drop schema if exists studioflow_ink_private;

commit;

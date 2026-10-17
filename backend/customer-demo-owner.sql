alter table public.studioflow_demo_bookings drop constraint studioflow_demo_bookings_status_check;
alter table public.studioflow_demo_bookings add constraint studioflow_demo_bookings_status_check check(status in ('confirmed','completed','cancelled'));
create index if not exists studioflow_demo_owner_created on public.studioflow_demo_bookings(owner_id,created_at desc);
create policy demo_owner_read on public.studioflow_demo_bookings for select to authenticated using((select auth.uid())=owner_id);
create policy demo_owner_manage on public.studioflow_demo_bookings for update to authenticated using((select auth.uid())=owner_id and status='confirmed') with check((select auth.uid())=owner_id and status in ('completed','cancelled'));

-- Explicit administrator bootstrap for the freshly reset project.
begin;

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_email_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  check (email = lower(btrim(email)))
);

insert into public.admin_email_allowlist(email)
values ('templateapp67@gmail.com')
on conflict (email) do nothing;

alter table public.app_admins enable row level security;
alter table public.admin_email_allowlist enable row level security;
create policy app_admins_self_select on public.app_admins for select to authenticated using (user_id=(select auth.uid()));
revoke all on public.app_admins, public.admin_email_allowlist from public, anon, authenticated;
grant select on public.app_admins to authenticated;

create or replace function public.assign_allowlisted_admin()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
  if exists(select 1 from public.admin_email_allowlist a where a.email=lower(btrim(new.email))) then
    insert into public.app_admins(user_id) values(new.id) on conflict(user_id) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.assign_allowlisted_admin() from public,anon,authenticated;

drop trigger if exists trg_profiles_assign_allowlisted_admin on public.profiles;
create trigger trg_profiles_assign_allowlisted_admin
after insert on public.profiles for each row execute procedure public.assign_allowlisted_admin();

create or replace function public.is_my_app_admin()
returns boolean language sql stable security invoker set search_path=pg_catalog,public as $$
  select exists(select 1 from public.app_admins where user_id=(select auth.uid()))
$$;
revoke all on function public.is_my_app_admin() from public,anon;
grant execute on function public.is_my_app_admin() to authenticated;
notify pgrst,'reload schema';
commit;

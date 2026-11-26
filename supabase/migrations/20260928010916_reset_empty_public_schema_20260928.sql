begin;
drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant create on schema public to postgres, service_role;
commit;

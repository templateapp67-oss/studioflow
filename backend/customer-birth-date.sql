-- DOB is private customer profile data, never part of public/referral projections.
alter table public.studioflow_android_profiles add column if not exists date_of_birth date;
alter table public.studioflow_android_profiles add constraint studioflow_customer_birth_date_valid check(date_of_birth is null or (date_of_birth>=date '1900-01-01' and date_of_birth <= (now() at time zone 'Asia/Kolkata')::date));
create or replace function studioflow_android_private.capture_customer_birth_date() returns trigger
language plpgsql security definer set search_path='' as $$
declare raw_date text:=nullif(new.raw_user_meta_data->>'date_of_birth',''); dob date;
begin
 if raw_date is null then return new;end if;
 if raw_date !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date of birth' using errcode='22007';end if;
 dob:=raw_date::date;
 if dob<date '1900-01-01' or dob>(now() at time zone 'Asia/Kolkata')::date then raise exception 'Date of birth must be between 1900 and today' using errcode='22007';end if;
 insert into public.studioflow_android_profiles(customer_id,full_name,date_of_birth) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),150),dob)
 on conflict(customer_id) do update set date_of_birth=excluded.date_of_birth;
 return new;
end $$;
revoke all on function studioflow_android_private.capture_customer_birth_date() from public,anon,authenticated;
create trigger studioflow_customer_birth_date after insert on auth.users for each row execute function studioflow_android_private.capture_customer_birth_date();

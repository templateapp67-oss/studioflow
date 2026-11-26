-- Separate staff ratings: real completed visits, one review per customer/staff/salon.
create table if not exists studioflow_review_private.staff_reviews(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.studioflow_websites(owner_id) on delete cascade,
 staff_id text not null,customer_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null,rating integer not null check(rating between 1 and 5),comment text not null check(char_length(btrim(comment)) between 10 and 2000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(owner_id,staff_id,customer_id)
);
alter table studioflow_review_private.staff_reviews enable row level security;
revoke all on studioflow_review_private.staff_reviews from public,anon,authenticated;
create index if not exists staff_reviews_list_idx on studioflow_review_private.staff_reviews(owner_id,staff_id,updated_at desc);
create index if not exists staff_reviews_customer_idx on studioflow_review_private.staff_reviews(customer_id);
create index if not exists staff_review_completed_visits_idx on public.studioflow_bookings(customer_id,owner_id,stylist_id) where status='completed';
create or replace function studioflow_review_private.staff_reviews_list(p_slug text,p_staff_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare salon uuid; actor uuid:=auth.uid(); rows jsonb; own jsonb; total integer; average numeric; eligible boolean;
begin
 select w.owner_id into salon from public.studioflow_websites w where w.slug=p_slug and exists(select 1 from jsonb_array_elements(coalesce(w.content->'stylists','[]')) s where s->>'id'=p_staff_id and coalesce(s->>'status','Available')<>'Inactive');
 if salon is null then raise exception 'This specialist profile is unavailable';end if;
 select count(*),round(avg(rating),1) into total,average from studioflow_review_private.staff_reviews where owner_id=salon and staff_id=p_staff_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.display_name,'rating',r.rating,'comment',r.comment,'date',r.updated_at,'verified',true) order by r.updated_at desc,r.id),'[]') into rows from(select * from studioflow_review_private.staff_reviews where owner_id=salon and staff_id=p_staff_id order by updated_at desc,id limit 50) r;
 select jsonb_build_object('rating',rating,'comment',comment) into own from studioflow_review_private.staff_reviews where owner_id=salon and staff_id=p_staff_id and customer_id=actor;
 eligible:=actor is not null and actor<>salon and exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and (banned_until is null or banned_until<=now())) and exists(select 1 from public.studioflow_bookings where owner_id=salon and customer_id=actor and stylist_id=p_staff_id and status='completed' and ends_at<=now());
 return jsonb_build_object('reviews',rows,'count',total,'average',average,'ownReview',own,'canReview',eligible);
end $$;
create or replace function studioflow_review_private.staff_review_submit(p_slug text,p_staff_id text,p_rating integer,p_comment text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();salon uuid; customer_name text; info jsonb;recent timestamptz;
begin
 if actor is null then raise exception 'Sign in to review this specialist' using errcode='42501';end if;
 info:=studioflow_review_private.staff_reviews_list(p_slug,p_staff_id);
 if not coalesce((info->>'canReview')::boolean,false) then raise exception 'Complete a booking with this specialist before reviewing' using errcode='42501';end if;
 if p_rating is null or p_rating not between 1 and 5 or char_length(btrim(coalesce(p_comment,''))) not between 10 and 2000 then raise exception 'Choose 1–5 stars and write a review of 10–2000 characters';end if;
 select owner_id into salon from public.studioflow_websites where slug=p_slug;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||salon::text||p_staff_id,0));
 select updated_at into recent from studioflow_review_private.staff_reviews where owner_id=salon and staff_id=p_staff_id and customer_id=actor;
 if recent>now()-interval '10 seconds' then raise exception 'Please wait a few seconds before updating your review';end if;
 select coalesce(nullif(left(btrim(raw_user_meta_data->>'full_name'),100),''),'Customer') into customer_name from auth.users where id=actor;
 insert into studioflow_review_private.staff_reviews(owner_id,staff_id,customer_id,display_name,rating,comment) values(salon,p_staff_id,actor,customer_name,p_rating,btrim(p_comment)) on conflict(owner_id,staff_id,customer_id) do update set display_name=excluded.display_name,rating=excluded.rating,comment=excluded.comment,updated_at=now();
 return studioflow_review_private.staff_reviews_list(p_slug,p_staff_id);
end $$;
revoke all on function studioflow_review_private.staff_reviews_list(text,text),studioflow_review_private.staff_review_submit(text,text,integer,text) from public,anon,authenticated;
grant execute on function studioflow_review_private.staff_reviews_list(text,text) to anon,authenticated;
grant execute on function studioflow_review_private.staff_review_submit(text,text,integer,text) to authenticated;
create or replace function public.studioflow_staff_reviews(p_slug text,p_staff_id text) returns jsonb language sql stable security invoker set search_path='' as $$ select studioflow_review_private.staff_reviews_list(p_slug,p_staff_id); $$;
create or replace function public.studioflow_staff_review_submit(p_slug text,p_staff_id text,p_rating integer,p_comment text) returns jsonb language sql security invoker set search_path='' as $$ select studioflow_review_private.staff_review_submit(p_slug,p_staff_id,p_rating,p_comment); $$;
revoke all on function public.studioflow_staff_reviews(text,text),public.studioflow_staff_review_submit(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.studioflow_staff_reviews(text,text) to anon,authenticated;
grant execute on function public.studioflow_staff_review_submit(text,text,integer,text) to authenticated;

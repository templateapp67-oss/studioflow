-- Owners may submit a clearly attributed owner update; verified visit is reserved for customers.
alter table public.studioflow_reviews drop constraint studioflow_reviews_check;
create or replace function studioflow_review_private.review_json(r public.studioflow_reviews) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',r.id,'name',r.name,'rating',r.rating,'comment',r.comment,'serviceName',r.service_name,'imageUrl',r.image_url,'date',r.created_at,'isMine',r.customer_id=auth.uid(),'isOwnerReview',r.customer_id=r.owner_id,'verified',r.customer_id<>r.owner_id and exists(select 1 from public.studioflow_bookings b where b.owner_id=r.owner_id and b.customer_id=r.customer_id and b.status='completed'));
$$;
revoke all on function studioflow_review_private.review_json(public.studioflow_reviews) from public,anon,authenticated;
create or replace function studioflow_review_private.list_reviews(p_slug text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare salon uuid; actor uuid:=auth.uid(); result jsonb; own jsonb;
begin
 select owner_id into salon from public.studioflow_websites where slug=p_slug;
 if salon is null then raise exception 'Publish the salon website before collecting customer reviews'; end if;
 select coalesce(jsonb_agg(studioflow_review_private.review_json(r) order by r.updated_at desc),'[]'::jsonb) into result from (select * from public.studioflow_reviews where owner_id=salon order by updated_at desc limit 50) r;
 select studioflow_review_private.review_json(r) into own from public.studioflow_reviews r where owner_id=salon and customer_id=actor;
 return jsonb_build_object('reviews',result,'ownReview',own,'canReview',actor is not null);
end;
$$;
create or replace function studioflow_review_private.submit_review(p_slug text,p_name text,p_rating integer,p_comment text,p_service_name text default '',p_image_url text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare salon uuid; actor uuid:=auth.uid(); prefix text; image_path text; existing public.studioflow_reviews;
begin
 if actor is null then raise exception 'Sign in to submit a review' using errcode='42501';end if;
 if exists(select 1 from auth.users where id=actor and banned_until>now()) then raise exception 'Account unavailable' using errcode='42501';end if;
 select owner_id into salon from public.studioflow_websites where slug=p_slug;
 if salon is null then raise exception 'Salon website is unavailable';end if;
 if char_length(btrim(coalesce(p_name,''))) not between 2 and 100 or p_rating is null or p_rating not between 1 and 5 or char_length(btrim(coalesce(p_comment,''))) not between 10 and 2000 or char_length(coalesce(p_service_name,''))>150 then raise exception 'Provide your name, a 1–5 star rating and a review of 10–2000 characters';end if;
 p_image_url:=nullif(btrim(p_image_url),'');
 if p_image_url is not null then
  prefix:='https://zilwgiuiygqqardzutxi.supabase.co/storage/v1/object/public/studioflow-media/';
  if left(p_image_url,char_length(prefix||actor::text||'/'))<>prefix||actor::text||'/' then raise exception 'Upload your own review photo';end if;
  image_path:=substr(p_image_url,char_length(prefix)+1);
  if not exists(select 1 from storage.objects where bucket_id='studioflow-media' and name=image_path) then raise exception 'Review photo upload is unavailable';end if;
 end if;
 select * into existing from public.studioflow_reviews where owner_id=salon and customer_id=actor;
 if existing.id is not null and existing.updated_at>now()-interval '10 seconds' then raise exception 'Please wait a few seconds before updating your review';end if;
 insert into public.studioflow_reviews(owner_id,customer_id,name,rating,comment,service_name,image_url) values(salon,actor,btrim(p_name),p_rating,btrim(p_comment),btrim(coalesce(p_service_name,'')),p_image_url)
 on conflict(owner_id,customer_id) do update set name=excluded.name,rating=excluded.rating,comment=excluded.comment,service_name=excluded.service_name,image_url=excluded.image_url,updated_at=now();
 return studioflow_review_private.list_reviews(p_slug);
end;
$$;
notify pgrst,'reload schema';

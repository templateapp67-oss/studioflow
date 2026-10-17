begin;
do $$
declare salon uuid;slug text;staff text;actor uuid:=gen_random_uuid();other uuid:=gen_random_uuid();data jsonb;before_count integer;blocked boolean;
begin
 select w.owner_id,w.slug,s->>'id' into salon,slug,staff from public.studioflow_websites w cross join lateral jsonb_array_elements(w.content->'stylists') s where coalesce(s->>'status','Available')<>'Inactive' limit 1;
 if staff is null then raise exception 'No published specialist to test';end if;
 insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values(actor,'authenticated','authenticated',actor::text||'@staff-qa.invalid',now(),'{}','{"full_name":"Staff QA Customer"}'),(other,'authenticated','authenticated',other::text||'@staff-qa.invalid',now(),'{}','{}');
 data:=public.studioflow_staff_reviews(slug,staff);before_count:=(data->>'count')::integer;
 perform set_config('request.jwt.claim.sub',actor::text,true);execute 'set local role authenticated';
 blocked:=false;begin perform public.studioflow_staff_review_submit(slug,staff,5,'Should not accept an unverified visit.');exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Unverified review accepted';end if;
 execute 'set local role postgres';insert into public.studioflow_bookings(owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload) values(salon,actor,staff,now()-interval '2 hours',now()-interval '1 hour','completed','{}');execute 'set local role authenticated';
 data:=public.studioflow_staff_review_submit(slug,staff,4,'Verified specialist review for transaction rollback testing.');if (data->>'count')::integer<>before_count+1 or not (data->>'canReview')::boolean then raise exception 'Verified review was not saved';end if;
 execute 'set local role postgres';update studioflow_review_private.staff_reviews set updated_at=now()-interval '20 seconds' where customer_id=actor;execute 'set local role authenticated';data:=public.studioflow_staff_review_submit(slug,staff,5,'Updated verified review keeps one rating per customer.');if (data->>'count')::integer<>before_count+1 or (data->'ownReview'->>'rating')::integer<>5 then raise exception 'Review update duplicated rating';end if;
 perform set_config('request.jwt.claim.sub',other::text,true);data:=public.studioflow_staff_reviews(slug,staff);if data->'ownReview' is distinct from 'null'::jsonb or (data->>'canReview')::boolean then raise exception 'Cross-customer own review leak';end if;
 blocked:=false;begin perform public.studioflow_staff_review_submit(slug,'unrelated-staff',5,'Cannot review a different specialist.');exception when others then blocked:=true;end;if not blocked then raise exception 'Unknown specialist accepted';end if;
 execute 'set local role anon';perform set_config('request.jwt.claim.sub','',true);data:=public.studioflow_staff_reviews(slug,staff);if position(actor::text in data::text)>0 or position(other::text in data::text)>0 then raise exception 'Customer identifier leak';end if;
 if has_table_privilege('authenticated','studioflow_review_private.staff_reviews','SELECT') or has_table_privilege('authenticated','studioflow_review_private.staff_reviews','INSERT') or has_function_privilege('anon','public.studioflow_staff_review_submit(text,text,integer,text)','EXECUTE') then raise exception 'Unexpected direct privileges';end if;
 execute 'set local role postgres';raise notice 'PASS: completed-visit review, own update without duplicates, wrong specialist rejected, safe anonymous projection and no direct client table access.';
end $$;
rollback;

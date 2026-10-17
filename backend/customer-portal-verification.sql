begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();address_id uuid;blocked boolean;changed int;path text;
begin
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
 (a,'authenticated','authenticated',a::text||'@customer-portal-qa.invalid','{}','{"full_name":"Customer QA"}'),
 (b,'authenticated','authenticated',b::text||'@customer-portal-qa.invalid','{}','{}');
 perform set_config('request.jwt.claim.sub',a::text,true);execute 'set local role authenticated';
 perform public.studioflow_android_profile();
 perform public.studioflow_android_save_profile('Customer QA Updated','9876543210');
 if public.studioflow_android_profile()->>'full_name'<>'Customer QA Updated' then raise exception 'Profile save failed';end if;
 path:=a::text||'/photos/qa.jpg';
 insert into storage.objects(bucket_id,name,metadata) values('nexora-customer-private',path,'{"mimetype":"image/jpeg","size":100}');
 perform public.studioflow_android_record_upload(path,false);
 if public.studioflow_android_profile()->>'photo_path'<>path then raise exception 'Photo pointer did not persist';end if;
 insert into public.studioflow_customer_addresses(label,address_line,city,postal_code) values('Home','QA Test Address','Mumbai','400050') returning id into address_id;
 insert into public.studioflow_customer_preferences(theme,language) values('dark','hi');
 if not exists(select 1 from public.studioflow_customer_preferences where customer_id=a and theme='dark' and language='hi') then raise exception 'Preferences missing';end if;
 blocked:=false;begin update public.studioflow_customer_addresses set customer_id=b where id=address_id;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Address ownership reassignment allowed';end if;
 blocked:=false;begin insert into public.studioflow_customer_preferences(customer_id) values(b);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Foreign preference write allowed';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 if exists(select 1 from public.studioflow_customer_addresses where id=address_id) or exists(select 1 from public.studioflow_customer_preferences where customer_id=a) or exists(select 1 from public.studioflow_android_profiles where customer_id=a) or exists(select 1 from storage.objects where bucket_id='nexora-customer-private' and name=path) then raise exception 'Cross-customer private read allowed';end if;
 update public.studioflow_customer_addresses set city='Delhi' where id=address_id;get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Cross-customer address update allowed';end if;
 blocked:=false;begin perform public.studioflow_android_record_upload(path,false);exception when others then blocked:=true;end;
 if not blocked then raise exception 'Foreign profile photo linkage allowed';end if;
 blocked:=false;begin insert into storage.objects(bucket_id,name) values('nexora-customer-private',a::text||'/photos/foreign.jpg');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Foreign photo upload path allowed';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 update public.studioflow_customer_addresses set label='Work' where id=address_id;
 if not exists(select 1 from public.studioflow_customer_addresses where id=address_id and label='Work') then raise exception 'Own address update failed';end if;
 delete from public.studioflow_customer_addresses where id=address_id;
 if exists(select 1 from public.studioflow_customer_addresses where id=address_id) then raise exception 'Own address deletion failed';end if;
 execute 'set local role anon';
 if jsonb_array_length(public.studioflow_customer_catalog()->'templates')<>14 then raise exception 'Template catalogue incomplete';end if;
 if exists(select 1 from jsonb_array_elements(public.studioflow_customer_catalog()->'salons') s where s->>'slug' like 'studioflow-qa-%') then raise exception 'QA fixture exposed as customer salon';end if;
 blocked:=false;begin perform count(*) from public.studioflow_customer_addresses;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous address access allowed';end if;
 execute 'set local role postgres';
end $$;
rollback;
select 'PASS: profile save, private photo pointer, address CRUD, stored preferences, ownership reassignment denial, cross-user address/profile/storage isolation, foreign photo rejection, anonymous privacy denial, all 14 templates; every fixture rolled back' as verification;


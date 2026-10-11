-- Tests run inside a rollback; no real user rows are changed.
begin;
do $$
declare actor uuid:=gen_random_uuid(); d jsonb; saved jsonb; published jsonb; v_slug text:='qa-wire-'||substr(actor::text,1,8); template record; revision integer:=0; n integer:=0;
begin
 insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(actor,'authenticated','authenticated','studioflow-wiring-qa-'||actor||'@example.invalid',now(),'{"provider":"email","providers":["email"]}','{"full_name":"Wiring QA","salon_name":"Wiring QA Salon"}',now(),now());
 perform set_config('request.jwt.claim.sub',actor::text,true);
 execute 'set local role authenticated';
 perform public.studioflow_ensure_account('');
 d:=jsonb_build_object('profile',jsonb_build_object('businessType','hair_salon','businessName','Wiring QA Salon','phone','+919876543210','subdomain',v_slug,'email','PRIVATE OWNER EMAIL','socialVideos',jsonb_build_array(jsonb_build_object('id','v1','videoId','abcdefghijk','title','Owner Video')),'promoCampaign',jsonb_build_object('enabled',true,'headline','Saved Promotion'),'websiteSections',jsonb_build_object('videos',true,'promo',true)), 'services',jsonb_build_array(jsonb_build_object('id','s1','name','Real Service','price',500,'durationMinutes',30)), 'stylists',jsonb_build_array(jsonb_build_object('id','t1','name','Real Specialist','phone','PRIVATE PHONE','commissionRate',50,'schedule','[]'::jsonb)), 'clients',jsonb_build_array(jsonb_build_object('name','PRIVATE CRM')), 'extras',jsonb_build_object('gallery',jsonb_build_array('https://example.com/photo.jpg'),'policies',jsonb_build_object('cancellation','Owner policy'),'whiteLabel',jsonb_build_object('platformName','Owner Brand','poweredBy',true)), 'loyaltyConfig',jsonb_build_object('programEnabled',true,'rewards',jsonb_build_array(jsonb_build_object('id','r1','title','Public reward','isActive',true,'couponCodePrefix','PRIVATE PREFIX'),jsonb_build_object('id','r2','title','Disabled reward','isActive',false))));
 saved:=public.studioflow_save_workspace(d,revision);revision:=(saved->>'revision')::integer;
 perform public.studioflow_publish();
 for template in select id from public.studioflow_templates where active loop
  d:=jsonb_set(d,'{profile,businessType}',to_jsonb(template.id));
  d:=jsonb_set(d,'{profile,promoCampaign,headline}',to_jsonb('Changed '||template.id));
  d:=jsonb_set(d,'{profile,socialVideos,0,title}',to_jsonb('Video '||template.id));
  saved:=public.studioflow_save_workspace(d,revision);revision:=(saved->>'revision')::integer;
  select content into published from public.studioflow_websites where owner_id=actor;
  if published->'profile'->'promoCampaign'->>'headline'<>'Changed '||template.id or published->'profile'->'socialVideos'->0->>'title'<>'Video '||template.id then raise exception 'FAIL: published dashboard sync for %',template.id; end if;
  if published ? 'clients' or published->'profile' ? 'email' or published->'stylists'->0 ? 'phone' or published->'stylists'->0 ? 'commissionRate' then raise exception 'FAIL: private fields leaked';end if;
  if published->'policies'->>'cancellation'<>'Owner policy' or published->'branding'->>'platformName'<>'Owner Brand' or jsonb_array_length(published->'loyaltyConfig'->'rewards')<>1 or published->'loyaltyConfig'->'rewards'->0 ? 'couponCodePrefix' then raise exception 'FAIL: public sections projection';end if;
  n:=n+1;
 end loop;
 if n<>14 then raise exception 'FAIL: expected all 14 catalog templates, got %',n;end if;
 d:=jsonb_set(d,'{profile,subdomain}','"draft-new-slug"');d:=jsonb_set(d,'{profile,socialVideos}','[]');d:=jsonb_set(d,'{extras,gallery}','[]');d:=jsonb_set(d,'{profile,websiteSections,videos}','false');
 perform public.studioflow_save_workspace(d,revision);
 execute 'set local role anon';
 select content into published from public.studioflow_websites where slug=v_slug;
 if published->'profile'->>'subdomain'<>v_slug or jsonb_array_length(published->'profile'->'socialVideos')<>0 or jsonb_array_length(published->'gallery')<>0 or published->'profile'->'websiteSections'->'videos'<>'false'::jsonb then raise exception 'FAIL: stable public URL or removal persistence';end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: dashboard autosync across 14 templates, private data excluded, branding/policies/rewards, removals, and stable public URL' as result;

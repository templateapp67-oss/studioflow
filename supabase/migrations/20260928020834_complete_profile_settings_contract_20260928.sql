-- Canonical owner Profile Settings contract used by every editor/modal.
begin;

alter table public.profiles
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_notifications_enabled boolean not null default true,
  add column if not exists primary_color text,
  add column if not exists secondary_color text,
  add column if not exists background_color text,
  add column if not exists heading_style text,
  add column if not exists button_style text,
  add column if not exists border_radius text,
  add column if not exists appearance text,
  add column if not exists offers jsonb not null default '[]'::jsonb,
  add column if not exists custom_favicon_url text,
  add column if not exists custom_favicon text,
  add column if not exists favicon_url text,
  add column if not exists social_share_image_url text,
  add column if not exists social_share_image text,
  add column if not exists seo_keywords text,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists heading_font text,
  add column if not exists body_font text;

update public.profiles set whatsapp_notifications_enabled=whatsapp_notifications where whatsapp_notifications_enabled is distinct from whatsapp_notifications;

drop function if exists public.save_my_profile_settings(jsonb);
create function public.save_my_profile_settings(p_patch jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare actor uuid:=auth.uid(); d date; phone_value text; whatsapp_value text; photo_value text;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_patch is null or jsonb_typeof(p_patch)<>'object' or octet_length(p_patch::text)>1000000 then raise exception 'Invalid profile settings payload' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(p_patch) k where not(k=any(array['ownerName','businessName','businessType','email','phone','whatsapp','dob','dateOfBirth','postalCode','city','areaLocality','address','state','landmark','ownerPhotoUrl','coverImageUrl','logoUrl','tagline','about','currency','subdomain','customDomain','foundingYear','instagramHandle','facebookPage','youtubeChannel','tiktokProfile','googleBusinessUrl','themePreset','themeAccentKey','customAccentColor','primaryColor','secondaryColor','backgroundColor','headingStyle','buttonStyle','borderRadius','appearance','requireDeposit','depositPercentage','homeService','offers','customFaviconUrl','socialShareImageUrl','seoKeywords','seoTitle','seoDescription','headingFont','bodyFont','whatsappNotificationsEnabled','latitude','longitude','workingHours']))) then raise exception 'Unsupported profile field' using errcode='22023'; end if;
  phone_value:=nullif(regexp_replace(coalesce(p_patch->>'phone',''),'[[:space:]().-]','','g'),'');
  whatsapp_value:=nullif(regexp_replace(coalesce(p_patch->>'whatsapp',''),'[[:space:]().-]','','g'),'');
  if phone_value is not null and phone_value !~ '^\+?[0-9]{7,15}$' then raise exception 'Invalid phone number' using errcode='22023'; end if;
  if whatsapp_value is not null and whatsapp_value !~ '^\+?[0-9]{7,15}$' then raise exception 'Invalid WhatsApp number' using errcode='22023'; end if;
  photo_value:=nullif(p_patch->>'ownerPhotoUrl','');
  if photo_value is not null and length(photo_value)>700000 then raise exception 'Profile image is too large' using errcode='22023'; end if;
  begin d:=nullif(coalesce(p_patch->>'dob',p_patch->>'dateOfBirth'),'')::date; exception when invalid_datetime_format then raise exception 'Invalid date of birth' using errcode='22023'; end;
  insert into public.profiles(id,user_id) values(actor,actor) on conflict(id) do nothing;
  update public.profiles set
    full_name=case when p_patch?'ownerName' then nullif(btrim(p_patch->>'ownerName'),'') else full_name end,
    salon_name=case when p_patch?'businessName' then nullif(btrim(p_patch->>'businessName'),'') else salon_name end,
    business_type=case when p_patch?'businessType' then nullif(btrim(p_patch->>'businessType'),'') else business_type end,
    email=case when p_patch?'email' then nullif(btrim(p_patch->>'email'),'') else email end,
    phone=case when p_patch?'phone' then phone_value else phone end, phone_number=case when p_patch?'phone' then phone_value else phone_number end, mobile=case when p_patch?'phone' then phone_value else mobile end,
    whatsapp=case when p_patch?'whatsapp' then whatsapp_value else whatsapp end, whatsapp_number=case when p_patch?'whatsapp' then whatsapp_value else whatsapp_number end,
    postal_code=case when p_patch?'postalCode' then nullif(btrim(p_patch->>'postalCode'),'') else postal_code end, pincode=case when p_patch?'postalCode' then nullif(btrim(p_patch->>'postalCode'),'') else pincode end,
    city=case when p_patch?'city' then nullif(btrim(p_patch->>'city'),'') else city end, preferred_city=case when p_patch?'city' then nullif(btrim(p_patch->>'city'),'') else preferred_city end,
    area=case when p_patch?'areaLocality' then nullif(btrim(p_patch->>'areaLocality'),'') else area end, preferred_area=case when p_patch?'areaLocality' then nullif(btrim(p_patch->>'areaLocality'),'') else preferred_area end,
    full_address=case when p_patch?'address' then nullif(btrim(p_patch->>'address'),'') else full_address end, state=case when p_patch?'state' then nullif(btrim(p_patch->>'state'),'') else state end, landmark=case when p_patch?'landmark' then nullif(btrim(p_patch->>'landmark'),'') else landmark end,
    dob=case when p_patch?'dob' or p_patch?'dateOfBirth' then d else dob end, date_of_birth=case when p_patch?'dob' or p_patch?'dateOfBirth' then d else date_of_birth end,
    owner_photo_url=case when p_patch?'ownerPhotoUrl' then photo_value else owner_photo_url end, avatar_url=case when p_patch?'ownerPhotoUrl' then photo_value else avatar_url end, photo_url=case when p_patch?'ownerPhotoUrl' then photo_value else photo_url end,
    cover_image_url=case when p_patch?'coverImageUrl' then nullif(p_patch->>'coverImageUrl','') else cover_image_url end, logo_url=case when p_patch?'logoUrl' then nullif(p_patch->>'logoUrl','') else logo_url end,
    tagline=case when p_patch?'tagline' then nullif(p_patch->>'tagline','') else tagline end, about=case when p_patch?'about' then nullif(p_patch->>'about','') else about end, currency=case when p_patch?'currency' then nullif(p_patch->>'currency','') else currency end,
    subdomain=case when p_patch?'subdomain' then nullif(lower(btrim(p_patch->>'subdomain')),'') else subdomain end, custom_domain=case when p_patch?'customDomain' then nullif(lower(btrim(p_patch->>'customDomain')),'') else custom_domain end,
    founding_year=case when p_patch?'foundingYear' then nullif(p_patch->>'foundingYear','') else founding_year end, instagram_handle=case when p_patch?'instagramHandle' then nullif(p_patch->>'instagramHandle','') else instagram_handle end, facebook_page=case when p_patch?'facebookPage' then nullif(p_patch->>'facebookPage','') else facebook_page end, youtube_channel=case when p_patch?'youtubeChannel' then nullif(p_patch->>'youtubeChannel','') else youtube_channel end, tiktok_profile=case when p_patch?'tiktokProfile' then nullif(p_patch->>'tiktokProfile','') else tiktok_profile end, google_business_url=case when p_patch?'googleBusinessUrl' then nullif(p_patch->>'googleBusinessUrl','') else google_business_url end,
    theme_preset=case when p_patch?'themePreset' then nullif(p_patch->>'themePreset','') else theme_preset end, theme_accent_key=case when p_patch?'themeAccentKey' then nullif(p_patch->>'themeAccentKey','') else theme_accent_key end, custom_accent_color=case when p_patch?'customAccentColor' then nullif(p_patch->>'customAccentColor','') else custom_accent_color end,
    primary_color=case when p_patch?'primaryColor' then nullif(p_patch->>'primaryColor','') else primary_color end, secondary_color=case when p_patch?'secondaryColor' then nullif(p_patch->>'secondaryColor','') else secondary_color end, background_color=case when p_patch?'backgroundColor' then nullif(p_patch->>'backgroundColor','') else background_color end, heading_style=case when p_patch?'headingStyle' then nullif(p_patch->>'headingStyle','') else heading_style end, button_style=case when p_patch?'buttonStyle' then nullif(p_patch->>'buttonStyle','') else button_style end, border_radius=case when p_patch?'borderRadius' then nullif(p_patch->>'borderRadius','') else border_radius end, appearance=case when p_patch?'appearance' then nullif(p_patch->>'appearance','') else appearance end,
    require_deposit=case when p_patch?'requireDeposit' then coalesce((p_patch->>'requireDeposit')::boolean,require_deposit) else require_deposit end, deposit_percentage=case when p_patch?'depositPercentage' then coalesce((p_patch->>'depositPercentage')::numeric,deposit_percentage) else deposit_percentage end,
    home_service=case when p_patch?'homeService' and jsonb_typeof(p_patch->'homeService')='object' then p_patch->'homeService' else home_service end, offers=case when p_patch?'offers' and jsonb_typeof(p_patch->'offers')='array' then p_patch->'offers' else offers end,
    custom_favicon_url=case when p_patch?'customFaviconUrl' then nullif(p_patch->>'customFaviconUrl','') else custom_favicon_url end, custom_favicon=case when p_patch?'customFaviconUrl' then nullif(p_patch->>'customFaviconUrl','') else custom_favicon end, favicon_url=case when p_patch?'customFaviconUrl' then nullif(p_patch->>'customFaviconUrl','') else favicon_url end,
    social_share_image_url=case when p_patch?'socialShareImageUrl' then nullif(p_patch->>'socialShareImageUrl','') else social_share_image_url end, social_share_image=case when p_patch?'socialShareImageUrl' then nullif(p_patch->>'socialShareImageUrl','') else social_share_image end,
    seo_keywords=case when p_patch?'seoKeywords' then nullif(p_patch->>'seoKeywords','') else seo_keywords end, seo_title=case when p_patch?'seoTitle' then nullif(p_patch->>'seoTitle','') else seo_title end, seo_description=case when p_patch?'seoDescription' then nullif(p_patch->>'seoDescription','') else seo_description end, heading_font=case when p_patch?'headingFont' then nullif(p_patch->>'headingFont','') else heading_font end, body_font=case when p_patch?'bodyFont' then nullif(p_patch->>'bodyFont','') else body_font end,
    whatsapp_notifications=case when p_patch?'whatsappNotificationsEnabled' then coalesce((p_patch->>'whatsappNotificationsEnabled')::boolean,true) else whatsapp_notifications end, whatsapp_notifications_enabled=case when p_patch?'whatsappNotificationsEnabled' then coalesce((p_patch->>'whatsappNotificationsEnabled')::boolean,true) else whatsapp_notifications_enabled end,
    latitude=case when p_patch?'latitude' then nullif(p_patch->>'latitude','')::double precision else latitude end, longitude=case when p_patch?'longitude' then nullif(p_patch->>'longitude','')::double precision else longitude end,
    working_hours=case when p_patch?'workingHours' and jsonb_typeof(p_patch->'workingHours') in ('object','array') then p_patch->'workingHours' else working_hours end, updated_at=now()
  where id=actor;
  return public.get_my_profile_settings();
end $$;

create or replace function public.get_my_profile_settings()
returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
  select jsonb_build_object('ownerName',coalesce(full_name,''),'businessName',coalesce(salon_name,''),'businessType',coalesce(business_type,''),'email',coalesce(email,''),'phone',coalesce(phone,phone_number,''),'whatsapp',coalesce(whatsapp,whatsapp_number,''),'postalCode',coalesce(postal_code,pincode,''),'city',coalesce(city,preferred_city,''),'area',coalesce(area,preferred_area,''),'address',coalesce(full_address,''),'state',coalesce(state,''),'landmark',coalesce(landmark,''),'dob',coalesce(dob,date_of_birth)::text,'avatar',coalesce(owner_photo_url,avatar_url,photo_url,''),'notifications',coalesce(whatsapp_notifications_enabled,whatsapp_notifications,true),'profile',to_jsonb(p)) from public.profiles p where id=(select auth.uid())
$$;

revoke all on function public.save_my_profile_settings(jsonb),public.get_my_profile_settings() from public,anon;
grant execute on function public.save_my_profile_settings(jsonb),public.get_my_profile_settings() to authenticated;
notify pgrst,'reload schema';
commit;

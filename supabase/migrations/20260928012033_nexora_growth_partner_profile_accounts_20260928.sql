-- Growth Partner profile, application, and account settings. No demo metrics.
begin;

alter table public.profiles add column if not exists partner_avatar_path text;

create table if not exists public.growth_partner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  kyc_document_type text not null,
  kyc_document_reference text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  kyc_status text not null default 'pending' check (kyc_status in ('pending','approved','rejected')),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_account_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  agency_name text not null default '', whatsapp_phone text, city text not null default '', state text not null default '',
  public_bio text not null default '', full_address text not null default '', alternate_phone text, website_url text,
  social_handles text not null default '', social_links jsonb not null default '{}'::jsonb,
  payout_method text check (payout_method in ('upi','bank_transfer','paypal')),
  payout_account_name text, payout_account_number text, payout_ifsc text, payout_upi_id text,
  bank_name text, bank_branch text, swift_code text, pan_number text,
  notify_email boolean not null default true, notify_whatsapp boolean not null default true, notify_sms boolean not null default false,
  two_factor_enabled boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists idx_growth_partner_applications_status on public.growth_partner_applications(status, created_at desc);
alter table public.growth_partner_applications enable row level security;
alter table public.partner_account_settings enable row level security;
create policy growth_partner_applications_self_select on public.growth_partner_applications for select to authenticated using (user_id=(select auth.uid()));
create policy partner_account_settings_self_all on public.partner_account_settings for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
grant select on public.growth_partner_applications to authenticated;
grant select,insert,update,delete on public.partner_account_settings to authenticated;

create or replace function public.get_my_growth_partner()
returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
  select jsonb_build_object('user_id', user_id, 'referral_code', referral_code, 'is_active', is_active, 'status', case when is_active then 'active' else 'inactive' end, 'created_at', created_at, 'updated_at', updated_at)
  from public.growth_partners where user_id=(select auth.uid())
$$;

create or replace function public.get_my_growth_partner_profile()
returns jsonb language plpgsql stable security invoker set search_path=pg_catalog,public as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not exists(select 1 from public.growth_partners where user_id=actor) then raise exception 'Growth Partner access required' using errcode='42501'; end if;
  select jsonb_build_object('full_name',coalesce(p.full_name,''),'email',coalesce(p.email,''),'phone',p.phone,'photo_path',p.partner_avatar_path,'partner_id',g.user_id,'referral_code',g.referral_code,'account_status',case when g.is_active then 'Active' else 'Paused' end,'partner_role','Growth Partner','approval_status',coalesce(a.status,'approved'),'joined_at',g.created_at) into result
  from public.growth_partners g join public.profiles p on p.id=g.user_id left join public.growth_partner_applications a on a.user_id=g.user_id where g.user_id=actor;
  return result;
end $$;

create or replace function public.save_my_growth_partner_profile(p_patch jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare actor uuid:=auth.uid(); v_name text; v_phone text; v_path text;
begin
  if actor is null or not exists(select 1 from public.growth_partners where user_id=actor) then raise exception 'Growth Partner access required' using errcode='42501'; end if;
  if p_patch is null or jsonb_typeof(p_patch)<>'object' or p_patch - array['full_name','phone','photo_path'] <> '{}'::jsonb then raise exception 'Invalid profile patch' using errcode='22023'; end if;
  v_name:=nullif(btrim(p_patch->>'full_name'),''); v_phone:=nullif(regexp_replace(coalesce(p_patch->>'phone',''),'[[:space:]().-]','','g'),''); v_path:=nullif(p_patch->>'photo_path','');
  if v_name is not null and (length(v_name)>120 or v_name~'[[:cntrl:]]') then raise exception 'Invalid full name' using errcode='22023'; end if;
  if v_phone is not null and v_phone !~ '^\\+?[0-9]{7,15}$' then raise exception 'Invalid phone number' using errcode='22023'; end if;
  if v_path is not null and v_path !~ ('^'||actor::text||'/[a-f0-9-]{36}\\.(jpg|png|webp)$') then raise exception 'Invalid photo path' using errcode='22023'; end if;
  update public.profiles set full_name=case when p_patch?'full_name' then v_name else full_name end,phone=case when p_patch?'phone' then v_phone else phone end,partner_avatar_path=case when p_patch?'photo_path' then v_path else partner_avatar_path end where id=actor;
  return public.get_my_growth_partner_profile();
end $$;

create or replace function public.get_my_partner_account_settings()
returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
  select to_jsonb(s) - array['user_id','created_at','updated_at'] from public.partner_account_settings s where s.user_id=(select auth.uid())
$$;

create or replace function public.save_my_partner_account_settings(p_patch jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare actor uuid:=auth.uid(); allowed text[]:=array['agency_name','whatsapp_phone','city','state','public_bio','full_address','alternate_phone','website_url','social_handles','social_links','payout_method','payout_account_name','payout_account_number','payout_ifsc','payout_upi_id','bank_name','bank_branch','swift_code','pan_number','notify_email','notify_whatsapp','notify_sms','two_factor_enabled']; key text;
begin
  if actor is null or not exists(select 1 from public.growth_partners where user_id=actor) then raise exception 'Growth Partner access required' using errcode='42501'; end if;
  if p_patch is null or jsonb_typeof(p_patch)<>'object' or exists(select 1 from jsonb_object_keys(p_patch) k where not(k=any(allowed))) then raise exception 'Invalid account settings patch' using errcode='22023'; end if;
  insert into public.partner_account_settings(user_id) values(actor) on conflict(user_id) do nothing;
  update public.partner_account_settings set
    agency_name=case when p_patch?'agency_name' then coalesce(p_patch->>'agency_name','') else agency_name end, whatsapp_phone=case when p_patch?'whatsapp_phone' then nullif(p_patch->>'whatsapp_phone','') else whatsapp_phone end, city=case when p_patch?'city' then coalesce(p_patch->>'city','') else city end, state=case when p_patch?'state' then coalesce(p_patch->>'state','') else state end, public_bio=case when p_patch?'public_bio' then coalesce(p_patch->>'public_bio','') else public_bio end, full_address=case when p_patch?'full_address' then coalesce(p_patch->>'full_address','') else full_address end, alternate_phone=case when p_patch?'alternate_phone' then nullif(p_patch->>'alternate_phone','') else alternate_phone end, website_url=case when p_patch?'website_url' then nullif(p_patch->>'website_url','') else website_url end, social_handles=case when p_patch?'social_handles' then coalesce(p_patch->>'social_handles','') else social_handles end, social_links=case when p_patch?'social_links' and jsonb_typeof(p_patch->'social_links')='object' then p_patch->'social_links' else social_links end, payout_method=case when p_patch?'payout_method' then nullif(p_patch->>'payout_method','') else payout_method end, payout_account_name=case when p_patch?'payout_account_name' then nullif(p_patch->>'payout_account_name','') else payout_account_name end, payout_account_number=case when p_patch?'payout_account_number' then nullif(p_patch->>'payout_account_number','') else payout_account_number end, payout_ifsc=case when p_patch?'payout_ifsc' then nullif(p_patch->>'payout_ifsc','') else payout_ifsc end, payout_upi_id=case when p_patch?'payout_upi_id' then nullif(p_patch->>'payout_upi_id','') else payout_upi_id end, bank_name=case when p_patch?'bank_name' then nullif(p_patch->>'bank_name','') else bank_name end, bank_branch=case when p_patch?'bank_branch' then nullif(p_patch->>'bank_branch','') else bank_branch end, swift_code=case when p_patch?'swift_code' then nullif(p_patch->>'swift_code','') else swift_code end, pan_number=case when p_patch?'pan_number' then nullif(p_patch->>'pan_number','') else pan_number end, notify_email=case when p_patch?'notify_email' then coalesce((p_patch->>'notify_email')::boolean,true) else notify_email end, notify_whatsapp=case when p_patch?'notify_whatsapp' then coalesce((p_patch->>'notify_whatsapp')::boolean,true) else notify_whatsapp end, notify_sms=case when p_patch?'notify_sms' then coalesce((p_patch->>'notify_sms')::boolean,false) else notify_sms end, two_factor_enabled=case when p_patch?'two_factor_enabled' then coalesce((p_patch->>'two_factor_enabled')::boolean,false) else two_factor_enabled end, updated_at=now() where user_id=actor;
  return public.get_my_partner_account_settings();
end $$;

create or replace function public.submit_growth_partner_application(p_full_name text,p_phone text,p_kyc_document_type text,p_kyc_document_reference text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare actor uuid:=auth.uid(); name_value text:=nullif(btrim(p_full_name),'');
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if name_value is null or length(name_value)>120 or nullif(btrim(p_kyc_document_type),'') is null or nullif(btrim(p_kyc_document_reference),'') is null then raise exception 'Complete all application fields' using errcode='22023'; end if;
  insert into public.growth_partner_applications(user_id,full_name,phone,kyc_document_type,kyc_document_reference) values(actor,name_value,nullif(btrim(p_phone),''),btrim(p_kyc_document_type),btrim(p_kyc_document_reference)) on conflict(user_id) do update set full_name=excluded.full_name,phone=excluded.phone,kyc_document_type=excluded.kyc_document_type,kyc_document_reference=excluded.kyc_document_reference,status='pending',kyc_status='pending',review_note=null,reviewed_at=null,reviewed_by=null,updated_at=now();
  return jsonb_build_object('status','pending');
end $$;

revoke all on function public.get_my_growth_partner(),public.get_my_growth_partner_profile(),public.save_my_growth_partner_profile(jsonb),public.get_my_partner_account_settings(),public.save_my_partner_account_settings(jsonb),public.submit_growth_partner_application(text,text,text,text) from public,anon;
grant execute on function public.get_my_growth_partner(),public.get_my_growth_partner_profile(),public.save_my_growth_partner_profile(jsonb),public.get_my_partner_account_settings(),public.save_my_partner_account_settings(jsonb),public.submit_growth_partner_application(text,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
